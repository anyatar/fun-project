import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { ENTITY_STATUSES } from "../types/domain.js";

export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    throw new AppError("VALIDATION_ERROR", 400, "The request is invalid", details);
  }
  return result.data;
}

export const idParamsSchema = z.strictObject({ id: z.uuid() });

export const statusBodySchema = z.strictObject({ status: z.enum(ENTITY_STATUSES) });

/** Integer minor units (agorot / cents). See docs/decisions/ADR-002. */
export const positiveAmountSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
