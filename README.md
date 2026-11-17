# Wallet Transaction API

A REST API where merchants charge wallets and refund those charges. Money is exact (integer minor units),
every money movement is atomic and recorded in an append-only ledger, and parallel charges cannot overspend
a wallet.

Built with Node.js, TypeScript, Express 5, PostgreSQL 17 (`pg`, plain SQL) and Zod. Tests use Vitest +
Supertest against a real Postgres.

## Run it from a fresh clone

Requirements: Node.js ≥ 22.12, Docker (for Postgres).

```bash
npm ci
cp .env.example .env            # local-only credentials matching docker-compose.yml
docker compose up -d --wait     # Postgres on localhost:5432 (creates `wallet` and `wallet_test`)
npm run db:migrate              # applies migrations/*.sql to the `wallet` database
npm run dev                     # http://localhost:3000/api  (or: npm run build && npm start)
```

Example requests: [`requests.http`](requests.http).

## Tests and checks

```bash
npm test          # unit + integration tests (needs the Postgres container; migrates wallet_test itself)
npm run typecheck
npm run lint
npm run build
```

Integration tests **truncate every table** in the test database (`wallet_test`, or `TEST_DATABASE_URL`).
Never point them at a database with real data.

## API

All under `/api`. JSON in, JSON out. Success: `{ "data": … }`.
Error: `{ "error": { "code", "message", "details"?, "requestId", "transactionId"? } }`.

| Method | Path | Notes |
|---|---|---|
| POST | `/merchants` | `{ name }` → 201 |
| GET | `/merchants`, `/merchants/:id` | |
| PATCH | `/merchants/:id/status` | `{ status: "ACTIVE" \| "INACTIVE" }` |
| POST | `/wallets` | `{ merchantId, currency, initialBalance? }` → 201 |
| GET | `/wallets`, `/wallets/:id` | includes `balance` |
| PATCH | `/wallets/:id/status` | `{ status }` |
| POST | `/transactions/charge` | `{ merchantId, walletId, amount, currency }`, optional `Idempotency-Key` header |
| POST | `/transactions/refund` | `{ originalTransactionId, amount? }`, optional `Idempotency-Key` header |
| GET | `/transactions?walletId=&merchantId=` | both filters optional |
| GET | `/transactions/:id` | |

| Case | Status | `error.code` |
|---|---|---|
| Approved charge / refund | 201 | — |
| Declined (stored, no money moved) | 422 | the decline reason, plus `error.transactionId` |
| Invalid input / unknown field | 400 | `VALIDATION_ERROR`, `INVALID_JSON` |
| Unknown merchant / wallet / transaction | 404 | `MERCHANT_NOT_FOUND`, `WALLET_NOT_FOUND`, `TRANSACTION_NOT_FOUND` |
| Idempotency key reused with a different body | 409 | `IDEMPOTENCY_KEY_REUSED` |
| Unexpected error | 500 | `INTERNAL_SERVER_ERROR` (no internals) |

Decline reasons: `MERCHANT_INACTIVE`, `WALLET_INACTIVE`, `WALLET_MERCHANT_MISMATCH`, `CURRENCY_MISMATCH`,
`INSUFFICIENT_FUNDS`, `ORIGINAL_NOT_CHARGE`, `ORIGINAL_NOT_APPROVED`, `REFUND_EXCEEDS_ORIGINAL`.

## Business assumptions

Full list and rule order: [`docs/overview.md`](docs/overview.md). The main ones:

- **Money** is an integer in minor units (agorot / cents) everywhere: `"amount": 1050` = 10.50. Decimals and
  strings are rejected with 400. ([ADR-002](docs/decisions/ADR-002-money-as-integer-minor-units.md))
- **Currency** must match the wallet's currency, otherwise declined `CURRENCY_MISMATCH`. No conversion.
- **Opening balance:** `initialBalance` (default 0) is set when the wallet is created and stored on the
  wallet. It has no ledger entry, so the reconciliation rule is
  `initialBalance + sum(ledger amounts) = balance`. Ledger amounts are signed (charge −, refund +).
- **Refunds:** partial and multiple refunds are allowed up to the original amount. Omitting `amount` refunds
  what remains. A refund takes its wallet, merchant and currency from the original charge.
  It is declined if the merchant or wallet is now inactive.
- **Declines** return 422 and are stored as `DECLINED` with a reason. They move no money and write no ledger entry.
  When several rules fail, the first in the documented order wins.
- **Deactivation** is allowed with money in the wallet. Deactivating a merchant does not deactivate its wallets.
  Nothing is ever hard-deleted, and the ledger rejects `UPDATE`/`DELETE` with a DB trigger.
- **Idempotency:** the same `Idempotency-Key` + same body replays the original result; a different body → 409.
  Keys are scoped per endpoint, never expire, and are not stored when the request fails with 400/404/500.
  ([ADR-004](docs/decisions/ADR-004-idempotency-keys.md))
- **No authentication.** `merchantId` comes from the request body as the brief specifies. Any caller can act
  as any merchant. ([ADR-003](docs/decisions/ADR-003-no-authentication.md))
- **Request ID:** `X-Request-Id` is accepted if it matches `[A-Za-z0-9_-]{1,128}`, otherwise generated.
  It is returned as a response header and in error bodies.

## Correctness under concurrency

Each charge or refund runs in one DB transaction ([ADR-001](docs/decisions/ADR-001-postgresql-and-plain-sql.md)):

1. Claim the idempotency key, if sent (`INSERT … ON CONFLICT DO NOTHING`).
2. Lock rows in a fixed order: original charge (refunds only) `FOR UPDATE` → merchant `FOR SHARE` →
   wallet `FOR UPDATE`.
3. Evaluate the rules (pure functions in `transactions.rules.ts`).
4. Insert the transaction. If approved, update the balance and append the ledger entry.

`CHECK (balance >= 0)` is a backstop if a code path ever skips the check. Tests fire 10 parallel charges of 20
against a balance of 100 (exactly 5 approved), parallel refunds of one charge, and parallel requests with one
idempotency key.

## Project structure

```text
src/
  app.ts, server.ts           Express composition / process entry (graceful shutdown)
  config/env.ts               validated environment
  middleware/                 request id, 404, central error handler
  modules/<feature>/          routes → controller → service → repository (+ schemas, types)
    transactions/             charge/refund service, pure rules, ledger + idempotency repositories
  infrastructure/database/    pg pool, withTransaction, migration runner
  shared/                     AppError, input validation helpers, domain enums
migrations/                   versioned SQL
tests/unit, tests/integration
docs/                         overview (business rules), conventions, ADRs in docs/decisions/
```

## With more time / for production

- Authentication (API key or OAuth client credentials). Take the merchant from the credential and scope every
  query and idempotency key to it.
- Cursor pagination on the list endpoints, which are currently unbounded. Also a `GET /ledger` endpoint
  and a scheduled reconciliation job.
- Expire idempotency keys (for example after 24h) with a cleanup job.
- Structured logger (pino) with redaction, metrics, tracing, `/health/live` and `/health/ready`.
- Helmet, rate limiting, an OpenAPI spec, a Dockerfile for the API, and CI running lint, typecheck, tests and build.
- Retry on serialization failures and deadlocks if isolation is raised or lock patterns change.
- A deposit/top-up flow with its own ledger type, instead of the opening balance.

## Known issues

- `npm audit` reports a high-severity ReDoS in `picomatch`, which only the dev tools (eslint, vitest) pull in.
  Runtime dependencies have no reported vulnerabilities.
