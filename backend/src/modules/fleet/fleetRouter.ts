import { Router } from "express";
import type { BackendEnvConfig } from "../../config/env.ts";
import { createRateLimiter } from "../../security/rateLimiter.ts";
import type { AuthService } from "../auth/authService.ts";
import { createRbacGuards } from "../team/rbacMiddleware.ts";
import type { TeamService } from "../team/teamService.ts";
import type { FleetService } from "./fleetService.ts";
import { registerMetricsRoutes } from "./routes/metrics.routes.ts";
import { registerPurchaseOrdersRoutes } from "./routes/purchaseOrders.routes.ts";
import { registerInsuranceCompaniesRoutes } from "./routes/insuranceCompanies.routes.ts";
import { registerVehicleLifecycleRoutes } from "./routes/vehicleLifecycle.routes.ts";
import { registerCatalogRoutes } from "./routes/catalog.routes.ts";
import { registerVendorsRoutes } from "./routes/vendors.routes.ts";
import { registerVehiclesRoutes } from "./routes/vehicles.routes.ts";
import { registerPhotosRoutes } from "./routes/photos.routes.ts";
import { registerInclusionsRoutes } from "./routes/inclusions.routes.ts";
import { registerCustomersRoutes } from "./routes/customers.routes.ts";
import { registerContractsRoutes } from "./routes/contracts.routes.ts";

export function createFleetRouter(options: {
 authService: AuthService; teamService: TeamService; fleetService: FleetService; env: BackendEnvConfig;
}): Router {
 const router = Router();
 const context = { fleetService: options.fleetService, guards: createRbacGuards(options) };
 router.use(createRateLimiter({ windowMs: 60_000, maxRequests: 200 }));
 registerMetricsRoutes(router, context);
 registerPurchaseOrdersRoutes(router, context);
 registerInsuranceCompaniesRoutes(router, context);
 registerVehicleLifecycleRoutes(router, context);
 registerCatalogRoutes(router, context);
 registerVendorsRoutes(router, context);
 registerVehiclesRoutes(router, context);
 registerPhotosRoutes(router, context);
 registerInclusionsRoutes(router, context);
 registerCustomersRoutes(router, context);
 registerContractsRoutes(router, context);
 return router;
}
