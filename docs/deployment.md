# Deployment and Runtime

## Build and run
- Compile TypeScript to JavaScript for a predictable production artifact, unless the deployment platform explicitly standardizes another approach.
- Run the compiled entry point in production.
- Keep build-time and runtime configuration separate.
- Pin dependencies with a lockfile and use reproducible installs.

## Process behavior
- The process should listen on the configured port and bind to the expected interface.
- Handle `SIGTERM`/`SIGINT`: stop accepting new requests, allow in-flight requests to finish within a deadline, close database/queue clients, then exit.
- Let the process supervisor/container platform restart crashed instances.
- Do not rely on in-memory state for data that must survive restarts or be shared across replicas.

## Containers
- Use a small supported base image.
- Run as a non-root user.
- Use multi-stage builds where useful.
- Do not bake secrets into image layers.
- Define CPU/memory requests and limits in the deployment platform.
- Configure liveness/readiness probes using the documented health endpoints.

## Reverse proxy
- Configure `trust proxy` only for the actual trusted proxy topology. Incorrect settings can affect client IP and secure-cookie behavior.
- Enforce TLS at the edge or service mesh.
- Set appropriate proxy/body/request timeouts.

## Releases
- Use backward-compatible database migrations.
- Support rolling deployment with old and new versions overlapping.
- Define rollback and forward-fix procedures.
- Record release version/commit SHA in logs and diagnostics.
