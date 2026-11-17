import pg from "pg";
import type { PoolClient } from "pg";
import { env } from "../../config/env.js";

const INT8_OID = 20;

// Money is BIGINT minor units. Parse to number, failing loudly instead of losing precision.
pg.types.setTypeParser(INT8_OID, (value: string): number => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("BIGINT value is outside the safe integer range");
  }
  return parsed;
});

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });

pool.on("error", (error) => {
  console.error(JSON.stringify({ level: "error", message: "Idle database client error", error: error.message }));
});

/** A pool or a client inside a transaction; repositories accept either. */
export type Queryable = pg.Pool | PoolClient;

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let connectionBroken = false;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      connectionBroken = true;
    }
    throw error;
  } finally {
    client.release(connectionBroken);
  }
}
