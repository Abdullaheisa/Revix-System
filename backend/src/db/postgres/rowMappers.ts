import type { ActionTokenRecord, ActionTokenType, BranchRecord, CompanyMembershipRecord, CompanyNetworkInvitationRecord, CompanyNetworkLinkRecord, CompanyOperatingMode, CompanyRecord, CompanyRoleRecord, EmployeeInvitationRecord, FleetVehicleRecord, FleetVehicleStatus, MembershipStatus, NetworkInvitationStatus, NetworkLinkStatus, NetworkPermittedBranchRecord, PaymentTermsType, PermissionMatrix, PurchaseOrderItemRecord, PurchaseOrderRecord, PurchaseOrderStatus, RentalInclusionRecord, RoleScopeType, SessionRecord, UserRecord, UserStatus, VehicleCategory, VehiclePhotoRecord, VehicleVariantRecord, VendorCategory, VendorRecord } from "../store.ts";

export interface DbUserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  email_verified_at: Date | null;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface DbSessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface DbActionTokenRow {
  id: string;
  user_id: string;
  token_type: ActionTokenType;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

export interface DbCompanyRow {
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

export interface DbBranchRow {
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

export interface DbCompanyRoleRow {
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

export interface DbCompanyMembershipRow {
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

export interface DbEmployeeInvitationRow {
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

export function mapCompanyRoleRow(row: DbCompanyRoleRow): CompanyRoleRecord {
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

export function mapCompanyMembershipRow(
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

export function mapEmployeeInvitationRow(
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

export interface DbNetworkLinkRow {
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

export interface DbPermittedBranchRow {
  id: string;
  link_id: string;
  local_company_id: string;
  branch_id: string;
  created_at: string;
}

export interface DbNetworkInvitationRow {
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

export function mapNetworkLinkRow(row: DbNetworkLinkRow): CompanyNetworkLinkRecord {
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

export function mapPermittedBranchRow(
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

export function mapNetworkInvitationRow(
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

export interface DbVehicleVariantRow {
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

export function mapVehicleVariantRow(row: DbVehicleVariantRow): VehicleVariantRecord {
  return {
    id: row.id,
    variantCode: (row as DbVehicleVariantRow & { variant_code?: string | null }).variant_code ?? undefined,
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

export interface DbVendorRow {
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

export function mapVendorRow(row: DbVendorRow): VendorRecord {
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

export interface DbPurchaseOrderRow {
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

export function mapPurchaseOrderRow(row: DbPurchaseOrderRow): PurchaseOrderRecord {
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
        : (() => {
            const d = new Date(row.order_date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })(),
    expectedDeliveryDate: row.expected_delivery_date
      ? typeof row.expected_delivery_date === "string"
        ? row.expected_delivery_date.slice(0, 10)
        : (() => {
            const d = new Date(row.expected_delivery_date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })()
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
    companyName: (row as DbPurchaseOrderRow & { company_name?: string }).company_name,
    companyLogoUrl: (row as DbPurchaseOrderRow & { company_logo_url?: string | null }).company_logo_url ?? null,
    companyTimezone: (row as DbPurchaseOrderRow & { company_timezone?: string | null }).company_timezone ?? null,
    companyCountryCode: (row as DbPurchaseOrderRow & { company_country_code?: string | null }).company_country_code ?? null,
    parentCompanyName: (row as DbPurchaseOrderRow & { parent_company_name?: string | null }).parent_company_name ?? null,
    parentCompanyLogoUrl: (row as DbPurchaseOrderRow & { parent_company_logo_url?: string | null }).parent_company_logo_url ?? null,
    signatureDataUrl: (row as DbPurchaseOrderRow & { signature_data_url?: string | null }).signature_data_url ?? null,
    signedByName: (row as DbPurchaseOrderRow & { signed_by_name?: string | null }).signed_by_name ?? null,
    signedAt: (row as DbPurchaseOrderRow & { signed_at?: string | Date | null }).signed_at
      ? new Date((row as DbPurchaseOrderRow & { signed_at?: string | Date | null }).signed_at!)
      : null,
  };
}

export interface DbPurchaseOrderItemRow {
  id: string;
  purchase_order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: string | number;
  received_count: number;
  notes: string | null;
  created_at: string;
}

export function mapPurchaseOrderItemRow(
  row: DbPurchaseOrderItemRow,
): PurchaseOrderItemRecord {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    variantId: row.variant_id,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    receivedCount: Number(row.received_count),
    vin: (row as DbPurchaseOrderItemRow & { vin?: string | null }).vin ?? null,
    color: (row as DbPurchaseOrderItemRow & { color?: string | null }).color ?? null,
    notes: row.notes,
    createdAt: new Date(row.created_at),
  };
}

export interface DbFleetVehicleRow {
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

export function mapFleetVehicleRow(row: DbFleetVehicleRow): FleetVehicleRecord {
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
    assetCode: (row as DbFleetVehicleRow & { asset_code?: string | null }).asset_code ?? undefined,
    companyId: row.company_id,
    branchId: row.branch_id,
    variantId: row.variant_id,
    vendorName: (row as DbFleetVehicleRow & { vendor_name?: string | null }).vendor_name ?? null,
    poNumber: (row as DbFleetVehicleRow & { po_number?: string | null }).po_number ?? null,
    purchasePrice:
      (row as DbFleetVehicleRow & { purchase_price?: string | number | null }).purchase_price != null
        ? Number((row as DbFleetVehicleRow & { purchase_price?: string | number | null }).purchase_price)
        : null,
    purchaseOrderDate: (row as DbFleetVehicleRow & { po_order_date?: string | Date | null }).po_order_date
      ? typeof (row as DbFleetVehicleRow & { po_order_date?: string | Date | null }).po_order_date === "string"
        ? ((row as DbFleetVehicleRow & { po_order_date?: string | Date | null }).po_order_date as string).slice(0, 10)
        : new Date((row as DbFleetVehicleRow & { po_order_date?: string | Date | null }).po_order_date!).toISOString().slice(0, 10)
      : null,
    insuranceCompany:
      (row as DbFleetVehicleRow & { insurance_company?: string | null }).insurance_company ?? null,
    insurancePolicyNumber:
      (row as DbFleetVehicleRow & { insurance_policy_number?: string | null }).insurance_policy_number ?? null,
    isBookable: Boolean((row as DbFleetVehicleRow & { is_bookable?: boolean }).is_bookable),
    publishedToFleetAt: (row as DbFleetVehicleRow & { published_to_fleet_at?: string | Date | null }).published_to_fleet_at
      ? new Date((row as DbFleetVehicleRow & { published_to_fleet_at?: string | Date | null }).published_to_fleet_at!)
      : null,
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

export interface DbVehiclePhotoRow {
  id: string;
  company_id: string;
  vehicle_name: string;
  photo_url: string;
  category: string;
  created_at: string;
}

export function mapVehiclePhotoRow(row: DbVehiclePhotoRow): VehiclePhotoRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    vehicleName: row.vehicle_name,
    photoUrl: row.photo_url,
    category: row.category,
    createdAt: new Date(row.created_at),
  };
}

export interface DbRentalInclusionRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function mapRentalInclusionRow(row: DbRentalInclusionRow): RentalInclusionRecord {
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

export function mapUserRow(row: DbUserRow): UserRecord {
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

export function mapSessionRow(row: DbSessionRow): SessionRecord {
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

export function mapActionTokenRow(row: DbActionTokenRow): ActionTokenRecord {
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

export function mapCompanyRow(row: DbCompanyRow): CompanyRecord {
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

export function mapBranchRow(row: DbBranchRow): BranchRecord {
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
