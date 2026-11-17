import { randomUUID } from "node:crypto";
import type { RequestHandler, Response } from "express";

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{1,128}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get("X-Request-Id");
  const id = incoming !== undefined && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
};

export function getRequestId(res: Response): string | undefined {
  const value: unknown = res.locals.requestId;
  return typeof value === "string" ? value : undefined;
}
