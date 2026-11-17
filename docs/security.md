# Security Requirements

## Authentication and authorization
- Authentication establishes who the caller is.
- Authorization checks whether that caller may perform the requested action on the specific resource.
- Apply authorization on every protected operation.
- Enforce object-level access checks; possession of an ID is not permission.
- Verify token signature, issuer, audience, expiry, and allowed algorithms using a maintained library.

## Input and output
- Validate all untrusted input.
- Use parameterized database operations.
- Encode output appropriately for its context.
- Set request body size limits.
- Configure CORS with explicit allowed origins; do not use wildcard origins with credentials.
- Use security headers (commonly via Helmet).

## Abuse protection
- Apply rate limits to public and sensitive endpoints.
- Add stricter limits to login, password reset, OTP, and expensive operations.
- Set timeouts and limits for external dependencies.
- Avoid unbounded concurrency and unbounded uploads.

## Secrets
- Never commit credentials, tokens, private keys, or production `.env` files.
- Use a secret manager in deployed environments.
- Rotate credentials and scope them with least privilege.
- Redact authorization headers, cookies, API keys, and sensitive personal data from logs.

## Operational security
- Keep dependencies patched and review vulnerability reports.
- Run as a non-root user in containers.
- Use TLS in transit and encryption at rest where required.
- Define security event logging and incident response procedures.
- Do not reveal whether a protected resource exists if that would enable enumeration; follow the product's policy.
