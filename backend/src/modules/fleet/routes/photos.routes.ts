import { createVehiclePhotoSchema } from ".././fleetSchemas.ts";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express, { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { paginateResponse, handleFleetError, detectImageExtension } from "../fleetHttp.ts";

const rawImageParser = express.raw({
  type: () => true,
  limit: "6mb",
});

function parseRawImageMiddleware(
  req: AuthenticatedTenantRequest,
  res: Response,
  next: () => void,
): void {
  rawImageParser(req, res, (err) => {
    if (err) {
      const status = (err as { status?: number }).status === 413 ? 413 : 400;
      res.status(status).json({
        ok: false,
        error: {
          code: status === 413 ? "FILE_TOO_LARGE" : "UPLOAD_PARSE_ERROR",
          message:
            status === 413
              ? "Image size exceeds the 5 MB limit."
              : err instanceof Error
                ? err.message
                : "Could not read uploaded image.",
        },
      });
      return;
    }
    next();
  });
}

export function registerPhotosRoutes(router: Router, { guards, fleetService, uploadsDir }: FleetRouteContext): void {
router.get(
    "/photos",
    guards.requirePermission("vehicle_photos", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const photos = await fleetService.listVehiclePhotos(req.tenantActor!, search);
        res.status(200).json(paginateResponse(photos, req.query, 30));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/photos/upload",
    guards.requirePermission("vehicle_photos", "create"),
    parseRawImageMiddleware,
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawName =
        typeof req.query.vehicleName === "string"
          ? req.query.vehicleName
          : typeof req.headers["x-vehicle-name"] === "string"
            ? decodeURIComponent(req.headers["x-vehicle-name"])
            : "";
      const vehicleName = rawName.trim();

      if (!vehicleName || vehicleName.length > 120) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Vehicle photo name is required (1–120 characters).",
          },
        });
        return;
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Image file is required (PNG, JPG, or WebP up to 5MB).",
          },
        });
        return;
      }

      const ext = detectImageExtension(req.body);
      if (!ext) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_IMAGE_FORMAT",
            message: "Unsupported or invalid image file. Only PNG, JPG, and WebP are allowed.",
          },
        });
        return;
      }

      try {
        const companyId = req.tenantActor!.company.id;
        const filename = `${crypto.randomUUID()}.${ext}`;
        const targetDir = path.resolve(uploadsDir, "vehicle-photos", companyId);
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, filename), req.body);

        const photoUrl = `/uploads/vehicle-photos/${companyId}/${filename}`;
        const photo = await fleetService.createVehiclePhoto(req.tenantActor!, {
          vehicleName,
          photoUrl,
          category: "General",
        });
        res.status(201).json({ ok: true, data: photo });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/photos",
    guards.requirePermission("vehicle_photos", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createVehiclePhotoSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle photo details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const photo = await fleetService.createVehiclePhoto(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: photo });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.patch(
    "/photos/:id",
    guards.requirePermission("vehicle_photos", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const rawName = typeof req.body?.vehicleName === "string" ? req.body.vehicleName.trim() : undefined;
      const rawCategory = typeof req.body?.category === "string" ? req.body.category.trim() : undefined;

      if (rawName !== undefined && (!rawName || rawName.length > 120)) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Vehicle photo name must be between 1 and 120 characters.",
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateVehiclePhoto(req.tenantActor!, id!, {
          vehicleName: rawName,
          category: rawCategory,
        });
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/photos/:id/upload",
    guards.requirePermission("vehicle_photos", "update"),
    parseRawImageMiddleware,
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const rawName =
        typeof req.query.vehicleName === "string"
          ? req.query.vehicleName.trim()
          : undefined;

      if (rawName !== undefined && (!rawName || rawName.length > 120)) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Vehicle photo name is required (1–120 characters).",
          },
        });
        return;
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Image file is required (PNG, JPG, or WebP up to 5MB).",
          },
        });
        return;
      }

      const ext = detectImageExtension(req.body);
      if (!ext) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_IMAGE_FORMAT",
            message: "Unsupported or invalid image file. Only PNG, JPG, and WebP are allowed.",
          },
        });
        return;
      }

      try {
        const companyId = req.tenantActor!.company.id;
        const filename = `${crypto.randomUUID()}.${ext}`;
        const targetDir = path.resolve(uploadsDir, "vehicle-photos", companyId);
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, filename), req.body);

        const photoUrl = `/uploads/vehicle-photos/${companyId}/${filename}`;
        const updated = await fleetService.updateVehiclePhoto(req.tenantActor!, id!, {
          vehicleName: rawName,
          photoUrl,
        });
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.delete(
    "/photos/:id",
    guards.requirePermission("vehicle_photos", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const photoId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!photoId) {
        res.status(400).json({
          ok: false,
          error: { code: "BAD_REQUEST", message: "Photo ID is required." },
        });
        return;
      }

      try {
        const deleted = await fleetService.deleteVehiclePhoto(req.tenantActor!, photoId);
        res.status(200).json({ ok: true, data: { deleted } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );
}

