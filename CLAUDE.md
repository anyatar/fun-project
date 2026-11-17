# Claude Code Instructions

## Project context

This repository is a Node.js backend built with Express 5 and TypeScript. It exposes HTTP APIs and should be designed as a maintainable, testable service. Read `README.md` and the relevant files under `docs/` before making architectural changes.

## How to work

1. Inspect the existing repository and identify its conventions before editing.
2. For non-trivial work, summarize the requirement, inspect related code, and propose a short implementation plan before changing files.
3. Implement in small, reviewable steps. Avoid unrelated refactors.
4. Add or update tests for behavior changes and bug fixes.
5. Run the relevant tests, type-check, lint, and build commands. Report exactly what ran and whether it passed.
6. Do not claim that code was tested if commands were not run.
7. If requirements are ambiguous or a decision affects architecture, security, data integrity, or public API behavior, ask before choosing.

## Architecture rules

- Keep HTTP concerns in routes/controllers and business rules in services/use-cases.
- Keep persistence and external-system access behind repository/client modules.
- Controllers should be thin: parse validated input, call a service, map the result to an HTTP response.
- Do not put SQL, business rules, or provider-specific SDK calls in route handlers.
- Avoid circular dependencies. Dependencies should point inward toward domain/application logic.
- Prefer a modular monolith unless there is a documented reason to introduce a separate service.
- Do not introduce abstractions or layers that do not solve a current problem.

## TypeScript rules

- Keep TypeScript strict. Avoid `any`; use `unknown` and narrow it.
- Prefer explicit domain types and small interfaces at module boundaries.
- Use `import type` for type-only imports where appropriate.
- Handle nullable values and errors explicitly.
- Do not use type assertions to silence errors unless the runtime invariant is established and documented.
- Prefer `async`/`await` and return awaited work from async functions.

## Express rules

- Use Express 5 conventions.
- Register middleware in a deliberate order: security and request setup, parsers, request context/logging, routes, 404 handler, then error handler.
- Validate all untrusted input at the boundary (params, query, body, headers).
- Do not trust client-supplied tenant/user identifiers for authorization decisions.
- Use centralized error handling and a consistent JSON response shape.
- Never send stack traces, secrets, SQL, or internal implementation details to clients.
- Do not call `next()` after sending a response.
- Keep controllers and middleware typed; extend Express request types only when there is a clear shared need.

## Security and data

- Apply authentication and authorization separately.
- Enforce ownership/tenant scoping in the service/repository query, not only in the UI or route.
- Use parameterized database queries and transactions for multi-step writes.
- Never commit secrets or real credentials. Use environment variables or a secret manager.
- Redact tokens, passwords, personal data, and sensitive payloads from logs.
- Use least privilege for database and cloud credentials.

## Quality

- Add unit tests for business logic and integration tests for HTTP/database behavior where appropriate.
- Test success, validation failure, unauthorized/forbidden, not-found, conflict, and unexpected-error paths.
- Keep functions focused and names descriptive.
- Avoid unnecessary dependencies; explain why a new dependency is needed.
- Update documentation when API contracts, configuration, architecture, or operational behavior changes.

## Decision-making and clarification protocol

### Core principle

Do not silently make product, business-logic, API-contract, data-model, or significant architecture decisions. Act as a senior engineering partner: investigate, explain options and trade-offs, ask the user, and wait for an explicit decision before implementing.

### When you must ask first

Pause and ask clarifying questions before proceeding whenever a requirement leaves meaningful ambiguity about:

- Business rules, workflows, edge cases, permissions, or expected behavior.
- Data entities, relationships, ownership, lifecycle, deletion, or retention.
- API shape, endpoint semantics, response format, status codes, pagination, filtering, or compatibility.
- Authentication, authorization, roles, tenant boundaries, or security policy.
- Database choice, schema design, consistency, transactions, concurrency, or migrations.
- Architecture boundaries, module responsibilities, queues, events, external services, or synchronous vs asynchronous processing.
- Reliability, retries, idempotency, ordering, failure handling, or recovery behavior.
- Performance, scalability, availability, cost, or operational trade-offs.
- Any irreversible or expensive-to-change decision.

### Required decision workflow

1. **Understand:** Restate the requirement and identify what is known, assumed, and missing.
2. **Inspect:** For an existing codebase, inspect relevant code, docs, tests, and established patterns before asking questions. Do not ask the user to repeat information already documented.
3. **Identify decisions:** List only the unresolved decisions that materially affect the design or implementation.
4. **Explain options:** For each important decision, provide a small number of viable options (normally 2–3), with concise pros, cons, and consequences. Include your recommendation and why.
5. **Ask:** Ask focused questions in plain language. Group related questions into one short decision checklist when that is easier to answer. Make it clear which choices are required and which can safely use a default.
6. **Wait:** Do not implement the affected design or make files changes until the user answers or explicitly authorizes you to choose.
7. **Record:** After the user decides, summarize the agreed decisions and update the relevant documentation (and an ADR for significant architectural choices) before or alongside implementation.
8. **Implement:** Implement incrementally according to the approved decisions. If new ambiguity or a conflicting requirement appears, pause and ask again.

### Do not

- Do not interpret silence as approval.
- Do not treat your preferred option as the user's decision.
- Do not invent business requirements or edge-case behavior.
- Do not choose a database, ORM, authentication provider, cloud service, queue, caching strategy, or deployment model merely because it is common.
- Do not add dependencies or infrastructure without explaining why they are needed.
- Do not ask questions whose answers are already explicit in the request, repository, or approved documentation.
- Do not block on trivial implementation details that have a safe, reversible, conventional default.

### Safe defaults

You may make small, reversible implementation choices that do not change product behavior or public contracts. State noteworthy assumptions briefly. Examples include local variable names, private helper organization, and formatting consistent with the repository.

If a choice is low-risk but not specified, use the simplest conventional option, document the assumption when relevant, and continue. If the choice changes observable behavior or is expensive to reverse, ask first.

### Question format

Prefer concise questions like:

> I found two reasonable ways to handle this. Which behavior do you want?
>
> **Option A — Soft delete:** retain the record with `deleted_at`; it can be restored and remains auditable.
>
> **Option B — Hard delete:** permanently remove the record; simpler, but recovery and audit history are limited.
>
> **Recommendation:** Option A if records need auditability or restoration. I will wait for your choice before implementing deletion.

For a larger feature, first provide:

- Requirements understood
- Open questions / decisions
- Recommended options and trade-offs
- Proposed implementation plan (not yet executed)

### Explicit authorization

If the user says "make the decision", "use your best judgment", or otherwise explicitly delegates a decision, choose a sensible option, explain the choice and trade-offs, and record it. Delegation for one decision does not automatically authorize unrelated decisions.

## Task Workflow

Whenever the user provides a new task definition or feature request, follow this workflow:

### Step 1 — Requirements analysis

- Read the complete task definition.
- Summarize requirements and identify missing information.
- Identify business rules, entities, workflows, and edge cases.

### Step 2 — Clarification

- Ask the user about important unresolved business and technical decisions.
- Present options, trade-offs, and recommendations.
- Never silently decide important business logic or architecture.
- Wait for answers before proceeding with dependent decisions.

### Step 3 — Technical design

- Prepare architecture, database schema, ERD, API contracts, and workflow diagrams where relevant.
- Explain important design trade-offs.
- Identify assumptions and remaining open questions.

### Step 4 — Approval

- Present the complete design and implementation plan.
- Wait for explicit user approval before changing application code.

### Step 5 — Implementation

- Implement incrementally according to the approved plan.
- Add tests for every meaningful behavior.
- Run relevant tests, typecheck, lint, and build.
- Report actual results.

### Step 6 — Documentation and completion

- Update relevant project documentation.
- Create a feature summary under `docs/feature-summaries/`.
- Create ADRs for significant architectural decisions.
- Present a completion report to the user.

### Workflow flexibility

- Apply the workflow proportionally to the task size.
- For small bug fixes or minor changes, do not force a full architecture-design process.
- For significant features, follow all steps.
- If the user explicitly asks to skip a phase, respect that instruction.
- Never skip clarification for ambiguous business rules or high-impact decisions.

## Documentation map

- `docs/overview.md`: scope and requirements
- `docs/architecture.md`: components and dependency direction
- `docs/folder-structure.md`: code organization
- `docs/api-guidelines.md`: HTTP/API conventions
- `docs/validation-and-errors.md`: input validation and error contract
- `docs/database.md`: persistence rules
- `docs/security.md`: security requirements
- `docs/testing.md`: test strategy
- `docs/configuration.md`: environment configuration
- `docs/observability.md`: logs, metrics, tracing, health
- `docs/development.md`: local workflow
- `docs/deployment.md`: production/runtime guidance
- `docs/decisions/`: architecture decision records

These documents are starter defaults. If implementation or an approved decision differs, update the docs rather than forcing code to match stale guidance.
