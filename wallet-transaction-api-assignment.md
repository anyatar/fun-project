# Home Assignment: Wallet Transaction API

> **Note:** This is a reconstruction, not the official PayPlus brief. It was inferred from two public
> candidate solutions (`Utilski/payplus-wallet-transaction`, `danielkofefprojects/daniel-kofef-payplus`).
> The parts both solutions share are marked as core requirements. Parts only one solution has are
> marked **(bonus)**. Where the solutions disagree, the brief leaves it to you as an assumption.

---

## 1. Goal

Build a backend REST API for a simple payment wallet system. Merchants charge customer wallets and
can refund those charges. Every money movement must be correct, traceable and safe under concurrent
requests.

**Suggested time box:** 4–6 hours for the core. Add bonus items only after the core works.

## 2. Technical requirements

- **Node.js + TypeScript**
- Any web framework (Express, Fastify, Hapi, NestJS…)
- Any database that supports transactions (PostgreSQL, SQLite, MySQL…)
- Someone must be able to run it from a fresh clone by following your README
- No frontend needed

## 3. Entities

### Merchant
| Field | Type | Notes |
|---|---|---|
| `id` | string / int | |
| `name` | string | required |
| `status` | `ACTIVE` \| `INACTIVE` | default `ACTIVE` |
| `createdAt` | timestamp | |

### Wallet
| Field | Type | Notes |
|---|---|---|
| `id` | string / int | |
| `merchantId` | ref → Merchant | the merchant this wallet belongs to |
| `currency` | `ILS` \| `USD` \| `EUR` | |
| `balance` | money | must never be negative |
| `status` | `ACTIVE` \| `INACTIVE` | default `ACTIVE` |
| `createdAt` | timestamp | |

### Transaction
| Field | Type | Notes |
|---|---|---|
| `id` | string / int | |
| `type` | `CHARGE` \| `REFUND` | |
| `walletId` | ref → Wallet | |
| `merchantId` | ref → Merchant | |
| `amount` | money | positive |
| `currency` | `ILS` \| `USD` \| `EUR` | |
| `status` | `APPROVED` \| `DECLINED` | |
| `declineReason` | string \| null | set when declined |
| `originalTransactionId` | ref → Transaction \| null | required for refunds |
| `createdAt` | timestamp | |

### Ledger entry
| Field | Type | Notes |
|---|---|---|
| `id` | string / int | |
| `walletId` | ref → Wallet | |
| `transactionId` | ref → Transaction | |
| `type` | `CHARGE` \| `REFUND` | |
| `amount` | money | signed or with direction, your choice |
| `currency` | | |
| `createdAt` | timestamp | |

> **Money:** pick an exact representation. Floats (`0.1 + 0.2 !== 0.3`) are not acceptable for money.
> Use integer minor units (agorot / cents) or a `DECIMAL`/`NUMERIC` column.

## 4. Endpoints

All under `/api`. JSON in, JSON out.

### Merchants
```
POST   /merchants                 create
GET    /merchants                 list
GET    /merchants/:id             get one
PATCH  /merchants/:id/status      activate / deactivate
```

### Wallets
```
POST   /wallets                   create (merchantId, currency, optional initial balance)
GET    /wallets                   list
GET    /wallets/:id               get one (includes current balance)
PATCH  /wallets/:id/status        activate / deactivate
```

### Transactions
```
POST   /transactions/charge       { merchantId, walletId, amount, currency }
POST   /transactions/refund       { originalTransactionId, amount? }
GET    /transactions              list (filter by wallet / merchant is a plus)
GET    /transactions/:id          get one
```

### Ledger (bonus)
```
GET    /ledger                    list entries, read-only
```

## 5. Business rules

### Charge
1. The merchant and wallet must exist, otherwise `404`.
2. The merchant and wallet must both be `ACTIVE`, otherwise **declined**.
3. The wallet must belong to the merchant, otherwise **declined**.
4. The currency must match the wallet's currency, otherwise **declined**. *(Or convert it, if you choose
   to support conversion. State the rates and rounding as an assumption.)*
5. The wallet balance must be ≥ amount, otherwise **declined** (`INSUFFICIENT_FUNDS`).
6. On approval: debit the wallet, store an `APPROVED` transaction and write one ledger entry.

### Refund
1. The original transaction must exist, otherwise `404`.
2. The original must be an `APPROVED` `CHARGE`, otherwise **declined**.
3. The refund amount must be > 0 and must not exceed the amount still refundable on the original,
   otherwise **declined**.
   *(Decide whether partial or multiple refunds are allowed, and document it.)*
4. The merchant and wallet must still be `ACTIVE` *(your decision; document it)*.
5. On approval: credit the wallet, store an `APPROVED` refund linked to the original and write one
   ledger entry.

### General
- **Declined transactions are stored** with a `declineReason` and move no money. They do not create ledger entries.
- **Malformed input** (missing fields, negative/zero amount, unknown currency) returns `400` and stores nothing.
- **Atomicity:** the balance change, the transaction row and the ledger entry happen in one DB
  transaction. Either all are written or none are.
- **Concurrency:** two parallel charges must never overspend a wallet. Use a row lock (`SELECT … FOR UPDATE`),
  a conditional update (`UPDATE … SET balance = balance - $1 WHERE id = $2 AND balance >= $1`), or a DB
  `CHECK (balance >= 0)` constraint.
- **The ledger is append-only.** Entries are never updated or deleted.
- **Nothing is hard-deleted.** Merchants and wallets are deactivated, and their history stays readable.

## 6. Response and error format

Use one consistent error shape, for example:
```json
{ "error": { "code": "INSUFFICIENT_FUNDS", "message": "Wallet balance is lower than the charge amount" } }
```

Suggested status codes:
| Case | Status |
|---|---|
| Created / approved | `201` / `200` |
| Validation error | `400` |
| Entity not found | `404` |
| Business rule decline (stored as `DECLINED`) | `422` (or `200` with `status: DECLINED`; choose one and document it) |
| Idempotency key reused with a different body (bonus) | `409` |
| Unexpected error | `500`, without leaking internals |

## 7. Deliverables

1. A Git repository (public or shared link)
2. A `README.md` with:
   - how to install and run it from a fresh clone
   - how to run the tests
   - the project structure in a few lines
   - **your business assumptions** (currency handling, partial refunds, opening balance, status codes…)
   - what you would do with more time or for production
3. Tests: at least the core money paths (see section 9)
4. Example requests (curl, a Postman collection or an `.http` file)

## 8. Bonus (pick any)

- **Idempotency:** an `Idempotency-Key` header on charge and refund. The same key with the same body returns the
  original response. The same key with a different body returns `409`.
- `GET /ledger` with pagination, and a check that the sum of ledger entries matches the wallet balance
- Pagination on all list endpoints (offset or cursor), plus your reasoning for the choice
- Request validation with a schema library (zod, joi…), rejecting unknown fields
- Request logging with a request id, and sensitive fields redacted
- DB migrations instead of create-on-startup
- Docker / docker-compose for the database
- An integration test that fires N concurrent charges and proves the balance never goes negative
- Authentication: the merchant is taken from an API key, not from the request body
- OpenAPI / Swagger docs

## 9. Self-check scenarios

Your tests should prove these:

| # | Scenario | Expected |
|---|---|---|
| 1 | Charge 50 from a wallet with balance 100 | approved, balance 50, 1 ledger entry |
| 2 | Charge 150 from a wallet with balance 100 | declined `INSUFFICIENT_FUNDS`, balance unchanged, no ledger entry |
| 3 | Charge with the wrong currency | declined `CURRENCY_MISMATCH` (or converted, per your assumption) |
| 4 | Charge an inactive wallet | declined |
| 5 | Charge for an inactive merchant | declined |
| 6 | Charge another merchant's wallet | declined |
| 7 | Charge with amount `0`, `-5`, `"abc"` | `400`, nothing stored |
| 8 | Charge an unknown wallet id | `404`, nothing stored |
| 9 | Full refund of an approved charge | approved, balance restored |
| 10 | Two partial refunds of 30 + 20 on a charge of 50 | both approved |
| 11 | Refund of 60 on a charge of 50 | declined `REFUND_EXCEEDS_ORIGINAL` |
| 12 | Refund of a declined charge | declined |
| 13 | Refund of a refund | declined |
| 14 | 10 parallel charges of 20 on a wallet with balance 100 | exactly 5 approved, final balance 0 |
| 15 | `0.10` charged 3 times from `0.30` | balance exactly `0` |
| 16 | (bonus) Same `Idempotency-Key` sent twice | one transaction, same response |
| 17 | (bonus) Same key, different amount | `409` |

## 10. What reviewers likely look at

- **Correctness of money:** no floats, no negative balances, no lost updates under concurrency
- **Atomicity:** no half-written state if something throws mid-request
- **Clear assumptions:** they read your README before your code
- **Structure:** routes → controllers → services → DB, kept separate
- **Validation at the boundary** and a consistent error format
- **Tests** that cover the money rules, not just "it returns 200"
- **Scope judgement:** a small, solid core beats many half-done features
