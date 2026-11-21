import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type pg from "pg";
import { runMigrations } from "../src/db/migrate.ts";

function migrationDatabase() {
  let history = new Map<string, string>();
  let pending = new Map<string, string>();
  const statements: string[] = [];
  let failOnSql = false;
  let releases = 0;
  const client = {
    async query(sql: string, values?: string[]) {
      statements.push(sql);
      if (sql === "BEGIN") pending = new Map(history);
      else if (sql === "COMMIT") history = new Map(pending);
      else if (sql.startsWith("SELECT filename")) {
        return { rows: [...history].map(([filename, checksum]) => ({ filename, checksum })) };
      } else if (sql.startsWith("INSERT INTO schema_migrations")) {
        pending.set(values![0], values![1]);
      } else if (sql.includes("CREATE TABLE IF NOT EXISTS users") && failOnSql) {
        throw new Error("Simulated SQL failure");
      }
      return { rows: [] };
    },
    release() { releases++; },
  };
  return {
    pool: { connect: async () => client } as unknown as pg.Pool,
    history: () => history,
    statements,
    fail() { failOnSql = true; },
    releases: () => releases,
  };
}

describe("PostgreSQL migration history", () => {
  it("records migrations once and skips their SQL on subsequent starts", async () => {
    const db = migrationDatabase();
    const applied = await runMigrations(db.pool);
    assert.ok(applied.length >= 17);
    assert.equal(db.history().size, applied.length);
    db.statements.length = 0;
    assert.deepEqual(await runMigrations(db.pool), []);
    assert.ok(!db.statements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS users")));
    assert.ok(db.statements.indexOf("SELECT pg_advisory_xact_lock(72638421)") < db.statements.indexOf("SELECT filename, checksum FROM schema_migrations"));
    assert.equal(db.releases(), 2);
  });

  it("rolls back a failed batch and releases its connection", async () => {
    const db = migrationDatabase();
    db.fail();
    await assert.rejects(runMigrations(db.pool), /Simulated SQL failure/);
    assert.equal(db.history().size, 0);
    assert.equal(db.statements.at(-1), "ROLLBACK");
    assert.equal(db.releases(), 1);
  });

  it("rejects edited migration files before executing new migration SQL", async () => {
    const db = migrationDatabase();
    await runMigrations(db.pool);
    const filename = db.history().keys().next().value!;
    db.history().set(filename, "invalid-checksum");
    db.statements.length = 0;
    await assert.rejects(runMigrations(db.pool), /has changed/);
    assert.ok(!db.statements.some((sql) => sql.startsWith("INSERT INTO schema_migrations")));
    assert.equal(db.statements.at(-1), "ROLLBACK");
  });
});
