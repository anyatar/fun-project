import type { PoolClient } from "pg";
import type { TransactionType } from "./transactions.types.js";

export type IdempotencyScope = TransactionType;

export interface StoredIdempotencyKey {
  requestHash: string;
  transactionId: string | null;
}

/**
 * Returns true if this transaction now owns the key. If another open transaction holds the same key,
 * Postgres blocks here until it commits (conflict → false) or rolls back (insert succeeds → true).
 */
export async function claimIdempotencyKey(
  client: PoolClient,
  scope: IdempotencyScope,
  key: string,
  requestHash: string,
): Promise<boolean> {
  const result = await client.query(
    `INSERT INTO idempotency_keys (scope, key, request_hash) VALUES ($1, $2, $3) ON CONFLICT (scope, key) DO NOTHING`,
    [scope, key, requestHash],
  );
  return result.rowCount === 1;
}

export async function findIdempotencyKey(
  client: PoolClient,
  scope: IdempotencyScope,
  key: string,
): Promise<StoredIdempotencyKey | null> {
  const result = await client.query<StoredIdempotencyKey>(
    `SELECT request_hash AS "requestHash", transaction_id AS "transactionId"
       FROM idempotency_keys WHERE scope = $1 AND key = $2`,
    [scope, key],
  );
  return result.rows[0] ?? null;
}

export async function attachTransactionToKey(
  client: PoolClient,
  scope: IdempotencyScope,
  key: string,
  transactionId: string,
): Promise<void> {
  await client.query(`UPDATE idempotency_keys SET transaction_id = $3 WHERE scope = $1 AND key = $2`, [
    scope,
    key,
    transactionId,
  ]);
}
