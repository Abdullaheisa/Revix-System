import { z } from "zod";

export const createVariantSchema = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  modelYear: z.number().int().min(1990).max(2040),
  trim: z.string().trim().max(60).optional(),
  category: z.string().trim().min(1).max(30),
  transmission: z.enum(["automatic", "manual"]).optional(),
  fuelType: z.enum(["petrol", "diesel", "hybrid", "electric"]).optional(),
  seatingCapacity: z.number().int().min(1).max(30).optional(),
  sippCode: z.string().trim().max(8).optional(),
});

export const updateVariantSchema = createVariantSchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
});

export const createVendorSchema = z.object({
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

export const updateVendorSchema = createVendorSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});

export const createPoItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(500),
  unitPrice: z.number().min(0),
  vin: z.string().trim().max(40).nullable().optional(),
  color: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

export const createPurchaseOrderSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
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

export const updatePoStatusSchema = z.object({
  status: z.enum([
    "draft",
    "pending_approval",
    "approved",
    "partially_received",
    "completed",
    "cancelled",
  ]),
});

export const receiveVehicleSchema = z.object({
  itemId: z.string().uuid(),
  branchId: z.string().uuid().nullable().optional(),
  vin: z.string().trim().min(4).max(40),
  licensePlate: z.string().trim().min(1).max(30),
  keyNumber: z.string().trim().max(20).nullable().optional(),
  color: z.string().trim().min(1).max(40),
  mileageOdometer: z.number().int().min(0).optional(),
  isBookable: z.boolean().optional(),
  insuranceExpiry: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  inServiceDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  insuranceCompanyId: z.string().uuid().nullable().optional(),
  insuranceProviderName: z.string().trim().max(150).nullable().optional(),
  insurancePolicyNumber: z.string().trim().max(100).nullable().optional(),
  insuranceCoverageType: z.string().trim().max(50).nullable().optional(),
  insuranceStartDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  insurancePremiumAmount: z.number().min(0).optional(),
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

export const createVehicleSchema = z.object({
  branchId: z.string().uuid(),
  variantId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().nullable().optional(),
  vin: z.string().trim().min(4).max(40),
  licensePlate: z.string().trim().min(1).max(30),
  keyNumber: z.string().trim().max(20).nullable().optional(),
  color: z.string().trim().min(1).max(40),
  mileageOdometer: z.number().int().min(0).optional(),
  isBookable: z.boolean().optional(),
  status: z.enum(["available", "on_rent", "maintenance", "reserved", "out_of_service"]).optional(),
  inServiceDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  insuranceCompanyId: z.string().uuid().nullable().optional(),
  insuranceProviderName: z.string().trim().max(150).nullable().optional(),
  insurancePolicyNumber: z.string().trim().max(100).nullable().optional(),
  insuranceCoverageType: z.string().trim().max(50).nullable().optional(),
  insuranceStartDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  insurancePremiumAmount: z.number().min(0).optional(),
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

export const updateVehicleSchema = z.object({
  branchId: z.string().uuid().optional(),
  keyNumber: z.string().trim().max(20).nullable().optional(),
  color: z.string().trim().min(1).max(40).optional(),
  mileageOdometer: z.number().int().min(0).optional(),
  status: z.enum(["available", "on_rent", "maintenance", "reserved", "out_of_service"]).optional(),
  inServiceDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  insuranceCompanyId: z.string().uuid().nullable().optional(),
  insuranceProviderName: z.string().trim().max(150).nullable().optional(),
  insurancePolicyNumber: z.string().trim().max(100).nullable().optional(),
  insuranceCoverageType: z.string().trim().max(50).nullable().optional(),
  insuranceStartDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  insurancePremiumAmount: z.number().min(0).optional(),
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

export const createVehiclePhotoSchema = z.object({
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

export const createRentalInclusionSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const updateRentalInclusionSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const updateVehicleStatusSchema = z.object({
  status: z.enum(["available", "on_rent", "maintenance", "reserved", "out_of_service"]),
});
