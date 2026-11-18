import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createApp } from "./app.ts";
import { loadEnvConfig } from "./config/env.ts";
import { InMemoryAuthDataStore } from "./db/memoryStore.ts";
import { runMigrations } from "./db/migrate.ts";
import { PostgresAuthDataStore } from "./db/postgresStore.ts";
import type { AuthDataStore } from "./db/store.ts";
import { InMemoryEmailDeliveryAdapter } from "./modules/auth/emailDelivery.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DEV_STORE_FILE = path.resolve(
  __dirname,
  "../.dev-data/local-store.json",
);

async function startServer(): Promise<void> {
  const env = loadEnvConfig();
  let store: AuthDataStore;

  if (env.databaseUrl) {
    const pool = new pg.Pool({ connectionString: env.databaseUrl });
    await runMigrations(pool);
    store = new PostgresAuthDataStore(pool);
    console.log("[Revix Backend] Connected to PostgreSQL database and applied migrations.");
  } else {
    store = new InMemoryAuthDataStore({
      persistFilePath: LOCAL_DEV_STORE_FILE,
    });
    console.log(
      `[Revix Backend] DATABASE_URL not set; persisting local dev data to ${LOCAL_DEV_STORE_FILE}`,
    );
  }

  const emailAdapter = new InMemoryEmailDeliveryAdapter();
  const { app } = createApp({ env, store, emailAdapter });

  app.listen(env.port, () => {
    console.log(
      `[Revix Backend] Express + TypeScript API listening on http://localhost:${env.port}`,
    );
  });
}

startServer().catch((err) => {
  console.error("[Revix Backend] Fatal startup error:", err);
  process.exit(1);
});
