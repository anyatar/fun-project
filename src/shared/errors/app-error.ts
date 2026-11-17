/** An expected error with a stable public code. Anything else is mapped to 500. */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: unknown;

  constructor(code: string, statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFound(code: string, message: string): AppError {
  return new AppError(code, 404, message);
}
