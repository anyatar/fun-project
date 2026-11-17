# Testing Strategy

## Test levels
- **Unit tests:** pure functions and business rules; mock infrastructure boundaries.
- **Integration tests:** repositories, database behavior, and service integrations.
- **HTTP/API tests:** exercise the Express app through HTTP-level requests without opening a production listener.
- **End-to-end tests:** validate critical user/business flows across deployed components when justified.

## What to test
For each endpoint, cover:
- Happy path
- Missing and malformed input
- Authentication failure
- Authorization failure, including cross-user/tenant access
- Not found
- Conflict/duplicate
- Dependency failure and timeout
- Unexpected error response without leaking internals

For data changes, test transaction behavior, uniqueness constraints, and concurrent updates where relevant.

## Test isolation
- Tests must be repeatable and independent.
- Use a dedicated test database or isolated schema.
- Reset fixtures/state between tests.
- Do not connect automated tests to production services or data.
- Avoid relying on test execution order.

## Quality gates
A pull request should pass:
1. Formatting/lint
2. Type checking
3. Unit tests
4. Integration/API tests required by the change
5. Build

## Test naming
Name tests by behavior and expected outcome, not implementation details.
