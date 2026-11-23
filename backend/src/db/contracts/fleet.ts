

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

export interface VehicleVariantRecord {
  id: string;
  variantCode?: string;
  companyId: string;
  make: string;
  model: string;
  modelYear: number;
  trim: string;
  category: VehicleCategory;
  transmission?: VehicleTransmission;
  fuelType?: VehicleFuelType;
  seatingCapacity?: number;
  sippCode: string;
  status: VehicleVariantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVehicleVariantInput {
  id?: string;
  companyId: string;
  make: string;
  model: string;
  modelYear: number;
  trim?: string;
  category?: VehicleCategory;
  transmission?: VehicleTransmission;
  fuelType?: VehicleFuelType;
  seatingCapacity?: number;
  sippCode?: string;
}

export interface UpdateVehicleVariantInput {
  make?: string;
  model?: string;
  modelYear?: number;
  trim?: string;
  category?: VehicleCategory;
  transmission?: VehicleTransmission;
  fuelType?: VehicleFuelType;
  seatingCapacity?: number;
  sippCode?: string;
  status?: VehicleVariantStatus;
}

export interface VehiclePhotoRecord {
  id: string;
  companyId: string;
  vehicleName: string;
  photoUrl: string;
  category: string;
  createdAt: Date;
}

export interface CreateVehiclePhotoInput {
  id?: string;
  companyId: string;
  vehicleName: string;
  photoUrl: string;
  category?: string;
}

export interface RentalInclusionRecord {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRentalInclusionInput {
  id?: string;
  companyId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateRentalInclusionInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export type FleetVehicleStatus =
  | "available"
  | "on_rent"
  | "maintenance"
  | "reserved"
  | "out_of_service";

export interface FleetVehicleRecord {
  id: string;
  assetCode?: string;
  companyId: string;
  branchId: string | null;
  variantId: string;
  purchaseOrderId: string | null;
  vin: string;
  licensePlate: string;
  keyNumber: string | null;
  color: string;
  mileageOdometer: number;
  status: FleetVehicleStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Extended rental operations & specs fields
  photoUrl: string | null;
  locationType: string;
  fuelPolicy: string;
  instantConfirmation: boolean;
  description: string | null;
  deliveryPolicy: string | null;
  dailyRate1to2: number;
  dailyRate3to7: number;
  dailyRate8Plus: number;
  damageExcess: number;
  mileagePolicy: "unlimited" | "limited";
  dailyKmLimit: number;
  extraKmRate: number;
  inclusions: string[];
  seats: number;
  doors: number;
  airConditioning: boolean;
  fuelType: string;
  luggageCapacity: string;
  transmission: string;
  // Enriched presentation fields
  variant?: VehicleVariantRecord;
  branchName?: string;
  companyName?: string;
  companyLogoUrl?: string | null;
  companyTimezone?: string | null;
  companyCountryCode?: string | null;
  parentCompanyName?: string | null;
  parentCompanyLogoUrl?: string | null;
  signatureDataUrl?: string | null;
  signedByName?: string | null;
  signedAt?: Date | null;
  isPartnerVehicle?: boolean;
  vendorName?: string | null;
  poNumber?: string | null;
  purchasePrice?: number | null;
  purchaseOrderDate?: string | null;
  isBookable?: boolean;
  publishedToFleetAt?: Date | null;
  insuranceCompany?: string | null;
  insurancePolicyNumber?: string | null;
  inServiceDate?: string | null;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
}

export interface VehicleInsurancePolicyRecord {
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
  createdAt: Date;
}

export interface VehicleOdometerLogRecord {
  id: string;
  companyId: string;
  vehicleId: string;
  source: string;
  referenceLabel: string | null;
  odometerKm: number;
  deltaKm: number;
  recordedBy: string | null;
  recordedAt: Date;
}

export interface VehicleMaintenanceLogRecord {
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
  createdAt: Date;
}

export interface VehicleDamagePointRecord {
  id: string;
  inspectionId: string;
  vehicleId: string;
  zoneKey: string;
  severity: string;
  description: string | null;
  repairCost: number;
  isResolved: boolean;
  createdAt: Date;
}

export interface VehicleInspectionRecord {
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
  inspectedAt: Date;
  damagePoints: VehicleDamagePointRecord[];
}

export interface DriverRecord {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleMovementRecord {
  id: string;
  companyId: string;
  movementNumber: string;
  vehicleId: string;
  fromBranchId: string | null;
  toBranchId: string;
  driverId: string;
  status: "in_transit" | "received" | "cancelled";
  dispatchOdometerKm: number;
  arrivalOdometerKm: number | null;
  dispatchedByUserId: string | null;
  receivedByUserId: string | null;
  dispatchedAt: Date;
  receivedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  vehicleName?: string | null;
  vehiclePlate?: string | null;
  fromBranchName?: string | null;
  toBranchName?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  dispatchedByUserName?: string | null;
  receivedByUserName?: string | null;
}

export interface VehicleLifecycleProfile {
  insurancePolicies: VehicleInsurancePolicyRecord[];
  odometerLogs: VehicleOdometerLogRecord[];
  maintenanceLogs: VehicleMaintenanceLogRecord[];
  inspections: VehicleInspectionRecord[];
  damagePoints: VehicleDamagePointRecord[];
  movements?: VehicleMovementRecord[];
}

export interface CreateFleetVehicleInput {
  id?: string;
  companyId: string;
  branchId: string;
  variantId: string;
  purchaseOrderId?: string | null;
  createdByUserId?: string | null;
  vin: string;
  licensePlate: string;
  keyNumber?: string | null;
  color: string;
  mileageOdometer?: number;
  isBookable?: boolean;
  status?: FleetVehicleStatus;
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

export interface FleetVehicleFilterOptions {
  branchId?: string;
  status?: FleetVehicleStatus;
  variantId?: string;
  search?: string;
  includeNetwork?: boolean;
  isBookable?: boolean;
}
