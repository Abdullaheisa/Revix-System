

export interface CustomerRecord {
  id: string;
  customerCode?: string;
  companyId: string;
  fullName: string;
  phone: string;
  secondaryPhone: string | null;
  email: string | null;
  nationalId: string | null;
  nationalIdExpiry: string | null;
  driverLicenseNo: string | null;
  licenseExpiry: string | null;
  nationality: string | null;
  address: string | null;
  workAddress: string | null;
  notes: string | null;
  signatureDataUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RentalContractStatus = "draft" | "active" | "completed" | "cancelled";

export interface RentalContractRecord {
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
  returnCondition?: string | null;
  secondDriverName?: string | null;
  secondDriverLicenseNo?: string | null;
  sponsorName?: string | null;
  sponsorNationalId?: string | null;
  sponsorPhone?: string | null;
  returnedAt?: Date | null;
  customerSignatureDataUrl?: string | null;
  signedAt?: Date | null;
  createdByUserId: string | null;
  createdByUserName?: string | null;
  createdByUserSignatureDataUrl?: string | null;
  cancelledByUserId?: string | null;
  cancelledByUserName?: string | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Enriched presentation fields
  vehicleAssetCode?: string;
  vehiclePlate?: string;
  vehicleName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleModelYear?: number;
  vehicleCategory?: string;
  vehicleColor?: string;
  vehicleInsuranceCompany?: string | null;
  vehicleInsuranceExpiry?: string | null;
  vehicleDailyKmLimit?: number | null;
  vehicleExtraKmRate?: number | null;
  customerName?: string;
  customerPhone?: string;
  customerSecondaryPhone?: string | null;
  customerNationality?: string | null;
  customerNationalId?: string | null;
  customerNationalIdExpiry?: string | null;
  customerDriverLicenseNo?: string | null;
  customerLicenseExpiry?: string | null;
  customerAddress?: string | null;
  customerWorkAddress?: string | null;
  branchName?: string;
  currencyCode?: string;
}

export type ContractVoucherType = "receipt" | "payment" | "refund";
export type VoucherPaymentMethod = "cash" | "knet" | "link" | "bank_transfer" | "cheque";

export interface ContractVoucherRecord {
  id: string;
  companyId: string;
  branchId: string | null;
  contractId: string;
  contractNumber?: string;
  customerName?: string;
  voucherNumber: string;
  voucherType: ContractVoucherType;
  amount: number;
  currencyCode: string;
  paymentMethod: VoucherPaymentMethod;
  paymentDate: string;
  referenceNo: string | null;
  bankName: string | null;
  description: string | null;
  createdByUserId: string | null;
  createdByUserName?: string | null;
  createdByUserSignatureDataUrl?: string | null;
  createdAt: Date;
}
