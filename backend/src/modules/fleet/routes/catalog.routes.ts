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

  router.delete(
    "/makes/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Make ID is required." } });
        return;
      }
      try {
        await fleetService.deleteVehicleMake(req.tenantActor!, id);
        res.status(200).json({ ok: true, data: { deleted: true } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.delete(
    "/models/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Model ID is required." } });
        return;
      }
      try {
        await fleetService.deleteVehicleModel(req.tenantActor!, id);
        res.status(200).json({ ok: true, data: { deleted: true } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  // --- Vehicle Colors Master ---
  router.get(
    "/colors",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const colors = await fleetService.listVehicleColors(req.tenantActor!);
        res.status(200).json({ ok: true, data: colors });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/colors",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const rawAr = typeof req.body?.nameAr === "string" ? req.body.nameAr.trim() : "";
      const rawEn = typeof req.body?.nameEn === "string" ? req.body.nameEn.trim() : "";
      const nameAr = rawAr || rawEn || rawName;
      const nameEn = rawEn || rawAr || rawName;
      const colorType =
        typeof req.body?.colorType === "string" && req.body.colorType.trim()
          ? req.body.colorType.trim()
          : "exterior";
      if (!nameAr) {
        res.status(400).json({
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Color name is required." },
        });
        return;
      }
      try {
        const created = await fleetService.createVehicleColor(req.tenantActor!, {
          colorType,
          nameEn: nameEn || nameAr,
          nameAr,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.delete(
    "/colors/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Color ID is required." } });
        return;
      }
      try {
        await fleetService.deleteVehicleColor(req.tenantActor!, id);
        res.status(200).json({ ok: true, data: { deleted: true } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  // --- Vehicle Body Styles Master ---
  router.get(
    "/body-styles",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const styles = await fleetService.listVehicleBodyStyles(req.tenantActor!);
        res.status(200).json({ ok: true, data: styles });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/body-styles",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const rawAr = typeof req.body?.nameAr === "string" ? req.body.nameAr.trim() : "";
      const rawEn = typeof req.body?.nameEn === "string" ? req.body.nameEn.trim() : "";
      const nameAr = rawAr || rawEn || rawName;
      const nameEn = rawEn || rawAr || rawName;
      const code =
        typeof req.body?.code === "string" && req.body.code.trim()
          ? req.body.code.trim()
          : nameEn.toLowerCase().replace(/\s+/g, "_");
      if (!nameAr) {
        res.status(400).json({
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Body style name is required." },
        });
        return;
      }
      try {
        const created = await fleetService.createVehicleBodyStyle(req.tenantActor!, {
          code,
          nameEn: nameEn || nameAr,
          nameAr,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.delete(
    "/body-styles/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Body style ID is required." } });
        return;
      }
      try {
        await fleetService.deleteVehicleBodyStyle(req.tenantActor!, id);
        res.status(200).json({ ok: true, data: { deleted: true } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  // --- Fleet Price Lists Master ---
  router.get(
    "/price-lists",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const list = await fleetService.listFleetPriceLists(req.tenantActor!);
        res.status(200).json({ ok: true, data: list });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/price-lists",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const currencyCode =
        typeof req.body?.currencyCode === "string" ? req.body.currencyCode.trim() : "";
      const priceListType =
        typeof req.body?.priceListType === "string" ? req.body.priceListType.trim() : "spot";
      const priceType =
        typeof req.body?.priceType === "string" ? req.body.priceType.trim() : "daily_bands";
      const effectiveFrom =
        typeof req.body?.effectiveFrom === "string" && req.body.effectiveFrom.trim()
          ? req.body.effectiveFrom.trim()
          : null;
      const effectiveTo =
        typeof req.body?.effectiveTo === "string" && req.body.effectiveTo.trim()
          ? req.body.effectiveTo.trim()
          : null;

      if (!name || !currencyCode) {
        res.status(400).json({
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Price list name and currency code are required." },
        });
        return;
      }

      try {
        const created = await fleetService.createFleetPriceList(req.tenantActor!, {
          name,
          priceListType,
          currencyCode,
          effectiveFrom,
          effectiveTo,
          priceType,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.put(
    "/price-lists/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Price list ID is required." } });
        return;
      }
      try {
        const updated = await fleetService.updateFleetPriceList(req.tenantActor!, id, req.body ?? {});
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.delete(
    "/price-lists/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Price list ID is required." } });
        return;
      }
      try {
        await fleetService.deleteFleetPriceList(req.tenantActor!, id);
        res.status(200).json({ ok: true, data: { deleted: true } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

