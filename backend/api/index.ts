import type { IncomingMessage, ServerResponse } from "node:http";
import pg from "pg";
import { createApp } from "../src/app.ts";
import { loadEnvConfig } from "../src/config/env.ts";
import { runMigrations } from "../src/db/migrate.ts";
import { PostgresAuthDataStore } from "../src/db/postgresStore.ts";
import { InMemoryEmailDeliveryAdapter } from "../src/modules/auth/emailDelivery.ts";

let cachedApp: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;

async function getApp() {
  if (cachedApp) {
    return cachedApp;
  }

  const env = loadEnvConfig();
  const isRemote =
    Boolean(env.databaseUrl) &&
    !env.databaseUrl?.includes("localhost") &&
    !env.databaseUrl?.includes("127.0.0.1");

  const pool = new pg.Pool({
    connectionString: env.databaseUrl,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await runMigrations(pool);
  } catch (err) {
    console.error("[Vercel Startup] Migration check notice:", err);
  }

  const store = new PostgresAuthDataStore(pool);
  const emailAdapter = new InMemoryEmailDeliveryAdapter();
  const { app } = createApp({ env, store, emailAdapter });
  cachedApp = app;
  return app;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const app = await getApp();
  app(req, res);
}
