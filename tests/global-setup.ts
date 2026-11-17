import pg from "pg";
import { runMigrations } from "../src/infrastructure/database/migrate.js";

export default async function setup(): Promise<void> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await runMigrations(pool);
  } finally {
    await pool.end();
  }
}
