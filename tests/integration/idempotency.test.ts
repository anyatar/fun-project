import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, charge, getBalance, refund, setupWallet } from "../helpers/api.js";
import { countRows, useTestDatabase } from "../helpers/db.js";

useTestDatabase();

describe("Idempotency-Key", () => {
  it("#16 same key twice: one transaction, same response", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    const body = { merchantId, walletId, amount: 30, currency: "ILS" };

    const first = await charge(body, "key-1").expect(201);
    const second = await charge(body, "key-1").expect(201);

    expect(second.body).toEqual(first.body);
    expect(await countRows("transactions", walletId)).toBe(1);
    expect(await getBalance(walletId)).toBe(70);
  });

  it("#17 same key with a different amount returns 409", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    await charge({ merchantId, walletId, amount: 30, currency: "ILS" }, "key-1").expect(201);
    const res = await charge({ merchantId, walletId, amount: 31, currency: "ILS" }, "key-1").expect(409);
    expect(res.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(await getBalance(walletId)).toBe(70);
  });

  it("replays a declined charge as the same 422", async () => {
    const { merchantId, walletId } = await setupWallet(10);
    const body = { merchantId, walletId, amount: 30, currency: "ILS" };
    const first = await charge(body, "key-1").expect(422);
    const second = await charge(body, "key-1").expect(422);
    expect(second.body.error.transactionId).toBe(first.body.error.transactionId);
    expect(await countRows("transactions", walletId)).toBe(1);
  });

  it("processes concurrent requests with the same key exactly once", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    const body = { merchantId, walletId, amount: 10, currency: "ILS" };
    const responses = await Promise.all(Array.from({ length: 5 }, () => charge(body, "same-key")));

    expect(responses.map((res) => res.status)).toEqual([201, 201, 201, 201, 201]);
    expect(new Set(responses.map((res) => res.body.data.id)).size).toBe(1);
    expect(await getBalance(walletId)).toBe(90);
  });

  it("does not store the key when the request fails with 404, so it can be retried", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    await charge({ merchantId, walletId: randomUUID(), amount: 10, currency: "ILS" }, "retry-key").expect(404);
    await charge({ merchantId, walletId, amount: 10, currency: "ILS" }, "retry-key").expect(201);
  });

  it("scopes keys per endpoint and works on refunds", async () => {
    const { merchantId, walletId } = await setupWallet(100);
    const charged = await charge({ merchantId, walletId, amount: 50, currency: "ILS" }, "shared-key").expect(201);

    const body = { originalTransactionId: charged.body.data.id, amount: 20 };
    const first = await refund(body, "shared-key").expect(201);
    const second = await refund(body, "shared-key").expect(201);
    expect(second.body).toEqual(first.body);
    expect(await getBalance(walletId)).toBe(70);
  });

  it.each(["", "a".repeat(256), "has space"])("rejects an invalid key %j with 400", async (key) => {
    const { merchantId, walletId } = await setupWallet(100);
    await request(app)
      .post("/api/transactions/charge")
      .set("Idempotency-Key", key)
      .send({ merchantId, walletId, amount: 10, currency: "ILS" })
      .expect(400);
  });
});
