import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, createMerchant, createWallet } from "../helpers/api.js";
import { useTestDatabase } from "../helpers/db.js";

useTestDatabase();

describe("merchants", () => {
  it("creates, lists, gets and deactivates a merchant", async () => {
    const created = await request(app).post("/api/merchants").send({ name: "  Acme  " }).expect(201);
    expect(created.body.data).toMatchObject({ name: "Acme", status: "ACTIVE" });
    const id: string = created.body.data.id;

    const list = await request(app).get("/api/merchants").expect(200);
    expect(list.body.data).toHaveLength(1);

    await request(app).get(`/api/merchants/${id}`).expect(200);

    const patched = await request(app).patch(`/api/merchants/${id}/status`).send({ status: "INACTIVE" }).expect(200);
    expect(patched.body.data.status).toBe("INACTIVE");
    // Setting the same status again is a no-op 200.
    await request(app).patch(`/api/merchants/${id}/status`).send({ status: "INACTIVE" }).expect(200);
  });

  it.each([{}, { name: "" }, { name: 5 }, { name: "Acme", extra: true }])("rejects invalid body %j with 400", async (body) => {
    const res = await request(app).post("/api/merchants").send(body).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 for an unknown merchant and 400 for a malformed id", async () => {
    const notFound = await request(app).get(`/api/merchants/${randomUUID()}`).expect(404);
    expect(notFound.body.error.code).toBe("MERCHANT_NOT_FOUND");
    await request(app).get("/api/merchants/not-a-uuid").expect(400);
  });

  it("rejects an unknown status with 400", async () => {
    const { id } = await createMerchant();
    await request(app).patch(`/api/merchants/${id}/status`).send({ status: "DELETED" }).expect(400);
  });
});

describe("wallets", () => {
  it("creates a wallet with an initial balance and reads its balance", async () => {
    const merchant = await createMerchant();
    const created = await request(app)
      .post("/api/wallets")
      .send({ merchantId: merchant.id, currency: "USD", initialBalance: 1050 })
      .expect(201);
    expect(created.body.data).toMatchObject({
      merchantId: merchant.id,
      currency: "USD",
      initialBalance: 1050,
      balance: 1050,
      status: "ACTIVE",
    });

    const fetched = await request(app).get(`/api/wallets/${created.body.data.id}`).expect(200);
    expect(fetched.body.data.balance).toBe(1050);
    const list = await request(app).get("/api/wallets").expect(200);
    expect(list.body.data).toHaveLength(1);
  });

  it("defaults the initial balance to 0", async () => {
    const merchant = await createMerchant();
    const res = await request(app).post("/api/wallets").send({ merchantId: merchant.id, currency: "EUR" }).expect(201);
    expect(res.body.data.balance).toBe(0);
  });

  it("returns 404 when the merchant does not exist", async () => {
    const res = await request(app)
      .post("/api/wallets")
      .send({ merchantId: randomUUID(), currency: "ILS" })
      .expect(404);
    expect(res.body.error.code).toBe("MERCHANT_NOT_FOUND");
  });

  it.each([
    { currency: "GBP" },
    { currency: "ILS", initialBalance: -1 },
    { currency: "ILS", initialBalance: 10.5 },
    { currency: "ILS", initialBalance: "100" },
  ])("rejects invalid body %j with 400", async (body) => {
    const merchant = await createMerchant();
    await request(app).post("/api/wallets").send({ merchantId: merchant.id, ...body }).expect(400);
  });

  it("deactivates a wallet that still has a balance", async () => {
    const merchant = await createMerchant();
    const wallet = await createWallet(merchant.id, 500);
    const res = await request(app).patch(`/api/wallets/${wallet.id}/status`).send({ status: "INACTIVE" }).expect(200);
    expect(res.body.data).toMatchObject({ status: "INACTIVE", balance: 500 });
  });

  it("returns 404 when patching an unknown wallet", async () => {
    await request(app).patch(`/api/wallets/${randomUUID()}/status`).send({ status: "INACTIVE" }).expect(404);
  });
});
