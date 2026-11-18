export type UserStatus = "active" | "disabled";
export type ActionTokenType = "verify_email" | "reset_password";
export type CompanyOperatingMode =
  | "independent"
  | "network_main"
  | "local_partner";

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

  listBranchesByCompanyId(companyId: string): Promise<BranchRecord[]>;
  findBranchById(branchId: string): Promise<BranchRecord | null>;
  createBranch(input: CreateBranchInput): Promise<BranchRecord>;
  updateBranch(
    branchId: string,
    companyId: string,
    input: UpdateBranchInput,
  ): Promise<BranchRecord | null>;

  recordAuditLog(input: AuditLogInput): Promise<void>;
}
