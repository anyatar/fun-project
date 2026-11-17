# ADR-003: No authentication in this version

- Status: Accepted
- Date: 2026-11-17
- Owners: project owner

## Context
The assignment's charge contract takes `merchantId` from the request body. Project rules say client-supplied
identifiers must not be trusted for authorization.

## Decision
Ship without authentication, following the assignment's contract. The wallet-belongs-to-merchant check is a
business rule (a declined `WALLET_MERCHANT_MISMATCH`), not an authorization control.

## Alternatives considered
1. API key per merchant, merchant derived from the key — correct for production, but changes the request
   contract and adds key management.

## Consequences
### Negative / trade-offs
- Any caller can charge or refund on behalf of any merchant, and read all data. **Not production safe.**
- Idempotency keys are scoped per endpoint globally, not per merchant.

## Follow-up
- Production: API-key or OAuth client-credentials authentication, merchant taken from the credential,
  every query scoped to that merchant, idempotency keys scoped per merchant.
