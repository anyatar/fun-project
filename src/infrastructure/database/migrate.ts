import { readdir, readFile } from "node:fs/promises";
import type pg from "pg";

const MIGRATIONS_DIR = new URL("../../../migrations/", import.meta.url);
const MIGRATION_LOCK_ID = 727_001;

/** Applies pending `migrations/*.sql` files in name order, each in its own transaction. */
export async function runMigrations(pool: pg.Pool): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const applied = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const appliedNames = new Set(applied.rows.map((row) => row.name));

    const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
    const newlyApplied: string[] = [];
    for (const file of files) {
      if (appliedNames.has(file)) continue;
      const sql = await readFile(new URL(file, MIGRATIONS_DIR), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      newlyApplied.push(file);
    }
    return newlyApplied;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => undefined);
    client.release();
  }
}
