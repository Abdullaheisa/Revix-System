import { loadEnvConfig } from "../config/env.ts";
import { runMigrations } from "./migrate.ts";
import { createPgPool } from "./pool.ts";

interface ForeignKeyEdge {
  tableName: string;
  referencedTable: string;
}

function topoSortTables(tables: string[], edges: ForeignKeyEdge[]): string[] {
  const deps = new Map<string, Set<string>>();
  for (const t of tables) deps.set(t, new Set());
  for (const e of edges) {
    if (e.tableName !== e.referencedTable && deps.has(e.tableName) && deps.has(e.referencedTable)) {
      deps.get(e.tableName)!.add(e.referencedTable);
    }
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: string[] = [];

  function visit(node: string) {
    if (visited.has(node)) return;
    if (visiting.has(node)) return;
    visiting.add(node);
    for (const dep of deps.get(node) ?? []) {
      visit(dep);
    }
    visiting.delete(node);
    visited.add(node);
    ordered.push(node);
  }

  for (const t of tables) visit(t);
  return ordered;
}

async function main(): Promise<void> {
  loadEnvConfig();
  const sourceUrl = process.env.SOURCE_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  const targetUrl = process.env.TARGET_DATABASE_URL?.trim();

  if (!sourceUrl || !targetUrl) {
    console.error(
      "Both SOURCE_DATABASE_URL (or DATABASE_URL) and TARGET_DATABASE_URL are required.",
    );
    process.exit(1);
  }

  if (sourceUrl === targetUrl) {
    console.error("SOURCE_DATABASE_URL and TARGET_DATABASE_URL must be different databases.");
    process.exit(1);
  }

  const sourcePool = createPgPool(sourceUrl);
  const targetPool = createPgPool(targetUrl);

  try {
    console.log("[Transfer] Running migrations on target (Supabase) database...");
    const applied = await runMigrations(targetPool);
    console.log(`[Transfer] Target migrations ready (newly applied: ${applied.length}).`);

    const tablesRes = await sourcePool.query<{ tablename: string }>(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename <> 'schema_migrations'
       ORDER BY tablename`,
    );
    const allTables = tablesRes.rows.map((r) => r.tablename);

    const fkRes = await sourcePool.query<{
      table_name: string;
      referenced_table: string;
    }>(
      `SELECT tc.table_name, ccu.table_name AS referenced_table
       FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = 'public'`,
    );

    const orderedTables = topoSortTables(
      allTables,
      fkRes.rows.map((r) => ({
        tableName: r.table_name,
        referencedTable: r.referenced_table,
      })),
    );

    for (const table of orderedTables) {
      const colRes = await sourcePool.query<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table],
      );
      const columns = colRes.rows;
      if (columns.length === 0) continue;

      const srcRowsRes = await sourcePool.query(`SELECT * FROM "${table}"`);
      const rows = srcRowsRes.rows;

      if (rows.length === 0) {
        console.log(`  - ${table}: 0 rows (skipped)`);
        continue;
      }

      const colNames = columns.map((c) => `"${c.column_name}"`).join(", ");
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
      const insertSql = `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      const isSelfReferencing = fkRes.rows.some(
        (fk) => fk.table_name === table && fk.referenced_table === table,
      );

      const buildValues = (row: Record<string, unknown>) =>
        columns.map((c) => {
          const val = row[c.column_name];
          if (val === undefined) return null;
          if ((c.data_type === "jsonb" || c.data_type === "json") && val !== null) {
            return JSON.stringify(val);
          }
          return val;
        });

      const targetClient = await targetPool.connect();
      try {
        await targetClient.query("BEGIN");
        if (!isSelfReferencing) {
          for (const row of rows) {
            await targetClient.query(insertSql, buildValues(row));
          }
        } else {
          let pending = [...rows];
          let pass = 0;
          while (pending.length > 0) {
            pass += 1;
            const nextPending: Record<string, unknown>[] = [];
            for (const row of pending) {
              await targetClient.query("SAVEPOINT sp_row");
              try {
                await targetClient.query(insertSql, buildValues(row));
                await targetClient.query("RELEASE SAVEPOINT sp_row");
              } catch (err) {
                const pgErr = err as { code?: string };
                if (pgErr.code === "23503") {
                  await targetClient.query("ROLLBACK TO SAVEPOINT sp_row");
                  nextPending.push(row);
                } else {
                  throw err;
                }
              }
            }
            if (nextPending.length === pending.length) {
              throw new Error(
                `Unresolvable self-referencing FK cycle in "${table}" at pass ${pass}`,
              );
            }
            pending = nextPending;
          }
        }
        await targetClient.query("COMMIT");
      } catch (err) {
        await targetClient.query("ROLLBACK");
        throw new Error(`Failed copying table "${table}": ${(err as Error).message}`);
      } finally {
        targetClient.release();
      }

      const tgtCountRes = await targetPool.query<{ cnt: number }>(
        `SELECT COUNT(*)::int AS cnt FROM "${table}"`,
      );
      console.log(
        `  ✓ ${table}: source=${rows.length}, target=${tgtCountRes.rows[0]?.cnt ?? 0}`,
      );
    }

    console.log("[Transfer] Data migration from Neon to Supabase completed successfully.");
  } finally {
    await Promise.all([sourcePool.end(), targetPool.end()]);
  }
}

main().catch((err) => {
  console.error("[Transfer] Failed:", err);
  process.exit(1);
});
