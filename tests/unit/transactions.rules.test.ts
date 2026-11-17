import { describe, expect, it } from "vitest";
import { evaluateCharge, evaluateRefund, resolveRefundAmount } from "../../src/modules/transactions/transactions.rules.js";

const merchant = { id: "m1", status: "ACTIVE" as const };
const wallet = { merchantId: "m1", currency: "ILS" as const, balance: 100, status: "ACTIVE" as const };

describe("evaluateCharge", () => {
  it("approves when every rule passes, including spending the exact balance", () => {
    expect(evaluateCharge({ merchant, wallet, amount: 100, currency: "ILS" })).toBeNull();
  });

  it.each([
    ["MERCHANT_INACTIVE", { merchant: { ...merchant, status: "INACTIVE" as const } }],
    ["WALLET_INACTIVE", { wallet: { ...wallet, status: "INACTIVE" as const } }],
    ["WALLET_MERCHANT_MISMATCH", { wallet: { ...wallet, merchantId: "m2" } }],
    ["CURRENCY_MISMATCH", { currency: "USD" as const }],
    ["INSUFFICIENT_FUNDS", { amount: 101 }],
  ])("declines %s", (reason, override) => {
    expect(evaluateCharge({ merchant, wallet, amount: 50, currency: "ILS", ...override })).toBe(reason);
  });

  it("reports the first failing rule when several fail", () => {
    const result = evaluateCharge({
      merchant: { ...merchant, status: "INACTIVE" },
      wallet: { ...wallet, status: "INACTIVE", balance: 0 },
      amount: 50,
      currency: "USD",
    });
    expect(result).toBe("MERCHANT_INACTIVE");
  });
});

describe("evaluateRefund", () => {
  const original = { type: "CHARGE" as const, status: "APPROVED" as const, amount: 50 };
  const active = { status: "ACTIVE" as const };
  const base = { original, alreadyRefunded: 0, amount: 50, merchant: active, wallet: active };

  it("approves a refund up to the remaining amount", () => {
    expect(evaluateRefund({ ...base, alreadyRefunded: 30, amount: 20 })).toBeNull();
  });

  it.each([
    ["ORIGINAL_NOT_CHARGE", { original: { ...original, type: "REFUND" as const } }],
    ["ORIGINAL_NOT_APPROVED", { original: { ...original, status: "DECLINED" as const } }],
    ["REFUND_EXCEEDS_ORIGINAL", { amount: 51 }],
    ["REFUND_EXCEEDS_ORIGINAL", { alreadyRefunded: 30, amount: 21 }],
    ["MERCHANT_INACTIVE", { merchant: { status: "INACTIVE" as const } }],
    ["WALLET_INACTIVE", { wallet: { status: "INACTIVE" as const } }],
  ])("declines %s", (reason, override) => {
    expect(evaluateRefund({ ...base, ...override })).toBe(reason);
  });
});

describe("resolveRefundAmount", () => {
  it("uses the requested amount when given", () => {
    expect(resolveRefundAmount(10, { amount: 50 }, 30)).toBe(10);
  });
  it("defaults to the remaining refundable amount", () => {
    expect(resolveRefundAmount(undefined, { amount: 50 }, 30)).toBe(20);
  });
  it("falls back to the full original amount when nothing remains", () => {
    expect(resolveRefundAmount(undefined, { amount: 50 }, 50)).toBe(50);
  });
});
