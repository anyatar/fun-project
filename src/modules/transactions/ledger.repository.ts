import type { PoolClient } from "pg";
import type { Currency } from "../../shared/types/domain.js";
import type { TransactionType } from "./transactions.types.js";

export interface NewLedgerEntry {
  walletId: string;
  transactionId: string;
  type: TransactionType;
  /** Signed minor units: negative for CHARGE, positive for REFUND. */
  amount: number;
  currency: Currency;
}

/** The ledger is append-only (a DB trigger rejects UPDATE/DELETE), so this is its only write. */
export async function insertLedgerEntry(client: PoolClient, entry: NewLedgerEntry): Promise<void> {
  await client.query(
    `INSERT INTO ledger_entries (wallet_id, transaction_id, type, amount, currency) VALUES ($1, $2, $3, $4, $5)`,
    [entry.walletId, entry.transactionId, entry.type, entry.amount, entry.currency],
  );
}
