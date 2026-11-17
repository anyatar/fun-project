import type { PoolClient } from "pg";
import type { Queryable } from "../../infrastructure/database/pool.js";
import type { EntityStatus } from "../../shared/types/domain.js";
import type { Merchant } from "./merchants.types.js";

const COLUMNS = `id, name, status, created_at AS "createdAt"`;

export async function insertMerchant(db: Queryable, name: string): Promise<Merchant> {
  const result = await db.query<Merchant>(`INSERT INTO merchants (name) VALUES ($1) RETURNING ${COLUMNS}`, [name]);
  const merchant = result.rows[0];
  if (!merchant) throw new Error("INSERT … RETURNING returned no row");
  return merchant;
}

export async function listMerchants(db: Queryable): Promise<Merchant[]> {
  // shortcut: unbounded list (pagination was out of scope); add cursor pagination before real data volumes.
  const result = await db.query<Merchant>(`SELECT ${COLUMNS} FROM merchants ORDER BY created_at DESC, id DESC`);
  return result.rows;
}

export async function findMerchantById(db: Queryable, id: string): Promise<Merchant | null> {
  const result = await db.query<Merchant>(`SELECT ${COLUMNS} FROM merchants WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

/** Blocks a concurrent status change until the surrounding transaction ends. */
export async function findMerchantByIdForShare(client: PoolClient, id: string): Promise<Merchant | null> {
  const result = await client.query<Merchant>(`SELECT ${COLUMNS} FROM merchants WHERE id = $1 FOR SHARE`, [id]);
  return result.rows[0] ?? null;
}

export async function updateMerchantStatus(db: Queryable, id: string, status: EntityStatus): Promise<Merchant | null> {
  const result = await db.query<Merchant>(`UPDATE merchants SET status = $2 WHERE id = $1 RETURNING ${COLUMNS}`, [
    id,
    status,
  ]);
  return result.rows[0] ?? null;
}
