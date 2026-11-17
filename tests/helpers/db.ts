import { afterAll, beforeEach } from "vitest";
import { pool } from "../../src/infrastructure/database/pool.js";

/** Registers hooks that empty every table before each test and close the pool after the file. */
export function useTestDatabase(): void {
  beforeEach(async () => {
    // TRUNCATE does not fire the ledger's row-level append-only trigger.
    await pool.query("TRUNCATE ledger_entries, idempotency_keys, transactions, wallets, merchants CASCADE");
  });
  afterAll(async () => {
    await pool.end();
  });
}

export async function countRows(table: "transactions" | "ledger_entries", walletId: string): Promise<number> {
  // `table` is a closed union of literals, never user input.
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::bigint AS count FROM ${table} WHERE wallet_id = $1`,
    [walletId],
  );
  return result.rows[0]?.count ?? 0;
}

/** initial_balance + SUM(ledger) must equal balance. Returns both sides. */
export async function reconcileWallet(walletId: string): Promise<{ expected: number; actual: number }> {
  const result = await pool.query<{ expected: number; actual: number }>(
    `SELECT w.initial_balance + COALESCE((SELECT SUM(amount) FROM ledger_entries l WHERE l.wallet_id = w.id), 0)::bigint
              AS expected,
            w.balance AS actual
       FROM wallets w WHERE w.id = $1`,
    [walletId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Wallet not found");
  return row;
}
