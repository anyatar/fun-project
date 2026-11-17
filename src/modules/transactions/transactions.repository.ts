import type { PoolClient } from "pg";
import type { Queryable } from "../../infrastructure/database/pool.js";
import type { NewTransaction, Transaction } from "./transactions.types.js";

const COLUMNS = `id, type, wallet_id AS "walletId", merchant_id AS "merchantId", amount, currency, status,
  decline_reason AS "declineReason", original_transaction_id AS "originalTransactionId", created_at AS "createdAt"`;

export async function insertTransaction(client: PoolClient, transaction: NewTransaction): Promise<Transaction> {
  const result = await client.query<Transaction>(
    `INSERT INTO transactions
       (type, wallet_id, merchant_id, amount, currency, status, decline_reason, original_transaction_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLUMNS}`,
    [
      transaction.type,
      transaction.walletId,
      transaction.merchantId,
      transaction.amount,
      transaction.currency,
      transaction.status,
      transaction.declineReason,
      transaction.originalTransactionId,
    ],
  );
  const inserted = result.rows[0];
  if (!inserted) throw new Error("INSERT … RETURNING returned no row");
  return inserted;
}

export async function findTransactionById(db: Queryable, id: string): Promise<Transaction | null> {
  const result = await db.query<Transaction>(`SELECT ${COLUMNS} FROM transactions WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

/** Locks the original so concurrent refunds of the same charge are serialized. */
export async function findTransactionByIdForUpdate(client: PoolClient, id: string): Promise<Transaction | null> {
  const result = await client.query<Transaction>(`SELECT ${COLUMNS} FROM transactions WHERE id = $1 FOR UPDATE`, [id]);
  return result.rows[0] ?? null;
}

export async function sumApprovedRefunds(client: PoolClient, originalTransactionId: string): Promise<number> {
  const result = await client.query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0)::bigint AS total
       FROM transactions
      WHERE original_transaction_id = $1 AND type = 'REFUND' AND status = 'APPROVED'`,
    [originalTransactionId],
  );
  return result.rows[0]?.total ?? 0;
}

export interface TransactionFilter {
  walletId?: string | undefined;
  merchantId?: string | undefined;
}

export async function listTransactions(db: Queryable, filter: TransactionFilter): Promise<Transaction[]> {
  // shortcut: unbounded list (pagination was out of scope); add cursor pagination before real data volumes.
  const result = await db.query<Transaction>(
    `SELECT ${COLUMNS} FROM transactions
      WHERE ($1::uuid IS NULL OR wallet_id = $1)
        AND ($2::uuid IS NULL OR merchant_id = $2)
      ORDER BY created_at DESC, id DESC`,
    [filter.walletId ?? null, filter.merchantId ?? null],
  );
  return result.rows;
}
