# Logging, Metrics, Tracing, and Health

## Structured logs
Use structured JSON logs in deployed environments. Include:
- Timestamp and severity
- Service name and version
- Environment
- Request/correlation ID
- HTTP method, route template, status, and duration
- Error code and stack trace in protected internal logs

Do not log secrets, authorization headers, session cookies, or sensitive payloads.

## Metrics
At minimum consider:
- Request count by route and status class
- Request latency (p50/p95/p99)
- Error rate
- Process memory/CPU/event-loop health
- Database pool usage and query latency
- External dependency latency and failures
- Queue depth/age if asynchronous processing exists

Avoid high-cardinality metric labels such as raw user IDs or request IDs.

## Distributed tracing
Propagate trace context across HTTP and messaging boundaries. Use OpenTelemetry or the platform's supported tracing standard where appropriate.

## Health endpoints
- `/health/live`: process is alive; should not depend on every downstream service.
- `/health/ready`: instance can safely receive traffic; may check critical dependencies with short timeouts.

Do not expose detailed infrastructure topology or credentials through public health responses.

## Alerts
Alert on user-visible symptoms and SLO impact, not every isolated exception. Document dashboard links, ownership, and response steps.
