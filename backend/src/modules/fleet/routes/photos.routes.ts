import { createVehiclePhotoSchema } from ".././fleetSchemas.ts";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express, { Router, type Response } from "express";
import { type AuthenticatedTenantRequest } from "../../team/rbacMiddleware.ts";
import type { FleetRouteContext } from "../fleetRouteContext.ts";
import { paginateResponse, handleFleetError, detectImageExtension } from "../fleetHttp.ts";

export function registerPhotosRoutes(router: Router, { guards, fleetService }: FleetRouteContext): void {
router.get(
    "/photos",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const photos = await fleetService.listVehiclePhotos(req.tenantActor!, search);
        res.status(200).json(paginateResponse(photos, req.query, 20));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

router.post(
    "/photos/upload",
    guards.requirePermission("fleet", "create"),
    express.raw({
      type: ["image/png", "image/jpeg", "image/jpg", "image/webp"],
      limit: "5mb",
    }),
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
        const targetDir = path.resolve(
          process.cwd(),
          "uploads",
          "vehicle-photos",
          companyId,
        );
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
    guards.requirePermission("fleet", "create"),
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

router.delete(
    "/photos/:id",
    guards.requirePermission("fleet", "update"),
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

