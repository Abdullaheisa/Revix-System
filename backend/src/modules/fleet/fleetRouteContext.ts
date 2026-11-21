import type { createRbacGuards } from "../team/rbacMiddleware.ts";
import type { FleetService } from "./fleetService.ts";
export interface FleetRouteContext { guards: ReturnType<typeof createRbacGuards>; fleetService: FleetService; }
