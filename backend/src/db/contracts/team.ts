

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
