import { z } from "zod";
import { CURRENCIES } from "../../shared/types/domain.js";

export const createWalletBodySchema = z.strictObject({
  merchantId: z.uuid(),
  currency: z.enum(CURRENCIES),
  /** Integer minor units, default 0. */
  initialBalance: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
});
