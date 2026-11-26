import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { handleFleetError } from "../fleetHttp.ts";

export function registerCustomersRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/customers",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const customers = await fleetService.listCustomers(req.tenantActor!);
        res.status(200).json({ ok: true, data: customers });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/customers",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const created = await fleetService.createCustomer(req.tenantActor!, {
          fullName: String(req.body?.fullName ?? ""),
          phone: String(req.body?.phone ?? ""),
          secondaryPhone: req.body?.secondaryPhone ?? null,
          email: req.body?.email ?? null,
          nationalId: req.body?.nationalId ?? null,
          nationalIdExpiry: req.body?.nationalIdExpiry ?? null,
          driverLicenseNo: req.body?.driverLicenseNo ?? null,
          licenseExpiry: req.body?.licenseExpiry ?? null,
          nationality: req.body?.nationality ?? null,
          address: req.body?.address ?? null,
          workAddress: req.body?.workAddress ?? null,
          notes: req.body?.notes ?? null,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.patch(
    "/customers/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const updated = await fleetService.updateCustomer(req.tenantActor!, id!, {
          fullName: String(req.body?.fullName ?? ""),
          phone: String(req.body?.phone ?? ""),
          secondaryPhone: req.body?.secondaryPhone ?? null,
          email: req.body?.email ?? null,
          nationalId: req.body?.nationalId ?? null,
          nationalIdExpiry: req.body?.nationalIdExpiry ?? null,
          driverLicenseNo: req.body?.driverLicenseNo ?? null,
          licenseExpiry: req.body?.licenseExpiry ?? null,
          nationality: req.body?.nationality ?? null,
          address: req.body?.address ?? null,
          workAddress: req.body?.workAddress ?? null,
          notes: req.body?.notes ?? null,
        });
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.delete(
    "/customers/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const deleted = await fleetService.deleteCustomer(req.tenantActor!, id!);
        res.status(200).json({ ok: true, data: { deleted } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

