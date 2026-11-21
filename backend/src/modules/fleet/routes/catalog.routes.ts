import { createVariantSchema, updateVariantSchema } from ".././fleetSchemas.ts";
import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { paginateResponse, handleFleetError } from "../fleetHttp.ts";

export function registerCatalogRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/makes",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const makes = await fleetService.listVehicleMakes(req.tenantActor!);
        res.status(200).json({ ok: true, data: makes });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/makes",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name) {
        res.status(400).json({
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Manufacturer name is required." },
        });
        return;
      }
      try {
        const make = await fleetService.createVehicleMake(req.tenantActor!, name);
        res.status(201).json({ ok: true, data: make });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/makes/:makeId/models",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const makeId = Array.isArray(req.params.makeId)
        ? req.params.makeId[0]
        : req.params.makeId;
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!makeId || !name) {
        res.status(400).json({
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Make ID and model name are required." },
        });
        return;
      }
      try {
        const model = await fleetService.createVehicleModel(req.tenantActor!, makeId, name);
        res.status(201).json({ ok: true, data: model });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.get(
    "/variants",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const category = typeof req.query.category === "string" ? (req.query.category as any) : undefined;
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const variants = await fleetService.listVariants(req.tenantActor!, { category, search });
        res.status(200).json(paginateResponse(variants, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/variants",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createVariantSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle variant details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const variant = await fleetService.createVariant(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: variant });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.get(
    "/variants/:id",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const variantId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!variantId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Variant ID is required." } });
        return;
      }
      try {
        const variant = await fleetService.getVariant(req.tenantActor!, variantId);
        res.status(200).json({ ok: true, data: variant });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.put(
    "/variants/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const variantId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!variantId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Variant ID is required." } });
        return;
      }
      const parsed = updateVariantSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid variant update details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateVariant(req.tenantActor!, variantId, parsed.data);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.delete(
    "/variants/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const variantId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!variantId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Variant ID is required." } });
        return;
      }
      try {
        await fleetService.deleteVariant(req.tenantActor!, variantId);
        res.status(200).json({ ok: true, data: { archived: true } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

