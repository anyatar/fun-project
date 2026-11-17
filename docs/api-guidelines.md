# HTTP API Guidelines

## Base path and versioning
This service uses `/api` (the base path given by the assignment brief). Introduce `/api/v2` only for breaking contract changes. The concrete response and error contract is in `docs/overview.md`.

## Resource naming
- Use plural nouns: `/users`, `/orders`.
- Use path parameters for resource identity: `GET /users/:userId`.
- Use query parameters for filtering, sorting, and pagination.
- Use HTTP methods according to their semantics:
  - `GET`: read; no state-changing side effects.
  - `POST`: create or execute a non-idempotent command.
  - `PUT`: replace a resource or perform an idempotent update.
  - `PATCH`: partial update.
  - `DELETE`: remove or deactivate a resource.

## Status codes
- `200`: successful read/update/action with response body.
- `201`: resource created; include `Location` where useful.
- `202`: accepted for asynchronous processing.
- `204`: successful operation with no response body.
- `400`: malformed request or invalid input.
- `401`: missing/invalid authentication.
- `403`: authenticated but not authorized.
- `404`: resource does not exist or must not be disclosed.
- `409`: state conflict or duplicate resource.
- `422`: optional convention for semantically invalid input; choose consistently.
- `429`: rate limit exceeded.
- `500`: unexpected server error.
- `503`: temporarily unavailable dependency/service.

## Response shape
Choose and document one contract. Example:
```json
{
  "data": {
    "id": "usr_123",
    "email": "person@example.com"
  }
}
```

Error example:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid",
    "details": [
      { "field": "email", "issue": "Invalid email address" }
    ],
    "requestId": "req_abc"
  }
}
```

Do not expose stack traces or internal exception messages.

## Pagination
Prefer cursor pagination for large or frequently changing datasets. Offset pagination can be acceptable for small, stable datasets.

Example:
`GET /api/v1/users?limit=25&cursor=opaque-token`

Document:
- Default and maximum page size
- Stable sort order and tie-breaker
- Cursor format (opaque to clients)
- Whether total count is available

## Filtering and sorting
Allowlist supported filter and sort fields. Never interpolate client-provided column names or SQL fragments directly into queries.

## Idempotency
For operations where clients may retry (payments, job creation, external side effects), consider an `Idempotency-Key`. Define key scope, retention, payload mismatch behavior, and concurrent request behavior.

## OpenAPI
Maintain an OpenAPI specification for externally consumed APIs. Treat it as a contract and validate that implementation and docs remain aligned.
