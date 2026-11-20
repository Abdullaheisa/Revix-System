import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import type { BackendEnvConfig } from "./config/env.ts";
import type { AuthDataStore } from "./db/store.ts";
import { createAuthRouter } from "./modules/auth/authRouter.ts";
import { AuthService } from "./modules/auth/authService.ts";
import type { EmailDeliveryAdapter } from "./modules/auth/emailDelivery.ts";
import { createTeamRouter } from "./modules/team/teamRouter.ts";
import { TeamService } from "./modules/team/teamService.ts";
import { createNetworkRouter } from "./modules/network/networkRouter.ts";
import { NetworkService } from "./modules/network/networkService.ts";
import { createFleetRouter } from "./modules/fleet/fleetRouter.ts";
import { FleetService } from "./modules/fleet/fleetService.ts";
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
  teamService: TeamService;
  networkService: NetworkService;
  fleetService: FleetService;
} {
  const { env, store, emailAdapter } = options;

  const app = express();
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!requestOrigin) return callback(null, true);

        // If configured as wildcard, or matches exact configured origin, or preview deployments
        if (
          env.frontendOrigin === "*" ||
          env.frontendOrigin === requestOrigin ||
          requestOrigin.endsWith(".vercel.app") ||
          requestOrigin.includes("localhost") ||
          requestOrigin.includes("127.0.0.1")
        ) {
          return callback(null, true);
        }

        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept", "X-Requested-With", "Authorization"],
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "512kb" }));
  app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), "uploads"), {
      maxAge: "7d",
      immutable: true,
    }),
  );

  const authService = new AuthService({
    store,
    emailAdapter,
    sessionTtlHours: env.sessionTtlHours,
  });

  const teamService = new TeamService({
    store,
    emailAdapter,
    sessionTtlHours: env.sessionTtlHours,
  });

  const networkService = new NetworkService(store, emailAdapter);
  const fleetService = new FleetService(store);
  const workspaceService = new WorkspaceService(store, teamService);

  app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "revix-system-backend",
      phase: 5,
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

  app.use(
    "/api/v1/team",
    createTeamRouter({
      authService,
      teamService,
      env,
    }),
  );

  app.use(
    "/api/v1/network",
    createNetworkRouter({
      authService,
      teamService,
      networkService,
      env,
    }),
  );

  app.use(
    "/api/v1/fleet",
    createFleetRouter({
      authService,
      teamService,
      fleetService,
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

  return { app, authService, workspaceService, teamService, networkService, fleetService };
}
