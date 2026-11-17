import { runMigrations } from "./migrate.js";
import { pool } from "./pool.js";

try {
  const applied = await runMigrations(pool);
  console.log(applied.length > 0 ? `Applied: ${applied.join(", ")}` : "No pending migrations");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
