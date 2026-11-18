import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "../..");

export interface BackendEnvConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  databaseUrl: string | undefined;
  frontendOrigin: string;
  sessionCookieName: string;
  sessionTtlHours: number;
}

let envFileLoaded = false;

function loadDotEnvIfPresent(): void {
  if (envFileLoaded || process.env.NODE_ENV === "test") {
    return;
  }
  envFileLoaded = true;

  const envPath = path.join(BACKEND_ROOT, ".env");
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore malformed optional local .env during startup; env vars still apply.
    }
  }
}

export function loadEnvConfig(): BackendEnvConfig {
  loadDotEnvIfPresent();

  const rawNodeEnv = process.env.NODE_ENV ?? "development";
  const nodeEnv =
    rawNodeEnv === "production" || rawNodeEnv === "test"
      ? rawNodeEnv
      : "development";

  const parsedPort = Number.parseInt(process.env.PORT ?? "4000", 10);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 4000;

  const parsedTtl = Number.parseInt(
    process.env.SESSION_TTL_HOURS ?? "168",
    10,
  );
  const sessionTtlHours =
    Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 168;

  return {
    nodeEnv,
    port,
    databaseUrl: process.env.DATABASE_URL?.trim() || undefined,
    frontendOrigin:
      process.env.FRONTEND_ORIGIN?.trim() || "http://localhost:3000",
    sessionCookieName:
      process.env.SESSION_COOKIE_NAME?.trim() || "revix_session",
    sessionTtlHours,
  };
}
