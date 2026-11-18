import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnvConfig } from "../config/env.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

export async function runMigrations(pool: pg.Pool): Promise<string[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  const sqlFiles = entries
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const applied: string[] = [];
  for (const file of sqlFiles) {
    const fullPath = path.join(MIGRATIONS_DIR, file);
    const sql = await fs.readFile(fullPath, "utf8");
    await pool.query(sql);
    applied.push(file);
  }
  return applied;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = loadEnvConfig();
  if (!env.databaseUrl) {
    console.error("DATABASE_URL is required to run PostgreSQL migrations.");
    process.exit(1);
  }

  const isRemote =
    !env.databaseUrl.includes("localhost") &&
    !env.databaseUrl.includes("127.0.0.1");
  const pool = new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });
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
