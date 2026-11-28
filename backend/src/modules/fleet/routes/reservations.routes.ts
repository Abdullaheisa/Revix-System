import { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { handleFleetError } from "../fleetHttp.ts";
import type { ReservationSource, ReservationStatus } from "../../../db/contracts/rentals.ts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerReservationsRoutes(
  router: Router,
  { guards, fleetService }: FleetRouteContext,
): void {
  router.get(
    "/reservations",
    guards.requirePermission("sales", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const rows = await fleetService.listReservations(req.tenantActor!);
        res.status(200).json({ ok: true, data: rows });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.get(
    "/reservations/:id",
    guards.requirePermission("sales", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_RESERVATION_ID", message: "Invalid reservation ID." } });
        return;
      }
      try {
        const row = await fleetService.getReservation(req.tenantActor!, id);
        res.status(200).json({ ok: true, data: row });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/reservations",
    guards.requirePermission("sales", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const created = await fleetService.createReservation(req.tenantActor!, {
          branchId: String(req.body?.branchId ?? ""),
          returnBranchId: typeof req.body?.returnBranchId === "string" && req.body.returnBranchId.trim() ? req.body.returnBranchId.trim() : null,
          customerId: String(req.body?.customerId ?? ""),
          variantId: String(req.body?.variantId ?? ""),
          allowSimilar: req.body?.allowSimilar !== false,
          source: (req.body?.source as ReservationSource) || "phone",
          externalBookingRef: typeof req.body?.externalBookingRef === "string" ? req.body.externalBookingRef.trim() || null : null,
          externalMetadata: req.body?.externalMetadata && typeof req.body.externalMetadata === "object" ? req.body.externalMetadata : null,
          status: req.body?.status === "pending" ? "pending" : "confirmed",
          pickupDate: String(req.body?.pickupDate ?? ""),
          pickupTime: typeof req.body?.pickupTime === "string" ? req.body.pickupTime.trim() || null : null,
          returnDate: String(req.body?.returnDate ?? ""),
          returnTime: typeof req.body?.returnTime === "string" ? req.body.returnTime.trim() || null : null,
          dailyRate: req.body?.dailyRate != null ? Number(req.body.dailyRate) : undefined,
          notes: typeof req.body?.notes === "string" ? req.body.notes.trim() || null : null,
        });
        res.status(201).json({ ok: true, data: created });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.patch(
    "/reservations/:id/status",
    guards.requirePermission("sales", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_RESERVATION_ID", message: "Invalid reservation ID." } });
        return;
      }
      try {
        const updated = await fleetService.updateReservationStatus(
          req.tenantActor!,
          id,
          String(req.body?.status ?? "") as ReservationStatus,
        );
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.get(
    "/reservations/:id/available-vehicles",
    guards.requirePermission("sales", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_RESERVATION_ID", message: "Invalid reservation ID." } });
        return;
      }
      try {
        const result = await fleetService.getReservationAvailableVehicles(req.tenantActor!, id);
        res.status(200).json({ ok: true, data: result });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/reservations/:id/convert",
    guards.requirePermission("sales", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || !UUID_REGEX.test(id)) {
        res.status(400).json({ ok: false, error: { code: "INVALID_RESERVATION_ID", message: "Invalid reservation ID." } });
        return;
      }
      try {
        const result = await fleetService.convertReservationToContract(req.tenantActor!, id, {
          vehicleId: String(req.body?.vehicleId ?? ""),
          pickupOdometer: req.body?.pickupOdometer != null ? Number(req.body.pickupOdometer) : undefined,
          dailyRate: req.body?.dailyRate != null ? Number(req.body.dailyRate) : undefined,
          discount: req.body?.discount != null ? Number(req.body.discount) : 0,
          insuranceFee: req.body?.insuranceFee != null ? Number(req.body.insuranceFee) : 0,
          notes: typeof req.body?.notes === "string" ? req.body.notes.trim() || null : null,
        });
        res.status(201).json({ ok: true, data: result });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}
