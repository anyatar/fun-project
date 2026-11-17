# ADR-004: Idempotency-Key on charge and refund

- Status: Accepted
- Date: 2026-11-17
- Owners: project owner

## Context
Payment clients retry on timeouts. A retried charge must not move money twice.

## Decision
- Optional `Idempotency-Key` header on `POST /api/transactions/charge` and `/refund`
  (1–255 visible ASCII characters).
- Table `idempotency_keys (scope, key, request_hash, transaction_id)`, primary key `(scope, key)`, where
  scope is `CHARGE` or `REFUND`. `request_hash` is SHA-256 of the validated request body.
- Inside the same DB transaction as the money movement, the service first runs
  `INSERT … ON CONFLICT DO NOTHING`:
  - Inserted → the key is claimed; process normally and store the resulting `transaction_id`.
  - Conflict, same hash → replay: return the stored transaction, so the response is the same
    (`201` approved or `422` declined). Only `requestId` differs.
  - Conflict, different hash → `409 IDEMPOTENCY_KEY_REUSED`.
- Concurrent requests with the same key: the second `INSERT` waits on the first transaction's uncommitted row,
  then sees the conflict (replay) or, if the first rolled back, claims the key itself.
- Requests that fail with `400` / `404` / `500` roll back, so their key is not stored and may be retried.
- Keys never expire in this version.

## Alternatives considered
1. Store the raw HTTP response — couples the service to HTTP; replaying from the immutable transaction is
   equivalent.
2. Separate "in progress" state and `409` for concurrent duplicates — more states, worse client experience.

## Consequences
### Negative / trade-offs
- The table grows without bound (production: expire keys after e.g. 24h with a cleanup job).
- No authentication, so key scope is global per endpoint (see ADR-003).
