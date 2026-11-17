# Local Development Workflow

## First-time setup
1. Install the supported Node.js LTS version.
2. Install dependencies using the repository's package manager and lockfile.
3. Copy `.env.example` to `.env`.
4. Start required local dependencies (database, cache, or queue).
5. Run migrations and seed only non-sensitive development data.
6. Start the API in watch mode.

## Daily workflow
1. Pull/rebase the latest main branch.
2. Create a focused branch.
3. Read relevant architecture/API docs and nearby code.
4. Implement a small change.
5. Add/update tests.
6. Run formatting, lint, typecheck, tests, and build.
7. Review the complete diff, including generated files and migrations.
8. Update docs when behavior or configuration changes.

## Pull request checklist
- [ ] Scope is focused and requirements are met.
- [ ] No secrets or sensitive data are committed.
- [ ] Input validation and authorization are covered.
- [ ] Errors are mapped to safe, stable responses.
- [ ] Tests cover success and failure cases.
- [ ] Migrations are safe and reversible where possible.
- [ ] Logs and metrics are useful without leaking sensitive data.
- [ ] Documentation and OpenAPI are updated.
- [ ] Typecheck, lint, tests, and build pass.

## AI coding agents
Give the agent the relevant requirement, constraints, and existing patterns. Ask it to inspect and propose a plan before significant edits. Review every diff and independently verify tests and security-sensitive behavior. The human author remains responsible for the result.
