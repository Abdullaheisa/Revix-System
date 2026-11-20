import crypto from "node:crypto";
import pg from "pg";
import type {
  ActionTokenRecord,
  ActionTokenType,
  AuditLogInput,
  AuthDataStore,
  BranchRecord,
  CompanyMembershipRecord,
  CompanyNetworkInvitationRecord,
  CompanyNetworkLinkRecord,
  CompanyOperatingMode,
  CompanyRecord,
  CompanyRoleRecord,
  CreateBranchInput,
  CreateCompanyInput,
  CreateCompanyMembershipInput,
  CreateCompanyRoleInput,
  CreateEmployeeInvitationInput,
  CreateFleetVehicleInput,
  CreateNetworkInvitationInput,
  CreateNetworkLinkInput,
  CreatePurchaseOrderInput,
  CreateRentalInclusionInput,
  CreateVehiclePhotoInput,
  CreateVehicleVariantInput,
  CreateVendorInput,
  EmployeeInvitationRecord,
  FleetVehicleFilterOptions,
  FleetVehicleRecord,
  FleetVehicleStatus,
  MembershipStatus,
  NetworkInvitationStatus,
  NetworkLinkStatus,
  NetworkPermittedBranchRecord,
  PaymentTermsType,
  PermissionMatrix,
  PurchaseOrderItemRecord,
  PurchaseOrderRecord,
  PurchaseOrderStatus,
  ReceiveVehicleFromPoInput,
  RentalInclusionRecord,
  RoleScopeType,
  SessionRecord,
  UpdateBranchInput,
  UpdateCompanyInput,
  UpdateCompanyMembershipInput,
  UpdateCompanyRoleInput,
  UpdateFleetVehicleInput,
  UpdateRentalInclusionInput,
  UpdateVehicleVariantInput,
  UpdateVendorInput,
  UserRecord,
  UserStatus,
  VehicleCategory,
  VehiclePhotoRecord,
  VehicleVariantRecord,
  VendorCategory,
  VendorRecord,
} from "./store.ts";

interface DbUserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  email_verified_at: Date | null;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

interface DbSessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

interface DbActionTokenRow {
  id: string;
  user_id: string;
  token_type: ActionTokenType;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

interface DbCompanyRow {
  id: string;
  owner_user_id: string;
  name: string;
  legal_name: string;
  logo_url: string | null;
  brand_color: string;
  phone: string;
  email: string;
  country_code: string;
  city: string;
  address: string;
  postal_code: string;
  base_currency: string;
  timezone: string;
  business_reg_number: string;
  tax_reg_number: string;
  operating_mode: CompanyOperatingMode;
  parent_company_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DbBranchRow {
  id: string;
  company_id: string;
  name: string;
  code: string;
  country_code: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  currency_code: string;
  timezone: string;
  working_days: string;
  working_hours: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface DbCompanyRoleRow {
  id: string;
  company_id: string;
  code: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  scope_type: RoleScopeType;
  permissions: PermissionMatrix;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

interface DbCompanyMembershipRow {
  id: string;
  user_id: string;
  company_id: string;
  role_id: string;
  phone: string;
  status: MembershipStatus;
  branch_ids?: string[] | null;
  created_at: Date;
  updated_at: Date;
}

interface DbEmployeeInvitationRow {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  phone: string;
  role_id: string;
  branch_ids: string[] | null;
  token_hash: string;
  invited_by_user_id: string;
  expires_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

function mapCompanyRoleRow(row: DbCompanyRoleRow): CompanyRoleRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    code: row.code,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    descriptionEn: row.description_en,
    descriptionAr: row.description_ar,
    scopeType: row.scope_type,
    permissions:
      row.permissions && typeof row.permissions === "object"
        ? { ...row.permissions }
        : {},
    isSystem: row.is_system,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapCompanyMembershipRow(
  row: DbCompanyMembershipRow,
): CompanyMembershipRecord {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    roleId: row.role_id,
    phone: row.phone,
    status: row.status,
    branchIds: Array.isArray(row.branch_ids)
      ? row.branch_ids.filter((id): id is string => typeof id === "string")
      : [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapEmployeeInvitationRow(
  row: DbEmployeeInvitationRow,
): EmployeeInvitationRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    roleId: row.role_id,
    branchIds: Array.isArray(row.branch_ids)
      ? row.branch_ids.filter((id): id is string => typeof id === "string")
      : [],
    tokenHash: row.token_hash,
    invitedByUserId: row.invited_by_user_id,
    expiresAt: new Date(row.expires_at),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    createdAt: new Date(row.created_at),
  };
}

interface DbNetworkLinkRow {
  id: string;
  main_company_id: string;
  local_company_id: string;
  status: NetworkLinkStatus;
  permitted_countries: string[];
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DbPermittedBranchRow {
  id: string;
  link_id: string;
  local_company_id: string;
  branch_id: string;
  created_at: string;
}

interface DbNetworkInvitationRow {
  id: string;
  main_company_id: string;
  invitee_email: string;
  local_company_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  token_hash: string;
  status: NetworkInvitationStatus;
  invited_by_user_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

function mapNetworkLinkRow(row: DbNetworkLinkRow): CompanyNetworkLinkRecord {
  return {
    id: row.id,
    mainCompanyId: row.main_company_id,
    localCompanyId: row.local_company_id,
    status: row.status,
    permittedCountries: Array.isArray(row.permitted_countries)
      ? row.permitted_countries
      : [],
    notes: row.notes ?? undefined,
    createdByUserId: row.created_by_user_id ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapPermittedBranchRow(
  row: DbPermittedBranchRow,
): NetworkPermittedBranchRecord {
  return {
    id: row.id,
    linkId: row.link_id,
    localCompanyId: row.local_company_id,
    branchId: row.branch_id,
    createdAt: new Date(row.created_at),
  };
}

function mapNetworkInvitationRow(
  row: DbNetworkInvitationRow,
): CompanyNetworkInvitationRecord {
  return {
    id: row.id,
    mainCompanyId: row.main_company_id,
    inviteeEmail: row.invitee_email,
    localCompanyName: row.local_company_name,
    contactName: row.contact_name ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    logoUrl: row.logo_url ?? null,
    tokenHash: row.token_hash.trim(),
    status: row.status,
    invitedByUserId: row.invited_by_user_id ?? undefined,
    expiresAt: new Date(row.expires_at),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    createdAt: new Date(row.created_at),
  };
}

interface DbVehicleVariantRow {
  id: string;
  company_id: string;
  make: string;
  model: string;
  model_year: number;
  trim: string;
  category: VehicleCategory;
  transmission: "automatic" | "manual";
  fuel_type: "petrol" | "diesel" | "hybrid" | "electric";
  seating_capacity: number;
  sipp_code: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

function mapVehicleVariantRow(row: DbVehicleVariantRow): VehicleVariantRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    make: row.make,
    model: row.model,
    modelYear: Number(row.model_year),
    trim: row.trim,
    category: row.category,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    seatingCapacity: Number(row.seating_capacity),
    sippCode: row.sipp_code,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

interface DbVendorRow {
  id: string;
  company_id: string;
  name: string;
  legal_name: string | null;
  category: VendorCategory;
  contact_person: string;
  phone: string;
  email: string | null;
  country_code: string;
  city: string;
  address: string | null;
  tax_number: string | null;
  commercial_register: string | null;
  bank_name: string | null;
  iban: string | null;
  payment_terms_days: number;
  payment_terms_type?: string;
  payment_terms_config?: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

function mapVendorRow(row: DbVendorRow): VendorRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    legalName: row.legal_name,
    category: row.category,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    countryCode: row.country_code,
    city: row.city,
    address: row.address,
    taxNumber: row.tax_number,
    commercialRegister: row.commercial_register,
    bankName: row.bank_name,
    iban: row.iban,
    paymentTermsDays: Number(row.payment_terms_days),
    paymentTermsType:
      (row.payment_terms_type as PaymentTermsType) ||
      (Number(row.payment_terms_days) === 0 ? "cash" : "net_terms"),
    paymentTermsConfig: row.payment_terms_config || null,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

interface DbPurchaseOrderRow {
  id: string;
  company_id: string;
  branch_id: string;
  vendor_id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_delivery_date: string | null;
  currency: string;
  total_amount: string | number;
  upfront_paid: string | number;
  remaining_amount: string | number;
  installments_count: number;
  notes: string | null;
  created_by_user_id: string | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  vendor_name?: string;
  branch_name?: string;
}

function mapPurchaseOrderRow(row: DbPurchaseOrderRow): PurchaseOrderRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    vendorId: row.vendor_id,
    poNumber: row.po_number,
    status: row.status,
    orderDate:
      typeof row.order_date === "string"
        ? row.order_date.slice(0, 10)
        : new Date(row.order_date).toISOString().slice(0, 10),
    expectedDeliveryDate: row.expected_delivery_date
      ? typeof row.expected_delivery_date === "string"
        ? row.expected_delivery_date.slice(0, 10)
        : new Date(row.expected_delivery_date).toISOString().slice(0, 10)
      : null,
    currency: row.currency,
    totalAmount: Number(row.total_amount),
    upfrontPaid: Number(row.upfront_paid),
    remainingAmount: Number(row.remaining_amount),
    installmentsCount: Number(row.installments_count),
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    approvedByUserId: row.approved_by_user_id,
    approvedAt: row.approved_at ? new Date(row.approved_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    vendorName: row.vendor_name,
    branchName: row.branch_name,
  };
}

interface DbPurchaseOrderItemRow {
  id: string;
  purchase_order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: string | number;
  received_count: number;
  notes: string | null;
  created_at: string;
}

function mapPurchaseOrderItemRow(
  row: DbPurchaseOrderItemRow,
): PurchaseOrderItemRecord {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    variantId: row.variant_id,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    receivedCount: Number(row.received_count),
    notes: row.notes,
    createdAt: new Date(row.created_at),
  };
}

interface DbFleetVehicleRow {
  id: string;
  company_id: string;
  branch_id: string;
  variant_id: string;
  purchase_order_id: string | null;
  vin: string;
  license_plate: string;
  key_number: string | null;
  color: string;
  mileage_odometer: number;
  status: FleetVehicleStatus;
  registration_expiry: string | null;
  insurance_expiry: string | null;
  notes: string | null;
  photo_url?: string | null;
  location_type?: string | null;
  fuel_policy?: string | null;
  instant_confirmation?: boolean;
  description?: string | null;
  delivery_policy?: string | null;
  daily_rate_1_to_2?: number | string | null;
  daily_rate_3_to_7?: number | string | null;
  daily_rate_8_plus?: number | string | null;
  damage_excess?: number | string | null;
  mileage_policy?: "unlimited" | "limited" | null;
  daily_km_limit?: number | null;
  extra_km_rate?: number | string | null;
  inclusions?: string[] | null;
  seats?: number | null;
  doors?: number | null;
  air_conditioning?: boolean | null;
  fuel_type?: string | null;
  luggage_capacity?: string | null;
  transmission?: string | null;
  created_at: string;
  updated_at: string;
  branch_name?: string;
  company_name?: string;
  variant_make?: string;
  variant_model?: string;
  variant_model_year?: number;
  variant_trim?: string;
  variant_category?: VehicleCategory;
  variant_transmission?: "automatic" | "manual";
  variant_fuel_type?: "petrol" | "diesel" | "hybrid" | "electric";
  variant_seating_capacity?: number;
  variant_sipp_code?: string;
  variant_status?: "active" | "archived";
}

function mapFleetVehicleRow(row: DbFleetVehicleRow): FleetVehicleRecord {
  const variant: VehicleVariantRecord | undefined = row.variant_make
    ? {
        id: row.variant_id,
        companyId: row.company_id,
        make: row.variant_make,
        model: row.variant_model!,
        modelYear: Number(row.variant_model_year),
        trim: row.variant_trim!,
        category: row.variant_category!,
        transmission: row.variant_transmission!,
        fuelType: row.variant_fuel_type!,
        seatingCapacity: Number(row.variant_seating_capacity),
        sippCode: row.variant_sipp_code!,
        status: row.variant_status!,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }
    : undefined;

  return {
    id: row.id,
    companyId: row.company_id,
    branchId: row.branch_id,
    variantId: row.variant_id,
    purchaseOrderId: row.purchase_order_id,
    vin: row.vin,
    licensePlate: row.license_plate,
    keyNumber: row.key_number,
    color: row.color,
    mileageOdometer: Number(row.mileage_odometer),
    status: row.status,
    registrationExpiry: row.registration_expiry
      ? typeof row.registration_expiry === "string"
        ? row.registration_expiry.slice(0, 10)
        : new Date(row.registration_expiry).toISOString().slice(0, 10)
      : null,
    insuranceExpiry: row.insurance_expiry
      ? typeof row.insurance_expiry === "string"
        ? row.insurance_expiry.slice(0, 10)
        : new Date(row.insurance_expiry).toISOString().slice(0, 10)
      : null,
    notes: row.notes,
    photoUrl: row.photo_url ?? null,
    locationType: (row.location_type as any) ?? "airport_terminal",
    fuelPolicy: (row.fuel_policy as any) ?? "full_to_full",
    instantConfirmation: row.instant_confirmation !== false,
    description: row.description ?? null,
    deliveryPolicy: (row.delivery_policy as any) ?? "pickup_only",
    dailyRate1to2: row.daily_rate_1_to_2 != null ? Number(row.daily_rate_1_to_2) : 0,
    dailyRate3to7: row.daily_rate_3_to_7 != null ? Number(row.daily_rate_3_to_7) : 0,
    dailyRate8Plus: row.daily_rate_8_plus != null ? Number(row.daily_rate_8_plus) : 0,
    damageExcess: row.damage_excess != null ? Number(row.damage_excess) : 0,
    mileagePolicy: (row.mileage_policy as any) ?? "unlimited",
    dailyKmLimit: row.daily_km_limit != null ? Number(row.daily_km_limit) : 0,
    extraKmRate: row.extra_km_rate != null ? Number(row.extra_km_rate) : 0,
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
    seats: row.seats != null ? Number(row.seats) : 5,
    doors: row.doors != null ? Number(row.doors) : 4,
    airConditioning: row.air_conditioning !== false,
    fuelType: (row.fuel_type as any) ?? null,
    luggageCapacity: (row.luggage_capacity as any) ?? null,
    transmission: (row.transmission as any) ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    variant,
    branchName: row.branch_name,
    companyName: row.company_name,
  };
}

interface DbVehiclePhotoRow {
  id: string;
  company_id: string;
  vehicle_name: string;
  photo_url: string;
  category: string;
  created_at: string;
}

function mapVehiclePhotoRow(row: DbVehiclePhotoRow): VehiclePhotoRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    vehicleName: row.vehicle_name,
    photoUrl: row.photo_url,
    category: row.category,
    createdAt: new Date(row.created_at),
  };
}

interface DbRentalInclusionRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapRentalInclusionRow(row: DbRentalInclusionRow): RentalInclusionRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapUserRow(row: DbUserRow): UserRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    emailVerifiedAt: row.email_verified_at
      ? new Date(row.email_verified_at)
      : null,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapSessionRow(row: DbSessionRow): SessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash.trim(),
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    expiresAt: new Date(row.expires_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    createdAt: new Date(row.created_at),
  };
}

interface DbNetworkLinkRow {
  id: string;
  main_company_id: string;
  local_company_id: string;
  status: NetworkLinkStatus;
  permitted_countries: string[];
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DbPermittedBranchRow {
  id: string;
  link_id: string;
  local_company_id: string;
  branch_id: string;
  created_at: string;
}

function mapActionTokenRow(row: DbActionTokenRow): ActionTokenRecord {
  return {
    id: row.id,
    userId: row.user_id,
    tokenType: row.token_type,
    tokenHash: row.token_hash.trim(),
    expiresAt: new Date(row.expires_at),
    consumedAt: row.consumed_at ? new Date(row.consumed_at) : null,
    createdAt: new Date(row.created_at),
  };
}

function mapCompanyRow(row: DbCompanyRow): CompanyRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    legalName: row.legal_name,
    logoUrl: row.logo_url,
    brandColor: row.brand_color,
    phone: row.phone,
    email: row.email,
    countryCode: row.country_code.trim(),
    city: row.city,
    address: row.address,
    postalCode: row.postal_code,
    baseCurrency: row.base_currency.trim(),
    timezone: row.timezone,
    businessRegNumber: row.business_reg_number,
    taxRegNumber: row.tax_reg_number,
    operatingMode: row.operating_mode,
    parentCompanyId: row.parent_company_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapBranchRow(row: DbBranchRow): BranchRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    code: row.code,
    countryCode: row.country_code.trim(),
    city: row.city,
    address: row.address,
    phone: row.phone,
    email: row.email,
    currencyCode: row.currency_code.trim(),
    timezone: row.timezone,
    workingDays: row.working_days,
    workingHours: row.working_hours,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PostgresAuthDataStore implements AuthDataStore {
  private readonly pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const res = await this.pool.query<DbUserRow>(
      `SELECT id, full_name, email, password_hash, email_verified_at, status, created_at, updated_at
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalized],
    );
    const row = res.rows[0];
    return row ? mapUserRow(row) : null;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    const res = await this.pool.query<DbUserRow>(
      `SELECT id, full_name, email, password_hash, email_verified_at, status, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );
    const row = res.rows[0];
    return row ? mapUserRow(row) : null;
  }

  async createUser(input: {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const res = await this.pool.query<DbUserRow>(
      `INSERT INTO users (id, full_name, email, password_hash, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, full_name, email, password_hash, email_verified_at, status, created_at, updated_at`,
      [input.id, input.fullName.trim(), normalizedEmail, input.passwordHash],
    );
    return mapUserRow(res.rows[0]);
  }

  async markUserEmailVerified(userId: string, verifiedAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, $2),
           updated_at = $2
       WHERE id = $1`,
      [userId, verifiedAt],
    );
  }

  async updateUserPassword(
    userId: string,
    newPasswordHash: string,
    updatedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET password_hash = $2,
           updated_at = $3
       WHERE id = $1`,
      [userId, newPasswordHash, updatedAt],
    );
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET status = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [userId, status],
    );
  }

  async createSession(input: {
    id: string;
    userId: string;
    tokenHash: string;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const res = await this.pool.query<DbSessionRow>(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, token_hash, ip_address, user_agent, expires_at, revoked_at, created_at`,
      [
        input.id,
        input.userId,
        input.tokenHash,
        input.ipAddress,
        input.userAgent,
        input.expiresAt,
      ],
    );
    return mapSessionRow(res.rows[0]);
  }

  async findActiveSessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<SessionRecord | null> {
    const res = await this.pool.query<DbSessionRow>(
      `SELECT id, user_id, token_hash, ip_address, user_agent, expires_at, revoked_at, created_at
       FROM user_sessions
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > $2
       LIMIT 1`,
      [tokenHash, now],
    );
    const row = res.rows[0];
    return row ? mapSessionRow(row) : null;
  }

  async revokeSessionByTokenHash(
    tokenHash: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE user_sessions
       SET revoked_at = COALESCE(revoked_at, $2)
       WHERE token_hash = $1`,
      [tokenHash, revokedAt],
    );
  }

  async revokeAllUserSessions(userId: string, revokedAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE user_sessions
       SET revoked_at = COALESCE(revoked_at, $2)
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId, revokedAt],
    );
  }

  async createActionToken(input: {
    id: string;
    userId: string;
    tokenType: ActionTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<ActionTokenRecord> {
    const res = await this.pool.query<DbActionTokenRow>(
      `INSERT INTO auth_action_tokens (id, user_id, token_type, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, token_type, token_hash, expires_at, consumed_at, created_at`,
      [
        input.id,
        input.userId,
        input.tokenType,
        input.tokenHash,
        input.expiresAt,
      ],
    );
    return mapActionTokenRow(res.rows[0]);
  }

  async invalidateUnusedActionTokens(
    userId: string,
    tokenType: ActionTokenType,
    consumedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE auth_action_tokens
       SET consumed_at = $3
       WHERE user_id = $1
         AND token_type = $2
         AND consumed_at IS NULL`,
      [userId, tokenType, consumedAt],
    );
  }

  async consumeActionToken(
    tokenHash: string,
    tokenType: ActionTokenType,
    now: Date,
  ): Promise<
    | { status: "consumed"; token: ActionTokenRecord }
    | { status: "expired" }
    | { status: "invalid" }
  > {
    const existingRes = await this.pool.query<DbActionTokenRow>(
      `SELECT id, user_id, token_type, token_hash, expires_at, consumed_at, created_at
       FROM auth_action_tokens
       WHERE token_hash = $1 AND token_type = $2
       LIMIT 1`,
      [tokenHash, tokenType],
    );

    const existing = existingRes.rows[0];
    if (!existing || existing.consumed_at !== null) {
      return { status: "invalid" };
    }

    if (new Date(existing.expires_at).getTime() <= now.getTime()) {
      return { status: "expired" };
    }

    const updatedRes = await this.pool.query<DbActionTokenRow>(
      `UPDATE auth_action_tokens
       SET consumed_at = $2
       WHERE id = $1 AND consumed_at IS NULL
       RETURNING id, user_id, token_type, token_hash, expires_at, consumed_at, created_at`,
      [existing.id, now],
    );

    const updated = updatedRes.rows[0];
    if (!updated) {
      return { status: "invalid" };
    }

    return {
      status: "consumed",
      token: mapActionTokenRow(updated),
    };
  }

  async findCompanyByOwnerUserId(
    userId: string,
  ): Promise<CompanyRecord | null> {
    const res = await this.pool.query<DbCompanyRow>(
      `SELECT * FROM companies WHERE owner_user_id = $1 LIMIT 1`,
      [userId],
    );
    const row = res.rows[0];
    return row ? mapCompanyRow(row) : null;
  }

  async findCompanyById(companyId: string): Promise<CompanyRecord | null> {
    const res = await this.pool.query<DbCompanyRow>(
      `SELECT * FROM companies WHERE id = $1 LIMIT 1`,
      [companyId],
    );
    const row = res.rows[0];
    return row ? mapCompanyRow(row) : null;
  }

  async createCompany(input: CreateCompanyInput): Promise<CompanyRecord> {
    const res = await this.pool.query<DbCompanyRow>(
      `INSERT INTO companies (
        id, owner_user_id, name, legal_name, logo_url, brand_color,
        phone, email, country_code, city, address, postal_code,
        base_currency, timezone, business_reg_number, tax_reg_number,
        operating_mode, parent_company_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18
      ) RETURNING *`,
      [
        input.id,
        input.ownerUserId,
        input.name.trim(),
        input.legalName.trim(),
        input.logoUrl?.trim() || null,
        input.brandColor.trim(),
        input.phone.trim(),
        input.email.trim().toLowerCase(),
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address.trim(),
        input.postalCode.trim(),
        input.baseCurrency.trim().toUpperCase(),
        input.timezone.trim(),
        input.businessRegNumber.trim(),
        input.taxRegNumber.trim(),
        input.operatingMode,
        input.parentCompanyId ?? null,
      ],
    );
    return mapCompanyRow(res.rows[0]);
  }

  async updateCompany(
    companyId: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyRecord | null> {
    const res = await this.pool.query<DbCompanyRow>(
      `UPDATE companies SET
        name = $2,
        legal_name = $3,
        logo_url = $4,
        brand_color = $5,
        phone = $6,
        email = $7,
        country_code = $8,
        city = $9,
        address = $10,
        postal_code = $11,
        base_currency = $12,
        timezone = $13,
        business_reg_number = $14,
        tax_reg_number = $15,
        operating_mode = $16,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        companyId,
        input.name.trim(),
        input.legalName.trim(),
        input.logoUrl?.trim() || null,
        input.brandColor.trim(),
        input.phone.trim(),
        input.email.trim().toLowerCase(),
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address.trim(),
        input.postalCode.trim(),
        input.baseCurrency.trim().toUpperCase(),
        input.timezone.trim(),
        input.businessRegNumber.trim(),
        input.taxRegNumber.trim(),
        input.operatingMode,
      ],
    );
    const row = res.rows[0];
    return row ? mapCompanyRow(row) : null;
  }

  async updateCompanyOperatingMode(
    companyId: string,
    operatingMode: CompanyOperatingMode,
    parentCompanyId?: string | null,
  ): Promise<CompanyRecord | null> {
    const res = await this.pool.query<DbCompanyRow>(
      `UPDATE companies SET
        operating_mode = $2,
        parent_company_id = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [companyId, operatingMode, parentCompanyId ?? null],
    );
    const row = res.rows[0];
    return row ? mapCompanyRow(row) : null;
  }

  async listBranchesByCompanyId(companyId: string): Promise<BranchRecord[]> {
    const res = await this.pool.query<DbBranchRow>(
      `SELECT * FROM branches WHERE company_id = $1 ORDER BY created_at ASC`,
      [companyId],
    );
    return res.rows.map(mapBranchRow);
  }

  async findBranchById(branchId: string): Promise<BranchRecord | null> {
    const res = await this.pool.query<DbBranchRow>(
      `SELECT * FROM branches WHERE id = $1 LIMIT 1`,
      [branchId],
    );
    const row = res.rows[0];
    return row ? mapBranchRow(row) : null;
  }

  async createBranch(input: CreateBranchInput): Promise<BranchRecord> {
    const res = await this.pool.query<DbBranchRow>(
      `INSERT INTO branches (
        id, company_id, name, code, country_code, city, address,
        phone, email, currency_code, timezone, working_days, working_hours
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        input.id,
        input.companyId,
        input.name.trim(),
        input.code.trim().toUpperCase(),
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address.trim(),
        input.phone.trim(),
        input.email.trim().toLowerCase(),
        input.currencyCode.trim().toUpperCase(),
        input.timezone.trim(),
        input.workingDays.trim(),
        input.workingHours.trim(),
      ],
    );
    return mapBranchRow(res.rows[0]);
  }

  async updateBranch(
    branchId: string,
    companyId: string,
    input: UpdateBranchInput,
  ): Promise<BranchRecord | null> {
    const res = await this.pool.query<DbBranchRow>(
      `UPDATE branches SET
        name = $3,
        code = $4,
        country_code = $5,
        city = $6,
        address = $7,
        phone = $8,
        email = $9,
        currency_code = $10,
        timezone = $11,
        working_days = $12,
        working_hours = $13,
        is_active = $14,
        updated_at = NOW()
      WHERE id = $1 AND company_id = $2
      RETURNING *`,
      [
        branchId,
        companyId,
        input.name.trim(),
        input.code.trim().toUpperCase(),
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address.trim(),
        input.phone.trim(),
        input.email.trim().toLowerCase(),
        input.currencyCode.trim().toUpperCase(),
        input.timezone.trim(),
        input.workingDays.trim(),
        input.workingHours.trim(),
        input.isActive,
      ],
    );
    const row = res.rows[0];
    return row ? mapBranchRow(row) : null;
  }

  // Phase 3: Team Roles, Memberships, Branch Scopes & Invitations
  async listCompanyRoles(companyId: string): Promise<CompanyRoleRecord[]> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `SELECT * FROM company_roles WHERE company_id = $1 ORDER BY created_at ASC`,
      [companyId],
    );
    return res.rows.map(mapCompanyRoleRow);
  }

  async findCompanyRoleById(roleId: string): Promise<CompanyRoleRecord | null> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `SELECT * FROM company_roles WHERE id = $1 LIMIT 1`,
      [roleId],
    );
    const row = res.rows[0];
    return row ? mapCompanyRoleRow(row) : null;
  }

  async findCompanyRoleByCode(
    companyId: string,
    code: string,
  ): Promise<CompanyRoleRecord | null> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `SELECT * FROM company_roles WHERE company_id = $1 AND LOWER(code) = LOWER($2) LIMIT 1`,
      [companyId, code.trim()],
    );
    const row = res.rows[0];
    return row ? mapCompanyRoleRow(row) : null;
  }

  async createCompanyRole(
    input: CreateCompanyRoleInput,
  ): Promise<CompanyRoleRecord> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `INSERT INTO company_roles (
        id, company_id, code, name_en, name_ar, description_en, description_ar,
        scope_type, permissions, is_system
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
      RETURNING *`,
      [
        input.id,
        input.companyId,
        input.code.trim().toLowerCase(),
        input.nameEn.trim(),
        input.nameAr.trim(),
        input.descriptionEn.trim(),
        input.descriptionAr.trim(),
        input.scopeType,
        JSON.stringify(input.permissions ?? {}),
        input.isSystem,
      ],
    );
    return mapCompanyRoleRow(res.rows[0]);
  }

  async updateCompanyRole(
    roleId: string,
    companyId: string,
    input: UpdateCompanyRoleInput,
  ): Promise<CompanyRoleRecord | null> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `UPDATE company_roles SET
        name_en = COALESCE($3, name_en),
        name_ar = COALESCE($4, name_ar),
        description_en = COALESCE($5, description_en),
        description_ar = COALESCE($6, description_ar),
        scope_type = $7,
        permissions = $8::jsonb,
        updated_at = NOW()
      WHERE id = $1 AND company_id = $2
      RETURNING *`,
      [
        roleId,
        companyId,
        input.nameEn?.trim() ?? null,
        input.nameAr?.trim() ?? null,
        input.descriptionEn?.trim() ?? null,
        input.descriptionAr?.trim() ?? null,
        input.scopeType,
        JSON.stringify(input.permissions ?? {}),
      ],
    );
    const row = res.rows[0];
    return row ? mapCompanyRoleRow(row) : null;
  }

  async deleteCompanyRole(roleId: string, companyId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM company_roles WHERE id = $1 AND company_id = $2 AND is_system = false`,
      [roleId, companyId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async findMembershipByUserId(
    userId: string,
  ): Promise<CompanyMembershipRecord | null> {
    const res = await this.pool.query<DbCompanyMembershipRow>(
      `SELECT m.*,
        COALESCE(
          (SELECT array_agg(s.branch_id ORDER BY s.created_at ASC)
           FROM member_branch_scopes s
           WHERE s.membership_id = m.id),
          ARRAY[]::uuid[]
        ) AS branch_ids
       FROM company_memberships m
       WHERE m.user_id = $1
       LIMIT 1`,
      [userId],
    );
    const row = res.rows[0];
    return row ? mapCompanyMembershipRow(row) : null;
  }

  async findMembershipById(
    membershipId: string,
  ): Promise<CompanyMembershipRecord | null> {
    const res = await this.pool.query<DbCompanyMembershipRow>(
      `SELECT m.*,
        COALESCE(
          (SELECT array_agg(s.branch_id ORDER BY s.created_at ASC)
           FROM member_branch_scopes s
           WHERE s.membership_id = m.id),
          ARRAY[]::uuid[]
        ) AS branch_ids
       FROM company_memberships m
       WHERE m.id = $1
       LIMIT 1`,
      [membershipId],
    );
    const row = res.rows[0];
    return row ? mapCompanyMembershipRow(row) : null;
  }

  async listCompanyMemberships(
    companyId: string,
  ): Promise<CompanyMembershipRecord[]> {
    const res = await this.pool.query<DbCompanyMembershipRow>(
      `SELECT m.*,
        COALESCE(
          (SELECT array_agg(s.branch_id ORDER BY s.created_at ASC)
           FROM member_branch_scopes s
           WHERE s.membership_id = m.id),
          ARRAY[]::uuid[]
        ) AS branch_ids
       FROM company_memberships m
       WHERE m.company_id = $1
       ORDER BY m.created_at ASC`,
      [companyId],
    );
    return res.rows.map(mapCompanyMembershipRow);
  }

  async createCompanyMembership(
    input: CreateCompanyMembershipInput,
  ): Promise<CompanyMembershipRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query<DbCompanyMembershipRow>(
        `INSERT INTO company_memberships (id, user_id, company_id, role_id, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          input.id,
          input.userId,
          input.companyId,
          input.roleId,
          input.phone.trim(),
          input.status ?? "active",
        ],
      );

      const uniqueBranches = Array.from(new Set(input.branchIds));
      for (const branchId of uniqueBranches) {
        await client.query(
          `INSERT INTO member_branch_scopes (membership_id, branch_id)
           VALUES ($1, $2)
           ON CONFLICT (membership_id, branch_id) DO NOTHING`,
          [input.id, branchId],
        );
      }

      await client.query("COMMIT");
      return mapCompanyMembershipRow({
        ...res.rows[0],
        branch_ids: uniqueBranches,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async updateCompanyMembership(
    membershipId: string,
    companyId: string,
    input: UpdateCompanyMembershipInput,
  ): Promise<CompanyMembershipRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query<DbCompanyMembershipRow>(
        `UPDATE company_memberships SET
          role_id = $3,
          phone = $4,
          status = $5,
          updated_at = NOW()
         WHERE id = $1 AND company_id = $2
         RETURNING *`,
        [
          membershipId,
          companyId,
          input.roleId,
          input.phone.trim(),
          input.status,
        ],
      );
      const row = res.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `DELETE FROM member_branch_scopes WHERE membership_id = $1`,
        [membershipId],
      );

      const uniqueBranches = Array.from(new Set(input.branchIds));
      for (const branchId of uniqueBranches) {
        await client.query(
          `INSERT INTO member_branch_scopes (membership_id, branch_id)
           VALUES ($1, $2)
           ON CONFLICT (membership_id, branch_id) DO NOTHING`,
          [membershipId, branchId],
        );
      }

      await client.query("COMMIT");
      return mapCompanyMembershipRow({
        ...row,
        branch_ids: uniqueBranches,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async createEmployeeInvitation(
    input: CreateEmployeeInvitationInput,
  ): Promise<EmployeeInvitationRecord> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `INSERT INTO employee_invitations (
        id, company_id, email, full_name, phone, role_id, branch_ids,
        token_hash, invited_by_user_id, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
      RETURNING *`,
      [
        input.id,
        input.companyId,
        input.email.trim().toLowerCase(),
        input.fullName.trim(),
        input.phone.trim(),
        input.roleId,
        JSON.stringify(Array.from(new Set(input.branchIds))),
        input.tokenHash,
        input.invitedByUserId,
        input.expiresAt,
      ],
    );
    return mapEmployeeInvitationRow(res.rows[0]);
  }

  async findInvitationById(
    invitationId: string,
  ): Promise<EmployeeInvitationRecord | null> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `SELECT * FROM employee_invitations WHERE id = $1 LIMIT 1`,
      [invitationId],
    );
    const row = res.rows[0];
    return row ? mapEmployeeInvitationRow(row) : null;
  }

  async findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<EmployeeInvitationRecord | null> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `SELECT * FROM employee_invitations WHERE token_hash = $1 LIMIT 1`,
      [tokenHash],
    );
    const row = res.rows[0];
    return row ? mapEmployeeInvitationRow(row) : null;
  }

  async listCompanyInvitations(
    companyId: string,
  ): Promise<EmployeeInvitationRecord[]> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `SELECT * FROM employee_invitations WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId],
    );
    return res.rows.map(mapEmployeeInvitationRow);
  }

  async revokePendingInvitationsForEmail(
    companyId: string,
    email: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE employee_invitations
       SET revoked_at = $3
       WHERE company_id = $1
         AND LOWER(email) = LOWER($2)
         AND accepted_at IS NULL
         AND revoked_at IS NULL`,
      [companyId, email.trim(), revokedAt],
    );
  }

  async revokeInvitationById(
    invitationId: string,
    companyId: string,
    revokedAt: Date,
  ): Promise<EmployeeInvitationRecord | null> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `UPDATE employee_invitations
       SET revoked_at = COALESCE(revoked_at, $3)
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [invitationId, companyId, revokedAt],
    );
    const row = res.rows[0];
    return row ? mapEmployeeInvitationRow(row) : null;
  }

  async markInvitationAccepted(
    invitationId: string,
    acceptedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE employee_invitations
       SET accepted_at = $2
       WHERE id = $1`,
      [invitationId, acceptedAt],
    );
  }

  // Phase 4: Company Network Implementation
  async createNetworkLink(
    input: CreateNetworkLinkInput,
  ): Promise<CompanyNetworkLinkRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbNetworkLinkRow>(
      `INSERT INTO company_network_links (
        id, main_company_id, local_company_id, status, permitted_countries, notes, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      RETURNING *`,
      [
        id,
        input.mainCompanyId,
        input.localCompanyId,
        input.status ?? "active",
        JSON.stringify(input.permittedCountries ?? []),
        input.notes ?? null,
        input.createdByUserId ?? null,
      ],
    );
    return mapNetworkLinkRow(res.rows[0]);
  }

  async findNetworkLinkById(
    linkId: string,
  ): Promise<CompanyNetworkLinkRecord | null> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `SELECT * FROM company_network_links WHERE id = $1 LIMIT 1`,
      [linkId],
    );
    const row = res.rows[0];
    return row ? mapNetworkLinkRow(row) : null;
  }

  async findNetworkLink(
    mainCompanyId: string,
    localCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord | null> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `SELECT * FROM company_network_links
       WHERE main_company_id = $1 AND local_company_id = $2
       LIMIT 1`,
      [mainCompanyId, localCompanyId],
    );
    const row = res.rows[0];
    return row ? mapNetworkLinkRow(row) : null;
  }

  async listNetworkLinksForMain(
    mainCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord[]> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `SELECT * FROM company_network_links
       WHERE main_company_id = $1
       ORDER BY created_at DESC`,
      [mainCompanyId],
    );
    return res.rows.map(mapNetworkLinkRow);
  }

  async listNetworkLinksForLocal(
    localCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord[]> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `SELECT * FROM company_network_links
       WHERE local_company_id = $1
       ORDER BY created_at DESC`,
      [localCompanyId],
    );
    return res.rows.map(mapNetworkLinkRow);
  }

  async updateNetworkLinkStatus(
    linkId: string,
    status: NetworkLinkStatus,
  ): Promise<CompanyNetworkLinkRecord | null> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `UPDATE company_network_links
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [linkId, status],
    );
    const row = res.rows[0];
    return row ? mapNetworkLinkRow(row) : null;
  }

  async deleteNetworkLink(linkId: string): Promise<void> {
    await this.pool.query(`DELETE FROM company_network_links WHERE id = $1`, [
      linkId,
    ]);
  }

  async setNetworkPermittedBranches(
    linkId: string,
    localCompanyId: string,
    branchIds: string[],
  ): Promise<NetworkPermittedBranchRecord[]> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM network_permitted_branches WHERE link_id = $1`,
        [linkId],
      );

      const uniqueBranchIds = Array.from(new Set(branchIds));
      const records: NetworkPermittedBranchRecord[] = [];
      for (const branchId of uniqueBranchIds) {
        const res = await client.query<DbPermittedBranchRow>(
          `INSERT INTO network_permitted_branches (id, link_id, local_company_id, branch_id)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [crypto.randomUUID(), linkId, localCompanyId, branchId],
        );
        records.push(mapPermittedBranchRow(res.rows[0]));
      }

      await client.query("COMMIT");
      return records;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async listNetworkPermittedBranches(
    linkId: string,
  ): Promise<NetworkPermittedBranchRecord[]> {
    const res = await this.pool.query<DbPermittedBranchRow>(
      `SELECT * FROM network_permitted_branches WHERE link_id = $1 ORDER BY created_at ASC`,
      [linkId],
    );
    return res.rows.map(mapPermittedBranchRow);
  }

  async createNetworkInvitation(
    input: CreateNetworkInvitationInput,
  ): Promise<CompanyNetworkInvitationRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `INSERT INTO company_network_invitations (
        id, main_company_id, invitee_email, local_company_name, contact_name, contact_phone, logo_url, token_hash, expires_at, invited_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        input.mainCompanyId,
        input.inviteeEmail.trim().toLowerCase(),
        input.localCompanyName.trim(),
        input.contactName?.trim() || null,
        input.contactPhone?.trim() || null,
        input.logoUrl ?? null,
        input.tokenHash,
        input.expiresAt,
        input.invitedByUserId ?? null,
      ],
    );
    return mapNetworkInvitationRow(res.rows[0]);
  }

  async findNetworkInvitationById(
    invitationId: string,
  ): Promise<CompanyNetworkInvitationRecord | null> {
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `SELECT * FROM company_network_invitations WHERE id = $1 LIMIT 1`,
      [invitationId],
    );
    const row = res.rows[0];
    return row ? mapNetworkInvitationRow(row) : null;
  }

  async findNetworkInvitationByTokenHash(
    tokenHash: string,
  ): Promise<CompanyNetworkInvitationRecord | null> {
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `SELECT * FROM company_network_invitations WHERE token_hash = $1 LIMIT 1`,
      [tokenHash],
    );
    const row = res.rows[0];
    return row ? mapNetworkInvitationRow(row) : null;
  }

  async listNetworkInvitationsForMain(
    mainCompanyId: string,
  ): Promise<CompanyNetworkInvitationRecord[]> {
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `SELECT * FROM company_network_invitations WHERE main_company_id = $1 ORDER BY created_at DESC`,
      [mainCompanyId],
    );
    return res.rows.map(mapNetworkInvitationRow);
  }

  async updateNetworkInvitationStatus(
    invitationId: string,
    status: NetworkInvitationStatus,
    acceptedAt?: Date,
  ): Promise<CompanyNetworkInvitationRecord | null> {
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `UPDATE company_network_invitations
       SET status = $2, accepted_at = COALESCE($3, accepted_at)
       WHERE id = $1
       RETURNING *`,
      [invitationId, status, acceptedAt ?? null],
    );
    const row = res.rows[0];
    return row ? mapNetworkInvitationRow(row) : null;
  }

  async recordAuditLog(input: AuditLogInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_logs (id, company_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        crypto.randomUUID(),
        input.companyId ?? null,
        input.branchId ?? null,
        input.actorUserId ?? null,
        input.action,
        input.entityType,
        input.entityId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  // --- Phase 5: Vehicle Variants ---
  async createVehicleVariant(
    input: CreateVehicleVariantInput,
  ): Promise<VehicleVariantRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbVehicleVariantRow>(
      `INSERT INTO vehicle_variants
        (id, company_id, make, model, model_year, trim, category, transmission, fuel_type,
         seating_capacity, sipp_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        input.companyId,
        input.make.trim(),
        input.model.trim(),
        input.modelYear,
        input.trim?.trim() || "Standard",
        input.category,
        input.transmission ?? "automatic",
        input.fuelType ?? "petrol",
        input.seatingCapacity ?? 5,
        input.sippCode?.trim() || "ICAR",
      ],
    );
    return mapVehicleVariantRow(res.rows[0]!);
  }

  async findVehicleVariantById(
    variantId: string,
  ): Promise<VehicleVariantRecord | null> {
    const res = await this.pool.query<DbVehicleVariantRow>(
      `SELECT * FROM vehicle_variants WHERE id = $1`,
      [variantId],
    );
    const row = res.rows[0];
    return row ? mapVehicleVariantRow(row) : null;
  }

  async listVehicleVariants(
    companyId: string,
    filter?: { category?: VehicleCategory; search?: string },
  ): Promise<VehicleVariantRecord[]> {
    let query = `SELECT * FROM vehicle_variants WHERE company_id = $1`;
    const params: unknown[] = [companyId];

    if (filter?.category) {
      params.push(filter.category);
      query += ` AND category = $${params.length}`;
    }

    if (filter?.search) {
      params.push(`%${filter.search.trim()}%`);
      query += ` AND (make ILIKE $${params.length} OR model ILIKE $${params.length} OR trim ILIKE $${params.length} OR sipp_code ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;
    const res = await this.pool.query<DbVehicleVariantRow>(query, params);
    return res.rows.map(mapVehicleVariantRow);
  }

  async updateVehicleVariant(
    variantId: string,
    input: UpdateVehicleVariantInput,
  ): Promise<VehicleVariantRecord | null> {
    const existing = await this.findVehicleVariantById(variantId);
    if (!existing) return null;

    const res = await this.pool.query<DbVehicleVariantRow>(
      `UPDATE vehicle_variants
       SET make = COALESCE($2, make),
           model = COALESCE($3, model),
           model_year = COALESCE($4, model_year),
           trim = COALESCE($5, trim),
           category = COALESCE($6, category),
           transmission = COALESCE($7, transmission),
           fuel_type = COALESCE($8, fuel_type),
           seating_capacity = COALESCE($9, seating_capacity),
           sipp_code = COALESCE($10, sipp_code),
           status = COALESCE($11, status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        variantId,
        input.make?.trim() ?? null,
        input.model?.trim() ?? null,
        input.modelYear ?? null,
        input.trim?.trim() ?? null,
        input.category ?? null,
        input.transmission ?? null,
        input.fuelType ?? null,
        input.seatingCapacity ?? null,
        input.sippCode?.trim() ?? null,
        input.status ?? null,
      ],
    );
    const row = res.rows[0];
    return row ? mapVehicleVariantRow(row) : null;
  }

  async deleteVehicleVariant(variantId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE vehicle_variants SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [variantId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Phase 5: Vendors Directory ---
  async createVendor(input: CreateVendorInput): Promise<VendorRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbVendorRow>(
      `INSERT INTO vendors
        (id, company_id, name, legal_name, category, contact_person, phone, email, country_code,
         city, address, tax_number, commercial_register, bank_name, iban, payment_terms_days,
         payment_terms_type, payment_terms_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        id,
        input.companyId,
        input.name.trim(),
        input.legalName?.trim() || null,
        input.category ?? "dealership",
        input.contactPerson.trim(),
        input.phone.trim(),
        input.email?.trim().toLowerCase() || null,
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address?.trim() || null,
        input.taxNumber?.trim() || null,
        input.commercialRegister?.trim() || null,
        input.bankName?.trim() || null,
        input.iban?.trim() || null,
        input.paymentTermsDays ?? 30,
        input.paymentTermsType ?? (input.paymentTermsDays === 0 ? "cash" : "net_terms"),
        input.paymentTermsConfig?.trim() || null,
      ],
    );
    return mapVendorRow(res.rows[0]!);
  }

  async findVendorById(vendorId: string): Promise<VendorRecord | null> {
    const res = await this.pool.query<DbVendorRow>(
      `SELECT * FROM vendors WHERE id = $1`,
      [vendorId],
    );
    const row = res.rows[0];
    return row ? mapVendorRow(row) : null;
  }

  async listVendors(
    companyId: string,
    filter?: { category?: VendorCategory; search?: string },
  ): Promise<VendorRecord[]> {
    let query = `SELECT * FROM vendors WHERE company_id = $1`;
    const params: unknown[] = [companyId];

    if (filter?.category) {
      params.push(filter.category);
      query += ` AND category = $${params.length}`;
    }

    if (filter?.search) {
      params.push(`%${filter.search.trim()}%`);
      query += ` AND (name ILIKE $${params.length} OR legal_name ILIKE $${params.length} OR contact_person ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;
    const res = await this.pool.query<DbVendorRow>(query, params);
    return res.rows.map(mapVendorRow);
  }

  async updateVendor(
    vendorId: string,
    input: UpdateVendorInput,
  ): Promise<VendorRecord | null> {
    const res = await this.pool.query<DbVendorRow>(
      `UPDATE vendors
       SET name = COALESCE($2, name),
           legal_name = COALESCE($3, legal_name),
           category = COALESCE($4, category),
           contact_person = COALESCE($5, contact_person),
           phone = COALESCE($6, phone),
           email = COALESCE($7, email),
           country_code = COALESCE($8, country_code),
           city = COALESCE($9, city),
           address = COALESCE($10, address),
           tax_number = COALESCE($11, tax_number),
           commercial_register = COALESCE($12, commercial_register),
           bank_name = COALESCE($13, bank_name),
           iban = COALESCE($14, iban),
           payment_terms_days = COALESCE($15, payment_terms_days),
           payment_terms_type = COALESCE($16, payment_terms_type),
           payment_terms_config = COALESCE($17, payment_terms_config),
           status = COALESCE($18, status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        vendorId,
        input.name?.trim() ?? null,
        input.legalName !== undefined ? input.legalName?.trim() || null : null,
        input.category ?? null,
        input.contactPerson?.trim() ?? null,
        input.phone?.trim() ?? null,
        input.email !== undefined ? input.email?.trim().toLowerCase() || null : null,
        input.countryCode?.trim().toUpperCase() ?? null,
        input.city?.trim() ?? null,
        input.address !== undefined ? input.address?.trim() || null : null,
        input.taxNumber !== undefined ? input.taxNumber?.trim() || null : null,
        input.commercialRegister !== undefined ? input.commercialRegister?.trim() || null : null,
        input.bankName !== undefined ? input.bankName?.trim() || null : null,
        input.iban !== undefined ? input.iban?.trim() || null : null,
        input.paymentTermsDays ?? null,
        input.paymentTermsType ?? null,
        input.paymentTermsConfig !== undefined ? input.paymentTermsConfig?.trim() || null : null,
        input.status ?? null,
      ],
    );
    const row = res.rows[0];
    return row ? mapVendorRow(row) : null;
  }

  // --- Phase 5: Purchase Orders (PO) ---
  async createPurchaseOrder(
    input: CreatePurchaseOrderInput,
  ): Promise<PurchaseOrderRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const totalAmount =
        input.totalAmount ??
        input.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
      const upfrontPaid = input.upfrontPaid ?? 0;
      const remainingAmount = Math.max(0, totalAmount - upfrontPaid);

      let poNumber = input.poNumber?.trim();
      if (!poNumber) {
        const countRes = await client.query(
          `SELECT COUNT(*)::int as cnt FROM purchase_orders WHERE company_id = $1`,
          [input.companyId],
        );
        const count = countRes.rows[0]?.cnt ?? 0;
        poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
      }

      const id = input.id ?? crypto.randomUUID();
      const poRes = await client.query<DbPurchaseOrderRow>(
        `INSERT INTO purchase_orders
          (id, company_id, branch_id, vendor_id, po_number, status, order_date,
           expected_delivery_date, currency, total_amount, upfront_paid, remaining_amount,
           installments_count, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          id,
          input.companyId,
          input.branchId,
          input.vendorId,
          poNumber,
          "draft",
          input.orderDate ?? new Date().toISOString().slice(0, 10),
          input.expectedDeliveryDate ?? null,
          input.currency ?? "EGP",
          totalAmount,
          upfrontPaid,
          remainingAmount,
          input.installmentsCount ?? 1,
          input.notes?.trim() || null,
          input.createdByUserId ?? null,
        ],
      );

      const items: PurchaseOrderItemRecord[] = [];
      for (const item of input.items) {
        const itemRes = await client.query<DbPurchaseOrderItemRow>(
          `INSERT INTO purchase_order_items
            (id, purchase_order_id, variant_id, quantity, unit_price, received_count, notes)
           VALUES ($1, $2, $3, $4, $5, 0, $6)
           RETURNING *`,
          [
            crypto.randomUUID(),
            id,
            item.variantId,
            item.quantity,
            item.unitPrice,
            item.notes?.trim() || null,
          ],
        );
        items.push(mapPurchaseOrderItemRow(itemRes.rows[0]!));
      }

      await client.query("COMMIT");

      const record = mapPurchaseOrderRow(poRes.rows[0]!);
      record.items = items;
      return record;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async findPurchaseOrderById(poId: string): Promise<PurchaseOrderRecord | null> {
    const poRes = await this.pool.query<DbPurchaseOrderRow>(
      `SELECT po.*, v.name as vendor_name, b.name as branch_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN branches b ON b.id = po.branch_id
       WHERE po.id = $1`,
      [poId],
    );
    const poRow = poRes.rows[0];
    if (!poRow) return null;

    const itemsRes = await this.pool.query<DbPurchaseOrderItemRow>(
      `SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at ASC`,
      [poId],
    );

    const record = mapPurchaseOrderRow(poRow);
    record.items = itemsRes.rows.map(mapPurchaseOrderItemRow);
    return record;
  }

  async listPurchaseOrders(
    companyId: string,
    filter?: {
      branchId?: string;
      vendorId?: string;
      status?: PurchaseOrderStatus;
    },
  ): Promise<PurchaseOrderRecord[]> {
    let query = `
      SELECT po.*, v.name as vendor_name, b.name as branch_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN branches b ON b.id = po.branch_id
      WHERE po.company_id = $1
    `;
    const params: unknown[] = [companyId];

    if (filter?.branchId) {
      params.push(filter.branchId);
      query += ` AND po.branch_id = $${params.length}`;
    }
    if (filter?.vendorId) {
      params.push(filter.vendorId);
      query += ` AND po.vendor_id = $${params.length}`;
    }
    if (filter?.status) {
      params.push(filter.status);
      query += ` AND po.status = $${params.length}`;
    }

    query += ` ORDER BY po.created_at DESC`;
    const res = await this.pool.query<DbPurchaseOrderRow>(query, params);

    // Fetch items for all listed POs
    const poIds = res.rows.map((r) => r.id);
    let itemsByPoId = new Map<string, PurchaseOrderItemRecord[]>();
    if (poIds.length > 0) {
      const itemsRes = await this.pool.query<DbPurchaseOrderItemRow>(
        `SELECT * FROM purchase_order_items WHERE purchase_order_id = ANY($1::uuid[])`,
        [poIds],
      );
      for (const row of itemsRes.rows) {
        const list = itemsByPoId.get(row.purchase_order_id) ?? [];
        list.push(mapPurchaseOrderItemRow(row));
        itemsByPoId.set(row.purchase_order_id, list);
      }
    }

    return res.rows.map((row) => {
      const record = mapPurchaseOrderRow(row);
      record.items = itemsByPoId.get(row.id) ?? [];
      return record;
    });
  }

  async updatePurchaseOrderStatus(
    poId: string,
    status: PurchaseOrderStatus,
    approvedByUserId?: string,
  ): Promise<PurchaseOrderRecord | null> {
    await this.pool.query(
      `UPDATE purchase_orders
       SET status = $2::varchar,
           approved_by_user_id = CASE WHEN $2::text = 'approved' THEN $3::uuid ELSE approved_by_user_id END,
           approved_at = CASE WHEN $2::text = 'approved' THEN NOW() ELSE approved_at END,
           updated_at = NOW()
       WHERE id = $1`,
      [poId, status, approvedByUserId ?? null],
    );
    return this.findPurchaseOrderById(poId);
  }

  async receiveVehicleFromPo(
    input: ReceiveVehicleFromPoInput,
  ): Promise<{ vehicle: FleetVehicleRecord; po: PurchaseOrderRecord }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const poRes = await client.query<DbPurchaseOrderRow>(
        `SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE`,
        [input.purchaseOrderId],
      );
      const poRow = poRes.rows[0];
      if (!poRow) throw new Error("Purchase order not found");

      const itemRes = await client.query<DbPurchaseOrderItemRow>(
        `SELECT * FROM purchase_order_items WHERE id = $1 AND purchase_order_id = $2 FOR UPDATE`,
        [input.itemId, input.purchaseOrderId],
      );
      const itemRow = itemRes.rows[0];
      if (!itemRow) throw new Error("Purchase order line item not found");
      if (itemRow.received_count >= itemRow.quantity) {
        throw new Error("All vehicles for this purchase line have already been received");
      }

      // Create vehicle
      const vehicleId = crypto.randomUUID();
      const vehicleRes = await client.query<DbFleetVehicleRow>(
        `INSERT INTO fleet_vehicles
          (id, company_id, branch_id, variant_id, purchase_order_id, vin, license_plate,
           key_number, color, mileage_odometer, status, registration_expiry, insurance_expiry, notes,
           photo_url, location_type, fuel_policy, instant_confirmation, description, delivery_policy,
           daily_rate_1_to_2, daily_rate_3_to_7, daily_rate_8_plus, damage_excess,
           mileage_policy, daily_km_limit, extra_km_rate, inclusions,
           seats, doors, air_conditioning, fuel_type, luggage_capacity, transmission)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'available', $11, $12, $13,
                 $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
         RETURNING *`,
        [
          vehicleId,
          poRow.company_id,
          input.branchId || poRow.branch_id,
          itemRow.variant_id,
          poRow.id,
          input.vin.trim().toUpperCase(),
          input.licensePlate.trim().toUpperCase(),
          input.keyNumber?.trim() || null,
          input.color.trim(),
          input.mileageOdometer ?? 0,
          input.registrationExpiry ?? null,
          input.insuranceExpiry ?? null,
          input.notes?.trim() || null,
          input.photoUrl?.trim() || null,
          input.locationType ?? "airport_terminal",
          input.fuelPolicy ?? "full_to_full",
          input.instantConfirmation ?? false,
          input.description?.trim() || null,
          input.deliveryPolicy?.trim() || null,
          input.dailyRate1to2 ?? 0,
          input.dailyRate3to7 ?? 0,
          input.dailyRate8Plus ?? 0,
          input.damageExcess ?? 0,
          input.mileagePolicy ?? "unlimited",
          input.dailyKmLimit ?? 0,
          input.extraKmRate ?? 0,
          input.inclusions ?? [],
          input.seats ?? 5,
          input.doors ?? 4,
          input.airConditioning !== false,
          input.fuelType ?? "petrol",
          input.luggageCapacity ?? "2 Bags",
          input.transmission ?? "automatic",
        ],
      );

      // Increment received_count
      await client.query(
        `UPDATE purchase_order_items SET received_count = received_count + 1 WHERE id = $1`,
        [input.itemId],
      );

      // Check total received
      const totalRes = await client.query(
        `SELECT SUM(quantity)::int as total_qty, SUM(received_count)::int as total_rcv
         FROM purchase_order_items WHERE purchase_order_id = $1`,
        [input.purchaseOrderId],
      );
      const totalQty = totalRes.rows[0]?.total_qty ?? 0;
      const totalRcv = (totalRes.rows[0]?.total_rcv ?? 0) + 1; // including current

      const nextStatus: PurchaseOrderStatus =
        totalRcv >= totalQty ? "completed" : "partially_received";

      await client.query(
        `UPDATE purchase_orders SET status = $2, updated_at = NOW() WHERE id = $1`,
        [input.purchaseOrderId, nextStatus],
      );

      await client.query("COMMIT");

      const vehicle = mapFleetVehicleRow(vehicleRes.rows[0]!);
      const po = await this.findPurchaseOrderById(input.purchaseOrderId);
      return { vehicle, po: po! };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Phase 5: Fleet Vehicles Asset Register ---
  async createFleetVehicle(
    input: CreateFleetVehicleInput,
  ): Promise<FleetVehicleRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbFleetVehicleRow>(
      `INSERT INTO fleet_vehicles
        (id, company_id, branch_id, variant_id, purchase_order_id, vin, license_plate,
         key_number, color, mileage_odometer, status, registration_expiry, insurance_expiry, notes,
         photo_url, location_type, fuel_policy, instant_confirmation, description, delivery_policy,
         daily_rate_1_to_2, daily_rate_3_to_7, daily_rate_8_plus, damage_excess,
         mileage_policy, daily_km_limit, extra_km_rate, inclusions,
         seats, doors, air_conditioning, fuel_type, luggage_capacity, transmission)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
       RETURNING *`,
      [
        id,
        input.companyId,
        input.branchId,
        input.variantId,
        input.purchaseOrderId ?? null,
        input.vin.trim().toUpperCase(),
        input.licensePlate.trim().toUpperCase(),
        input.keyNumber?.trim() || null,
        input.color.trim(),
        input.mileageOdometer ?? 0,
        input.status ?? "available",
        input.registrationExpiry?.trim() || null,
        input.insuranceExpiry?.trim() || null,
        input.notes?.trim() || null,
        input.photoUrl?.trim() || null,
        input.locationType ?? "airport_terminal",
        input.fuelPolicy ?? "full_to_full",
        input.instantConfirmation ?? false,
        input.description?.trim() || null,
        input.deliveryPolicy?.trim() || null,
        input.dailyRate1to2 ?? 0,
        input.dailyRate3to7 ?? 0,
        input.dailyRate8Plus ?? 0,
        input.damageExcess ?? 0,
        input.mileagePolicy ?? "unlimited",
        input.dailyKmLimit ?? 0,
        input.extraKmRate ?? 0,
        input.inclusions ?? [],
        input.seats ?? 5,
        input.doors ?? 4,
        input.airConditioning !== false,
        input.fuelType ?? "petrol",
        input.luggageCapacity ?? "2 Bags",
        input.transmission ?? "automatic",
      ],
    );
    return (await this.findFleetVehicleById(res.rows[0]!.id))!;
  }

  async findFleetVehicleById(
    vehicleId: string,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `SELECT v.*, b.name as branch_name, c.name as company_name,
              var.make as variant_make, var.model as variant_model,
              var.model_year as variant_model_year, var.trim as variant_trim,
              var.category as variant_category, var.transmission as variant_transmission,
              var.fuel_type as variant_fuel_type, var.seating_capacity as variant_seating_capacity,
              var.sipp_code as variant_sipp_code, var.status as variant_status
       FROM fleet_vehicles v
       LEFT JOIN branches b ON b.id = v.branch_id
       LEFT JOIN companies c ON c.id = v.company_id
       LEFT JOIN vehicle_variants var ON var.id = v.variant_id
       WHERE v.id = $1`,
      [vehicleId],
    );
    const row = res.rows[0];
    return row ? mapFleetVehicleRow(row) : null;
  }

  async findFleetVehicleByVin(
    companyId: string,
    vin: string,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `SELECT id FROM fleet_vehicles WHERE company_id = $1 AND UPPER(vin) = UPPER($2)`,
      [companyId, vin.trim()],
    );
    const row = res.rows[0];
    return row ? this.findFleetVehicleById(row.id) : null;
  }

  async findFleetVehicleByLicensePlate(
    companyId: string,
    licensePlate: string,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `SELECT id FROM fleet_vehicles WHERE company_id = $1 AND UPPER(license_plate) = UPPER($2)`,
      [companyId, licensePlate.trim()],
    );
    const row = res.rows[0];
    return row ? this.findFleetVehicleById(row.id) : null;
  }

  async listFleetVehicles(
    companyId: string,
    filter?: FleetVehicleFilterOptions,
    permittedBranchIds?: string[],
  ): Promise<FleetVehicleRecord[]> {
    let query = `
      SELECT v.*, b.name as branch_name, c.name as company_name,
             var.make as variant_make, var.model as variant_model,
             var.model_year as variant_model_year, var.trim as variant_trim,
             var.category as variant_category, var.transmission as variant_transmission,
             var.fuel_type as variant_fuel_type, var.seating_capacity as variant_seating_capacity,
             var.sipp_code as variant_sipp_code, var.status as variant_status,
             FALSE as is_partner_vehicle
      FROM fleet_vehicles v
      LEFT JOIN branches b ON b.id = v.branch_id
      LEFT JOIN companies c ON c.id = v.company_id
      LEFT JOIN vehicle_variants var ON var.id = v.variant_id
      WHERE v.company_id = $1
    `;
    const params: unknown[] = [companyId];

    if (permittedBranchIds && permittedBranchIds.length > 0) {
      params.push(permittedBranchIds);
      query += ` AND v.branch_id = ANY($${params.length}::uuid[])`;
    }

    if (filter?.branchId) {
      params.push(filter.branchId);
      query += ` AND v.branch_id = $${params.length}`;
    }

    if (filter?.status) {
      params.push(filter.status);
      query += ` AND v.status = $${params.length}`;
    }

    if (filter?.variantId) {
      params.push(filter.variantId);
      query += ` AND v.variant_id = $${params.length}`;
    }

    if (filter?.search) {
      params.push(`%${filter.search.trim()}%`);
      query += ` AND (v.vin ILIKE $${params.length} OR v.license_plate ILIKE $${params.length} OR var.make ILIKE $${params.length} OR var.model ILIKE $${params.length})`;
    }

    query += ` ORDER BY v.created_at DESC`;
    const res = await this.pool.query<DbFleetVehicleRow & { is_partner_vehicle?: boolean }>(
      query,
      params,
    );
    const directVehicles = res.rows.map((r) => {
      const rec = mapFleetVehicleRow(r);
      rec.isPartnerVehicle = false;
      return rec;
    });

    // Check if network vehicles should be included
    if (filter?.includeNetwork) {
      const compRes = await this.pool.query(
        `SELECT operating_mode FROM companies WHERE id = $1`,
        [companyId],
      );
      if (compRes.rows[0]?.operating_mode === "network_main") {
        const partnerRes = await this.pool.query<
          DbFleetVehicleRow & { is_partner_vehicle?: boolean }
        >(
          `SELECT v.*, b.name as branch_name, c.name as company_name,
                  var.make as variant_make, var.model as variant_model,
                  var.model_year as variant_model_year, var.trim as variant_trim,
                  var.category as variant_category, var.transmission as variant_transmission,
                  var.fuel_type as variant_fuel_type, var.seating_capacity as variant_seating_capacity,
                  var.sipp_code as variant_sipp_code, var.status as variant_status,
                  TRUE as is_partner_vehicle
           FROM fleet_vehicles v
           JOIN network_permitted_branches npb ON npb.branch_id = v.branch_id
           JOIN company_network_links cnl ON cnl.id = npb.link_id AND cnl.status = 'active'
           LEFT JOIN branches b ON b.id = v.branch_id
           LEFT JOIN companies c ON c.id = v.company_id
           LEFT JOIN vehicle_variants var ON var.id = v.variant_id
           WHERE cnl.main_company_id = $1
           ORDER BY v.created_at DESC`,
          [companyId],
        );
        const partnerVehicles = partnerRes.rows.map((r) => {
          const rec = mapFleetVehicleRow(r);
          rec.isPartnerVehicle = true;
          return rec;
        });
        return [...directVehicles, ...partnerVehicles];
      }
    }

    return directVehicles;
  }

  async updateFleetVehicle(
    vehicleId: string,
    input: UpdateFleetVehicleInput,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `UPDATE fleet_vehicles
       SET branch_id = COALESCE($2, branch_id),
           key_number = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE key_number END,
           color = COALESCE($4, color),
           mileage_odometer = COALESCE($5, mileage_odometer),
           status = COALESCE($6, status),
           registration_expiry = COALESCE($7, registration_expiry),
           insurance_expiry = COALESCE($8, insurance_expiry),
           notes = CASE WHEN $9::text IS NOT NULL THEN $9 ELSE notes END,
           photo_url = CASE WHEN $10::text IS NOT NULL THEN $10 ELSE photo_url END,
           location_type = COALESCE($11, location_type),
           fuel_policy = COALESCE($12, fuel_policy),
           instant_confirmation = COALESCE($13, instant_confirmation),
           description = CASE WHEN $14::text IS NOT NULL THEN $14 ELSE description END,
           delivery_policy = CASE WHEN $15::text IS NOT NULL THEN $15 ELSE delivery_policy END,
           daily_rate_1_to_2 = COALESCE($16, daily_rate_1_to_2),
           daily_rate_3_to_7 = COALESCE($17, daily_rate_3_to_7),
           daily_rate_8_plus = COALESCE($18, daily_rate_8_plus),
           damage_excess = COALESCE($19, damage_excess),
           mileage_policy = COALESCE($20, mileage_policy),
           daily_km_limit = COALESCE($21, daily_km_limit),
           extra_km_rate = COALESCE($22, extra_km_rate),
           inclusions = COALESCE($23, inclusions),
           seats = COALESCE($24, seats),
           doors = COALESCE($25, doors),
           air_conditioning = COALESCE($26, air_conditioning),
           fuel_type = COALESCE($27, fuel_type),
           luggage_capacity = COALESCE($28, luggage_capacity),
           transmission = COALESCE($29, transmission),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        vehicleId,
        input.branchId ?? null,
        input.keyNumber !== undefined ? input.keyNumber?.trim() || null : null,
        input.color?.trim() ?? null,
        input.mileageOdometer ?? null,
        input.status ?? null,
        input.registrationExpiry !== undefined ? input.registrationExpiry?.trim() || null : null,
        input.insuranceExpiry !== undefined ? input.insuranceExpiry?.trim() || null : null,
        input.notes !== undefined ? input.notes?.trim() || null : null,
        input.photoUrl !== undefined ? input.photoUrl?.trim() || null : null,
        input.locationType ?? null,
        input.fuelPolicy ?? null,
        input.instantConfirmation ?? null,
        input.description !== undefined ? input.description?.trim() || null : null,
        input.deliveryPolicy !== undefined ? input.deliveryPolicy?.trim() || null : null,
        input.dailyRate1to2 ?? null,
        input.dailyRate3to7 ?? null,
        input.dailyRate8Plus ?? null,
        input.damageExcess ?? null,
        input.mileagePolicy ?? null,
        input.dailyKmLimit ?? null,
        input.extraKmRate ?? null,
        input.inclusions ?? null,
        input.seats ?? null,
        input.doors ?? null,
        input.airConditioning ?? null,
        input.fuelType ?? null,
        input.luggageCapacity ?? null,
        input.transmission ?? null,
      ],
    );
    const row = res.rows[0];
    return row ? this.findFleetVehicleById(row.id) : null;
  }

  async updateFleetVehicleStatus(
    vehicleId: string,
    status: FleetVehicleStatus,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `UPDATE fleet_vehicles SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [vehicleId, status],
    );
    const row = res.rows[0];
    return row ? this.findFleetVehicleById(row.id) : null;
  }

  // --- Phase 5: Vehicle Photo Catalog ---
  async createVehiclePhoto(
    input: CreateVehiclePhotoInput,
  ): Promise<VehiclePhotoRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbVehiclePhotoRow>(
      `INSERT INTO vehicle_photos (id, company_id, vehicle_name, photo_url, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        input.companyId,
        input.vehicleName.trim(),
        input.photoUrl.trim(),
        input.category?.trim() || "General",
      ],
    );
    return mapVehiclePhotoRow(res.rows[0]!);
  }

  async listVehiclePhotos(
    companyId: string,
    search?: string,
  ): Promise<VehiclePhotoRecord[]> {
    let query = `SELECT * FROM vehicle_photos WHERE company_id = $1`;
    const params: unknown[] = [companyId];
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND vehicle_name ILIKE $${params.length}`;
    }
    query += ` ORDER BY created_at DESC`;
    const res = await this.pool.query<DbVehiclePhotoRow>(query, params);
    return res.rows.map(mapVehiclePhotoRow);
  }

  async deleteVehiclePhoto(id: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM vehicle_photos WHERE id = $1 RETURNING id`,
      [id],
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Rental Inclusions ---
  async createRentalInclusion(
    input: CreateRentalInclusionInput,
  ): Promise<RentalInclusionRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbRentalInclusionRow>(
      `INSERT INTO rental_inclusions (id, company_id, name, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        input.companyId,
        input.name.trim(),
        input.description?.trim() || null,
        input.isActive ?? true,
      ],
    );
    return mapRentalInclusionRow(res.rows[0]!);
  }

  async getRentalInclusionById(id: string): Promise<RentalInclusionRecord | null> {
    const res = await this.pool.query<DbRentalInclusionRow>(
      `SELECT * FROM rental_inclusions WHERE id = $1`,
      [id],
    );
    return res.rows[0] ? mapRentalInclusionRow(res.rows[0]) : null;
  }

  async listRentalInclusions(
    companyId: string,
    search?: string,
    activeOnly?: boolean,
  ): Promise<RentalInclusionRecord[]> {
    let query = `SELECT * FROM rental_inclusions WHERE company_id = $1`;
    const params: unknown[] = [companyId];
    if (activeOnly) {
      params.push(true);
      query += ` AND is_active = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND name ILIKE $${params.length}`;
    }
    query += ` ORDER BY name ASC`;
    const res = await this.pool.query<DbRentalInclusionRow>(query, params);
    return res.rows.map(mapRentalInclusionRow);
  }

  async updateRentalInclusion(
    id: string,
    input: UpdateRentalInclusionInput,
  ): Promise<RentalInclusionRecord | null> {
    const existing = await this.getRentalInclusionById(id);
    if (!existing) return null;
    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const description = input.description !== undefined ? input.description?.trim() || null : existing.description;
    const isActive = input.isActive !== undefined ? input.isActive : existing.isActive;
    const res = await this.pool.query<DbRentalInclusionRow>(
      `UPDATE rental_inclusions
       SET name = $1, description = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, description, isActive, id],
    );
    return res.rows[0] ? mapRentalInclusionRow(res.rows[0]) : null;
  }

  async deleteRentalInclusion(id: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM rental_inclusions WHERE id = $1 RETURNING id`,
      [id],
    );
    return (res.rowCount ?? 0) > 0;
  }
}

