# ADR-002: Money as integer minor units

- Status: Accepted
- Date: 2026-11-17
- Owners: project owner

## Context
Floats cannot represent money exactly (`0.1 + 0.2 !== 0.3`).

## Decision
- All amounts and balances are integers in the currency's minor unit (agorot / cents), both in the API and
  in the database (`BIGINT`). `{"amount": 1050}` means 10.50.
- The API accepts only JSON integers: `> 0` for amounts, `>= 0` for an initial balance, and at most
  `Number.MAX_SAFE_INTEGER`. Strings such as `"50"` or decimals such as `10.5` are rejected with `400`.
- The `pg` driver is configured to parse `BIGINT` into a JS `number`, failing loudly if a value is outside the
  safe integer range (it cannot be, since a balance never exceeds its initial balance).

## Alternatives considered
1. Decimal strings (`"10.50"`) — readable but needs parsing/formatting on both sides.
2. JSON numbers in major units — pass through a float on the way in.

## Consequences
### Positive
- Exact arithmetic with plain integers; no decimal library.

### Negative / trade-offs
- Clients must convert to and from minor units. All supported currencies (ILS, USD, EUR) have 2 decimals.

## Follow-up
- A currency with a different exponent would need a per-currency exponent.
