import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express, { Router, type Response } from "express";
import { z } from "zod";
import type { BackendEnvConfig } from "../../config/env.ts";
import { createRateLimiter } from "../../security/rateLimiter.ts";
import type { AuthService } from "../auth/authService.ts";
import {
  createRbacGuards,
  type AuthenticatedTenantRequest,
} from "../team/rbacMiddleware.ts";
import type { TeamService } from "../team/teamService.ts";
import { FleetService, FleetServiceError } from "./fleetService.ts";

function paginateResponse<T>(
  items: T[],
  query: Record<string, unknown>,
  defaultPageSize = 15,
): {
  ok: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
} {
  const hasPageParam = query.page !== undefined || query.pageSize !== undefined;
  const totalItems = items.length;

  if (!hasPageParam) {
    return {
      ok: true,
      data: items,
      pagination: {
        page: 1,
        pageSize: totalItems || defaultPageSize,
        totalItems,
        totalPages: 1,
      },
    };
  }

  const rawPage = Number.parseInt(String(query.page ?? "1"), 10);
  const rawPageSize = Number.parseInt(String(query.pageSize ?? String(defaultPageSize)), 10);
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(Math.max(1, rawPageSize), 100)
    : defaultPageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Number.isFinite(rawPage)
    ? Math.min(Math.max(1, rawPage), totalPages)
    : 1;
  const start = (page - 1) * pageSize;

  return {
    ok: true,
    data: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

function handleFleetError(res: Response, err: unknown): void {
  if (err instanceof FleetServiceError) {
    res.status(err.status).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message,
    },
  });
}

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

const createVariantSchema = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  modelYear: z.number().int().min(1990).max(2040),
  trim: z.string().trim().max(60).optional(),
  category: z.enum(["sedan", "suv", "luxury", "compact", "economy", "commercial", "van"]),
  transmission: z.enum(["automatic", "manual"]).optional(),
  fuelType: z.enum(["petrol", "diesel", "hybrid", "electric"]).optional(),
  seatingCapacity: z.number().int().min(1).max(30).optional(),
  sippCode: z.string().trim().max(8).optional(),
});

const updateVariantSchema = createVariantSchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
});

const createVendorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  legalName: z.string().trim().max(150).nullable().optional(),
  category: z.enum(["dealership", "leasing", "auction", "maintenance_parts"]).optional(),
  contactPerson: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(4).max(30),
  email: z.string().trim().email().max(254).nullable().optional(),
  countryCode: z.string().trim().min(2).max(3),
  city: z.string().trim().min(1).max(80),
  address: z.string().trim().max(300).nullable().optional(),
  taxNumber: z.string().trim().max(60).nullable().optional(),
  commercialRegister: z.string().trim().max(60).nullable().optional(),
  bankName: z.string().trim().max(100).nullable().optional(),
  iban: z.string().trim().max(60).nullable().optional(),
  paymentTermsDays: z.number().int().min(0).max(1080).optional(),
  paymentTermsType: z.enum(["cash", "net_terms", "installments", "milestones"]).optional(),
  paymentTermsConfig: z.string().trim().max(100).nullable().optional(),
});

const updateVendorSchema = createVendorSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});

const createPoItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(500),
  unitPrice: z.number().min(0),
  notes: z.string().trim().max(300).nullable().optional(),
});

const createPurchaseOrderSchema = z.object({
  branchId: z.string().uuid(),
  vendorId: z.string().uuid(),
  poNumber: z.string().trim().max(40).optional(),
  orderDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expectedDeliveryDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  currency: z.string().trim().max(10).optional(),
  totalAmount: z.number().min(0).optional(),
  upfrontPaid: z.number().min(0).optional(),
  installmentsCount: z.number().int().min(1).max(60).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  items: z.array(createPoItemSchema).min(1),
});

const updatePoStatusSchema = z.object({
  status: z.enum([
    "draft",
    "pending_approval",
    "approved",
    "partially_received",
    "completed",
    "cancelled",
  ]),
});

const receiveVehicleSchema = z.object({
  itemId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  vin: z.string().trim().min(4).max(40),
  licensePlate: z.string().trim().min(1).max(30),
  keyNumber: z.string().trim().max(20).nullable().optional(),
  color: z.string().trim().min(1).max(40),
  mileageOdometer: z.number().int().min(0).optional(),
  registrationExpiry: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  insuranceExpiry: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
  photoUrl: z.string().trim().nullable().optional(),
  locationType: z.string().trim().max(50).optional(),
  fuelPolicy: z.string().trim().max(50).optional(),
  instantConfirmation: z.boolean().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  deliveryPolicy: z.string().trim().max(1000).nullable().optional(),
  dailyRate1to2: z.number().min(0).optional(),
  dailyRate3to7: z.number().min(0).optional(),
  dailyRate8Plus: z.number().min(0).optional(),
  damageExcess: z.number().min(0).optional(),
  mileagePolicy: z.enum(["unlimited", "limited"]).optional(),
  dailyKmLimit: z.number().int().min(0).nullable().optional(),
  extraKmRate: z.number().min(0).nullable().optional(),
  inclusions: z.array(z.string().trim()).optional(),
  seats: z.number().int().min(1).max(60).optional(),
  doors: z.number().int().min(2).max(8).optional(),
  airConditioning: z.boolean().optional(),
  fuelType: z.string().trim().max(30).optional(),
  luggageCapacity: z.string().trim().max(50).optional(),
  transmission: z.string().trim().max(30).optional(),
});

const createVehicleSchema = z.object({
  branchId: z.string().uuid(),
  variantId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().nullable().optional(),
  vin: z.string().trim().min(4).max(40),
  licensePlate: z.string().trim().min(1).max(30),
  keyNumber: z.string().trim().max(20).nullable().optional(),
  color: z.string().trim().min(1).max(40),
  mileageOdometer: z.number().int().min(0).optional(),
  status: z.enum(["available", "on_rent", "maintenance", "reserved", "out_of_service"]).optional(),
  registrationExpiry: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  insuranceExpiry: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
  photoUrl: z.string().trim().nullable().optional(),
  locationType: z.string().trim().max(50).optional(),
  fuelPolicy: z.string().trim().max(50).optional(),
  instantConfirmation: z.boolean().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  deliveryPolicy: z.string().trim().max(1000).nullable().optional(),
  dailyRate1to2: z.number().min(0).optional(),
  dailyRate3to7: z.number().min(0).optional(),
  dailyRate8Plus: z.number().min(0).optional(),
  damageExcess: z.number().min(0).optional(),
  mileagePolicy: z.enum(["unlimited", "limited"]).optional(),
  dailyKmLimit: z.number().int().min(0).nullable().optional(),
  extraKmRate: z.number().min(0).nullable().optional(),
  inclusions: z.array(z.string().trim()).optional(),
  seats: z.number().int().min(1).max(60).optional(),
  doors: z.number().int().min(2).max(8).optional(),
  airConditioning: z.boolean().optional(),
  fuelType: z.string().trim().max(30).optional(),
  luggageCapacity: z.string().trim().max(50).optional(),
  transmission: z.string().trim().max(30).optional(),
});

const updateVehicleSchema = z.object({
  branchId: z.string().uuid().optional(),
  keyNumber: z.string().trim().max(20).nullable().optional(),
  color: z.string().trim().min(1).max(40).optional(),
  mileageOdometer: z.number().int().min(0).optional(),
  status: z.enum(["available", "on_rent", "maintenance", "reserved", "out_of_service"]).optional(),
  registrationExpiry: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  insuranceExpiry: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
  photoUrl: z.string().trim().nullable().optional(),
  locationType: z.string().trim().max(50).optional(),
  fuelPolicy: z.string().trim().max(50).optional(),
  instantConfirmation: z.boolean().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  deliveryPolicy: z.string().trim().max(1000).nullable().optional(),
  dailyRate1to2: z.number().min(0).optional(),
  dailyRate3to7: z.number().min(0).optional(),
  dailyRate8Plus: z.number().min(0).optional(),
  damageExcess: z.number().min(0).optional(),
  mileagePolicy: z.enum(["unlimited", "limited"]).optional(),
  dailyKmLimit: z.number().int().min(0).nullable().optional(),
  extraKmRate: z.number().min(0).nullable().optional(),
  inclusions: z.array(z.string().trim()).optional(),
  seats: z.number().int().min(1).max(60).optional(),
  doors: z.number().int().min(2).max(8).optional(),
  airConditioning: z.boolean().optional(),
  fuelType: z.string().trim().max(30).optional(),
  luggageCapacity: z.string().trim().max(50).optional(),
  transmission: z.string().trim().max(30).optional(),
});

function detectImageExtension(buffer: Buffer): "png" | "jpg" | "webp" | null {
  if (buffer.length < 12) return null;
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

const createVehiclePhotoSchema = z.object({
  vehicleName: z.string().trim().min(1).max(120),
  photoUrl: z
    .string()
    .trim()
    .min(1)
    .refine((val) => !val.toLowerCase().startsWith("data:"), {
      message: "Base64 data URIs are not allowed. Upload the image file directly.",
    }),
  category: z.string().trim().max(40).optional(),
});

const createRentalInclusionSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

const updateRentalInclusionSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

const updateVehicleStatusSchema = z.object({
  status: z.enum(["available", "on_rent", "maintenance", "reserved", "out_of_service"]),
});

// ----------------------------------------------------------------------------
// Router Factory
// ----------------------------------------------------------------------------

export function createFleetRouter(options: {
  authService: AuthService;
  teamService: TeamService;
  fleetService: FleetService;
  env: BackendEnvConfig;
}): Router {
  const { authService, teamService, fleetService } = options;
  const router = Router();
  const guards = createRbacGuards({ authService, teamService, env: options.env });

  const fleetRateLimiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 200,
  });
  router.use(fleetRateLimiter);

  // --------------------------------------------------------------------------
  // Metrics
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // Vehicle Variants
  // --------------------------------------------------------------------------
  router.get(
    "/variants",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const category = typeof req.query.category === "string" ? (req.query.category as any) : undefined;
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const variants = await fleetService.listVariants(req.tenantActor!, { category, search });
        res.status(200).json(paginateResponse(variants, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/variants",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createVariantSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle variant details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const variant = await fleetService.createVariant(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: variant });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.get(
    "/variants/:id",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const variantId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!variantId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Variant ID is required." } });
        return;
      }
      try {
        const variant = await fleetService.getVariant(req.tenantActor!, variantId);
        res.status(200).json({ ok: true, data: variant });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.put(
    "/variants/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const variantId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!variantId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Variant ID is required." } });
        return;
      }
      const parsed = updateVariantSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid variant update details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateVariant(req.tenantActor!, variantId, parsed.data);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.delete(
    "/variants/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const variantId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!variantId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Variant ID is required." } });
        return;
      }
      try {
        await fleetService.deleteVariant(req.tenantActor!, variantId);
        res.status(200).json({ ok: true, data: { archived: true } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Vendors Directory
  // --------------------------------------------------------------------------
  router.get(
    "/vendors",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const category = typeof req.query.category === "string" ? (req.query.category as any) : undefined;
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const vendors = await fleetService.listVendors(req.tenantActor!, { category, search });
        res.status(200).json(paginateResponse(vendors, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/vendors",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vendor details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const vendor = await fleetService.createVendor(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: vendor });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.get(
    "/vendors/:id",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vendorId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vendorId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vendor ID is required." } });
        return;
      }
      try {
        const vendor = await fleetService.getVendor(req.tenantActor!, vendorId);
        res.status(200).json({ ok: true, data: vendor });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.put(
    "/vendors/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vendorId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vendorId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vendor ID is required." } });
        return;
      }
      const parsed = updateVendorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vendor update details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateVendor(req.tenantActor!, vendorId, parsed.data);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Purchase Orders (PO)
  // --------------------------------------------------------------------------
  router.get(
    "/purchase-orders",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
        const vendorId = typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
        const status = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
        const pos = await fleetService.listPurchaseOrders(req.tenantActor!, {
          branchId,
          vendorId,
          status,
        });
        res.status(200).json(paginateResponse(pos, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/purchase-orders",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createPurchaseOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid purchase order details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const po = await fleetService.createPurchaseOrder(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: po });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.get(
    "/purchase-orders/:id",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const poId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!poId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "PO ID is required." } });
        return;
      }
      try {
        const po = await fleetService.getPurchaseOrder(req.tenantActor!, poId);
        res.status(200).json({ ok: true, data: po });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.patch(
    "/purchase-orders/:id/status",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const poId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!poId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "PO ID is required." } });
        return;
      }
      const parsed = updatePoStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid purchase order status.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updatePurchaseOrderStatus(
          req.tenantActor!,
          poId,
          parsed.data.status,
        );
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/purchase-orders/:id/receive",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const poId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!poId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "PO ID is required." } });
        return;
      }
      const parsed = receiveVehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle receiving details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const result = await fleetService.receiveVehicleFromPo(req.tenantActor!, {
          ...parsed.data,
          purchaseOrderId: poId,
          branchId: parsed.data.branchId || "",
        });
        res.status(201).json({ ok: true, data: result });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  // --------------------------------------------------------------------------
  // Fleet Vehicles Register
  // --------------------------------------------------------------------------
  router.get(
    "/vehicles",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
        const status = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
        const variantId = typeof req.query.variantId === "string" ? req.query.variantId : undefined;
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const includeNetwork = req.query.includeNetwork === "true" || req.query.includeNetwork === "1";

        const vehicles = await fleetService.listVehicles(req.tenantActor!, {
          branchId,
          status,
          variantId,
          search,
          includeNetwork,
        });
        res.status(200).json(paginateResponse(vehicles, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/vehicles",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createVehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle registration details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const vehicle = await fleetService.createVehicle(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: vehicle });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.get(
    "/vehicles/:id",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vehicleId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vehicleId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vehicle ID is required." } });
        return;
      }
      try {
        const vehicle = await fleetService.getVehicle(req.tenantActor!, vehicleId);
        res.status(200).json({ ok: true, data: vehicle });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.put(
    "/vehicles/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vehicleId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vehicleId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vehicle ID is required." } });
        return;
      }
      const parsed = updateVehicleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle update details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateVehicle(req.tenantActor!, vehicleId, parsed.data);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.patch(
    "/vehicles/:id/status",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const vehicleId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!vehicleId) {
        res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Vehicle ID is required." } });
        return;
      }
      const parsed = updateVehicleStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid vehicle status.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateVehicleStatus(
          req.tenantActor!,
          vehicleId,
          parsed.data.status,
        );
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  // ============================================================================
  // 5. Vehicle Photos Catalog
  // ============================================================================

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

  // ============================================================================
  // 6. Rental Inclusions & Contract Benefits (What is Included)
  // ============================================================================

  router.get(
    "/inclusions",
    guards.requirePermission("fleet", "read"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      try {
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const activeOnly = req.query.activeOnly === "true";
        const inclusions = await fleetService.listRentalInclusions(req.tenantActor!, search, activeOnly);
        res.status(200).json(paginateResponse(inclusions, req.query));
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.post(
    "/inclusions",
    guards.requirePermission("fleet", "create"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const parsed = createRentalInclusionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid rental inclusion details.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const inclusion = await fleetService.createRentalInclusion(req.tenantActor!, parsed.data);
        res.status(201).json({ ok: true, data: inclusion });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.patch(
    "/inclusions/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const inclusionId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!inclusionId) {
        res.status(400).json({
          ok: false,
          error: { code: "BAD_REQUEST", message: "Inclusion ID is required." },
        });
        return;
      }

      const parsed = updateRentalInclusionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid update payload.",
            details: parsed.error.flatten(),
          },
        });
        return;
      }

      try {
        const updated = await fleetService.updateRentalInclusion(req.tenantActor!, inclusionId, parsed.data);
        res.status(200).json({ ok: true, data: updated });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  router.delete(
    "/inclusions/:id",
    guards.requirePermission("fleet", "update"),
    async (req: AuthenticatedTenantRequest, res: Response) => {
      const rawId = req.params.id;
      const inclusionId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!inclusionId) {
        res.status(400).json({
          ok: false,
          error: { code: "BAD_REQUEST", message: "Inclusion ID is required." },
        });
        return;
      }

      try {
        const deleted = await fleetService.deleteRentalInclusion(req.tenantActor!, inclusionId);
        res.status(200).json({ ok: true, data: { deleted } });
      } catch (err) {
        handleFleetError(res, err);
      }
    },
  );

  return router;
}
