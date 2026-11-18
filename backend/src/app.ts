import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { BackendEnvConfig } from "./config/env.ts";
import type { AuthDataStore } from "./db/store.ts";
import { createAuthRouter } from "./modules/auth/authRouter.ts";
import { AuthService } from "./modules/auth/authService.ts";
import type { EmailDeliveryAdapter } from "./modules/auth/emailDelivery.ts";
import { createWorkspaceRouter } from "./modules/workspace/workspaceRouter.ts";
import { WorkspaceService } from "./modules/workspace/workspaceService.ts";

export function createApp(options: {
  env: BackendEnvConfig;
  store: AuthDataStore;
  emailAdapter: EmailDeliveryAdapter;
}): {
  app: Express;
  authService: AuthService;
  workspaceService: WorkspaceService;
} {
  const { env, store, emailAdapter } = options;

  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept", "X-Requested-With"],
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "32kb" }));

  const authService = new AuthService({
    store,
    emailAdapter,
    sessionTtlHours: env.sessionTtlHours,
  });

  const workspaceService = new WorkspaceService(store);

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "revix-system-backend",
      phase: 2,
    });
  });

  app.use(
    "/api/v1/auth",
    createAuthRouter({
      authService,
      env,
    }),
  );

  app.use(
    "/api/v1/workspace",
    createWorkspaceRouter({
      authService,
      workspaceService,
      env,
    }),
  );

  app.use((_req, res) => {
    res.status(404).json({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "The requested API endpoint does not exist.",
      },
    });
  });

  return { app, authService, workspaceService };
}
