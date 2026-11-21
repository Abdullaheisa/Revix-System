

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
  vin?: string | null;
  color?: string | null;
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
  companyName?: string;
  companyLogoUrl?: string | null;
  companyTimezone?: string | null;
  companyCountryCode?: string | null;
  parentCompanyName?: string | null;
  parentCompanyLogoUrl?: string | null;
  signatureDataUrl?: string | null;
  signedByName?: string | null;
  signedAt?: Date | null;
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
