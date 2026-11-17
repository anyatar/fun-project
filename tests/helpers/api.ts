import request from "supertest";
import { createApp } from "../../src/app.js";

export const app = createApp();

interface Entity {
  id: string;
}

function readId(body: unknown): string {
  if (typeof body === "object" && body !== null && "data" in body) {
    const data: unknown = body.data;
    if (typeof data === "object" && data !== null && "id" in data && typeof data.id === "string") {
      return data.id;
    }
  }
  throw new Error(`Response has no data.id: ${JSON.stringify(body)}`);
}

export async function createMerchant(name = "Acme"): Promise<Entity> {
  const res = await request(app).post("/api/merchants").send({ name }).expect(201);
  return { id: readId(res.body) };
}

export async function createWallet(merchantId: string, initialBalance: number, currency = "ILS"): Promise<Entity> {
  const res = await request(app).post("/api/wallets").send({ merchantId, currency, initialBalance }).expect(201);
  return { id: readId(res.body) };
}

export async function getBalance(walletId: string): Promise<number> {
  const res = await request(app).get(`/api/wallets/${walletId}`).expect(200);
  const body: unknown = res.body;
  if (typeof body === "object" && body !== null && "data" in body) {
    const data: unknown = body.data;
    if (typeof data === "object" && data !== null && "balance" in data && typeof data.balance === "number") {
      return data.balance;
    }
  }
  throw new Error("Response has no data.balance");
}

/** A merchant with one ACTIVE ILS wallet. */
export async function setupWallet(initialBalance: number): Promise<{ merchantId: string; walletId: string }> {
  const merchant = await createMerchant();
  const wallet = await createWallet(merchant.id, initialBalance);
  return { merchantId: merchant.id, walletId: wallet.id };
}

export function charge(body: Record<string, unknown>, idempotencyKey?: string): request.Test {
  const req = request(app).post("/api/transactions/charge");
  if (idempotencyKey !== undefined) req.set("Idempotency-Key", idempotencyKey);
  return req.send(body);
}

export function refund(body: Record<string, unknown>, idempotencyKey?: string): request.Test {
  const req = request(app).post("/api/transactions/refund");
  if (idempotencyKey !== undefined) req.set("Idempotency-Key", idempotencyKey);
  return req.send(body);
}
