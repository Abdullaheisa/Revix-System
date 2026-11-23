import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { handleFleetError } from "../fleetHttp.ts";

export function registerInsuranceCompaniesRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/insurance-companies",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const list = await fleetService.listInsuranceCompanies(req.tenantActor!);
        res.status(200).json({ ok: true, data: list });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/insurance-companies",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      if (!name) {
        res.status(400).json({
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Insurance company name is required." },
        });
        return;
      }
      try {
        const created = await fleetService.createInsuranceCompany(req.tenantActor!, {
          name,
          contactPerson: req.body?.contactPerson ?? null,
          phone: req.body?.phone ?? null,
          email: req.body?.email ?? null,
          address: req.body?.address ?? null,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.get(
    "/insurance-companies/:id/policies",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const list = await fleetService.listInsurancePoliciesByInsuranceCompany(
          req.tenantActor!,
          id!,
        );
        res.status(200).json({ ok: true, data: list });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.delete(
    "/insurance-companies/:id",
    guards.requirePermission("fleet", "delete"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      try {
        const deleted = await fleetService.deleteInsuranceCompany(req.tenantActor!, id!);
        res.status(200).json({ ok: true, data: { deleted } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

