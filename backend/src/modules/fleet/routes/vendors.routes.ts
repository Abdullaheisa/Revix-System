import { createVendorSchema, updateVendorSchema } from ".././fleetSchemas.ts";
import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { paginateResponse, handleFleetError } from "../fleetHttp.ts";

export function registerVendorsRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/vendors",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const category = typeof req.query.category === "string" ? (req.query.category as any) : undefined;
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const vendors = await fleetService.listVendors(req.tenantActor!, { category, search });
        res.status(200).json(paginateResponse(vendors, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/vendors",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vendor details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const vendor = await fleetService.createVendor(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: vendor });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.get(
    "/vendors/:id",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vendorId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vendorId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vendor ID is required." } });
        return;
      }
      try {
        const vendor = await fleetService.getVendor(req.tenantActor!, vendorId);
        res.status(200).json({ ok: true, data: vendor });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.put(
    "/vendors/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vendorId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vendorId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vendor ID is required." } });
        return;
      }
      const parsed = updateVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vendor update details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateVendor(req.tenantActor!, vendorId, parsed.data);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

