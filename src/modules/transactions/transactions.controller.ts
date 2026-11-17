import type { Request, Response } from "express";
import { getRequestId } from "../../middleware/request-id.js";
import { idParamsSchema, parseInput } from "../../shared/http/validation.js";
import {
  chargeBodySchema,
  idempotencyHeadersSchema,
  listTransactionsQuerySchema,
  refundBodySchema,
} from "./transactions.schemas.js";
import * as transactionsService from "./transactions.service.js";
import { DECLINE_MESSAGES } from "./transactions.types.js";
import type { Transaction } from "./transactions.types.js";

function readIdempotencyKey(req: Request): string | undefined {
  return parseInput(idempotencyHeadersSchema, { "Idempotency-Key": req.get("Idempotency-Key") })["Idempotency-Key"];
}

/** Approved → 201 with the transaction. Declined (stored) → 422 with the decline reason as error code. */
function sendOutcome(res: Response, transaction: Transaction): void {
  if (transaction.status === "APPROVED") {
    res.status(201).json({ data: transaction });
    return;
  }
  if (transaction.declineReason === null) throw new Error("Declined transaction without a decline reason");
  res.status(422).json({
    error: {
      code: transaction.declineReason,
      message: DECLINE_MESSAGES[transaction.declineReason],
      transactionId: transaction.id,
      requestId: getRequestId(res),
    },
  });
}

export async function charge(req: Request, res: Response): Promise<void> {
  const idempotencyKey = readIdempotencyKey(req);
  const body = parseInput(chargeBodySchema, req.body);
  sendOutcome(res, await transactionsService.charge(body, idempotencyKey));
}

export async function refund(req: Request, res: Response): Promise<void> {
  const idempotencyKey = readIdempotencyKey(req);
  const body = parseInput(refundBodySchema, req.body);
  sendOutcome(res, await transactionsService.refund(body, idempotencyKey));
}

export async function listTransactions(req: Request, res: Response): Promise<void> {
  const filter = parseInput(listTransactionsQuerySchema, req.query);
  res.json({ data: await transactionsService.listTransactions(filter) });
}

export async function getTransaction(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(idParamsSchema, req.params);
  res.json({ data: await transactionsService.getTransaction(id) });
}
