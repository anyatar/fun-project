import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { pool } from "../../src/infrastructure/database/pool.js";
import { app, charge, createMerchant, createWallet, getBalance, setupWallet } from "../helpers/api.js";
import { countRows, reconcileWallet, useTestDatabase } from "../helpers/db.js";

useTestDatabase();

describe("POST /api/transactions/charge", () => {
  it("#1 approves a charge of 50 from 100: balance 50, one ledger entry", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    const res = await charge({ merchantId, walletId, amount: 50, currency: "ILS" }).expect(201);

    expect(res.body.data).toMatchObject({
      type: "CHARGE",
      status: "APPROVED",
      amount: 50,
      declineReason: null,
      originalTransactionId: null,
    });
    expect(await getBalance(walletId)).toBe(50);
    expect(await countRows("ledger_entries", walletId)).toBe(1);
    const ledger = await pool.query<{ amount: number }>("SELECT amount FROM ledger_entries WHERE wallet_id = $1", [
      walletId,
    ]);
    expect(ledger.rows[0]?.amount).toBe(-50);
  });

  it("#2 declines INSUFFICIENT_FUNDS, stores it, leaves the balance, writes no ledger entry", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    const res = await charge({ merchantId, walletId, amount: 150, currency: "ILS" }).expect(422);

    expect(res.body.error).toMatchObject({ code: "INSUFFICIENT_FUNDS", transactionId: expect.any(String) });
    expect(await getBalance(walletId)).toBe(100);
    expect(await countRows("ledger_entries", walletId)).toBe(0);
    const stored = await request(app).get(`/api/transactions/${res.body.error.transactionId}`).expect(200);
    expect(stored.body.data).toMatchObject({ status: "DECLINED", declineReason: "INSUFFICIENT_FUNDS" });
  });

  it("#3 declines CURRENCY_MISMATCH", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    const res = await charge({ merchantId, walletId, amount: 10, currency: "USD" }).expect(422);
    expect(res.body.error.code).toBe("CURRENCY_MISMATCH");
    expect(await getBalance(walletId)).toBe(100);
  });

  it("#4 declines a charge on an inactive wallet", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    await request(app).patch(`/api/wallets/${walletId}/status`).send({ status: "INACTIVE" }).expect(200);
    const res = await charge({ merchantId, walletId, amount: 10, currency: "ILS" }).expect(422);
    expect(res.body.error.code).toBe("WALLET_INACTIVE");
  });

  it("#5 declines a charge for an inactive merchant", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    await request(app).patch(`/api/merchants/${merchantId}/status`).send({ status: "INACTIVE" }).expect(200);
    const res = await charge({ merchantId, walletId, amount: 10, currency: "ILS" }).expect(422);
    expect(res.body.error.code).toBe("MERCHANT_INACTIVE");
  });

  it("#6 declines charging another merchant's wallet", async () => {
    const { walletId } = await setupWallet(100);
    const other = await createMerchant("Other");
    const res = await charge({ merchantId: other.id, walletId, amount: 10, currency: "ILS" }).expect(422);
    expect(res.body.error.code).toBe("WALLET_MERCHANT_MISMATCH");
    expect(await getBalance(walletId)).toBe(100);
  });

  it.each([0, -5, "abc", 10.5, "50", null])("#7 rejects amount %j with 400 and stores nothing", async (amount) => {
    const { merchantId, walletId } = await setupWallet(100);
    const res = await charge({ merchantId, walletId, amount, currency: "ILS" }).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(await countRows("transactions", walletId)).toBe(0);
  });

  it.each([
    { currency: "GBP" },
    { currency: undefined },
    { currency: "ILS", unexpected: 1 },
    { currency: "ILS", walletId: "not-a-uuid" },
  ])("rejects malformed body %j with 400", async (override) => {
    const { merchantId, walletId } = await setupWallet(100);
    await charge({ merchantId, walletId, amount: 10, ...override }).expect(400);
    expect(await countRows("transactions", walletId)).toBe(0);
  });

  it("#8 returns 404 for an unknown wallet and stores nothing", async () => {
    const { merchantId } = await setupWallet(100);
    const res = await charge({ merchantId, walletId: randomUUID(), amount: 10, currency: "ILS" }).expect(404);
    expect(res.body.error.code).toBe("WALLET_NOT_FOUND");
    const all = await request(app).get("/api/transactions").expect(200);
    expect(all.body.data).toHaveLength(0);
  });

  it("returns 404 for an unknown merchant", async () => {
    const { walletId } = await setupWallet(100);
    const res = await charge({ merchantId: randomUUID(), walletId, amount: 10, currency: "ILS" }).expect(404);
    expect(res.body.error.code).toBe("MERCHANT_NOT_FOUND");
  });

  it("#14 ten parallel charges of 20 on 100: exactly 5 approved, final balance 0", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => charge({ merchantId, walletId, amount: 20, currency: "ILS" })),
    );

    const statuses = responses.map((res) => res.status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(5);
    expect(statuses.filter((status) => status === 422)).toHaveLength(5);
    expect(await getBalance(walletId)).toBe(0);
    expect(await countRows("ledger_entries", walletId)).toBe(5);
    const { expected, actual } = await reconcileWallet(walletId);
    expect(actual).toBe(expected);
  });

  it("#15 charging 10 (0.10) three times from 30 (0.30) leaves exactly 0", async () => {
    const { merchantId, walletId } = await setupWallet(30);
    for (let i = 0; i < 3; i++) {
      await charge({ merchantId, walletId, amount: 10, currency: "ILS" }).expect(201);
    }
    expect(await getBalance(walletId)).toBe(0);
  });

  it("lists transactions filtered by wallet and merchant", async () => {
    const first = await setupWallet(100);
    const second = await setupWallet(100);
    await charge({ ...first, amount: 10, currency: "ILS" }).expect(201);
    await charge({ ...second, amount: 10, currency: "ILS" }).expect(201);
    await charge({ ...second, amount: 10, currency: "ILS" }).expect(201);

    const byWallet = await request(app).get(`/api/transactions?walletId=${second.walletId}`).expect(200);
    expect(byWallet.body.data).toHaveLength(2);
    const byMerchant = await request(app).get(`/api/transactions?merchantId=${first.merchantId}`).expect(200);
    expect(byMerchant.body.data).toHaveLength(1);
    await request(app).get("/api/transactions?walletId=nope").expect(400);
    await request(app).get("/api/transactions?sort=amount").expect(400);
  });

  it("allows a wallet created for an inactive merchant, but declines its charges", async () => {
    const merchant = await createMerchant();
    await request(app).patch(`/api/merchants/${merchant.id}/status`).send({ status: "INACTIVE" }).expect(200);
    const wallet = await createWallet(merchant.id, 100);
    const res = await charge({ merchantId: merchant.id, walletId: wallet.id, amount: 10, currency: "ILS" }).expect(422);
    expect(res.body.error.code).toBe("MERCHANT_INACTIVE");
  });
});

describe("database invariants", () => {
  it("rejects UPDATE and DELETE on the ledger", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    await charge({ merchantId, walletId, amount: 10, currency: "ILS" }).expect(201);
    await expect(pool.query("UPDATE ledger_entries SET amount = -1")).rejects.toThrow(/append-only/);
    await expect(pool.query("DELETE FROM ledger_entries")).rejects.toThrow(/append-only/);
  });

  it("rejects a negative wallet balance even if application checks are bypassed", async () => {
    const { walletId } = await setupWallet(100);
    await expect(pool.query("UPDATE wallets SET balance = -1 WHERE id = $1", [walletId])).rejects.toThrow(/check/i);
  });
});
