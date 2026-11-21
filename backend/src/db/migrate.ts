import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnvConfig } from "../config/env.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function runMigrations(pool: pg.Pool): Promise<string[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  const sqlFiles = entries
    .filter((file) => /^\d+_[\w-]+\.sql$/.test(file))
    .sort((a, b) => a.localeCompare(b));

  const migrations = await Promise.all(sqlFiles.map(async (file) => {
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    // Line-ending changes between Windows and Linux must not invalidate history.
    const checksum = createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
    return { file, sql, checksum };
  }));
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("BEGIN");
    // Serialize concurrent API startups on the same dedicated connection.
    await client.query("SELECT pg_advisory_xact_lock(72638421)");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const result = await client.query<{ filename: string; checksum: string }>(
      "SELECT filename, checksum FROM schema_migrations",
    );
    const history = new Map(result.rows.map((row) => [row.filename, row.checksum]));
    // Validate every applied file before executing any new SQL.
    for (const migration of migrations) {
      const checksum = history.get(migration.file);
      if (checksum && checksum !== migration.checksum) {
        throw new Error(`Applied migration ${migration.file} has changed. Add a new migration instead.`);
      }
    }
    for (const { file, sql, checksum } of migrations) {
      if (history.has(file)) continue;
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
        [file, checksum],
      );
      applied.push(file);
    }
    await client.query("COMMIT");
    return applied;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = loadEnvConfig();
  if (!env.databaseUrl) {
    console.error("DATABASE_URL is required to run PostgreSQL migrations.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: env.databaseUrl });
  runMigrations(pool)
    .then(async (files) => {
      console.log(`Applied ${files.length} migration(s): ${files.join(", ")}`);
      await pool.end();
    })
    .catch(async (err) => {
      console.error("Migration failed:", err);
      await pool.end();
      process.exit(1);
    });
}
