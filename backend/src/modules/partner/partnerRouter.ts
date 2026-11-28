import crypto from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import type { AuthDataStore } from "../../db/store.ts";
import type { CompanyRecord, PartnerApiKeyRecord } from "../../db/contracts/workspace.ts";
import { PartnerApiError, PartnerOfferService } from "./partnerOfferService.ts";

interface PartnerAuthedRequest extends Request {
  partnerKey?: PartnerApiKeyRecord;
  partnerCompany?: CompanyRecord;
  requestId?: string;
}

function makeMeta(req: PartnerAuthedRequest) {
  return {
    requestId: req.requestId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

function sendError(res: Response, req: PartnerAuthedRequest, err: unknown) {
  if (err instanceof PartnerApiError) {
    res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      meta: makeMeta(req),
    });
    return;
  }
  console.error("[PartnerAPI] unexpected error:", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Temporary server error.",
    },
    meta: makeMeta(req),
  });
}

export function createPartnerRouter(deps: { store: AuthDataStore }): Router {
  const router = Router({ mergeParams: true });
  const offerService = new PartnerOfferService(deps.store);

  const authMiddleware = async (
    req: PartnerAuthedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    req.requestId = crypto.randomUUID();
    const rawHeaderKey =
      (req.headers["x-partner-api-key"] as string | undefined) ||
      (typeof req.headers.authorization === "string" &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!rawHeaderKey || !rawHeaderKey.trim()) {
      sendError(
        res,
        req,
        new PartnerApiError(401, "PARTNER_AUTH_REQUIRED", "Missing X-Partner-API-Key header."),
      );
      return;
    }

    const keyHash = crypto.createHash("sha256").update(rawHeaderKey.trim()).digest("hex");
    const apiKey = await deps.store.findPartnerApiKeyByHash(keyHash);
    if (!apiKey) {
      sendError(
        res,
        req,
        new PartnerApiError(401, "INVALID_PARTNER_API_KEY", "Invalid Partner API key."),
      );
      return;
    }

    if (apiKey.status !== "active") {
      sendError(
        res,
        req,
        new PartnerApiError(403, "PARTNER_SUSPENDED", "Partner API key is suspended or revoked."),
      );
      return;
    }

    const slugParam = String(req.params.companySlug || "").trim().toLowerCase();
    const slugCompany = await deps.store.findCompanyByPartnerSlug(slugParam);
    if (
      !slugCompany ||
      slugCompany.id !== apiKey.companyId ||
      slugCompany.operatingMode !== "network_main"
    ) {
      sendError(
        res,
        req,
        new PartnerApiError(401, "INVALID_PARTNER_API_KEY", "API key does not match this company endpoint."),
      );
      return;
    }

    req.partnerKey = apiKey;
    req.partnerCompany = slugCompany;
    void deps.store.recordPartnerApiKeyUsage(apiKey.id).catch(() => {});
    next();
  };

  router.use(authMiddleware);

  router.get("/ping", (req: PartnerAuthedRequest, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        ready: true,
        companyName: req.partnerCompany!.name,
        environment: req.partnerKey!.environment,
      },
      meta: makeMeta(req),
    });
  });

  router.get("/locations", async (req: PartnerAuthedRequest, res: Response) => {
    try {
      const locs = await offerService.getLocations(req.partnerCompany!);
      res.status(200).json({
        success: true,
        totalCount: locs.length,
        data: locs.map(({ _ownerCompanyId: _omit, ...rest }) => rest),
        meta: makeMeta(req),
      });
    } catch (err) {
      sendError(res, req, err);
    }
  });

  router.get("/catalog", async (req: PartnerAuthedRequest, res: Response) => {
    try {
      const result = await offerService.getCatalog(req.partnerCompany!, {
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined,
        category: typeof req.query.category === "string" ? req.query.category : undefined,
        transmission:
          typeof req.query.transmission === "string" ? req.query.transmission : undefined,
      });
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        meta: makeMeta(req),
      });
    } catch (err) {
      sendError(res, req, err);
    }
  });

  router.get("/availability", async (req: PartnerAuthedRequest, res: Response) => {
    try {
      const pickupLocation = String(req.query.pickup_location || "").trim();
      const pickupDate = String(req.query.pickup_date || "").trim();
      const returnDate = String(req.query.return_date || "").trim();
      const driverAge = Number(req.query.driver_age);
      if (!pickupLocation || !pickupDate || !returnDate || !req.query.driver_age) {
        throw new PartnerApiError(
          400,
          "VALIDATION_ERROR",
          "pickup_location, pickup_date, return_date and driver_age are required.",
        );
      }

      const result = await offerService.searchAvailability(req.partnerCompany!, {
        pickup_location: pickupLocation,
        return_location:
          typeof req.query.return_location === "string"
            ? req.query.return_location.trim()
            : undefined,
        pickup_date: pickupDate,
        return_date: returnDate,
        pickup_time:
          typeof req.query.pickup_time === "string" ? req.query.pickup_time : undefined,
        return_time:
          typeof req.query.return_time === "string" ? req.query.return_time : undefined,
        driver_age: driverAge,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        vehicle_id:
          typeof req.query.vehicle_id === "string" ? req.query.vehicle_id : undefined,
        category: typeof req.query.category === "string" ? req.query.category : undefined,
        transmission:
          typeof req.query.transmission === "string" ? req.query.transmission : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        meta: makeMeta(req),
      });
    } catch (err) {
      sendError(res, req, err);
    }
  });

  router.post("/quote", async (req: PartnerAuthedRequest, res: Response) => {
    try {
      const body = req.body ?? {};
      if (
        !body.pickup_location ||
        !body.pickup_date ||
        !body.return_date ||
        body.driver_age == null ||
        !body.vehicle_id
      ) {
        throw new PartnerApiError(
          400,
          "VALIDATION_ERROR",
          "pickup_location, pickup_date, return_date, driver_age and vehicle_id are required.",
        );
      }

      const data = await offerService.quoteOffer(req.partnerCompany!, {
        pickup_location: String(body.pickup_location),
        return_location: body.return_location ? String(body.return_location) : undefined,
        pickup_date: String(body.pickup_date),
        return_date: String(body.return_date),
        driver_age: Number(body.driver_age),
        vehicle_id: String(body.vehicle_id),
        selected_extras: Array.isArray(body.selected_extras) ? body.selected_extras : [],
      });

      res.status(200).json({
        success: true,
        data,
        meta: makeMeta(req),
      });
    } catch (err) {
      sendError(res, req, err);
    }
  });

  router.post("/bookings", async (req: PartnerAuthedRequest, res: Response) => {
    try {
      const body = req.body ?? {};
      const c = body.customer ?? {};
      if (
        !body.pickup_location ||
        !body.pickup_date ||
        !body.return_date ||
        body.driver_age == null ||
        !body.vehicle_id ||
        !body.external_booking_id ||
        !c.first_name ||
        !c.last_name ||
        !c.email ||
        !c.phone ||
        !c.country_of_residence
      ) {
        throw new PartnerApiError(
          400,
          "VALIDATION_ERROR",
          "Required booking or customer fields are missing.",
        );
      }

      const idempotencyHeader =
        typeof req.headers["idempotency-key"] === "string"
          ? req.headers["idempotency-key"]
          : undefined;

      const result = await offerService.createBooking(
        req.partnerCompany!,
        req.partnerKey!,
        idempotencyHeader,
        body,
      );

      res.status(result.isReplay ? 200 : 201).json({
        success: true,
        data: result.booking,
        meta: makeMeta(req),
      });
    } catch (err) {
      sendError(res, req, err);
    }
  });

  router.get(
    "/bookings/:externalBookingId",
    async (req: PartnerAuthedRequest, res: Response) => {
      try {
        const extId = String(req.params.externalBookingId || "");
        const data = await offerService.getBooking(
          req.partnerCompany!,
          req.partnerKey!,
          extId,
        );
        res.status(200).json({
          success: true,
          data,
          meta: makeMeta(req),
        });
      } catch (err) {
        sendError(res, req, err);
      }
    },
  );

  router.post(
    "/bookings/:externalBookingId/cancel",
    async (req: PartnerAuthedRequest, res: Response) => {
      try {
        const extId = String(req.params.externalBookingId || "");
        const reason =
          typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : undefined;
        const data = await offerService.cancelBooking(
          req.partnerCompany!,
          req.partnerKey!,
          extId,
          reason,
        );
        res.status(200).json({
          success: true,
          data,
          meta: makeMeta(req),
        });
      } catch (err) {
        sendError(res, req, err);
      }
    },
  );

  return router;
}
