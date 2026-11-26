import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { handleFleetError } from "../fleetHttp.ts";

export function registerContractsRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/contracts",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const contracts = await fleetService.listRentalContracts(req.tenantActor!);
        res.status(200).json({ ok: true, data: contracts });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/contracts",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const created = await fleetService.createRentalContract(req.tenantActor!, {
          vehicleId: String(req.body?.vehicleId ?? ""),
          customerId: String(req.body?.customerId ?? ""),
          startDate: String(req.body?.startDate ?? ""),
          endDate: String(req.body?.endDate ?? ""),
          pickupOdometer: req.body?.pickupOdometer != null ? Number(req.body.pickupOdometer) : undefined,
          dailyRate: req.body?.dailyRate != null ? Number(req.body.dailyRate) : undefined,
          discount: req.body?.discount != null ? Number(req.body.discount) : 0,
          insuranceFee: req.body?.insuranceFee != null ? Number(req.body.insuranceFee) : 0,
          extraCharges: req.body?.extraCharges != null ? Number(req.body.extraCharges) : 0,
          paidAmount: req.body?.paidAmount != null ? Number(req.body.paidAmount) : 0,
          depositAmount: req.body?.depositAmount != null ? Number(req.body.depositAmount) : 0,
          notes: req.body?.notes ?? null,
          customerSignatureDataUrl:
            typeof req.body?.customerSignatureDataUrl === "string" && req.body.customerSignatureDataUrl.trim()
              ? req.body.customerSignatureDataUrl.trim()
              : null,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/contracts/:id/sign",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const sig = typeof req.body?.signatureDataUrl === "string" ? req.body.signatureDataUrl.trim() : "";
      if (!sig) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Signature is required." } });
        return;
      }
      try {
        const updated = await fleetService.signRentalContract(req.tenantActor!, id!, sig);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/contracts/:id/complete",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const updated = await fleetService.completeRentalContract(req.tenantActor!, id!, {
          returnOdometer: Number(req.body?.returnOdometer ?? 0),
          extraCharges: req.body?.extraCharges != null ? Number(req.body.extraCharges) : undefined,
          paidAmount: req.body?.paidAmount != null ? Number(req.body.paidAmount) : undefined,
          returnCondition: typeof req.body?.returnCondition === "string" ? req.body.returnCondition.trim() : null,
          notes: req.body?.notes ?? null,
        });
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/contracts/:id/cancel",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const updated = await fleetService.cancelRentalContract(req.tenantActor!, id!);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

