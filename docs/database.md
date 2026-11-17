# Database and Persistence

> This template assumes a relational database such as PostgreSQL. Replace it if the project uses a different datastore.

## Ownership
- Repositories own database queries.
- Services own business workflows and transaction boundaries.
- Controllers must not execute SQL or use an ORM directly.

## Schema and migrations
- Every schema change must be represented by a versioned migration.
- Migrations must be reviewed and tested against realistic data volumes.
- Prefer backward-compatible expand/migrate/contract changes for zero-downtime deployments.
- Do not edit an already-applied migration; create a new migration.

## Query safety and performance
- Use parameterized queries or safe ORM query APIs.
- Add indexes based on actual query patterns and query plans.
- Avoid N+1 queries and unbounded result sets.
- Select only the columns needed.
- Set sensible connection pool limits and timeouts.
- Use cursor pagination for large collections where appropriate.

## Transactions and consistency
- Use a transaction when multiple writes form one atomic business operation.
- Keep transactions short.
- Define uniqueness and foreign-key constraints in the database, not only in application code.
- Consider optimistic concurrency/version columns for contested updates.
- Define retry behavior for serialization failures/deadlocks.

## Multi-tenancy
If the application is multi-tenant:
- Derive tenant identity from verified authentication context, not an arbitrary body/query value.
- Include tenant scope in every relevant read and write.
- Consider database constraints that include `tenant_id`.
- Test cross-tenant access attempts explicitly.
- Decide whether row-level security is appropriate and document the threat model.

## Data lifecycle
Document retention, deletion, archival, backup, restore, and migration rollback expectations.
