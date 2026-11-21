import { createPurchaseOrderSchema, updatePoStatusSchema, receiveVehicleSchema } from ".././fleetSchemas.ts";
import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { paginateResponse, handleFleetError } from "../fleetHttp.ts";

export function registerPurchaseOrdersRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.post(
    "/purchase-orders/:id/sign",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const poId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const signatureDataUrl =
        typeof req.body?.signatureDataUrl === "string"
          ? req.body.signatureDataUrl.trim()
          : "";
      if (!poId || !signatureDataUrl.startsWith("data:image/")) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Valid electronic signature image is required.",
          },
        });
        return;
      }
      try {
        const updated = await fleetService.signPurchaseOrder(
          req.tenantActor!,
          poId,
          signatureDataUrl,
        );
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.get(
    "/purchase-orders",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
        const vendorId = typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
        const status = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
        const pos = await fleetService.listPurchaseOrders(req.tenantActor!, {
          branchId,
          vendorId,
          status,
        });
        res.status(200).json(paginateResponse(pos, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/purchase-orders",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createPurchaseOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid purchase order details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const po = await fleetService.createPurchaseOrder(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: po });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.get(
    "/purchase-orders/:id",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const poId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!poId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "PO ID is required." } });
        return;
      }
      try {
        const po = await fleetService.getPurchaseOrder(req.tenantActor!, poId);
        res.status(200).json({ ok: true, data: po });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.patch(
    "/purchase-orders/:id/status",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const poId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!poId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "PO ID is required." } });
        return;
      }
      const parsed = updatePoStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid purchase order status.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updatePurchaseOrderStatus(
          req.tenantActor!,
          poId,
          parsed.data.status,
        );
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/purchase-orders/:id/receive",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const poId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!poId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "PO ID is required." } });
        return;
      }
      const parsed = receiveVehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle receiving details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const result = await fleetService.receiveVehicleFromPo(req.tenantActor!, {
          ...parsed.data,
          purchaseOrderId: poId,
          branchId: parsed.data.branchId || "",
        });
        res.status(201).json({ ok: true, data: result });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

