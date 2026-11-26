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
          securityDeposit: req.body?.securityDeposit != null ? Number(req.body.securityDeposit) : 0,
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

  router.patch(
    "/variants/:variantId/pricing",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const variantId = Array.isArray(req.params.variantId)
        ? req.params.variantId[0]
        : req.params.variantId;
      if (!variantId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Variant ID is required." } });
        return;
      }
      try {
        const result = await fleetService.updateVariantPricingTiers(req.tenantActor!, variantId, {
          dailyRate1to2: Number(req.body?.dailyRate1to2 ?? 0),
          dailyRate3to7: Number(req.body?.dailyRate3to7 ?? 0),
          dailyRate8Plus: Number(req.body?.dailyRate8Plus ?? 0),
          damageExcess: Number(req.body?.damageExcess ?? 0),
          securityDeposit: req.body?.securityDeposit != null ? Number(req.body.securityDeposit) : undefined,
          mileagePolicy: req.body?.mileagePolicy === "limited" ? "limited" : req.body?.mileagePolicy === "unlimited" ? "unlimited" : undefined,
          dailyKmLimit: req.body?.dailyKmLimit != null ? Number(req.body.dailyKmLimit) : undefined,
          extraKmRate: req.body?.extraKmRate != null ? Number(req.body.extraKmRate) : undefined,
          branchId: req.body?.branchId ? String(req.body.branchId) : undefined,
        });
        res.status(200).json({ ok: true, data: result });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.patch(
    "/variants/:variantId/listing-setup",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const variantId = Array.isArray(req.params.variantId)
        ? req.params.variantId[0]
        : req.params.variantId;
      if (!variantId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Variant ID is required." } });
        return;
      }
      try {
        const body = req.body ?? {};
        const result = await fleetService.applyVariantListingSetup(req.tenantActor!, variantId, {
          photoUrl: body.photoUrl !== undefined ? (body.photoUrl ? String(body.photoUrl) : null) : undefined,
          locationType: body.locationType !== undefined ? String(body.locationType) : undefined,
          fuelPolicy: body.fuelPolicy !== undefined ? String(body.fuelPolicy) : undefined,
          instantConfirmation: body.instantConfirmation !== undefined ? Boolean(body.instantConfirmation) : undefined,
          description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
          deliveryPolicy: body.deliveryPolicy !== undefined ? (body.deliveryPolicy ? String(body.deliveryPolicy) : null) : undefined,
          dailyRate1to2: body.dailyRate1to2 !== undefined ? Number(body.dailyRate1to2) : undefined,
          dailyRate3to7: body.dailyRate3to7 !== undefined ? Number(body.dailyRate3to7) : undefined,
          dailyRate8Plus: body.dailyRate8Plus !== undefined ? Number(body.dailyRate8Plus) : undefined,
          damageExcess: body.damageExcess !== undefined ? Number(body.damageExcess) : undefined,
          mileagePolicy: body.mileagePolicy === "limited" ? "limited" : body.mileagePolicy === "unlimited" ? "unlimited" : undefined,
          dailyKmLimit: body.dailyKmLimit !== undefined ? (body.dailyKmLimit != null ? Number(body.dailyKmLimit) : null) : undefined,
          extraKmRate: body.extraKmRate !== undefined ? (body.extraKmRate != null ? Number(body.extraKmRate) : null) : undefined,
          inclusions: Array.isArray(body.inclusions) ? body.inclusions.map((x: unknown) => String(x)) : undefined,
          seats: body.seats !== undefined ? Number(body.seats) : undefined,
          doors: body.doors !== undefined ? Number(body.doors) : undefined,
          airConditioning: body.airConditioning !== undefined ? Boolean(body.airConditioning) : undefined,
          fuelType: body.fuelType !== undefined ? String(body.fuelType) : undefined,
          luggageCapacity: body.luggageCapacity !== undefined ? String(body.luggageCapacity) : undefined,
          transmission: body.transmission !== undefined ? String(body.transmission) : undefined,
          publishToFleet: body.publishToFleet !== undefined ? Boolean(body.publishToFleet) : true,
        });
        res.status(200).json({ ok: true, data: result });
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

  router.get(
    "/audit-logs",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
        const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
        const actorUserId = typeof req.query.actorUserId === "string" ? req.query.actorUserId : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const logs = await fleetService.listAuditLogs(req.tenantActor!, {
          entityType,
          entityId,
          actorUserId,
          limit,
        });
        res.status(200).json({ ok: true, data: logs });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  // --- Drivers Directory ---
  router.get(
    "/drivers",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const drivers = await fleetService.listDrivers(req.tenantActor!);
        res.status(200).json({ ok: true, data: drivers });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/drivers",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const driver = await fleetService.createDriver(req.tenantActor!, {
          fullName: String(req.body?.fullName ?? ""),
          phonePrimary: String(req.body?.phonePrimary ?? ""),
          phoneSecondary: req.body?.phoneSecondary ?? null,
          email: req.body?.email ?? null,
          licenseNumber: String(req.body?.licenseNumber ?? ""),
          licenseIssueDate: String(req.body?.licenseIssueDate ?? ""),
          licenseExpiryDate: String(req.body?.licenseExpiryDate ?? ""),
          passportNumber: req.body?.passportNumber ?? null,
          nationalIdNumber: req.body?.nationalIdNumber ?? null,
          idCardPhotoUrl: req.body?.idCardPhotoUrl ?? null,
          passportPhotoUrl: req.body?.passportPhotoUrl ?? null,
          licensePhotoUrl: req.body?.licensePhotoUrl ?? null,
          address: req.body?.address ?? null,
          status: req.body?.status === "inactive" ? "inactive" : "active",
        });
        res.status(201).json({ ok: true, data: driver });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.patch(
    "/drivers/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const driver = await fleetService.updateDriver(req.tenantActor!, id!, {
          fullName: String(req.body?.fullName ?? ""),
          phonePrimary: String(req.body?.phonePrimary ?? ""),
          phoneSecondary: req.body?.phoneSecondary ?? null,
          email: req.body?.email ?? null,
          licenseNumber: String(req.body?.licenseNumber ?? ""),
          licenseIssueDate: String(req.body?.licenseIssueDate ?? ""),
          licenseExpiryDate: String(req.body?.licenseExpiryDate ?? ""),
          passportNumber: req.body?.passportNumber ?? null,
          nationalIdNumber: req.body?.nationalIdNumber ?? null,
          idCardPhotoUrl: req.body?.idCardPhotoUrl ?? null,
          passportPhotoUrl: req.body?.passportPhotoUrl ?? null,
          licensePhotoUrl: req.body?.licensePhotoUrl ?? null,
          address: req.body?.address ?? null,
          status: req.body?.status === "inactive" ? "inactive" : "active",
        });
        res.status(200).json({ ok: true, data: driver });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.delete(
    "/drivers/:id",
    guards.requirePermission("fleet", "delete"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        await fleetService.deleteDriver(req.tenantActor!, id!);
        res.status(200).json({ ok: true });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  // --- Vehicle Movements & Branch Transfers ---
  router.get(
    "/movements",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const vehicleId = typeof req.query.vehicleId === "string" ? req.query.vehicleId : undefined;
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        const toBranchId = typeof req.query.toBranchId === "string" ? req.query.toBranchId : undefined;
        const movements = await fleetService.listVehicleMovements(req.tenantActor!, {
          vehicleId,
          status,
          toBranchId,
        });
        res.status(200).json({ ok: true, data: movements });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/movements",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const movement = await fleetService.dispatchVehicleMovement(req.tenantActor!, {
          vehicleId: String(req.body?.vehicleId ?? ""),
          toBranchId: String(req.body?.toBranchId ?? ""),
          driverId: String(req.body?.driverId ?? ""),
          dispatchOdometerKm: Number(req.body?.dispatchOdometerKm ?? 0),
          notes: req.body?.notes ?? null,
        });
        res.status(201).json({ ok: true, data: movement });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/movements/:id/receive",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const movement = await fleetService.receiveVehicleMovement(req.tenantActor!, id!, {
          arrivalOdometerKm: Number(req.body?.arrivalOdometerKm ?? 0),
          notes: req.body?.notes ?? null,
        });
        res.status(200).json({ ok: true, data: movement });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/movements/:id/cancel",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const movement = await fleetService.cancelVehicleMovement(req.tenantActor!, id!);
        res.status(200).json({ ok: true, data: movement });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

