import type { CorsOptions } from "cors";
import type { BackendEnvConfig } from "../config/env.ts";

export function createCorsPolicy(env: BackendEnvConfig): CorsOptions {
  const allowedOrigins = new Set(env.frontendOrigin.split(",").map((origin) => origin.trim()).filter(Boolean));
  if (env.nodeEnv === "production" && allowedOrigins.has("*")) {
    throw new Error("FRONTEND_ORIGIN must list explicit origins in production.");
  }
  return {
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin) || allowedOrigins.has("*"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "X-Requested-With", "Authorization"],
  };
}
