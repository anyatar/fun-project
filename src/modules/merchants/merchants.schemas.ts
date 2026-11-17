import { z } from "zod";

export const createMerchantBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
});
