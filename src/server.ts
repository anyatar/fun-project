import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./infrastructure/database/pool.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = createApp().listen(env.PORT, () => {
  console.log(JSON.stringify({ level: "info", message: `Listening on port ${env.PORT}` }));
});

function shutdown(signal: string): void {
  console.log(JSON.stringify({ level: "info", message: `${signal} received, shutting down` }));
  setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  server.close(() => {
    pool.end().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
