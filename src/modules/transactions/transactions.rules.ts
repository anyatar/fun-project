// Pure business rules: no Express, no database. Order of checks is documented in docs/overview.md.
import type { Currency } from "../../shared/types/domain.js";
import type { Merchant } from "../merchants/merchants.types.js";
import type { Wallet } from "../wallets/wallets.types.js";
import type { DeclineReason, Transaction } from "./transactions.types.js";

type MerchantState = Pick<Merchant, "id" | "status">;
type WalletState = Pick<Wallet, "merchantId" | "currency" | "balance" | "status">;

export function evaluateCharge(params: {
  merchant: MerchantState;
  wallet: WalletState;
  amount: number;
  currency: Currency;
}): DeclineReason | null {
  const { merchant, wallet, amount, currency } = params;
  if (merchant.status !== "ACTIVE") return "MERCHANT_INACTIVE";
  if (wallet.status !== "ACTIVE") return "WALLET_INACTIVE";
  if (wallet.merchantId !== merchant.id) return "WALLET_MERCHANT_MISMATCH";
  if (currency !== wallet.currency) return "CURRENCY_MISMATCH";
  if (wallet.balance < amount) return "INSUFFICIENT_FUNDS";
  return null;
}

/**
 * Omitted amount = whatever is still refundable. If nothing remains, the request is treated as a
 * full refund of the original amount, which is then declined REFUND_EXCEEDS_ORIGINAL.
 */
export function resolveRefundAmount(
  requested: number | undefined,
  original: Pick<Transaction, "amount">,
  alreadyRefunded: number,
): number {
  if (requested !== undefined) return requested;
  const remaining = original.amount - alreadyRefunded;
  return remaining > 0 ? remaining : original.amount;
}

export function evaluateRefund(params: {
  original: Pick<Transaction, "type" | "status" | "amount">;
  alreadyRefunded: number;
  amount: number;
  merchant: Pick<Merchant, "status">;
  wallet: Pick<Wallet, "status">;
}): DeclineReason | null {
  const { original, alreadyRefunded, amount, merchant, wallet } = params;
  if (original.type !== "CHARGE") return "ORIGINAL_NOT_CHARGE";
  if (original.status !== "APPROVED") return "ORIGINAL_NOT_APPROVED";
  if (amount > original.amount - alreadyRefunded) return "REFUND_EXCEEDS_ORIGINAL";
  if (merchant.status !== "ACTIVE") return "MERCHANT_INACTIVE";
  if (wallet.status !== "ACTIVE") return "WALLET_INACTIVE";
  return null;
}
