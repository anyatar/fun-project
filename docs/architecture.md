# Architecture

## Architectural style
Start with a modular monolith organized by business capability. Split into independently deployed services only when ownership, scaling, reliability, or deployment requirements justify it.

## Request flow
```text
HTTP Client
   |
   v
Express middleware
   |-- request ID / logging context
   |-- security headers / CORS / rate limiting
   |-- JSON parsing
   |-- authentication
   |-- route-level authorization
   |-- input validation
   v
Router -> Controller -> Application Service / Use Case
                              |             |
                              v             v
                         Repository     External Client
                              |
                              v
                           Database
```

## Responsibilities
- **Routes:** map HTTP methods and paths to middleware/controllers.
- **Middleware:** cross-cutting HTTP concerns such as authentication, request context, rate limits, and error handling.
- **Controllers:** translate HTTP input into application calls and application results into HTTP responses.
- **Services/use cases:** implement business workflows and enforce business invariants.
- **Repositories:** own persistence queries and mapping between database records and application/domain types.
- **Clients:** isolate calls to external APIs, queues, object storage, and other infrastructure.
- **Domain:** business concepts and rules that should not depend on Express or a database SDK.

## Dependency direction
HTTP and infrastructure layers may depend on application/domain code. Domain logic must not import Express, database clients, or cloud SDKs.

## Transactions and side effects
- Put related database writes in one transaction when they must succeed or fail together.
- Do not hold a database transaction open while waiting on a slow external network call.
- For reliable database-plus-event publication, evaluate the transactional outbox pattern.
- Make retryable operations idempotent where duplicate delivery is possible.

## Architecture diagram updates
Update this document when adding a major component, integration, queue, datastore, or deployment boundary.
