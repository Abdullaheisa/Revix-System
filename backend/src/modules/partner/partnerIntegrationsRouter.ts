import crypto from "node:crypto";
import { Router, type Response } from "express";
import type { BackendEnvConfig } from "../../config/env.ts";
import type { AuthDataStore } from "../../db/store.ts";
import type { PartnerApiKeyStatus } from "../../db/contracts/workspace.ts";
import type { AuthService } from "../auth/authService.ts";
import type { TeamService } from "../team/teamService.ts";
import {
  createRbacGuards,
  type AuthenticatedTenantRequest,
} from "../team/rbacMiddleware.ts";

const PARTNER_PUBLIC_ORIGIN = "https://apisystem.revixmobility.com";

export function createPartnerIntegrationsRouter(options: {
  authService: AuthService;
  teamService: TeamService;
  store: AuthDataStore;
  env: BackendEnvConfig;
}): Router {
  const router = Router();
  const guards = createRbacGuards({
    authService: options.authService,
    teamService: options.teamService,
    env: options.env,
  });

  const requireParentCompany = (req: AuthenticatedTenantRequest, res: Response) => {
    const actor = req.tenantActor!;
    if (actor.company.operatingMode !== "network_main") {
      res.status(403).json({
        ok: false,
        error: {
          code: "PARENT_COMPANY_ONLY",
          message: "Partner API integrations are only available for parent (network_main) companies.",
        },
      });
      return null;
    }
    return actor;
  };

  router.get(
    "/",
    guards.requirePermission("network", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const actor = requireParentCompany(req, res);
      if (!actor) return;

      try {
        const partnerSlug = await options.store.ensureCompanyPartnerSlug(actor.company.id);
        const keys = await options.store.listPartnerApiKeys(actor.company.id);

        res.status(200).json({
          ok: true,
          data: {
            partnerSlug,
            baseUrl: `${PARTNER_PUBLIC_ORIGIN}/api/v1/partner/${partnerSlug}`,
            keys: keys.map(({ keyHash: _hash, ...safe }) => safe),
          },
        });
      } catch (err) {
        console.error("[PartnerIntegrations] GET / error:", err);
        res.status(500).json({
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Failed to load partner integrations." },
        });
      }
    },
  );

  router.post(
    "/keys",
    guards.requirePermission("company", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const actor = requireParentCompany(req, res);
      if (!actor) return;

      const partnerName = String(req.body?.partnerName ?? "").trim();
      const partnerWebsiteUrl = String(req.body?.partnerWebsiteUrl ?? "").trim();
      if (!partnerName || !partnerWebsiteUrl) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "partnerName and partnerWebsiteUrl are required.",
          },
        });
        return;
      }

      try {
        const rawApiKey = `rvx_live_${crypto.randomBytes(24).toString("hex")}`;
        const keyPrefix = rawApiKey.slice(0, 14);
        const keyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

        const created = await options.store.createPartnerApiKey({
          companyId: actor.company.id,
          partnerName,
          partnerWebsiteUrl,
          keyPrefix,
          keyHash,
          scopes: ["read", "book", "cancel"],
          createdByUserId: actor.user.id,
        });

        const { keyHash: _omit, ...safeKey } = created;
        res.status(201).json({
          ok: true,
          data: {
            key: safeKey,
            rawApiKey,
          },
        });
      } catch (err) {
        console.error("[PartnerIntegrations] POST /keys error:", err);
        res.status(500).json({
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Failed to create partner API key." },
        });
      }
    },
  );

  router.patch(
    "/keys/:id/status",
    guards.requirePermission("company", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const actor = requireParentCompany(req, res);
      if (!actor) return;

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const status = String(req.body?.status ?? "").trim() as PartnerApiKeyStatus;
      if (!id || !["active", "suspended", "revoked"].includes(status)) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Valid key id and status (active, suspended, revoked) are required.",
          },
        });
        return;
      }

      try {
        const updated = await options.store.updatePartnerApiKeyStatus(
          actor.company.id,
          id,
          status,
        );
        if (!updated) {
          res.status(404).json({
            ok: false,
            error: { code: "KEY_NOT_FOUND", message: "Partner API key not found." },
          });
          return;
        }

        const { keyHash: _omit, ...safeKey } = updated;
        res.status(200).json({ ok: true, data: safeKey });
      } catch (err) {
        console.error("[PartnerIntegrations] PATCH /keys/:id/status error:", err);
        res.status(500).json({
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "Failed to update key status." },
        });
      }
    },
  );

  return router;
}
