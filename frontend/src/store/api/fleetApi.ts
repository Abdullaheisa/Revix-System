import { baseApi } from "./baseApi";

export type VehicleCategory =
  | "mini"
  | "economy"
  | "compact"
  | "intermediate"
  | "standard"
  | "fullsize"
  | "sedan"
  | "suv"
  | "crossover"
  | "luxury"
  | "premium"
  | "convertible"
  | "coupe"
  | "van"
  | "pickup"
  | "commercial";
export type VehicleTransmission = "automatic" | "manual";
export type VehicleFuelType = "petrol" | "diesel" | "hybrid" | "electric";
export type VehicleVariantStatus = "active" | "archived";

export interface VehicleVariantDto {
  id: string;
  variantCode?: string;
  companyId: string;
  make: string;
  model: string;
  modelYear: number;
  trim: string;
  category: VehicleCategory;
  transmission: VehicleTransmission;
  fuelType: VehicleFuelType;
  seatingCapacity: number;
  sippCode: string;
  status: VehicleVariantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleVariantInput {
  make: string;
  model: string;
  modelYear: number;
  trim?: string;
  category: VehicleCategory;
  transmission?: VehicleTransmission;
  fuelType?: VehicleFuelType;
  seatingCapacity?: number;
  sippCode?: string;
}

export type VendorCategory =
  | "dealership"
  | "leasing"
  | "auction"
  | "maintenance_parts";
export type VendorStatus = "active" | "inactive";
export type PaymentTermsType =
  | "cash"
  | "net_terms"
  | "installments"
  | "milestones";

export interface VendorDto {
  id: string;
  companyId: string;
  name: string;
  legalName: string | null;
  category: VendorCategory;
  contactPerson: string;
  phone: string;
  email: string | null;
  countryCode: string;
  city: string;
  address: string | null;
  taxNumber: string | null;
  commercialRegister: string | null;
  bankName: string | null;
  iban: string | null;
  paymentTermsDays: number;
  paymentTermsType?: PaymentTermsType;
  paymentTermsConfig?: string | null;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVendorInput {
  name: string;
  legalName?: string | null;
  category?: VendorCategory;
  contactPerson: string;
  phone: string;
  email?: string | null;
  countryCode: string;
  city: string;
  address?: string | null;
  taxNumber?: string | null;
  commercialRegister?: string | null;
  bankName?: string | null;
  iban?: string | null;
  paymentTermsDays?: number;
  paymentTermsType?: PaymentTermsType;
  paymentTermsConfig?: string | null;
}

export type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "partially_received"
  | "completed"
  | "cancelled";

export interface PurchaseOrderItemDto {
  variantName?: string;
  sippCode?: string;
  receivedVehicles?: { id: string; vin: string; plateNumber: string; color: string }[];
  id: string;
  purchaseOrderId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  receivedCount: number;
  vin?: string | null;
  color?: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseOrderDto {
  id: string;
  companyId: string;
  branchId: string;
  vendorId: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string | null;
  currency: string;
  totalAmount: number;
  upfrontPaid: number;
  remainingAmount: number;
  installmentsCount: number;
  notes: string | null;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseOrderItemDto[];
  vendorName?: string;
  branchName?: string;
  companyName?: string;
  companyLogoUrl?: string | null;
  companyTimezone?: string | null;
  companyCountryCode?: string | null;
  parentCompanyName?: string | null;
  parentCompanyLogoUrl?: string | null;
  signatureDataUrl?: string | null;
  signedByName?: string | null;
  signedAt?: string | null;
  createdByUserName?: string | null;
  approvedByUserName?: string | null;
}

export interface CreatePurchaseOrderItemInput {
  variantId: string;
  quantity: number;
  unitPrice: number;
  vin?: string | null;
  color?: string | null;
  notes?: string | null;
}

export interface CreatePurchaseOrderInput {
  branchId: string;
  vendorId: string;
  poNumber?: string;
  orderDate?: string;
  expectedDeliveryDate?: string | null;
  currency?: string;
  totalAmount?: number;
  upfrontPaid?: number;
  installmentsCount?: number;
  notes?: string | null;
  items: CreatePurchaseOrderItemInput[];
}

export interface ReceiveVehicleInput {
  purchaseOrderId: string;
  itemId: string;
  branchId?: string | null;
  vin: string;
  licensePlate: string;
  keyNumber?: string | null;
  color: string;
  mileageOdometer?: number;
  isBookable?: boolean;
  registrationExpiry?: string | null;
  insuranceExpiry?: string | null;
  inServiceDate?: string | null;
  insuranceCompanyId?: string | null;
  insuranceProviderName?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceCoverageType?: string | null;
  insuranceStartDate?: string | null;
  insurancePremiumAmount?: number;
  notes?: string | null;
  photoUrl?: string | null;
  locationType?: string;
  fuelPolicy?: string;
  instantConfirmation?: boolean;
  description?: string | null;
  deliveryPolicy?: string | null;
  dailyRate1to2?: number;
  dailyRate3to7?: number;
  dailyRate8Plus?: number;
  damageExcess?: number;
  mileagePolicy?: "unlimited" | "limited";
  dailyKmLimit?: number | null;
  extraKmRate?: number | null;
  inclusions?: string[];
  seats?: number;
  doors?: number;
  airConditioning?: boolean;
  fuelType?: string;
  luggageCapacity?: string;
  transmission?: string;
}

export type FleetVehicleStatus =
  | "available"
  | "on_rent"
  | "maintenance"
  | "reserved"
  | "out_of_service";

export interface FleetVehicleDto {
  id: string;
  assetCode?: string;
  companyId: string;
  branchId: string;
  variantId: string;
  purchaseOrderId: string | null;
  vin: string;
  licensePlate: string;
  keyNumber: string | null;
  color: string;
  mileageOdometer: number;
  status: FleetVehicleStatus;
  registrationExpiry: string | null;
  insuranceExpiry: string | null;
  notes: string | null;
  photoUrl?: string | null;
  locationType?: string;
  fuelPolicy?: string;
  instantConfirmation?: boolean;
  description?: string | null;
  deliveryPolicy?: string | null;
  dailyRate1to2?: number;
  dailyRate3to7?: number;
  dailyRate8Plus?: number;
  damageExcess?: number;
  mileagePolicy?: "unlimited" | "limited";
  dailyKmLimit?: number | null;
  extraKmRate?: number | null;
  inclusions?: string[];
  seats?: number;
  doors?: number;
  airConditioning?: boolean;
  fuelType?: string;
  luggageCapacity?: string;
  transmission?: string;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
  createdAt: string;
  updatedAt: string;
  variant?: VehicleVariantDto;
  branchName?: string;
  companyName?: string;
  companyLogoUrl?: string | null;
  companyTimezone?: string | null;
  companyCountryCode?: string | null;
  parentCompanyName?: string | null;
  parentCompanyLogoUrl?: string | null;
  isPartnerVehicle?: boolean;
  vendorName?: string | null;
  poNumber?: string | null;
  purchasePrice?: number | null;
  purchaseOrderDate?: string | null;
  insuranceCompany?: string | null;
  insurancePolicyNumber?: string | null;
  isBookable?: boolean;
  publishedToFleetAt?: string | null;
  inServiceDate?: string | null;
}

export interface CustomerDto {
  id: string;
  companyId: string;
  fullName: string;
  phone: string;
  secondaryPhone: string | null;
  email: string | null;
  nationalId: string | null;
  driverLicenseNo: string | null;
  licenseExpiry: string | null;
  nationality: string | null;
  address: string | null;
  workAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RentalContractStatus = "draft" | "active" | "completed" | "cancelled";

export interface RentalContractDto {
  id: string;
  companyId: string;
  branchId: string;
  contractNumber: string;
  vehicleId: string;
  customerId: string;
  status: RentalContractStatus;
  startDate: string;
  endDate: string;
  pickupOdometer: number;
  returnOdometer: number | null;
  dailyRate: number;
  totalDays: number;
  subtotal: number;
  discount: number;
  insuranceFee: number;
  extraCharges: number;
  totalAmount: number;
  paidAmount: number;
  depositAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vehiclePlate?: string;
  vehicleName?: string;
  customerName?: string;
  customerPhone?: string;
  branchName?: string;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
}

export interface InsuranceCompanyDto {
  id: string;
  companyId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
}

export interface VehicleInsurancePolicyDto {
  id: string;
  companyId: string;
  vehicleId: string;
  insuranceCompanyId: string | null;
  providerName: string;
  policyNumber: string;
  coverageType: string;
  premiumAmount: number;
  deductibleAmount: number;
  startDate: string;
  expiryDate: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

export interface VehicleOdometerLogDto {
  id: string;
  companyId: string;
  vehicleId: string;
  source: string;
  referenceLabel: string | null;
  odometerKm: number;
  deltaKm: number;
  recordedBy: string | null;
  recordedAt: string;
}

export interface VehicleMaintenanceLogDto {
  id: string;
  companyId: string;
  vehicleId: string;
  serviceType: string;
  workshopName: string | null;
  odometerAtService: number;
  nextServiceKm: number | null;
  nextServiceDate: string | null;
  cost: number;
  status: string;
  notes: string | null;
  serviceDate: string;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
  createdAt: string;
}

export interface AuditLogEntryDto {
  id: string;
  companyId: string | null;
  branchId: string | null;
  actorUserId: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface VehicleDamagePointDto {
  id: string;
  inspectionId: string;
  vehicleId: string;
  zoneKey: string;
  severity: string;
  description: string | null;
  repairCost: number;
  isResolved: boolean;
  createdAt: string;
}

export interface VehicleInspectionDto {
  id: string;
  companyId: string;
  vehicleId: string;
  inspectionType: string;
  bookingRef: string | null;
  customerName: string | null;
  odometerKm: number;
  hasAccident: boolean;
  accidentNotes: string | null;
  inspectedBy: string | null;
  inspectedAt: string;
  damagePoints: VehicleDamagePointDto[];
}

export interface DriverDto {
  id: string;
  companyId: string;
  fullName: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  email: string | null;
  licenseNumber: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  passportNumber: string | null;
  nationalIdNumber?: string | null;
  idCardPhotoUrl?: string | null;
  passportPhotoUrl?: string | null;
  licensePhotoUrl?: string | null;
  address: string | null;
  status: "active" | "inactive";
  createdByUserId: string | null;
  createdByUserName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMovementDto {
  id: string;
  companyId: string;
  movementNumber: string;
  vehicleId: string;
  fromBranchId: string;
  toBranchId: string;
  driverId: string;
  status: "in_transit" | "received" | "cancelled";
  dispatchOdometerKm: number;
  arrivalOdometerKm: number | null;
  dispatchedByUserId: string | null;
  receivedByUserId: string | null;
  dispatchedAt: string;
  receivedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vehicleName?: string | null;
  vehiclePlate?: string | null;
  fromBranchName?: string | null;
  toBranchName?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  dispatchedByUserName?: string | null;
  receivedByUserName?: string | null;
}

export interface VehicleLifecycleProfileDto {
  insurancePolicies: VehicleInsurancePolicyDto[];
  odometerLogs: VehicleOdometerLogDto[];
  maintenanceLogs: VehicleMaintenanceLogDto[];
  inspections: VehicleInspectionDto[];
  damagePoints: VehicleDamagePointDto[];
  movements?: VehicleMovementDto[];
}

export interface CreateFleetVehicleInput {
  branchId: string;
  variantId: string;
  purchaseOrderId?: string | null;
  vin: string;
  licensePlate: string;
  keyNumber?: string | null;
  color: string;
  mileageOdometer?: number;
  isBookable?: boolean;
  status?: FleetVehicleStatus;
  registrationExpiry?: string | null;
  insuranceExpiry?: string | null;
  inServiceDate?: string | null;
  insuranceCompanyId?: string | null;
  insuranceProviderName?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceCoverageType?: string | null;
  insuranceStartDate?: string | null;
  insurancePremiumAmount?: number;
  notes?: string | null;
  photoUrl?: string | null;
  locationType?: string;
  fuelPolicy?: string;
  instantConfirmation?: boolean;
  description?: string | null;
  deliveryPolicy?: string | null;
  dailyRate1to2?: number;
  dailyRate3to7?: number;
  dailyRate8Plus?: number;
  damageExcess?: number;
  mileagePolicy?: "unlimited" | "limited";
  dailyKmLimit?: number | null;
  extraKmRate?: number | null;
  inclusions?: string[];
  seats?: number;
  doors?: number;
  airConditioning?: boolean;
  fuelType?: string;
  luggageCapacity?: string;
  transmission?: string;
}

export interface UpdateFleetVehicleInput {
  branchId?: string;
  keyNumber?: string | null;
  color?: string;
  mileageOdometer?: number;
  status?: FleetVehicleStatus;
  registrationExpiry?: string | null;
  insuranceExpiry?: string | null;
  inServiceDate?: string | null;
  insuranceCompanyId?: string | null;
  insuranceProviderName?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceCoverageType?: string | null;
  insuranceStartDate?: string | null;
  insurancePremiumAmount?: number;
  notes?: string | null;
  photoUrl?: string | null;
  locationType?: string;
  fuelPolicy?: string;
  instantConfirmation?: boolean;
  description?: string | null;
  deliveryPolicy?: string | null;
  dailyRate1to2?: number;
  dailyRate3to7?: number;
  dailyRate8Plus?: number;
  damageExcess?: number;
  mileagePolicy?: "unlimited" | "limited";
  dailyKmLimit?: number | null;
  extraKmRate?: number | null;
  inclusions?: string[];
  seats?: number;
  doors?: number;
  airConditioning?: boolean;
  fuelType?: string;
  luggageCapacity?: string;
  transmission?: string;
}

export interface VehiclePhotoDto {
  id: string;
  companyId: string;
  vehicleName: string;
  photoUrl: string;
  category: string;
  createdAt: string;
}

export interface CreateVehiclePhotoInput {
  vehicleName: string;
  photoUrl: string;
  category?: string;
}

export interface RentalInclusionDto {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRentalInclusionInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRentalInclusionInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface FleetMetricsDto {
  totalVehicles: number;
  availableCount: number;
  onRentCount: number;
  maintenanceCount: number;
  reservedCount: number;
  outOfServiceCount: number;
  variantsCount: number;
  activePosCount: number;
  vendorsCount: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  ok: true;
  data: T;
  pagination?: PaginationMeta;
}

export const fleetApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFleetMetrics: builder.query<ApiResponse<FleetMetricsDto>, { branchId?: string } | void>({
      query: (params) => ({
        url: "/fleet/metrics",
        params: params || {},
      }),
      providesTags: ["Fleet", "PurchaseOrder"],
    }),

    listAuditLogs: builder.query<
      ApiResponse<AuditLogEntryDto[]>,
      { entityType?: string; entityId?: string; actorUserId?: string; limit?: number } | void
    >({
      query: (params) => ({
        url: "/fleet/audit-logs",
        params: params || {},
      }),
      providesTags: ["Fleet", "PurchaseOrder", "RentalContract"],
    }),

    // --- Variants ---
    signPurchaseOrder: builder.mutation<
      { ok: boolean; data: PurchaseOrderDto },
      { id: string; signatureDataUrl: string }
    >({
      query: ({ id, signatureDataUrl }) => ({
        url: `/fleet/purchase-orders/${id}/sign`,
        method: "POST",
        body: { signatureDataUrl },
      }),
      invalidatesTags: ["PurchaseOrder"],
    }),

    listInsuranceCompanies: builder.query<
      { ok: boolean; data: InsuranceCompanyDto[] },
      void
    >({
      query: () => "/fleet/insurance-companies",
      providesTags: ["Fleet"],
    }),

    createInsuranceCompany: builder.mutation<
      { ok: boolean; data: InsuranceCompanyDto },
      {
        name: string;
        contactPerson?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
      }
    >({
      query: (body) => ({
        url: "/fleet/insurance-companies",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    deleteInsuranceCompany: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `/fleet/insurance-companies/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Fleet"],
    }),

    getVehicleLifecycle: builder.query<
      { ok: boolean; data: VehicleLifecycleProfileDto },
      string
    >({
      query: (vehicleId) => `/fleet/vehicles/${vehicleId}/lifecycle`,
      providesTags: ["Fleet"],
    }),

    saveVehicleInsurance: builder.mutation<
      { ok: boolean; data: VehicleInsurancePolicyDto },
      {
        vehicleId: string;
        insuranceCompanyId?: string | null;
        providerName: string;
        policyNumber: string;
        coverageType: string;
        premiumAmount: number;
        deductibleAmount: number;
        startDate: string;
        expiryDate: string;
        notes?: string | null;
      }
    >({
      query: ({ vehicleId, ...body }) => ({
        url: `/fleet/vehicles/${vehicleId}/insurance`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    updateVehiclePricing: builder.mutation<
      { ok: boolean; data: FleetVehicleDto },
      {
        vehicleId: string;
        dailyRate1to2: number;
        dailyRate3to7: number;
        dailyRate8Plus: number;
        damageExcess: number;
        mileagePolicy: "unlimited" | "limited";
        dailyKmLimit: number;
        extraKmRate: number;
      }
    >({
      query: ({ vehicleId, ...body }) => ({
        url: `/fleet/vehicles/${vehicleId}/pricing`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    updateVariantPricing: builder.mutation<
      { ok: boolean; data: { updatedCount: number } },
      {
        variantId: string;
        dailyRate1to2: number;
        dailyRate3to7: number;
        dailyRate8Plus: number;
        damageExcess: number;
        mileagePolicy?: "unlimited" | "limited";
        dailyKmLimit?: number;
        extraKmRate?: number;
        branchId?: string;
      }
    >({
      query: ({ variantId, ...body }) => ({
        url: `/fleet/variants/${variantId}/pricing`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Fleet", "VehicleVariant"],
    }),

    applyVariantListingSetup: builder.mutation<
      { ok: boolean; data: { updatedCount: number } },
      {
        variantId: string;
        photoUrl?: string | null;
        locationType?: string;
        fuelPolicy?: string;
        instantConfirmation?: boolean;
        description?: string | null;
        deliveryPolicy?: string | null;
        dailyRate1to2?: number;
        dailyRate3to7?: number;
        dailyRate8Plus?: number;
        damageExcess?: number;
        mileagePolicy?: "unlimited" | "limited";
        dailyKmLimit?: number | null;
        extraKmRate?: number | null;
        inclusions?: string[];
        seats?: number;
        doors?: number;
        airConditioning?: boolean;
        fuelType?: string;
        luggageCapacity?: string;
        transmission?: string;
        publishToFleet?: boolean;
      }
    >({
      query: ({ variantId, ...body }) => ({
        url: `/fleet/variants/${variantId}/listing-setup`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Fleet", "VehicleVariant"],
    }),

    addVehicleMaintenance: builder.mutation<
      { ok: boolean; data: VehicleMaintenanceLogDto },
      {
        vehicleId: string;
        serviceType: string;
        workshopName?: string | null;
        odometerAtService: number;
        nextServiceKm?: number | null;
        nextServiceDate?: string | null;
        cost: number;
        status: string;
        notes?: string | null;
        serviceDate: string;
      }
    >({
      query: ({ vehicleId, ...body }) => ({
        url: `/fleet/vehicles/${vehicleId}/maintenance`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    addVehicleInspection: builder.mutation<
      { ok: boolean; data: VehicleInspectionDto },
      {
        vehicleId: string;
        inspectionType: string;
        bookingRef?: string | null;
        customerName?: string | null;
        odometerKm: number;
        hasAccident: boolean;
        accidentNotes?: string | null;
        damagePoints: Array<{
          zoneKey: string;
          severity: string;
          description?: string | null;
          repairCost?: number;
        }>;
      }
    >({
      query: ({ vehicleId, ...body }) => ({
        url: `/fleet/vehicles/${vehicleId}/inspections`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    listVehicleMakes: builder.query<
      {
        ok: boolean;
        data: Array<{
          id: string;
          companyId: string;
          name: string;
          models: Array<{ id: string; makeId: string; name: string }>;
        }>;
      },
      void
    >({
      query: () => "/fleet/makes",
      providesTags: ["VehicleVariant"],
    }),

    createVehicleMake: builder.mutation<
      {
        ok: boolean;
        data: {
          id: string;
          companyId: string;
          name: string;
          models: Array<{ id: string; makeId: string; name: string }>;
        };
      },
      { name: string }
    >({
      query: (body) => ({
        url: "/fleet/makes",
        method: "POST",
        body,
      }),
      invalidatesTags: ["VehicleVariant"],
    }),

    createVehicleModel: builder.mutation<
      { ok: boolean; data: { id: string; makeId: string; name: string } },
      { makeId: string; name: string }
    >({
      query: ({ makeId, name }) => ({
        url: `/fleet/makes/${makeId}/models`,
        method: "POST",
        body: { name },
      }),
      invalidatesTags: ["VehicleVariant"],
    }),

    listVariants: builder.query<
      ApiResponse<VehicleVariantDto[]>,
      { category?: VehicleCategory; search?: string; page?: number; pageSize?: number } | void
    >({
      query: (params) => ({
        url: "/fleet/variants",
        params: params || {},
      }),
      providesTags: ["VehicleVariant"],
    }),

    createVariant: builder.mutation<ApiResponse<VehicleVariantDto>, CreateVehicleVariantInput>({
      query: (body) => ({
        url: "/fleet/variants",
        method: "POST",
        body,
      }),
      invalidatesTags: ["VehicleVariant", "Fleet"],
    }),

    updateVariant: builder.mutation<
      ApiResponse<VehicleVariantDto>,
      { id: string; data: Partial<CreateVehicleVariantInput> & { status?: VehicleVariantStatus } }
    >({
      query: ({ id, data }) => ({
        url: `/fleet/variants/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["VehicleVariant", "Fleet"],
    }),

    deleteVariant: builder.mutation<ApiResponse<{ archived: boolean }>, string>({
      query: (id) => ({
        url: `/fleet/variants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["VehicleVariant", "Fleet"],
    }),

    // --- Vendors ---
    listVendors: builder.query<
      ApiResponse<VendorDto[]>,
      { category?: VendorCategory; search?: string; page?: number; pageSize?: number } | void
    >({
      query: (params) => ({
        url: "/fleet/vendors",
        params: params || {},
      }),
      providesTags: ["Vendor"],
    }),

    createVendor: builder.mutation<ApiResponse<VendorDto>, CreateVendorInput>({
      query: (body) => ({
        url: "/fleet/vendors",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Vendor", "Fleet"],
    }),

    updateVendor: builder.mutation<
      ApiResponse<VendorDto>,
      { id: string; data: Partial<CreateVendorInput> & { status?: VendorStatus } }
    >({
      query: ({ id, data }) => ({
        url: `/fleet/vendors/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Vendor", "Fleet"],
    }),

    // --- Purchase Orders ---
    listPurchaseOrders: builder.query<
      ApiResponse<PurchaseOrderDto[]>,
      { branchId?: string; vendorId?: string; status?: PurchaseOrderStatus; page?: number; pageSize?: number } | void
    >({
      query: (params) => ({
        url: "/fleet/purchase-orders",
        params: params || {},
      }),
      providesTags: ["PurchaseOrder"],
    }),

    createPurchaseOrder: builder.mutation<
      ApiResponse<PurchaseOrderDto>,
      CreatePurchaseOrderInput
    >({
      query: (body) => ({
        url: "/fleet/purchase-orders",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PurchaseOrder", "Fleet"],
    }),

    updatePurchaseOrderStatus: builder.mutation<
      ApiResponse<PurchaseOrderDto>,
      { id: string; status: PurchaseOrderStatus }
    >({
      query: ({ id, status }) => ({
        url: `/fleet/purchase-orders/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["PurchaseOrder", "Fleet"],
    }),

    receiveVehicle: builder.mutation<
      ApiResponse<{ vehicle: FleetVehicleDto; po: PurchaseOrderDto }>,
      ReceiveVehicleInput
    >({
      query: ({ purchaseOrderId, ...body }) => ({
        url: `/fleet/purchase-orders/${purchaseOrderId}/receive`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PurchaseOrder", "Fleet"],
    }),

    getVehicle: builder.query<ApiResponse<FleetVehicleDto>, string>({
      query: (id) => "/fleet/vehicles/" + encodeURIComponent(id),
      providesTags: ["Fleet"],
    }),
    getPurchaseOrder: builder.query<ApiResponse<PurchaseOrderDto>, string>({
      query: (id) => "/fleet/purchase-orders/" + encodeURIComponent(id),
      providesTags: ["PurchaseOrder"],
    }),

    // --- Vehicles ---
    listVehicles: builder.query<
      ApiResponse<FleetVehicleDto[]>,
      {
        branchId?: string;
        status?: FleetVehicleStatus;
        variantId?: string;
        search?: string;
        includeNetwork?: boolean;
        page?: number;
        pageSize?: number;
      } | void
    >({
      query: (params) => ({
        url: "/fleet/vehicles",
        params: params || {},
      }),
      providesTags: ["Fleet"],
    }),

    createVehicle: builder.mutation<ApiResponse<FleetVehicleDto>, CreateFleetVehicleInput>({
      query: (body) => ({
        url: "/fleet/vehicles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    updateVehicle: builder.mutation<
      ApiResponse<FleetVehicleDto>,
      { id: string; data: UpdateFleetVehicleInput }
    >({
      query: ({ id, data }) => ({
        url: `/fleet/vehicles/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Fleet"],
    }),

    updateVehicleStatus: builder.mutation<
      ApiResponse<FleetVehicleDto>,
      { id: string; status: FleetVehicleStatus }
    >({
      query: ({ id, status }) => ({
        url: `/fleet/vehicles/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Fleet"],
    }),

    // --- Vehicle Photos ---
    listVehiclePhotos: builder.query<
      ApiResponse<VehiclePhotoDto[]>,
      { search?: string; page?: number; pageSize?: number } | void
    >({
      query: (params) => ({
        url: "/fleet/photos",
        params: params || {},
      }),
      providesTags: ["VehiclePhoto"],
    }),

    createVehiclePhoto: builder.mutation<
      ApiResponse<VehiclePhotoDto>,
      CreateVehiclePhotoInput
    >({
      query: (body) => ({
        url: "/fleet/photos",
        method: "POST",
        body,
      }),
      invalidatesTags: ["VehiclePhoto"],
    }),

    uploadVehiclePhoto: builder.mutation<
      ApiResponse<VehiclePhotoDto>,
      { vehicleName: string; file: File }
    >({
      query: ({ vehicleName, file }) => ({
        url: `/fleet/photos/upload?vehicleName=${encodeURIComponent(vehicleName)}`,
        method: "POST",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      }),
      invalidatesTags: ["VehiclePhoto"],
    }),

    deleteVehiclePhoto: builder.mutation<
      ApiResponse<{ deleted: boolean }>,
      string
    >({
      query: (id) => ({
        url: `/fleet/photos/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["VehiclePhoto"],
    }),

    // --- Rental Inclusions (What is Included) ---
    listRentalInclusions: builder.query<
      ApiResponse<RentalInclusionDto[]>,
      { search?: string; activeOnly?: boolean; page?: number; pageSize?: number } | void
    >({
      query: (params) => ({
        url: "/fleet/inclusions",
        params: params
          ? {
              search: params.search,
              activeOnly: params.activeOnly ? "true" : undefined,
              page: params.page,
              pageSize: params.pageSize,
            }
          : undefined,
      }),
      providesTags: ["RentalInclusion"],
    }),

    createRentalInclusion: builder.mutation<
      ApiResponse<RentalInclusionDto>,
      CreateRentalInclusionInput
    >({
      query: (body) => ({
        url: "/fleet/inclusions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RentalInclusion"],
    }),

    updateRentalInclusion: builder.mutation<
      ApiResponse<RentalInclusionDto>,
      { id: string; data: UpdateRentalInclusionInput }
    >({
      query: ({ id, data }) => ({
        url: `/fleet/inclusions/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["RentalInclusion"],
    }),

    deleteRentalInclusion: builder.mutation<
      ApiResponse<{ deleted: boolean }>,
      string
    >({
      query: (id) => ({
        url: `/fleet/inclusions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["RentalInclusion"],
    }),

    // Phase 2: Bookable Fleet, Customers & Rental Contracts
    toggleVehicleBookable: builder.mutation<
      { ok: boolean; data: FleetVehicleDto },
      { id: string; isBookable: boolean }
    >({
      query: ({ id, isBookable }) => ({
        url: `/fleet/vehicles/${id}/bookable`,
        method: "PATCH",
        body: { isBookable },
      }),
      invalidatesTags: ["Fleet"],
    }),

    listCustomers: builder.query<{ ok: boolean; data: CustomerDto[] }, void>({
      query: () => "/fleet/customers",
      providesTags: ["Customer"],
    }),

    createCustomer: builder.mutation<
      { ok: boolean; data: CustomerDto },
      {
        fullName: string;
        phone: string;
        secondaryPhone?: string | null;
        email?: string | null;
        nationalId?: string | null;
        driverLicenseNo?: string | null;
        licenseExpiry?: string | null;
        nationality?: string | null;
        address?: string | null;
        workAddress?: string | null;
        notes?: string | null;
      }
    >({
      query: (body) => ({
        url: "/fleet/customers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customer"],
    }),

    updateCustomer: builder.mutation<
      { ok: boolean; data: CustomerDto },
      {
        id: string;
        fullName: string;
        phone: string;
        secondaryPhone?: string | null;
        email?: string | null;
        nationalId?: string | null;
        driverLicenseNo?: string | null;
        licenseExpiry?: string | null;
        nationality?: string | null;
        address?: string | null;
        workAddress?: string | null;
        notes?: string | null;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/fleet/customers/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Customer"],
    }),

    deleteCustomer: builder.mutation<{ ok: boolean; data: { deleted: boolean } }, string>({
      query: (id) => ({
        url: `/fleet/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customer"],
    }),

    listRentalContracts: builder.query<{ ok: boolean; data: RentalContractDto[] }, void>({
      query: () => "/fleet/contracts",
      providesTags: ["RentalContract"],
    }),

    createRentalContract: builder.mutation<
      { ok: boolean; data: RentalContractDto },
      {
        vehicleId: string;
        customerId: string;
        startDate: string;
        endDate: string;
        pickupOdometer?: number;
        dailyRate?: number;
        discount?: number;
        insuranceFee?: number;
        extraCharges?: number;
        paidAmount?: number;
        depositAmount?: number;
        notes?: string | null;
      }
    >({
      query: (body) => ({
        url: "/fleet/contracts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RentalContract", "Fleet"],
    }),

    completeRentalContract: builder.mutation<
      { ok: boolean; data: RentalContractDto },
      {
        id: string;
        returnOdometer: number;
        extraCharges?: number;
        paidAmount?: number;
        notes?: string | null;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/fleet/contracts/${id}/complete`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["RentalContract", "Fleet"],
    }),

    cancelRentalContract: builder.mutation<{ ok: boolean; data: RentalContractDto }, string>({
      query: (id) => ({
        url: `/fleet/contracts/${id}/cancel`,
        method: "POST",
      }),
      invalidatesTags: ["RentalContract", "Fleet"],
    }),

    // --- Drivers Directory ---
    listDrivers: builder.query<ApiResponse<DriverDto[]>, void>({
      query: () => "/fleet/drivers",
      providesTags: ["Fleet"],
    }),

    createDriver: builder.mutation<
      ApiResponse<DriverDto>,
      {
        fullName: string;
        phonePrimary: string;
        phoneSecondary?: string | null;
        email?: string | null;
        licenseNumber: string;
        licenseIssueDate: string;
        licenseExpiryDate: string;
        passportNumber?: string | null;
        nationalIdNumber?: string | null;
        idCardPhotoUrl?: string | null;
        passportPhotoUrl?: string | null;
        licensePhotoUrl?: string | null;
        address?: string | null;
        status?: "active" | "inactive";
      }
    >({
      query: (body) => ({
        url: "/fleet/drivers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    updateDriver: builder.mutation<
      ApiResponse<DriverDto>,
      {
        id: string;
        fullName: string;
        phonePrimary: string;
        phoneSecondary?: string | null;
        email?: string | null;
        licenseNumber: string;
        licenseIssueDate: string;
        licenseExpiryDate: string;
        passportNumber?: string | null;
        nationalIdNumber?: string | null;
        idCardPhotoUrl?: string | null;
        passportPhotoUrl?: string | null;
        licensePhotoUrl?: string | null;
        address?: string | null;
        status?: "active" | "inactive";
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/fleet/drivers/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    deleteDriver: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `/fleet/drivers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Fleet"],
    }),

    // --- Vehicle Movements & Branch Transfers ---
    listMovements: builder.query<
      ApiResponse<VehicleMovementDto[]>,
      { vehicleId?: string; status?: string; toBranchId?: string } | void
    >({
      query: (params) => ({
        url: "/fleet/movements",
        params: params || {},
      }),
      providesTags: ["Fleet"],
    }),

    dispatchMovement: builder.mutation<
      ApiResponse<VehicleMovementDto>,
      {
        vehicleId: string;
        toBranchId: string;
        driverId: string;
        dispatchOdometerKm: number;
        notes?: string | null;
      }
    >({
      query: (body) => ({
        url: "/fleet/movements",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    receiveMovement: builder.mutation<
      ApiResponse<VehicleMovementDto>,
      { id: string; arrivalOdometerKm: number; notes?: string | null }
    >({
      query: ({ id, ...body }) => ({
        url: `/fleet/movements/${id}/receive`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fleet"],
    }),

    cancelMovement: builder.mutation<ApiResponse<VehicleMovementDto>, string>({
      query: (id) => ({
        url: `/fleet/movements/${id}/cancel`,
        method: "POST",
      }),
      invalidatesTags: ["Fleet"],
    }),
  }),
});

export const {
  useGetFleetMetricsQuery,
  useListAuditLogsQuery,
  useListInsuranceCompaniesQuery,
  useCreateInsuranceCompanyMutation,
  useDeleteInsuranceCompanyMutation,
  useGetVehicleLifecycleQuery,
  useSaveVehicleInsuranceMutation,
  useUpdateVehiclePricingMutation,
  useUpdateVariantPricingMutation,
  useApplyVariantListingSetupMutation,
  useAddVehicleMaintenanceMutation,
  useAddVehicleInspectionMutation,
  useToggleVehicleBookableMutation,
  useListCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useListRentalContractsQuery,
  useCreateRentalContractMutation,
  useCompleteRentalContractMutation,
  useCancelRentalContractMutation,
  useSignPurchaseOrderMutation,
  useListVehicleMakesQuery,
  useCreateVehicleMakeMutation,
  useCreateVehicleModelMutation,
  useListVariantsQuery,
  useCreateVariantMutation,
  useUpdateVariantMutation,
  useDeleteVariantMutation,
  useListVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useListPurchaseOrdersQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderStatusMutation,
  useReceiveVehicleMutation,
  useListVehiclesQuery,
  useGetVehicleQuery,
  useGetPurchaseOrderQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useUpdateVehicleStatusMutation,
  useListVehiclePhotosQuery,
  useCreateVehiclePhotoMutation,
  useUploadVehiclePhotoMutation,
  useDeleteVehiclePhotoMutation,
  useListRentalInclusionsQuery,
  useCreateRentalInclusionMutation,
  useUpdateRentalInclusionMutation,
  useDeleteRentalInclusionMutation,
  useListDriversQuery,
  useCreateDriverMutation,
  useUpdateDriverMutation,
  useDeleteDriverMutation,
  useListMovementsQuery,
  useDispatchMovementMutation,
  useReceiveMovementMutation,
  useCancelMovementMutation,
} = fleetApi;
