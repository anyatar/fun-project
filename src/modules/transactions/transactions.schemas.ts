import { z } from "zod";
import { positiveAmountSchema } from "../../shared/http/validation.js";
import { CURRENCIES } from "../../shared/types/domain.js";

export const chargeBodySchema = z.strictObject({
  merchantId: z.uuid(),
  walletId: z.uuid(),
  amount: positiveAmountSchema,
  currency: z.enum(CURRENCIES),
});

export const refundBodySchema = z.strictObject({
  originalTransactionId: z.uuid(),
  amount: positiveAmountSchema.optional(),
});

export const idempotencyHeadersSchema = z.object({
  "Idempotency-Key": z
    .string()
    .min(1)
    .max(255)
    .regex(/^[\x21-\x7E]+$/, "Must be visible ASCII characters")
    .optional(),
});

export const listTransactionsQuerySchema = z.strictObject({
  walletId: z.uuid().optional(),
  merchantId: z.uuid().optional(),
});
