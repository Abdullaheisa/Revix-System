import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { BackendEnvConfig } from "../../config/env.ts";
import { createRateLimiter } from "../../security/rateLimiter.ts";
import type { AuthService } from "../auth/authService.ts";
import {
  createRbacGuards,
  type AuthenticatedTenantRequest,
} from "./rbacMiddleware.ts";
import { TeamService, TeamServiceError } from "./teamService.ts";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createInvitationSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().max(254).regex(EMAIL_REGEX),
  phone: z.string().trim().max(48).optional().default(""),
  roleId: z.string().uuid(),
  branchIds: z.array(z.string().uuid()).optional().default([]),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

const updateMemberSchema = z.object({
  roleId: z.string().uuid(),
  phone: z.string().trim().max(48).optional().default(""),
  status: z.enum(["active", "suspended"]),
  branchIds: z.array(z.string().uuid()).optional().default([]),
});

const updateRoleSchema = z.object({
  scopeType: z.enum(["company_wide", "assigned_branches"]),
  permissions: z.record(z.string(), z.array(z.string())),
});

const previewInvitationSchema = z.object({
  token: z.string().trim().min(10).max(512),
});

const acceptInvitationSchema = z.object({
  token: z.string().trim().min(10).max(512),
  password: z.string().min(12).max(4096),
  fullName: z.string().trim().min(1).max(160).optional(),
});

function handleTeamError(res: Response, err: unknown): void {
  if (err instanceof TeamServiceError) {
    res.status(err.status).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
}

export function createTeamRouter(options: {
  authService: AuthService;
  teamService: TeamService;
  env: BackendEnvConfig;
}): Router {
  const { authService, teamService, env } = options;
  const router = Router();
  const { requirePermission } = createRbacGuards({
    authService,
    teamService,
    env,
  });

  const publicInviteLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 20,
  });

  // Public invitation preview (POST body so raw token never appears in URL/access logs)
  router.post(
    "/invitations/preview",
    publicInviteLimiter,
    async (req: Request, res: Response) => {
      const parsed = previewInvitationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVITATION_INVALID_OR_EXPIRED",
            message: "This invitation link is invalid or has expired.",
          },
        });
        return;
      }

      try {
        const preview = await teamService.previewInvitation(parsed.data.token);
        res.status(200).json({
          ok: true,
          data: { invitation: preview },
        });
      } catch (err) {
        handleTeamError(res, err);
      }
    },
  );

  // Public invitation acceptance — creates/activates employee account and issues HttpOnly session
  router.post(
    "/invitations/accept",
    publicInviteLimiter,
    async (req: Request, res: Response) => {
      const parsed = acceptInvitationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Please provide a valid invitation token and strong password.",
          },
        });
        return;
      }

      try {
        const result = await teamService.acceptInvitation({
          rawToken: parsed.data.token,
          password: parsed.data.password,
          fullName: parsed.data.fullName,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
        });

        res.cookie(env.sessionCookieName, result.rawSessionToken, {
          httpOnly: true,
          secure: env.nodeEnv === "production",
          sameSite: "lax",
          path: "/",
          expires: result.sessionExpiresAt,
        });

        res.status(200).json({
          ok: true,
          data: { user: result.user },
        });
      } catch (err) {
        handleTeamError(res, err);
      }
    },
  );

  // Authenticated Team Overview (Roles + Members + Invitations + Company Branches)
  router.get(
    "/overview",
    requirePermission("team", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const overview = await teamService.getTeamOverview(req.tenantActor!);
        res.status(200).json({
          ok: true,
          data: overview,
        });
      } catch (err) {
        handleTeamError(res, err);
      }
    },
  );

  // Invite new employee
  router.post(
    "/invitations",
    requirePermission("team", "invite"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createInvitationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Please check all required employee invitation fields.",
          },
        });
        return;
      }

      try {
        const created = await teamService.createInvitation(
          req.tenantActor!,
          parsed.data,
        );
        res.status(201).json({
          ok: true,
          data: {
            invitation: created.invitation,
            invitePath: created.invitePath,
          },
        });
      } catch (err) {
        handleTeamError(res, err);
      }
    },
  );

  // Revoke pending invitation
  router.delete(
    "/invitations/:invitationId",
    requirePermission("team", "invite"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.invitationId;
      const invitationId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!invitationId) {
        res.status(400).json({
          ok: false,
          error: { code: "INVALID_INPUT", message: "Invitation ID required." },
        });
        return;
      }

      try {
        await teamService.revokeInvitation(req.tenantActor!, invitationId);
        res.status(200).json({ ok: true });
      } catch (err) {
        handleTeamError(res, err);
      }
    },
  );

  // Update employee membership (single role, branch scope, phone, or suspend)
  router.patch(
    "/members/:membershipId",
    requirePermission("team", "manage_members"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.membershipId;
      const membershipId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!membershipId) {
        res.status(400).json({
          ok: false,
          error: { code: "INVALID_INPUT", message: "Membership ID required." },
        });
        return;
      }

      const parsed = updateMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Please check member update details.",
          },
        });
        return;
      }

      try {
        const member = await teamService.updateMember(
          req.tenantActor!,
          membershipId,
          parsed.data,
        );
        res.status(200).json({
          ok: true,
          data: { member },
        });
      } catch (err) {
        handleTeamError(res, err);
      }
    },
  );

  // Update configurable role scope & permission matrix
  router.put(
    "/roles/:roleId",
    requirePermission("team", "manage_roles"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.roleId;
      const roleId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!roleId) {
        res.status(400).json({
          ok: false,
          error: { code: "INVALID_INPUT", message: "Role ID required." },
        });
        return;
      }

      const parsed = updateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid role scope or permissions payload.",
          },
        });
        return;
      }

      try {
        const role = await teamService.updateRole(
          req.tenantActor!,
          roleId,
          parsed.data,
        );
        res.status(200).json({
          ok: true,
          data: { role },
        });
      } catch (err) {
        handleTeamError(res, err);
      }
    },
  );

  return router;
}
