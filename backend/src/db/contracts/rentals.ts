

export interface CustomerRecord {
  id: string;
  companyId: string;
  fullName: string;
  phone: string;
  email: string | null;
  nationalId: string | null;
  driverLicenseNo: string | null;
  licenseExpiry: string | null;
  nationality: string | null;
  address: string | null;
  notes: string | null;
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
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Enriched presentation fields
  vehiclePlate?: string;
  vehicleName?: string;
  customerName?: string;
  customerPhone?: string;
  branchName?: string;
}
