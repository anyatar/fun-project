import type { PoolClient } from "pg";
import type { Queryable } from "../../infrastructure/database/pool.js";
import type { Currency, EntityStatus } from "../../shared/types/domain.js";
import type { Wallet } from "./wallets.types.js";

const COLUMNS = `id, merchant_id AS "merchantId", currency, initial_balance AS "initialBalance", balance, status,
  created_at AS "createdAt"`;

export interface NewWallet {
  merchantId: string;
  currency: Currency;
  initialBalance: number;
}

export async function insertWallet(db: Queryable, wallet: NewWallet): Promise<Wallet> {
  const result = await db.query<Wallet>(
    `INSERT INTO wallets (merchant_id, currency, initial_balance, balance) VALUES ($1, $2, $3, $3) RETURNING ${COLUMNS}`,
    [wallet.merchantId, wallet.currency, wallet.initialBalance],
  );
  const inserted = result.rows[0];
  if (!inserted) throw new Error("INSERT … RETURNING returned no row");
  return inserted;
}

export async function listWallets(db: Queryable): Promise<Wallet[]> {
  // shortcut: unbounded list (pagination was out of scope); add cursor pagination before real data volumes.
  const result = await db.query<Wallet>(`SELECT ${COLUMNS} FROM wallets ORDER BY created_at DESC, id DESC`);
  return result.rows;
}

export async function findWalletById(db: Queryable, id: string): Promise<Wallet | null> {
  const result = await db.query<Wallet>(`SELECT ${COLUMNS} FROM wallets WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

/** Row-locks the wallet until the surrounding transaction ends, serializing balance changes. */
export async function findWalletByIdForUpdate(client: PoolClient, id: string): Promise<Wallet | null> {
  const result = await client.query<Wallet>(`SELECT ${COLUMNS} FROM wallets WHERE id = $1 FOR UPDATE`, [id]);
  return result.rows[0] ?? null;
}

/** `delta` is signed minor units. The `balance >= 0` CHECK constraint is the last line of defence. */
export async function adjustWalletBalance(client: PoolClient, id: string, delta: number): Promise<void> {
  const result = await client.query("UPDATE wallets SET balance = balance + $2 WHERE id = $1", [id, delta]);
  if (result.rowCount !== 1) throw new Error("Wallet balance update affected no row");
}

export async function updateWalletStatus(db: Queryable, id: string, status: EntityStatus): Promise<Wallet | null> {
  const result = await db.query<Wallet>(`UPDATE wallets SET status = $2 WHERE id = $1 RETURNING ${COLUMNS}`, [
    id,
    status,
  ]);
  return result.rows[0] ?? null;
}
