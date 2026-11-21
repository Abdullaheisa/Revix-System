

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
