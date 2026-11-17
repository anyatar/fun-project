import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { pool, withTransaction } from "../../infrastructure/database/pool.js";
import { AppError, notFound } from "../../shared/errors/app-error.js";
import type { Currency } from "../../shared/types/domain.js";
import { findMerchantByIdForShare } from "../merchants/merchants.repository.js";
import { adjustWalletBalance, findWalletByIdForUpdate } from "../wallets/wallets.repository.js";
import * as idempotencyRepository from "./idempotency.repository.js";
import type { IdempotencyScope } from "./idempotency.repository.js";
import { insertLedgerEntry } from "./ledger.repository.js";
import * as transactionsRepository from "./transactions.repository.js";
import type { TransactionFilter } from "./transactions.repository.js";
import { evaluateCharge, evaluateRefund, resolveRefundAmount } from "./transactions.rules.js";
import type { NewTransaction, Transaction } from "./transactions.types.js";

export interface ChargeInput {
  merchantId: string;
  walletId: string;
  amount: number;
  currency: Currency;
}

export interface RefundInput {
  originalTransactionId: string;
  amount?: number | undefined;
}

/**
 * Charges a wallet. Declines are stored and returned (status DECLINED), not thrown.
 * Lock order: merchant (share) → wallet (update). See docs/decisions/ADR-001.
 */
export async function charge(input: ChargeInput, idempotencyKey?: string): Promise<Transaction> {
  return await withTransaction(async (client) => {
    const replayed = await claimOrReplay(client, "CHARGE", idempotencyKey, input);
    if (replayed) return replayed;

    const merchant = await findMerchantByIdForShare(client, input.merchantId);
    if (!merchant) throw notFound("MERCHANT_NOT_FOUND", "Merchant not found");
    const wallet = await findWalletByIdForUpdate(client, input.walletId);
    if (!wallet) throw notFound("WALLET_NOT_FOUND", "Wallet not found");

    const declineReason = evaluateCharge({ merchant, wallet, amount: input.amount, currency: input.currency });
    return await recordTransaction(
      client,
      {
        type: "CHARGE",
        walletId: wallet.id,
        merchantId: merchant.id,
        amount: input.amount,
        currency: input.currency,
        status: declineReason === null ? "APPROVED" : "DECLINED",
        declineReason,
        originalTransactionId: null,
      },
      idempotencyKey,
    );
  });
}

/** Lock order: original transaction → merchant (share) → wallet (update). */
export async function refund(input: RefundInput, idempotencyKey?: string): Promise<Transaction> {
  return await withTransaction(async (client) => {
    const replayed = await claimOrReplay(client, "REFUND", idempotencyKey, input);
    if (replayed) return replayed;

    const original = await transactionsRepository.findTransactionByIdForUpdate(client, input.originalTransactionId);
    if (!original) throw notFound("TRANSACTION_NOT_FOUND", "Original transaction not found");
    const merchant = await findMerchantByIdForShare(client, original.merchantId);
    const wallet = await findWalletByIdForUpdate(client, original.walletId);
    // Foreign keys and no hard deletes guarantee both exist.
    if (!merchant || !wallet) throw new Error("Original transaction references a missing merchant or wallet");

    const alreadyRefunded = await transactionsRepository.sumApprovedRefunds(client, original.id);
    const amount = resolveRefundAmount(input.amount, original, alreadyRefunded);
    const declineReason = evaluateRefund({ original, alreadyRefunded, amount, merchant, wallet });
    return await recordTransaction(
      client,
      {
        type: "REFUND",
        walletId: original.walletId,
        merchantId: original.merchantId,
        amount,
        currency: original.currency,
        status: declineReason === null ? "APPROVED" : "DECLINED",
        declineReason,
        originalTransactionId: original.id,
      },
      idempotencyKey,
    );
  });
}

export async function getTransaction(id: string): Promise<Transaction> {
  const transaction = await transactionsRepository.findTransactionById(pool, id);
  if (!transaction) throw notFound("TRANSACTION_NOT_FOUND", "Transaction not found");
  return transaction;
}

export async function listTransactions(filter: TransactionFilter): Promise<Transaction[]> {
  return await transactionsRepository.listTransactions(pool, filter);
}

/** Stores the transaction; if approved, moves the money and writes the ledger entry. Same DB transaction. */
async function recordTransaction(
  client: PoolClient,
  draft: NewTransaction,
  idempotencyKey: string | undefined,
): Promise<Transaction> {
  const transaction = await transactionsRepository.insertTransaction(client, draft);
  if (transaction.status === "APPROVED") {
    const signedAmount = transaction.type === "CHARGE" ? -transaction.amount : transaction.amount;
    await adjustWalletBalance(client, transaction.walletId, signedAmount);
    await insertLedgerEntry(client, {
      walletId: transaction.walletId,
      transactionId: transaction.id,
      type: transaction.type,
      amount: signedAmount,
      currency: transaction.currency,
    });
  }
  if (idempotencyKey !== undefined) {
    await idempotencyRepository.attachTransactionToKey(client, transaction.type, idempotencyKey, transaction.id);
  }
  return transaction;
}

/** Returns the earlier transaction for a repeated key, or null if this request now owns the key. ADR-004. */
async function claimOrReplay(
  client: PoolClient,
  scope: IdempotencyScope,
  key: string | undefined,
  validatedInput: ChargeInput | RefundInput,
): Promise<Transaction | null> {
  if (key === undefined) return null;
  // Validated input has a fixed key order (schema order), so JSON.stringify is a stable fingerprint.
  const requestHash = createHash("sha256").update(JSON.stringify(validatedInput)).digest("hex");
  if (await idempotencyRepository.claimIdempotencyKey(client, scope, key, requestHash)) return null;

  const stored = await idempotencyRepository.findIdempotencyKey(client, scope, key);
  if (!stored) throw new Error("Idempotency key conflicted but no row was found");
  if (stored.requestHash !== requestHash) {
    throw new AppError(
      "IDEMPOTENCY_KEY_REUSED",
      409,
      "This Idempotency-Key was already used with a different request body",
    );
  }
  // A committed key row always has its transaction attached (same DB transaction).
  if (stored.transactionId === null) throw new Error("Idempotency key has no transaction attached");
  const transaction = await transactionsRepository.findTransactionById(client, stored.transactionId);
  if (!transaction) throw new Error("Idempotency key references a missing transaction");
  return transaction;
}
