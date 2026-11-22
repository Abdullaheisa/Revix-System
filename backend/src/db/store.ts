import type { ActionTokenRecord, ActionTokenType, AuditLogInput, AuditLogRecord, SessionRecord, UserRecord, UserStatus } from "./contracts/auth.ts";
import type { BranchRecord, CompanyOperatingMode, CompanyRecord, CreateBranchInput, CreateCompanyInput, InsuranceCompanyRecord, UpdateBranchInput, UpdateCompanyInput } from "./contracts/workspace.ts";
import type { CompanyMembershipRecord, CompanyRoleRecord, CreateCompanyMembershipInput, CreateCompanyRoleInput, CreateEmployeeInvitationInput, EmployeeInvitationRecord, UpdateCompanyMembershipInput, UpdateCompanyRoleInput } from "./contracts/team.ts";
import type { CompanyNetworkInvitationRecord, CompanyNetworkLinkRecord, CreateNetworkInvitationInput, CreateNetworkLinkInput, NetworkInvitationStatus, NetworkLinkStatus, NetworkPermittedBranchRecord } from "./contracts/network.ts";
import type { CreateFleetVehicleInput, CreateRentalInclusionInput, CreateVehiclePhotoInput, CreateVehicleVariantInput, DriverRecord, FleetVehicleFilterOptions, FleetVehicleRecord, FleetVehicleStatus, RentalInclusionRecord, UpdateFleetVehicleInput, UpdateRentalInclusionInput, UpdateVehicleVariantInput, VehicleCategory, VehicleInspectionRecord, VehicleInsurancePolicyRecord, VehicleLifecycleProfile, VehicleMaintenanceLogRecord, VehicleMovementRecord, VehiclePhotoRecord, VehicleVariantRecord } from "./contracts/fleet.ts";
import type { CreatePurchaseOrderInput, CreateVendorInput, PurchaseOrderRecord, PurchaseOrderStatus, ReceiveVehicleFromPoInput, UpdateVendorInput, VendorCategory, VendorRecord } from "./contracts/purchasing.ts";
import type { CustomerRecord, RentalContractRecord } from "./contracts/rentals.ts";

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
  deleteCompanyRole(roleId: string, companyId: string): Promise<boolean>;

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
  signPurchaseOrder(
    poId: string,
    signatureDataUrl: string,
    signedByName: string,
  ): Promise<PurchaseOrderRecord | null>;

  // Vehicle Makes & Models Catalog
  listVehicleMakes(companyId: string): Promise<
    Array<{
      id: string;
      companyId: string;
      name: string;
      models: Array<{ id: string; makeId: string; name: string }>;
    }>
  >;
  createVehicleMake(
    companyId: string,
    name: string,
  ): Promise<{
    id: string;
    companyId: string;
    name: string;
    models: Array<{ id: string; makeId: string; name: string }>;
  }>;
  createVehicleModel(
    companyId: string,
    makeId: string,
    name: string,
  ): Promise<{ id: string; makeId: string; name: string }>;

  // Insurance Companies & Vehicle Lifecycle
  listInsuranceCompanies(companyId: string): Promise<InsuranceCompanyRecord[]>;
  createInsuranceCompany(input: {
    companyId: string;
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }): Promise<InsuranceCompanyRecord>;
  deleteInsuranceCompany(companyId: string, id: string): Promise<boolean>;
  getVehicleLifecycleProfile(
    companyId: string,
    vehicleId: string,
  ): Promise<VehicleLifecycleProfile>;
  upsertVehicleInsurancePolicy(input: {
    companyId: string;
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
  }): Promise<VehicleInsurancePolicyRecord>;
  updateVehiclePricingTiers(
    companyId: string,
    vehicleId: string,
    input: {
      dailyRate1to2: number;
      dailyRate3to7: number;
      dailyRate8Plus: number;
      damageExcess: number;
      mileagePolicy: "unlimited" | "limited";
      dailyKmLimit: number;
      extraKmRate: number;
    },
  ): Promise<FleetVehicleRecord | null>;
  updateVariantPricingTiers(
    companyId: string,
    variantId: string,
    input: {
      dailyRate1to2: number;
      dailyRate3to7: number;
      dailyRate8Plus: number;
      damageExcess: number;
      mileagePolicy?: "unlimited" | "limited";
      dailyKmLimit?: number;
      extraKmRate?: number;
      branchIds?: string[];
      unassignedOnly?: boolean;
    },
  ): Promise<{ updatedCount: number }>;
  applyVariantListingSetup(
    companyId: string,
    variantId: string,
    input: {
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
      branchIds?: string[];
    },
  ): Promise<{ updatedCount: number }>;
  addVehicleMaintenanceLog(input: {
    companyId: string;
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
    createdByUserId?: string | null;
  }): Promise<VehicleMaintenanceLogRecord>;
  addVehicleInspection(input: {
    companyId: string;
    vehicleId: string;
    inspectionType: string;
    bookingRef?: string | null;
    customerName?: string | null;
    odometerKm: number;
    hasAccident: boolean;
    accidentNotes?: string | null;
    inspectedBy?: string | null;
    damagePoints: Array<{
      zoneKey: string;
      severity: string;
      description?: string | null;
      repairCost?: number;
    }>;
  }): Promise<VehicleInspectionRecord>;

  // Phase 2: Bookable Fleet, Customers & Rental Contracts
  toggleFleetVehicleBookable(
    companyId: string,
    vehicleId: string,
    isBookable: boolean,
  ): Promise<FleetVehicleRecord | null>;
  listCustomers(companyId: string): Promise<CustomerRecord[]>;
  createCustomer(input: {
    companyId: string;
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
  }): Promise<CustomerRecord>;
  updateCustomer(
    companyId: string,
    customerId: string,
    input: {
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
    },
  ): Promise<CustomerRecord | null>;
  deleteCustomer(companyId: string, customerId: string): Promise<boolean>;
  listRentalContracts(companyId: string): Promise<RentalContractRecord[]>;
  createRentalContract(input: {
    companyId: string;
    branchId: string;
    vehicleId: string;
    customerId: string;
    startDate: string;
    endDate: string;
    pickupOdometer: number;
    dailyRate: number;
    totalDays: number;
    subtotal: number;
    discount?: number;
    insuranceFee?: number;
    extraCharges?: number;
    totalAmount: number;
    paidAmount?: number;
    depositAmount?: number;
    notes?: string | null;
    createdByUserId?: string | null;
  }): Promise<RentalContractRecord>;
  completeRentalContract(
    companyId: string,
    contractId: string,
    input: {
      returnOdometer: number;
      extraCharges?: number;
      paidAmount?: number;
      notes?: string | null;
    },
  ): Promise<RentalContractRecord | null>;
  cancelRentalContract(
    companyId: string,
    contractId: string,
  ): Promise<RentalContractRecord | null>;

  recordAuditLog(input: AuditLogInput): Promise<void>;
  listAuditLogs(
    companyId: string,
    filter?: {
      entityType?: string;
      entityId?: string;
      actorUserId?: string;
      limit?: number;
    },
  ): Promise<AuditLogRecord[]>;

  // Drivers & Vehicle Movements
  listDrivers(companyId: string): Promise<DriverRecord[]>;
  createDriver(input: {
    companyId: string;
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
    createdByUserId?: string | null;
  }): Promise<DriverRecord>;
  updateDriver(
    companyId: string,
    driverId: string,
    input: {
      fullName: string;
      phonePrimary: string;
      phoneSecondary?: string | null;
      email?: string | null;
      licenseNumber: string;
      licenseIssueDate: string;
      licenseExpiryDate: string;
      passportNumber?: string | null;
      address?: string | null;
      status?: "active" | "inactive";
    },
  ): Promise<DriverRecord | null>;
  deleteDriver(companyId: string, driverId: string): Promise<boolean>;

  listVehicleMovements(
    companyId: string,
    filter?: { vehicleId?: string; status?: string; toBranchId?: string },
  ): Promise<VehicleMovementRecord[]>;
  dispatchVehicleMovement(input: {
    companyId: string;
    vehicleId: string;
    fromBranchId?: string | null;
    toBranchId: string;
    driverId: string;
    dispatchOdometerKm: number;
    dispatchedByUserId?: string | null;
    dispatchedByName?: string | null;
    notes?: string | null;
  }): Promise<VehicleMovementRecord>;
  receiveVehicleMovement(
    companyId: string,
    movementId: string,
    input: {
      arrivalOdometerKm: number;
      receivedByUserId?: string | null;
      receivedByName?: string | null;
      notes?: string | null;
    },
  ): Promise<VehicleMovementRecord | null>;
  cancelVehicleMovement(companyId: string, movementId: string): Promise<VehicleMovementRecord | null>;
}

export type * from "./contracts/auth.ts";
export type * from "./contracts/workspace.ts";
export type * from "./contracts/team.ts";
export type * from "./contracts/network.ts";
export type * from "./contracts/fleet.ts";
export type * from "./contracts/purchasing.ts";
export type * from "./contracts/rentals.ts";
