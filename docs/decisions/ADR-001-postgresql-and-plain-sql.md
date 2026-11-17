# ADR-001: PostgreSQL with plain SQL (`pg`) and SQL migrations

- Status: Accepted
- Date: 2026-11-17
- Owners: project owner

## Context
Every money movement must be atomic and safe under concurrent requests (two parallel charges must never
overspend a wallet). The project must run from a fresh clone.

## Decision
- PostgreSQL 17, run locally with `docker-compose.yml`. A second database `wallet_test` is created by an
  init script for automated tests.
- Data access with the `pg` driver and hand-written, parameterized SQL inside `*.repository.ts` files.
- Schema changes are versioned `.sql` files in `migrations/`, applied by a small runner
  (`npm run db:migrate`) that records applied files in `schema_migrations` and holds an advisory lock.
- Concurrency: charges lock the wallet row with `SELECT … FOR UPDATE` (and the merchant row `FOR SHARE`);
  refunds additionally lock the original charge row first. `CHECK (balance >= 0)` is a backstop.

## Alternatives considered
1. SQLite — zero install, but single-writer and no row locks, so the concurrency test proves little.
2. Query builder (Kysely) — typed queries, one more dependency.
3. ORM (Prisma/Drizzle) — row locks and conditional updates are awkward to express.

## Consequences
### Positive
- Locking and transaction boundaries are explicit and reviewable.
- Few runtime dependencies.

### Negative / trade-offs
- Row types are declared by hand; the compiler cannot check SQL against the schema.
- Docker is required to run locally.

### Operational impact
- Lock order is merchant → wallet (and original charge → merchant → wallet for refunds) to avoid deadlocks.

## Follow-up
- Tests cover the concurrent-charge scenario against a real database.
