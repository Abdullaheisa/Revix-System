import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { handleFleetError } from "../fleetHttp.ts";

export function registerMetricsRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/metrics",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
        const metrics = await fleetService.getFleetMetrics(req.tenantActor!, branchId);
        res.status(200).json({ ok: true, data: metrics });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

