import type { ErrorRequestHandler } from "express";
import { AppError } from "../shared/errors/app-error.js";
import { getRequestId } from "./request-id.js";

/** Errors raised by express.json() carry a `type` such as "entity.parse.failed". */
function bodyParserErrorType(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "type" in error && typeof error.type === "string") {
    return error.type;
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const requestId = getRequestId(res);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId,
      },
    });
    return;
  }

  const parserErrorType = bodyParserErrorType(error);
  if (parserErrorType === "entity.parse.failed") {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON", requestId } });
    return;
  }
  if (parserErrorType === "entity.too.large") {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large", requestId } });
    return;
  }

  // Internal log only: never sent to the client.
  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      message: error instanceof Error ? error.message : "Non-Error value thrown",
      stack: error instanceof Error ? error.stack : undefined,
    }),
  );
  res.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred", requestId },
  });
};
