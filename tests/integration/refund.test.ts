import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, charge, getBalance, refund, setupWallet } from "../helpers/api.js";
import { countRows, reconcileWallet, useTestDatabase } from "../helpers/db.js";

useTestDatabase();

/** Wallet with balance 100, then an approved charge of 50 (balance 50). */
async function setupCharge(): Promise<{ merchantId: string; walletId: string; chargeId: string }> {
  const { merchantId, walletId } = await setupWallet(100);
  const res = await charge({ merchantId, walletId, amount: 50, currency: "ILS" }).expect(201);
  return { merchantId, walletId, chargeId: res.body.data.id };
}

describe("POST /api/transactions/refund", () => {
  it("#9 fully refunds an approved charge and restores the balance", async () => {
    const { walletId, chargeId } = await setupCharge();
    const res = await refund({ originalTransactionId: chargeId, amount: 50 }).expect(201);

    expect(res.body.data).toMatchObject({
      type: "REFUND",
      status: "APPROVED",
      amount: 50,
      currency: "ILS",
      walletId,
      originalTransactionId: chargeId,
    });
    expect(await getBalance(walletId)).toBe(100);
    expect(await countRows("ledger_entries", walletId)).toBe(2);
    const { expected, actual } = await reconcileWallet(walletId);
    expect(actual).toBe(expected);
  });

  it("#10 approves two partial refunds of 30 + 20 on a charge of 50", async () => {
    const { walletId, chargeId } = await setupCharge();
    await refund({ originalTransactionId: chargeId, amount: 30 }).expect(201);
    await refund({ originalTransactionId: chargeId, amount: 20 }).expect(201);
    expect(await getBalance(walletId)).toBe(100);
  });

  it("#11 declines a refund of 60 on a charge of 50", async () => {
    const { walletId, chargeId } = await setupCharge();
    const res = await refund({ originalTransactionId: chargeId, amount: 60 }).expect(422);
    expect(res.body.error.code).toBe("REFUND_EXCEEDS_ORIGINAL");
    expect(await getBalance(walletId)).toBe(50);
  });

  it("declines a partial refund that exceeds what remains", async () => {
    const { chargeId } = await setupCharge();
    await refund({ originalTransactionId: chargeId, amount: 30 }).expect(201);
    const res = await refund({ originalTransactionId: chargeId, amount: 21 }).expect(422);
    expect(res.body.error.code).toBe("REFUND_EXCEEDS_ORIGINAL");
  });

  it("#12 declines a refund of a declined charge", async () => {
    const { merchantId, walletId } = await setupWallet(10);
    const declined = await charge({ merchantId, walletId, amount: 50, currency: "ILS" }).expect(422);
    const res = await refund({ originalTransactionId: declined.body.error.transactionId }).expect(422);
    expect(res.body.error.code).toBe("ORIGINAL_NOT_APPROVED");
    expect(await getBalance(walletId)).toBe(10);
  });

  it("#13 declines a refund of a refund", async () => {
    const { chargeId } = await setupCharge();
    const first = await refund({ originalTransactionId: chargeId, amount: 10 }).expect(201);
    const res = await refund({ originalTransactionId: first.body.data.id, amount: 5 }).expect(422);
    expect(res.body.error.code).toBe("ORIGINAL_NOT_CHARGE");
  });

  it("refunds the remaining amount when amount is omitted", async () => {
    const { walletId, chargeId } = await setupCharge();
    await refund({ originalTransactionId: chargeId, amount: 30 }).expect(201);
    const res = await refund({ originalTransactionId: chargeId }).expect(201);
    expect(res.body.data.amount).toBe(20);
    expect(await getBalance(walletId)).toBe(100);
  });

  it("declines an omitted-amount refund when the charge is already fully refunded", async () => {
    const { chargeId } = await setupCharge();
    await refund({ originalTransactionId: chargeId }).expect(201);
    const res = await refund({ originalTransactionId: chargeId }).expect(422);
    expect(res.body.error.code).toBe("REFUND_EXCEEDS_ORIGINAL");
  });

  it("declines a refund when the wallet is inactive", async () => {
    const { walletId, chargeId } = await setupCharge();
    await request(app).patch(`/api/wallets/${walletId}/status`).send({ status: "INACTIVE" }).expect(200);
    const res = await refund({ originalTransactionId: chargeId }).expect(422);
    expect(res.body.error.code).toBe("WALLET_INACTIVE");
    expect(await getBalance(walletId)).toBe(50);
  });

  it("declines a refund when the merchant is inactive", async () => {
    const { merchantId, chargeId } = await setupCharge();
    await request(app).patch(`/api/merchants/${merchantId}/status`).send({ status: "INACTIVE" }).expect(200);
    const res = await refund({ originalTransactionId: chargeId }).expect(422);
    expect(res.body.error.code).toBe("MERCHANT_INACTIVE");
  });

  it("returns 404 for an unknown original transaction", async () => {
    const res = await refund({ originalTransactionId: randomUUID(), amount: 10 }).expect(404);
    expect(res.body.error.code).toBe("TRANSACTION_NOT_FOUND");
  });

  it.each([{ amount: 0 }, { amount: -5 }, { amount: "abc" }, { amount: 1, extra: true }])(
    "rejects %j with 400 and stores nothing",
    async (override) => {
      const { walletId, chargeId } = await setupCharge();
      await refund({ originalTransactionId: chargeId, ...override }).expect(400);
      expect(await countRows("transactions", walletId)).toBe(1);
    },
  );

  it("never over-refunds under concurrent refunds", async () => {
    const { walletId, chargeId } = await setupCharge();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => refund({ originalTransactionId: chargeId, amount: 20 })),
    );
    expect(responses.filter((res) => res.status === 201)).toHaveLength(2);
    expect(await getBalance(walletId)).toBe(90);
  });
});
