import { defineConfig } from "vitest/config";

// Matches docker-compose.yml. Override with TEST_DATABASE_URL. Never point this at real data:
// integration tests TRUNCATE every table.
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://wallet:wallet@localhost:5432/wallet_test";
process.env.DATABASE_URL = testDatabaseUrl;

export default defineConfig({
  test: {
    env: { NODE_ENV: "test", DATABASE_URL: testDatabaseUrl },
    globalSetup: ["tests/global-setup.ts"],
    // Integration tests share one database and reset it between tests.
    fileParallelism: false,
  },
});
