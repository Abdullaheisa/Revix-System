import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { handleFleetError } from "../fleetHttp.ts";

export function registerVehicleLifecycleRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/vehicles/:id/lifecycle",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const profile = await fleetService.getVehicleLifecycleProfile(req.tenantActor!, id!);
        res.status(200).json({ ok: true, data: profile });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/vehicles/:id/insurance",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const policy = await fleetService.upsertVehicleInsurancePolicy(req.tenantActor!, id!, {
          insuranceCompanyId: req.body?.insuranceCompanyId ?? null,
          providerName: String(req.body?.providerName ?? ""),
          policyNumber: String(req.body?.policyNumber ?? ""),
          coverageType: String(req.body?.coverageType ?? "comprehensive"),
          premiumAmount: Number(req.body?.premiumAmount ?? 0),
          deductibleAmount: Number(req.body?.deductibleAmount ?? 0),
          startDate: String(req.body?.startDate ?? ""),
          expiryDate: String(req.body?.expiryDate ?? ""),
          notes: req.body?.notes ?? null,
        });
        res.status(201).json({ ok: true, data: policy });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.patch(
    "/vehicles/:id/pricing",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const updated = await fleetService.updateVehiclePricingTiers(req.tenantActor!, id!, {
          dailyRate1to2: Number(req.body?.dailyRate1to2 ?? 0),
          dailyRate3to7: Number(req.body?.dailyRate3to7 ?? 0),
          dailyRate8Plus: Number(req.body?.dailyRate8Plus ?? 0),
          damageExcess: Number(req.body?.damageExcess ?? 0),
          mileagePolicy: req.body?.mileagePolicy === "limited" ? "limited" : "unlimited",
          dailyKmLimit: Number(req.body?.dailyKmLimit ?? 0),
          extraKmRate: Number(req.body?.extraKmRate ?? 0),
        });
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/vehicles/:id/maintenance",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const log = await fleetService.addVehicleMaintenanceLog(req.tenantActor!, id!, {
          serviceType: String(req.body?.serviceType ?? ""),
          workshopName: req.body?.workshopName ?? null,
          odometerAtService: Number(req.body?.odometerAtService ?? 0),
          nextServiceKm: req.body?.nextServiceKm != null ? Number(req.body.nextServiceKm) : null,
          nextServiceDate: req.body?.nextServiceDate ?? null,
          cost: Number(req.body?.cost ?? 0),
          status: String(req.body?.status ?? "completed"),
          notes: req.body?.notes ?? null,
          serviceDate: String(req.body?.serviceDate ?? new Date().toISOString().slice(0, 10)),
        });
        res.status(201).json({ ok: true, data: log });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/vehicles/:id/inspections",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const insp = await fleetService.addVehicleInspection(req.tenantActor!, id!, {
          inspectionType: String(req.body?.inspectionType ?? "checkin"),
          bookingRef: req.body?.bookingRef ?? null,
          customerName: req.body?.customerName ?? null,
          odometerKm: Number(req.body?.odometerKm ?? 0),
          hasAccident: Boolean(req.body?.hasAccident),
          accidentNotes: req.body?.accidentNotes ?? null,
          damagePoints: Array.isArray(req.body?.damagePoints) ? req.body.damagePoints : [],
        });
        res.status(201).json({ ok: true, data: insp });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

