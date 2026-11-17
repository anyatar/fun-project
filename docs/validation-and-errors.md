# Validation and Error Handling

## Validate at the boundary
Validate route params, query parameters, request body, and relevant headers before business logic runs. Use a schema validator (for example, Zod, Joi, or Ajv) and infer or derive TypeScript types from schemas where practical.

Validation must include:
- Required fields and types
- String length and format
- Numeric bounds
- Enum/allowlisted values
- Nested object shape
- Array size and item constraints
- Unknown-field policy (reject, strip, or allow explicitly)

TypeScript types do not validate runtime HTTP input.

## Error model
Use typed application errors with stable machine-readable codes. Separate expected errors (not found, conflict, validation, forbidden) from unexpected failures.

Example:
```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
```

## Express error middleware
Register the error handler after routes and the 404 handler. Express error middleware has four parameters. In Express 5, rejected promises from async route handlers are forwarded to error handling automatically.

```ts
import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Map known application errors to safe public responses.
  // Log unexpected errors with requestId and internal details.
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
```

The snippet is a skeleton: add explicit mapping for your application's error classes and validation library.

## Rules
- Do not return raw database or provider errors.
- Do not swallow errors or return success-shaped fallback values.
- Do not log secrets or full sensitive request bodies.
- Include a request/correlation ID in logs and, where useful, error responses.
- If headers have already been sent, delegate to Express's default error handling with `next(err)`.
