# Product and Service Overview

## Purpose
A REST API for a simple payment wallet system. Merchants charge wallets and refund those charges. Every money
movement is exact (integer minor units), atomic, traceable through an append-only ledger, and safe under
concurrent requests. Source brief: `wallet-transaction-api-assignment.md`.

## Non-goals (this version)
- Authentication / authorization (see ADR-003).
- Currency conversion, top-ups/deposits, pagination, a ledger read endpoint, OpenAPI.

## Actors
- API caller acting for a merchant (unauthenticated in this version).

## Decisions and business assumptions
| Topic | Decision |
|---|---|
| Database | PostgreSQL, plain SQL via `pg`, SQL migrations (ADR-001) |
| Money | Integer minor units in API and DB (ADR-002) |
| Base path | `/api` (from the brief) |
| Success shape | `{ "data": … }` |
| Error shape | `{ "error": { "code", "message", "details"?, "requestId", "transactionId"? } }` |
| Approved charge/refund | `201` with the transaction |
| Declined charge/refund | `422`, `error.code` = decline reason, `error.transactionId` = the stored declined transaction |
| Currency | Must equal the wallet currency, otherwise declined `CURRENCY_MISMATCH`; no conversion |
| Opening balance | `initialBalance` on wallet creation (default 0), stored on the wallet; no ledger entry. Invariant: `initialBalance + sum(ledger.amount) = balance` |
| Ledger amount | Signed: charge negative, refund positive |
| Partial / multiple refunds | Allowed while the total approved refunds ≤ the original charge amount |
| Refund without `amount` | Refunds the remaining refundable amount; if nothing remains, it is treated as a request for the full original amount and declined `REFUND_EXCEEDS_ORIGINAL` |
| Refund on inactive merchant/wallet | Declined |
| Deactivation | Allowed with a non-zero balance; deactivating a merchant does not cascade to its wallets |
| Wallet for inactive merchant | Creation is allowed (charges are declined anyway) |
| Status PATCH to the current status | `200`, no change |
| Idempotency | Optional `Idempotency-Key` on charge and refund (ADR-004) |
| Authentication | None (ADR-003) |
| Request ID | `X-Request-Id` accepted if `[A-Za-z0-9_-]{1,128}`, otherwise generated; echoed in the response header and error bodies |

## Charge rules (evaluated in this order)
1. Merchant exists, else `404 MERCHANT_NOT_FOUND`; wallet exists, else `404 WALLET_NOT_FOUND`. Nothing stored.
2. Merchant `ACTIVE`, else declined `MERCHANT_INACTIVE`.
3. Wallet `ACTIVE`, else declined `WALLET_INACTIVE`.
4. Wallet belongs to the merchant, else declined `WALLET_MERCHANT_MISMATCH`.
5. Currency equals the wallet currency, else declined `CURRENCY_MISMATCH`.
6. Balance ≥ amount, else declined `INSUFFICIENT_FUNDS`.
7. Approved: debit the wallet, store the transaction, write one ledger entry — in one DB transaction.

The first failing rule sets the decline reason. A declined charge stores the merchant and wallet from the request.

## Refund rules (evaluated in this order)
1. Original transaction exists, else `404 TRANSACTION_NOT_FOUND`. Nothing stored.
2. Original is a `CHARGE`, else declined `ORIGINAL_NOT_CHARGE`.
3. Original is `APPROVED`, else declined `ORIGINAL_NOT_APPROVED`.
4. Amount ≤ original amount − approved refunds so far, else declined `REFUND_EXCEEDS_ORIGINAL`.
5. Merchant `ACTIVE`, else `MERCHANT_INACTIVE`; wallet `ACTIVE`, else `WALLET_INACTIVE`.
6. Approved: credit the wallet, store the refund linked to the original, write one ledger entry.

A refund takes its wallet, merchant and currency from the original transaction.

## General
- Malformed input (missing/unknown fields, non-integer or non-positive amount, unknown currency, malformed id) → `400 VALIDATION_ERROR`, nothing stored.
- Declined transactions are stored, move no money and have no ledger entry.
- The ledger is append-only (enforced by a DB trigger). Nothing is hard-deleted.

## Non-functional requirements
Availability, latency and scale targets: TBD (not specified by the brief).
