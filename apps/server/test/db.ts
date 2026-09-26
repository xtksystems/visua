/**
 * Test database: SQLite in memory by default. Set VISUA_TEST_DATABASE_URL to a
 * Postgres URL to run the same suites on Postgres; each run gets its own
 * schema, dropped afterwards, so the database is never polluted.
 */
import { randomBytes } from "node:crypto";
import pg from "pg";

export const TEST_PG_URL = process.env["VISUA_TEST_DATABASE_URL"];

export interface TestDatabase {
  url: string;
  dialect: "sqlite" | "postgres";
  cleanup(): Promise<void>;
}

export async function testDatabase(label = "t"): Promise<TestDatabase> {
  if (!TEST_PG_URL) return { url: ":memory:", dialect: "sqlite", cleanup: async () => undefined };
  const schema = `visua_${label}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
  const admin = new pg.Client({ connectionString: TEST_PG_URL });
  await admin.connect();
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.end();
  const url = new URL(TEST_PG_URL);
  url.searchParams.set("options", `-c search_path=${schema}`);
  return {
    url: url.toString(),
    dialect: "postgres",
    cleanup: async () => {
      const c = new pg.Client({ connectionString: TEST_PG_URL });
      await c.connect();
      await c.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await c.end();
    },
  };
}
