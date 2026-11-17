import type { Currency } from "../../shared/types/domain.js";

export type TransactionType = "CHARGE" | "REFUND";
export type TransactionStatus = "APPROVED" | "DECLINED";

export const DECLINE_MESSAGES = {
  MERCHANT_INACTIVE: "Merchant is not active",
  WALLET_INACTIVE: "Wallet is not active",
  WALLET_MERCHANT_MISMATCH: "Wallet does not belong to the merchant",
  CURRENCY_MISMATCH: "Currency does not match the wallet currency",
  INSUFFICIENT_FUNDS: "Wallet balance is lower than the charge amount",
  ORIGINAL_NOT_CHARGE: "Only a charge can be refunded",
  ORIGINAL_NOT_APPROVED: "Only an approved charge can be refunded",
  REFUND_EXCEEDS_ORIGINAL: "Refund amount exceeds the amount still refundable on the original charge",
} as const;

export type DeclineReason = keyof typeof DECLINE_MESSAGES;

/** Amounts are integer minor units. */
export interface Transaction {
  id: string;
  type: TransactionType;
  walletId: string;
  merchantId: string;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  declineReason: DeclineReason | null;
  originalTransactionId: string | null;
  createdAt: Date;
}

export type NewTransaction = Omit<Transaction, "id" | "createdAt">;
