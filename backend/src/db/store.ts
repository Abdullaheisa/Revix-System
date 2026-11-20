export type UserStatus = "active" | "disabled";
export type ActionTokenType = "verify_email" | "reset_password";
export type CompanyOperatingMode =
  | "independent"
  | "network_main"
  | "local_partner";

export type RoleScopeType = "company_wide" | "assigned_branches";
export type MembershipStatus = "active" | "suspended";
export type PermissionResource =
  | "company"
  | "branches"
  | "team"
  | "fleet"
  | "purchase_orders"
  | "vendors"
  | "variants"
  | "vehicle_photos"
  | "rental_inclusions"
  | "sales"
  | "operations"
  | "finance"
  | "network";

export type PermissionMatrix = Partial<Record<PermissionResource, string[]>>;

export interface CompanyRoleRecord {
  id: string;
  companyId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  scopeType: RoleScopeType;
  permissions: PermissionMatrix;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyRoleInput {
  id: string;
  companyId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  scopeType: RoleScopeType;
  permissions: PermissionMatrix;
  isSystem: boolean;
}

export interface UpdateCompanyRoleInput {
  nameEn?: string;
  nameAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  scopeType: RoleScopeType;
  permissions: PermissionMatrix;
}

export interface CompanyMembershipRecord {
  id: string;
  userId: string;
  companyId: string;
  roleId: string;
  phone: string;
  status: MembershipStatus;
  branchIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyMembershipInput {
  id: string;
  userId: string;
  companyId: string;
  roleId: string;
  phone: string;
  status?: MembershipStatus;
  branchIds: string[];
}

export interface UpdateCompanyMembershipInput {
  roleId: string;
  phone: string;
  status: MembershipStatus;
  branchIds: string[];
}

export interface EmployeeInvitationRecord {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  phone: string;
  roleId: string;
  branchIds: string[];
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

// Phase 4: Company Network Types
export type NetworkLinkStatus = "pending" | "active" | "paused" | "terminated";
export type NetworkInvitationStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export interface CompanyNetworkLinkRecord {
  id: string;
  mainCompanyId: string;
  localCompanyId: string;
  status: NetworkLinkStatus;
  permittedCountries: string[];
  notes?: string;
  createdByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkPermittedBranchRecord {
  id: string;
  linkId: string;
  localCompanyId: string;
  branchId: string;
  createdAt: Date;
}

export interface CompanyNetworkInvitationRecord {
  id: string;
  mainCompanyId: string;
  inviteeEmail: string;
  localCompanyName: string;
  contactName?: string;
  contactPhone?: string;
  logoUrl?: string | null;
  tokenHash: string;
  status: NetworkInvitationStatus;
  invitedByUserId?: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  createdAt: Date;
}

export interface CreateNetworkLinkInput {
  id?: string;
  mainCompanyId: string;
  localCompanyId: string;
  status?: NetworkLinkStatus;
  permittedCountries?: string[];
  notes?: string;
  createdByUserId?: string;
}

export interface CreateNetworkInvitationInput {
  id?: string;
  mainCompanyId: string;
  inviteeEmail: string;
  localCompanyName: string;
  contactName?: string;
  contactPhone?: string;
  logoUrl?: string | null;
  tokenHash: string;
  expiresAt: Date;
  invitedByUserId?: string;
}

export interface CreateEmployeeInvitationInput {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  phone: string;
  roleId: string;
  branchIds: string[];
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: Date;
}

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ActionTokenRecord {
  id: string;
  userId: string;
  tokenType: ActionTokenType;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface CompanyRecord {
  id: string;
  ownerUserId: string;
  name: string;
  legalName: string;
  logoUrl: string | null;
  brandColor: string;
  phone: string;
  email: string;
  countryCode: string;
  city: string;
  address: string;
  postalCode: string;
  baseCurrency: string;
  timezone: string;
  businessRegNumber: string;
  taxRegNumber: string;
  operatingMode: CompanyOperatingMode;
  parentCompanyId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompanyInput {
  id: string;
  ownerUserId: string;
  name: string;
  legalName: string;
  logoUrl?: string | null;
  brandColor: string;
  phone: string;
  email: string;
  countryCode: string;
  city: string;
  address: string;
  postalCode: string;
  baseCurrency: string;
  timezone: string;
  businessRegNumber: string;
  taxRegNumber: string;
  operatingMode: CompanyOperatingMode;
  parentCompanyId?: string | null;
}

export interface UpdateCompanyInput {
  name: string;
  legalName: string;
  logoUrl?: string | null;
  brandColor: string;
  phone: string;
  email: string;
  countryCode: string;
  city: string;
  address: string;
  postalCode: string;
  baseCurrency: string;
  timezone: string;
  businessRegNumber: string;
  taxRegNumber: string;
  operatingMode: CompanyOperatingMode;
}

export interface BranchRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  countryCode: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  currencyCode: string;
  timezone: string;
  workingDays: string;
  workingHours: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBranchInput {
  id: string;
  companyId: string;
  name: string;
  code: string;
  countryCode: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  currencyCode: string;
  timezone: string;
  workingDays: string;
  workingHours: string;
}

export interface UpdateBranchInput {
  name: string;
  code: string;
  countryCode: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  currencyCode: string;
  timezone: string;
  workingDays: string;
  workingHours: string;
  isActive: boolean;
}

export interface AuditLogInput {
  companyId?: string | null;
  branchId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRecord extends Required<AuditLogInput> {
  id: string;
  createdAt: Date;
}

export interface AuthDataStore {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: string): Promise<UserRecord | null>;
  createUser(input: {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRecord>;
  markUserEmailVerified(userId: string, verifiedAt: Date): Promise<void>;
  updateUserPassword(
    userId: string,
    newPasswordHash: string,
    updatedAt: Date,
  ): Promise<void>;
  updateUserStatus(userId: string, status: UserStatus): Promise<void>;

  createSession(input: {
    id: string;
    userId: string;
    tokenHash: string;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<SessionRecord>;
  findActiveSessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<SessionRecord | null>;
  revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<void>;
  revokeAllUserSessions(userId: string, revokedAt: Date): Promise<void>;

  createActionToken(input: {
    id: string;
    userId: string;
    tokenType: ActionTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<ActionTokenRecord>;
  invalidateUnusedActionTokens(
    userId: string,
    tokenType: ActionTokenType,
    consumedAt: Date,
  ): Promise<void>;
  consumeActionToken(
    tokenHash: string,
    tokenType: ActionTokenType,
    now: Date,
  ): Promise<
    | { status: "consumed"; token: ActionTokenRecord }
    | { status: "expired" }
    | { status: "invalid" }
  >;

  findCompanyByOwnerUserId(userId: string): Promise<CompanyRecord | null>;
  findCompanyById(companyId: string): Promise<CompanyRecord | null>;
  createCompany(input: CreateCompanyInput): Promise<CompanyRecord>;
  updateCompany(
    companyId: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyRecord | null>;
  updateCompanyOperatingMode(
    companyId: string,
    operatingMode: CompanyOperatingMode,
    parentCompanyId?: string | null,
  ): Promise<CompanyRecord | null>;

  listBranchesByCompanyId(companyId: string): Promise<BranchRecord[]>;
  findBranchById(branchId: string): Promise<BranchRecord | null>;
  createBranch(input: CreateBranchInput): Promise<BranchRecord>;
  updateBranch(
    branchId: string,
    companyId: string,
    input: UpdateBranchInput,
  ): Promise<BranchRecord | null>;

  // Phase 3: Team Roles, Memberships, Branch Scopes & Invitations
  listCompanyRoles(companyId: string): Promise<CompanyRoleRecord[]>;
  findCompanyRoleById(roleId: string): Promise<CompanyRoleRecord | null>;
  findCompanyRoleByCode(
    companyId: string,
    code: string,
  ): Promise<CompanyRoleRecord | null>;
  createCompanyRole(input: CreateCompanyRoleInput): Promise<CompanyRoleRecord>;
  updateCompanyRole(
    roleId: string,
    companyId: string,
    input: UpdateCompanyRoleInput,
  ): Promise<CompanyRoleRecord | null>;

  findMembershipByUserId(
    userId: string,
  ): Promise<CompanyMembershipRecord | null>;
  findMembershipById(
    membershipId: string,
  ): Promise<CompanyMembershipRecord | null>;
  listCompanyMemberships(companyId: string): Promise<CompanyMembershipRecord[]>;
  createCompanyMembership(
    input: CreateCompanyMembershipInput,
  ): Promise<CompanyMembershipRecord>;
  updateCompanyMembership(
    membershipId: string,
    companyId: string,
    input: UpdateCompanyMembershipInput,
  ): Promise<CompanyMembershipRecord | null>;

  createEmployeeInvitation(
    input: CreateEmployeeInvitationInput,
  ): Promise<EmployeeInvitationRecord>;
  findInvitationById(
    invitationId: string,
  ): Promise<EmployeeInvitationRecord | null>;
  findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<EmployeeInvitationRecord | null>;
  listCompanyInvitations(companyId: string): Promise<EmployeeInvitationRecord[]>;
  revokePendingInvitationsForEmail(
    companyId: string,
    email: string,
    revokedAt: Date,
  ): Promise<void>;
  revokeInvitationById(
    invitationId: string,
    companyId: string,
    revokedAt: Date,
  ): Promise<EmployeeInvitationRecord | null>;
  markInvitationAccepted(
    invitationId: string,
    acceptedAt: Date,
  ): Promise<void>;

  // Phase 4: Company Network (Main Company <-> Local Partner Companies)
  createNetworkLink(
    input: CreateNetworkLinkInput,
  ): Promise<CompanyNetworkLinkRecord>;
  findNetworkLinkById(linkId: string): Promise<CompanyNetworkLinkRecord | null>;
  findNetworkLink(
    mainCompanyId: string,
    localCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord | null>;
  listNetworkLinksForMain(
    mainCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord[]>;
  listNetworkLinksForLocal(
    localCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord[]>;
  updateNetworkLinkStatus(
    linkId: string,
    status: NetworkLinkStatus,
  ): Promise<CompanyNetworkLinkRecord | null>;
  deleteNetworkLink(linkId: string): Promise<void>;

  setNetworkPermittedBranches(
    linkId: string,
    localCompanyId: string,
    branchIds: string[],
  ): Promise<NetworkPermittedBranchRecord[]>;
  listNetworkPermittedBranches(
    linkId: string,
  ): Promise<NetworkPermittedBranchRecord[]>;

  createNetworkInvitation(
    input: CreateNetworkInvitationInput,
  ): Promise<CompanyNetworkInvitationRecord>;
  findNetworkInvitationById(
    invitationId: string,
  ): Promise<CompanyNetworkInvitationRecord | null>;
  findNetworkInvitationByTokenHash(
    tokenHash: string,
  ): Promise<CompanyNetworkInvitationRecord | null>;
  listNetworkInvitationsForMain(
    mainCompanyId: string,
  ): Promise<CompanyNetworkInvitationRecord[]>;
  updateNetworkInvitationStatus(
    invitationId: string,
    status: NetworkInvitationStatus,
    acceptedAt?: Date,
  ): Promise<CompanyNetworkInvitationRecord | null>;

  // Phase 5: Fleet & Purchasing Data Access
  createVehicleVariant(
    input: CreateVehicleVariantInput,
  ): Promise<VehicleVariantRecord>;
  findVehicleVariantById(
    variantId: string,
  ): Promise<VehicleVariantRecord | null>;
  listVehicleVariants(
    companyId: string,
    filter?: { category?: VehicleCategory; search?: string },
  ): Promise<VehicleVariantRecord[]>;
  updateVehicleVariant(
    variantId: string,
    input: UpdateVehicleVariantInput,
  ): Promise<VehicleVariantRecord | null>;
  deleteVehicleVariant(variantId: string): Promise<boolean>;

  createVendor(input: CreateVendorInput): Promise<VendorRecord>;
  findVendorById(vendorId: string): Promise<VendorRecord | null>;
  listVendors(
    companyId: string,
    filter?: { category?: VendorCategory; search?: string },
  ): Promise<VendorRecord[]>;
  updateVendor(
    vendorId: string,
    input: UpdateVendorInput,
  ): Promise<VendorRecord | null>;

  createPurchaseOrder(
    input: CreatePurchaseOrderInput,
  ): Promise<PurchaseOrderRecord>;
  findPurchaseOrderById(poId: string): Promise<PurchaseOrderRecord | null>;
  listPurchaseOrders(
    companyId: string,
    filter?: {
      branchId?: string;
      vendorId?: string;
      status?: PurchaseOrderStatus;
    },
  ): Promise<PurchaseOrderRecord[]>;
  updatePurchaseOrderStatus(
    poId: string,
    status: PurchaseOrderStatus,
    approvedByUserId?: string,
  ): Promise<PurchaseOrderRecord | null>;
  receiveVehicleFromPo(
    input: ReceiveVehicleFromPoInput,
  ): Promise<{ vehicle: FleetVehicleRecord; po: PurchaseOrderRecord }>;

  createFleetVehicle(
    input: CreateFleetVehicleInput,
  ): Promise<FleetVehicleRecord>;
  findFleetVehicleById(vehicleId: string): Promise<FleetVehicleRecord | null>;
  findFleetVehicleByVin(
    companyId: string,
    vin: string,
  ): Promise<FleetVehicleRecord | null>;
  findFleetVehicleByLicensePlate(
    companyId: string,
    licensePlate: string,
  ): Promise<FleetVehicleRecord | null>;
  listFleetVehicles(
    companyId: string,
    filter?: FleetVehicleFilterOptions,
    permittedBranchIds?: string[],
  ): Promise<FleetVehicleRecord[]>;
  updateFleetVehicle(
    vehicleId: string,
    input: UpdateFleetVehicleInput,
  ): Promise<FleetVehicleRecord | null>;
  updateFleetVehicleStatus(
    vehicleId: string,
    status: FleetVehicleStatus,
  ): Promise<FleetVehicleRecord | null>;

  // Vehicle Photos Library
  createVehiclePhoto(input: CreateVehiclePhotoInput): Promise<VehiclePhotoRecord>;
  listVehiclePhotos(companyId: string, search?: string): Promise<VehiclePhotoRecord[]>;
  deleteVehiclePhoto(id: string): Promise<boolean>;

  // Rental Inclusions (What is Included)
  createRentalInclusion(input: CreateRentalInclusionInput): Promise<RentalInclusionRecord>;
  getRentalInclusionById(id: string): Promise<RentalInclusionRecord | null>;
  listRentalInclusions(companyId: string, search?: string, activeOnly?: boolean): Promise<RentalInclusionRecord[]>;
  updateRentalInclusion(id: string, input: UpdateRentalInclusionInput): Promise<RentalInclusionRecord | null>;
  deleteRentalInclusion(id: string): Promise<boolean>;

  recordAuditLog(input: AuditLogInput): Promise<void>;
}

// ==============================================================================
// Phase 5: Purchasing & Fleet Management Domain Models
// ==============================================================================

export type VehicleCategory =
  | "sedan"
  | "suv"
  | "luxury"
  | "compact"
  | "economy"
  | "commercial"
  | "van";
export type VehicleTransmission = "automatic" | "manual";
export type VehicleFuelType = "petrol" | "diesel" | "hybrid" | "electric";
export type VehicleVariantStatus = "active" | "archived";

export interface VehicleVariantRecord {
  id: string;
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

export interface VendorRecord {
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
  paymentTermsType: PaymentTermsType;
  paymentTermsConfig: string | null;
  status: VendorStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVendorInput {
  id?: string;
  companyId: string;
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

export interface UpdateVendorInput {
  name?: string;
  legalName?: string | null;
  category?: VendorCategory;
  contactPerson?: string;
  phone?: string;
  email?: string | null;
  countryCode?: string;
  city?: string;
  address?: string | null;
  taxNumber?: string | null;
  commercialRegister?: string | null;
  bankName?: string | null;
  iban?: string | null;
  paymentTermsDays?: number;
  paymentTermsType?: PaymentTermsType;
  paymentTermsConfig?: string | null;
  status?: VendorStatus;
}

export type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "partially_received"
  | "completed"
  | "cancelled";

export interface PurchaseOrderItemRecord {
  id: string;
  purchaseOrderId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  receivedCount: number;
  notes: string | null;
  createdAt: Date;
}

export interface PurchaseOrderRecord {
  id: string;
  companyId: string;
  branchId: string;
  vendorId: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string; // YYYY-MM-DD
  expectedDeliveryDate: string | null;
  currency: string;
  totalAmount: number;
  upfrontPaid: number;
  remainingAmount: number;
  installmentsCount: number;
  notes: string | null;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: PurchaseOrderItemRecord[];
  vendorName?: string;
  branchName?: string;
}

export interface CreatePurchaseOrderItemInput {
  variantId: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
}

export interface CreatePurchaseOrderInput {
  id?: string;
  companyId: string;
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
  createdByUserId?: string | null;
  items: CreatePurchaseOrderItemInput[];
}

export interface ReceiveVehicleFromPoInput {
  purchaseOrderId: string;
  itemId: string;
  branchId: string;
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

export interface FleetVehicleRecord {
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
  isPartnerVehicle?: boolean;
}

export interface CreateFleetVehicleInput {
  id?: string;
  companyId: string;
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

export interface FleetVehicleFilterOptions {
  branchId?: string;
  status?: FleetVehicleStatus;
  variantId?: string;
  search?: string;
  includeNetwork?: boolean;
}
