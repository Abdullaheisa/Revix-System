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
  parentCompanyName?: string | null;
  parentCompanyLogoUrl?: string | null;
  signatureDataUrl?: string | null;
  signedByName?: string | null;
  signedAt?: string | null;
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
  branchId?: string;
  vin: string;
  licensePlate: string;
  keyNumber?: string | null;
  color: string;
  mileageOdometer?: number;
  registrationExpiry?: string | null;
  insuranceExpiry?: string | null;
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
  createdAt: string;
  updatedAt: string;
  variant?: VehicleVariantDto;
  branchName?: string;
  companyName?: string;
  companyLogoUrl?: string | null;
  parentCompanyName?: string | null;
  parentCompanyLogoUrl?: string | null;
  isPartnerVehicle?: boolean;
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
  status?: FleetVehicleStatus;
  registrationExpiry?: string | null;
  insuranceExpiry?: string | null;
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
  }),
});

export const {
  useGetFleetMetricsQuery,
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
} = fleetApi;
