import { createVehicleSchema, updateVehicleSchema, updateVehicleStatusSchema } from ".././fleetSchemas.ts";
import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { paginateResponse, handleFleetError } from "../fleetHttp.ts";

export function registerVehiclesRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/vehicles",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
        const status = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
        const variantId = typeof req.query.variantId === "string" ? req.query.variantId : undefined;
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const includeNetwork = req.query.includeNetwork === "true" || req.query.includeNetwork === "1";

        const vehicles = await fleetService.listVehicles(req.tenantActor!, {
          branchId,
          status,
          variantId,
          search,
          includeNetwork,
        });
        res.status(200).json(paginateResponse(vehicles, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/vehicles",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createVehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle registration details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const vehicle = await fleetService.createVehicle(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: vehicle });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.get(
    "/vehicles/:id",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vehicleId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vehicleId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vehicle ID is required." } });
        return;
      }
      try {
        const vehicle = await fleetService.getVehicle(req.tenantActor!, vehicleId);
        res.status(200).json({ ok: true, data: vehicle });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.put(
    "/vehicles/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vehicleId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vehicleId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vehicle ID is required." } });
        return;
      }
      const parsed = updateVehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle update details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateVehicle(req.tenantActor!, vehicleId, parsed.data);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.patch(
    "/vehicles/:id/status",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vehicleId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vehicleId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vehicle ID is required." } });
        return;
      }
      const parsed = updateVehicleStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle status.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateVehicleStatus(
          req.tenantActor!,
          vehicleId,
          parsed.data.status,
        );
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.patch(
    "/vehicles/:id/bookable",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const updated = await fleetService.toggleVehicleBookable(
          req.tenantActor!,
          id!,
          Boolean(req.body?.isBookable),
        );
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

