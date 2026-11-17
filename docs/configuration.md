# Configuration

## Principles
- Read configuration from environment variables.
- Validate required configuration once at startup and fail fast with a clear, non-secret error.
- Do not scatter `process.env` access throughout business logic.
- Keep `.env.example` synchronized with the configuration schema.
- Never commit `.env` or real credentials.

## Example `.env.example`
```dotenv
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
API_BASE_PATH=/api/v1

DATABASE_URL=postgresql://user:password@localhost:5432/app
DATABASE_POOL_MIN=0
DATABASE_POOL_MAX=10

CORS_ORIGINS=http://localhost:5173
JWT_ISSUER=
JWT_AUDIENCE=
```

The values above are examples only. Use the actual authentication and database setup chosen for the service.

## Startup behavior
- Validate types, required values, and allowed ranges.
- Parse comma-separated lists explicitly.
- Never log full connection strings or secret values.
- Separate local, test, staging, and production configuration.
- Prefer platform secret injection over storing secrets in deployment manifests.
