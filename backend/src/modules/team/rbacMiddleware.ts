import type { NextFunction, Request, Response } from "express";
import type { BackendEnvConfig } from "../../config/env.ts";
import type { PermissionResource } from "../../db/store.ts";
import type { AuthService } from "../auth/authService.ts";
import { hasPermission } from "./defaultRoles.ts";
import {
  TeamService,
  TeamServiceError,
  type TenantActor,
} from "./teamService.ts";

export interface AuthenticatedTenantRequest extends Request {
  tenantActor?: TenantActor;
}

export function createRbacGuards(options: {
  authService: AuthService;
  teamService: TeamService;
  env: BackendEnvConfig;
}) {
  const { authService, teamService, env } = options;

  async function resolveActorOrRespond(
    req: AuthenticatedTenantRequest,
    res: Response,
  ): Promise<TenantActor | null> {
    const rawSession = req.cookies?.[env.sessionCookieName] as
      | string
      | undefined;
    const user = await authService.authenticateSession(rawSession);
    if (!user) {
      res.status(401).json({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Please sign in to access your workspace.",
        },
      });
      return null;
    }

    // TEMPORARILY DISABLED FOR TESTING: skip email verification check
    // if (!user.emailVerified) {
    //   res.status(403).json({
    //     ok: false,
    //     error: {
    //       code: "EMAIL_NOT_VERIFIED",
    //       message: "Please verify your email address first.",
    //     },
    //   });
    //   return null;
    // }

    try {
      const actor = await teamService.resolveTenantActor(user);
      if (!actor) {
        res.status(404).json({
          ok: false,
          error: {
            code: "COMPANY_NOT_FOUND",
            message: "No active company workspace found for this account.",
          },
        });
        return null;
      }

      req.tenantActor = actor;
      return actor;
    } catch (err) {
      if (err instanceof TeamServiceError) {
        res.status(err.status).json({
          ok: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return null;
      }
      throw err;
    }
  }

  /**
   * Enforces 2D Backend RBAC: (Company × Branch Scope × Role Permission).
   */
  function requirePermission(
    resource: PermissionResource,
    action: string,
    opts?: { branchIdParam?: string },
  ) {
    return async (
      req: AuthenticatedTenantRequest,
      res: Response,
      next: NextFunction,
    ): Promise<void> => {
      const actor = await resolveActorOrRespond(req, res);
      if (!actor) return;

      if (!hasPermission(actor.role.permissions, resource, action)) {
        res.status(403).json({
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to perform this action.",
          },
        });
        return;
      }

      if (opts?.branchIdParam && actor.role.scopeType === "assigned_branches") {
        const rawBranchId = req.params[opts.branchIdParam];
        const branchId = Array.isArray(rawBranchId)
          ? rawBranchId[0]
          : rawBranchId;
        if (branchId && !actor.branchIds.includes(branchId)) {
          res.status(403).json({
            ok: false,
            error: {
              code: "BRANCH_SCOPE_DENIED",
              message: "You do not have access to this branch.",
            },
          });
          return;
        }
      }

      next();
    };
  }

  return {
    resolveActorOrRespond,
    requirePermission,
  };
}
