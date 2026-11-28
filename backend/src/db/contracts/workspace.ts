

export type CompanyOperatingMode =
  | "independent"
  | "network_main"
  | "local_partner";

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
  partnerSlug?: string | null;
  contractTermsAr?: string | null;
  contractTermsEn?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PartnerApiKeyStatus = "active" | "suspended" | "revoked";

export interface PartnerApiKeyRecord {
  id: string;
  companyId: string;
  partnerName: string;
  partnerWebsiteUrl: string;
  environment: "production";
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  status: PartnerApiKeyStatus;
  lastUsedAt: Date | null;
  requestCount: number;
  createdByUserId: string | null;
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
  contractTermsAr?: string | null;
  contractTermsEn?: string | null;
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

export interface InsuranceCompanyRecord {
  id: string;
  companyId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: Date;
}
