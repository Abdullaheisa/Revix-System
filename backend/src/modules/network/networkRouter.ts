import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { BackendEnvConfig } from "../../config/env.ts";
import { createRateLimiter } from "../../security/rateLimiter.ts";
import type { AuthService } from "../auth/authService.ts";
import {
  createRbacGuards,
  type AuthenticatedTenantRequest,
} from "../team/rbacMiddleware.ts";
import type { TeamService } from "../team/teamService.ts";
import {
  NetworkService,
  NetworkServiceError,
} from "./networkService.ts";

const invitePartnerSchema = z.object({
  inviteeEmail: z.string().trim().email().max(254),
  localCompanyName: z.string().trim().min(1).max(160),
  contactName: z.string().trim().max(160).optional().default(""),
  contactPhone: z.string().trim().max(40).optional().default(""),
  logoUrl: z.string().trim().max(500_000).nullable().optional().default(null),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

const acceptInvitationSchema = z.object({
  token: z.string().trim().min(10).max(512),
  permittedBranchIds: z.array(z.string().uuid()).default([]),
});

const completeOnboardingSchema = z.object({
  token: z.string().trim().min(10).max(512),
  password: z.string().min(8).max(4096),
  fullName: z.string().trim().max(160).optional(),
});

const updateLinkStatusSchema = z.object({
  status: z.enum(["active", "paused"]),
});

const updatePermittedBranchesSchema = z.object({
  branchIds: z.array(z.string().uuid()),
});

function handleNetworkError(res: Response, err: unknown): void {
  if (err instanceof NetworkServiceError) {
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

export function createNetworkRouter(options: {
  authService: AuthService;
  teamService: TeamService;
  networkService: NetworkService;
  env: BackendEnvConfig;
}): Router {
  const { authService, teamService, networkService, env } = options;
  const router = Router();
  const { requirePermission } = createRbacGuards({
    authService,
    teamService,
    env,
  });

  const previewLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
  });

  /**
   * GET /api/v1/network/overview
   * Returns network status, connected local partners, pending invitations, or parent company link.
   */
  router.get(
    "/overview",
    requirePermission("network", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const actor = req.tenantActor!;
        const overview = await networkService.getNetworkOverview(actor.company.id);

        res.status(200).json({
          ok: true,
          data: overview,
        });
      } catch (err) {
        handleNetworkError(res, err);
      }
    },
  );

  /**
   * POST /api/v1/network/invite
   * Main Company invites a Local Partner to link with the company network.
   */
  router.post(
    "/invite",
    requirePermission("network", "manage"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const parsed = invitePartnerSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            ok: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invalid invitation payload.",
              issues: parsed.error.issues,
            },
          });
          return;
        }

        const actor = req.tenantActor!;
        const result = await networkService.inviteLocalPartner(
          actor.company.id,
          actor.user.id,
          parsed.data,
        );

        res.status(201).json({
          ok: true,
          data: {
            invitation: result.invitation,
            inviteLink: result.inviteLink,
          },
        });
      } catch (err) {
        handleNetworkError(res, err);
      }
    },
  );

  /**
   * GET /api/v1/network/invitations/preview?token=...
   * Previews a network invitation before accepting.
   */
  router.get(
    "/invitations/preview",
    previewLimiter,
    async (req: Request, res: Response) => {
      try {
        const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
        if (!token) {
          res.status(400).json({
            ok: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invitation token query parameter is required.",
            },
          });
          return;
        }

        const preview = await networkService.previewNetworkInvitation(token);

        res.status(200).json({
          ok: true,
          data: {
            invitation: {
              id: preview.invitation.id,
              localCompanyName: preview.invitation.localCompanyName,
              contactName: preview.invitation.contactName,
              contactPhone: preview.invitation.contactPhone,
              logoUrl: preview.invitation.logoUrl ?? null,
              inviteeEmail: preview.invitation.inviteeEmail,
              expiresAt: preview.invitation.expiresAt,
              createdAt: preview.invitation.createdAt,
            },
            mainCompany: {
              id: preview.mainCompany.id,
              name: preview.mainCompany.name,
              legalName: preview.mainCompany.legalName,
              logoUrl: preview.mainCompany.logoUrl,
              brandColor: preview.mainCompany.brandColor,
              countryCode: preview.mainCompany.countryCode,
              city: preview.mainCompany.city,
            },
            accountExists: preview.accountExists,
          },
        });
      } catch (err) {
        handleNetworkError(res, err);
      }
    },
  );

  /**
   * POST /api/v1/network/invitations/complete-onboarding
   * Public endpoint for invited local company manager to set password (or sign in) with prefilled email and accept link.
   */
  router.post(
    "/invitations/complete-onboarding",
    previewLimiter,
    async (req: Request, res: Response) => {
      try {
        const parsed = completeOnboardingSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            ok: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invalid invitation onboarding payload.",
              issues: parsed.error.issues,
            },
          });
          return;
        }

        const result = await networkService.completeNetworkInvitationOnboarding({
          rawToken: parsed.data.token,
          password: parsed.data.password,
          fullName: parsed.data.fullName,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null,
          sessionTtlHours: env.sessionTtlHours,
          ensureCompanyRolesAndOwnerMembership: (company) =>
            teamService.ensureCompanyRolesAndOwnerMembership(company),
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
          data: {
            link: result.link,
          },
        });
      } catch (err) {
        handleNetworkError(res, err);
      }
    },
  );

  /**
   * POST /api/v1/network/invitations/accept
   * Local company manager accepts the network invitation and shares permitted branches.
   */
  router.post(
    "/invitations/accept",
    requirePermission("network", "manage"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const parsed = acceptInvitationSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            ok: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invalid invitation acceptance payload.",
              issues: parsed.error.issues,
            },
          });
          return;
        }

        const actor = req.tenantActor!;
        const result = await networkService.acceptNetworkInvitation(
          parsed.data.token,
          actor.company.id,
          actor.user.id,
          { permittedBranchIds: parsed.data.permittedBranchIds },
        );

        res.status(200).json({
          ok: true,
          data: result,
        });
      } catch (err) {
        handleNetworkError(res, err);
      }
    },
  );

  /**
   * PATCH /api/v1/network/links/:linkId/status
   * Toggle network link status (active | paused).
   */
  router.patch(
    "/links/:linkId/status",
    requirePermission("network", "manage"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const linkId = Array.isArray(req.params.linkId)
          ? req.params.linkId[0]
          : String(req.params.linkId || "");
        const parsed = updateLinkStatusSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            ok: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invalid status payload. Must be 'active' or 'paused'.",
            },
          });
          return;
        }

        const actor = req.tenantActor!;
        const updated = await networkService.updateLinkStatus(
          actor.company.id,
          actor.user.id,
          linkId,
          parsed.data.status,
        );

        res.status(200).json({
          ok: true,
          data: { link: updated },
        });
      } catch (err) {
        handleNetworkError(res, err);
      }
    },
  );

  /**
   * PUT /api/v1/network/links/:linkId/branches
   * Update permitted branches shared across the network link.
   */
  router.put(
    "/links/:linkId/branches",
    requirePermission("network", "manage"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const linkId = Array.isArray(req.params.linkId)
          ? req.params.linkId[0]
          : String(req.params.linkId || "");
        const parsed = updatePermittedBranchesSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            ok: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invalid branch IDs array.",
            },
          });
          return;
        }

        const actor = req.tenantActor!;
        const permitted = await networkService.updatePermittedBranches(
          actor.company.id,
          linkId,
          parsed.data.branchIds,
        );

        res.status(200).json({
          ok: true,
          data: { permittedBranches: permitted },
        });
      } catch (err) {
        handleNetworkError(res, err);
      }
    },
  );

  /**
   * DELETE /api/v1/network/links/:linkId
   * Terminate network link with a local partner.
   */
  router.delete(
    "/links/:linkId",
    requirePermission("network", "manage"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const linkId = Array.isArray(req.params.linkId)
          ? req.params.linkId[0]
          : String(req.params.linkId || "");
        const actor = req.tenantActor!;
        await networkService.terminateLink(actor.company.id, actor.user.id, linkId);

        res.status(200).json({
          ok: true,
          data: { terminated: true },
        });
      } catch (err) {
        handleNetworkError(res, err);
      }
    },
  );

  return router;
}
