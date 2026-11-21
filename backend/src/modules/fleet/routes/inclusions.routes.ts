import { createRentalInclusionSchema, updateRentalInclusionSchema } from ".././fleetSchemas.ts";
import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { paginateResponse, handleFleetError } from "../fleetHttp.ts";

export function registerInclusionsRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/inclusions",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const activeOnly = req.query.activeOnly === "true";
        const inclusions = await fleetService.listRentalInclusions(req.tenantActor!, search, activeOnly);
        res.status(200).json(paginateResponse(inclusions, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/inclusions",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createRentalInclusionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid rental inclusion details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const inclusion = await fleetService.createRentalInclusion(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: inclusion });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.patch(
    "/inclusions/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const inclusionId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!inclusionId) {
        res.status(400).json({
          ok: false,
          error: { code: "BAD_REQUEST", message: "Inclusion ID is required." },
        });
        return;
      }

      const parsed = updateRentalInclusionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid update payload.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateRentalInclusion(req.tenantActor!, inclusionId, parsed.data);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.delete(
    "/inclusions/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const inclusionId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!inclusionId) {
        res.status(400).json({
          ok: false,
          error: { code: "BAD_REQUEST", message: "Inclusion ID is required." },
        });
        return;
      }

      try {
        const deleted = await fleetService.deleteRentalInclusion(req.tenantActor!, inclusionId);
        res.status(200).json({ ok: true, data: { deleted } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

