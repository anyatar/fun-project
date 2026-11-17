# Folder Structure

Suggested starting structure. Organize by feature as the domain grows; do not create empty layers just to match this example.

```text
.
├── src/
│   ├── app.ts                 # Express app composition; no listen()
│   ├── server.ts              # Process entry point; starts listener
│   ├── config/
│   │   └── env.ts             # Parse and validate environment
│   ├── routes/
│   │   └── index.ts           # Mount feature routers
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── request-context.ts
│   │   ├── not-found.ts
│   │   └── error-handler.ts
│   ├── modules/
│   │   └── users/
│   │       ├── users.routes.ts
│   │       ├── users.controller.ts
│   │       ├── users.service.ts
│   │       ├── users.repository.ts
│   │       ├── users.schemas.ts
│   │       └── users.types.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   └── clients/
│   ├── shared/
│   │   ├── errors/
│   │   └── types/
│   └── types/
│       └── express.d.ts       # Only for deliberate Express augmentation
├── tests/
│   ├── unit/
│   └── integration/
├── docs/
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## Rules
- Keep `app.ts` exportable so HTTP tests can import the app without opening a port.
- Keep `server.ts` responsible for startup and graceful shutdown.
- Group feature-specific files under `modules/<feature>/`.
- Put shared code in `shared/` only when it is genuinely used by multiple modules.
- Avoid generic `utils/` dumping grounds; name utilities by their responsibility.
- Keep test files close to source or in `tests/`, but use one consistent convention.
