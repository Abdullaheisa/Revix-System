import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  ActionTokenRecord,
  ActionTokenType,
  AuditLogInput,
  AuditLogRecord,
  AuthDataStore,
  BranchRecord,
  CompanyRecord,
  CreateBranchInput,
  CreateCompanyInput,
  SessionRecord,
  UpdateBranchInput,
  UpdateCompanyInput,
  UserRecord,
  UserStatus,
} from "./store.ts";

interface SerializedStoreSnapshot {
  users: UserRecord[];
  sessions: SessionRecord[];
  actionTokens: ActionTokenRecord[];
  companies: CompanyRecord[];
  branches: BranchRecord[];
  auditLogs: AuditLogRecord[];
}

export class InMemoryAuthDataStore implements AuthDataStore {
  private readonly usersById = new Map<string, UserRecord>();
  private readonly userIdByEmail = new Map<string, string>();
  private readonly sessionsByHash = new Map<string, SessionRecord>();
  private readonly actionTokensByHash = new Map<string, ActionTokenRecord>();
  private readonly companiesById = new Map<string, CompanyRecord>();
  private readonly companyIdByOwnerUserId = new Map<string, string>();
  private readonly branchesById = new Map<string, BranchRecord>();
  public readonly auditLogs: AuditLogRecord[] = [];
  private readonly persistFilePath: string | null;

  constructor(options?: { persistFilePath?: string }) {
    this.persistFilePath = options?.persistFilePath ?? null;
    if (this.persistFilePath) {
      this.loadFromDisk();
    }
  }

  private loadFromDisk(): void {
    if (!this.persistFilePath || !fs.existsSync(this.persistFilePath)) {
      return;
    }

    try {
      const raw = fs.readFileSync(this.persistFilePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<SerializedStoreSnapshot>;

      for (const u of parsed.users ?? []) {
        const record: UserRecord = {
          ...u,
          emailVerifiedAt: u.emailVerifiedAt
            ? new Date(u.emailVerifiedAt)
            : null,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        };
        this.usersById.set(record.id, record);
        this.userIdByEmail.set(record.email.toLowerCase(), record.id);
      }

      for (const s of parsed.sessions ?? []) {
        const record: SessionRecord = {
          ...s,
          expiresAt: new Date(s.expiresAt),
          revokedAt: s.revokedAt ? new Date(s.revokedAt) : null,
          createdAt: new Date(s.createdAt),
        };
        this.sessionsByHash.set(record.tokenHash, record);
      }

      for (const t of parsed.actionTokens ?? []) {
        const record: ActionTokenRecord = {
          ...t,
          expiresAt: new Date(t.expiresAt),
          consumedAt: t.consumedAt ? new Date(t.consumedAt) : null,
          createdAt: new Date(t.createdAt),
        };
        this.actionTokensByHash.set(record.tokenHash, record);
      }

      for (const c of parsed.companies ?? []) {
        const record: CompanyRecord = {
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        };
        this.companiesById.set(record.id, record);
        this.companyIdByOwnerUserId.set(record.ownerUserId, record.id);
      }

      for (const b of parsed.branches ?? []) {
        const record: BranchRecord = {
          ...b,
          createdAt: new Date(b.createdAt),
          updatedAt: new Date(b.updatedAt),
        };
        this.branchesById.set(record.id, record);
      }

      for (const a of parsed.auditLogs ?? []) {
        this.auditLogs.push({
          ...a,
          createdAt: new Date(a.createdAt),
        });
      }
    } catch {
      // If local dev snapshot is unreadable, start fresh without crashing.
    }
  }

  private saveToDisk(): void {
    if (!this.persistFilePath) {
      return;
    }

    try {
      const dir = path.dirname(this.persistFilePath);
      fs.mkdirSync(dir, { recursive: true });
      const snapshot: SerializedStoreSnapshot = {
        users: Array.from(this.usersById.values()),
        sessions: Array.from(this.sessionsByHash.values()),
        actionTokens: Array.from(this.actionTokensByHash.values()),
        companies: Array.from(this.companiesById.values()),
        branches: Array.from(this.branchesById.values()),
        auditLogs: this.auditLogs,
      };
      fs.writeFileSync(
        this.persistFilePath,
        JSON.stringify(snapshot, null, 2),
        "utf8",
      );
    } catch {
      // Ignore write failures in fallback dev mode.
    }
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const id = this.userIdByEmail.get(normalized);
    if (!id) {
      return null;
    }
    const user = this.usersById.get(id);
    return user ? { ...user } : null;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    const user = this.usersById.get(userId);
    return user ? { ...user } : null;
  }

  async createUser(input: {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (this.userIdByEmail.has(normalizedEmail)) {
      const duplicateErr = new Error("Duplicate email") as Error & {
        code?: string;
      };
      duplicateErr.code = "23505";
      throw duplicateErr;
    }

    const now = new Date();
    const record: UserRecord = {
      id: input.id,
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      passwordHash: input.passwordHash,
      emailVerifiedAt: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    this.usersById.set(record.id, record);
    this.userIdByEmail.set(normalizedEmail, record.id);
    this.saveToDisk();
    return { ...record };
  }

  async markUserEmailVerified(userId: string, verifiedAt: Date): Promise<void> {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = verifiedAt;
    }
    user.updatedAt = verifiedAt;
    this.saveToDisk();
  }

  async updateUserPassword(
    userId: string,
    newPasswordHash: string,
    updatedAt: Date,
  ): Promise<void> {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }
    user.passwordHash = newPasswordHash;
    user.updatedAt = updatedAt;
    this.saveToDisk();
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }
    user.status = status;
    user.updatedAt = new Date();
    this.saveToDisk();
  }

  async createSession(input: {
    id: string;
    userId: string;
    tokenHash: string;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const record: SessionRecord = {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    };
    this.sessionsByHash.set(record.tokenHash, record);
    this.saveToDisk();
    return { ...record };
  }

  async findActiveSessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<SessionRecord | null> {
    const session = this.sessionsByHash.get(tokenHash);
    if (!session) {
      return null;
    }
    if (session.revokedAt !== null) {
      return null;
    }
    if (session.expiresAt.getTime() <= now.getTime()) {
      return null;
    }
    return { ...session };
  }

  async revokeSessionByTokenHash(
    tokenHash: string,
    revokedAt: Date,
  ): Promise<void> {
    const session = this.sessionsByHash.get(tokenHash);
    if (session && session.revokedAt === null) {
      session.revokedAt = revokedAt;
      this.saveToDisk();
    }
  }

  async revokeAllUserSessions(userId: string, revokedAt: Date): Promise<void> {
    let changed = false;
    for (const session of this.sessionsByHash.values()) {
      if (session.userId === userId && session.revokedAt === null) {
        session.revokedAt = revokedAt;
        changed = true;
      }
    }
    if (changed) {
      this.saveToDisk();
    }
  }

  async createActionToken(input: {
    id: string;
    userId: string;
    tokenType: ActionTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<ActionTokenRecord> {
    const record: ActionTokenRecord = {
      id: input.id,
      userId: input.userId,
      tokenType: input.tokenType,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      consumedAt: null,
      createdAt: new Date(),
    };
    this.actionTokensByHash.set(record.tokenHash, record);
    this.saveToDisk();
    return { ...record };
  }

  async invalidateUnusedActionTokens(
    userId: string,
    tokenType: ActionTokenType,
    consumedAt: Date,
  ): Promise<void> {
    let changed = false;
    for (const token of this.actionTokensByHash.values()) {
      if (
        token.userId === userId &&
        token.tokenType === tokenType &&
        token.consumedAt === null
      ) {
        token.consumedAt = consumedAt;
        changed = true;
      }
    }
    if (changed) {
      this.saveToDisk();
    }
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
    const token = this.actionTokensByHash.get(tokenHash);
    if (!token || token.tokenType !== tokenType || token.consumedAt !== null) {
      return { status: "invalid" };
    }

    if (token.expiresAt.getTime() <= now.getTime()) {
      return { status: "expired" };
    }

    token.consumedAt = now;
    this.saveToDisk();
    return { status: "consumed", token: { ...token } };
  }

  async findCompanyByOwnerUserId(
    userId: string,
  ): Promise<CompanyRecord | null> {
    const companyId = this.companyIdByOwnerUserId.get(userId);
    if (!companyId) {
      return null;
    }
    const company = this.companiesById.get(companyId);
    return company ? { ...company } : null;
  }

  async findCompanyById(companyId: string): Promise<CompanyRecord | null> {
    const company = this.companiesById.get(companyId);
    return company ? { ...company } : null;
  }

  async createCompany(input: CreateCompanyInput): Promise<CompanyRecord> {
    if (this.companyIdByOwnerUserId.has(input.ownerUserId)) {
      const err = new Error("User already owns a company") as Error & {
        code?: string;
      };
      err.code = "23505";
      throw err;
    }

    const now = new Date();
    const record: CompanyRecord = {
      id: input.id,
      ownerUserId: input.ownerUserId,
      name: input.name.trim(),
      legalName: input.legalName.trim(),
      logoUrl: input.logoUrl?.trim() || null,
      brandColor: input.brandColor.trim(),
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      countryCode: input.countryCode.trim().toUpperCase(),
      city: input.city.trim(),
      address: input.address.trim(),
      postalCode: input.postalCode.trim(),
      baseCurrency: input.baseCurrency.trim().toUpperCase(),
      timezone: input.timezone.trim(),
      businessRegNumber: input.businessRegNumber.trim(),
      taxRegNumber: input.taxRegNumber.trim(),
      operatingMode: input.operatingMode,
      parentCompanyId: input.parentCompanyId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.companiesById.set(record.id, record);
    this.companyIdByOwnerUserId.set(record.ownerUserId, record.id);
    this.saveToDisk();
    return { ...record };
  }

  async updateCompany(
    companyId: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyRecord | null> {
    const existing = this.companiesById.get(companyId);
    if (!existing) {
      return null;
    }

    const updated: CompanyRecord = {
      ...existing,
      name: input.name.trim(),
      legalName: input.legalName.trim(),
      logoUrl: input.logoUrl?.trim() || null,
      brandColor: input.brandColor.trim(),
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      countryCode: input.countryCode.trim().toUpperCase(),
      city: input.city.trim(),
      address: input.address.trim(),
      postalCode: input.postalCode.trim(),
      baseCurrency: input.baseCurrency.trim().toUpperCase(),
      timezone: input.timezone.trim(),
      businessRegNumber: input.businessRegNumber.trim(),
      taxRegNumber: input.taxRegNumber.trim(),
      operatingMode: input.operatingMode,
      updatedAt: new Date(),
    };

    this.companiesById.set(companyId, updated);
    this.saveToDisk();
    return { ...updated };
  }

  async listBranchesByCompanyId(companyId: string): Promise<BranchRecord[]> {
    const list: BranchRecord[] = [];
    for (const branch of this.branchesById.values()) {
      if (branch.companyId === companyId) {
        list.push({ ...branch });
      }
    }
    return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findBranchById(branchId: string): Promise<BranchRecord | null> {
    const branch = this.branchesById.get(branchId);
    return branch ? { ...branch } : null;
  }

  async createBranch(input: CreateBranchInput): Promise<BranchRecord> {
    const normalizedCode = input.code.trim().toUpperCase();
    for (const existing of this.branchesById.values()) {
      if (
        existing.companyId === input.companyId &&
        existing.code.toUpperCase() === normalizedCode
      ) {
        const err = new Error(
          "Branch code already exists in this company",
        ) as Error & { code?: string };
        err.code = "23505";
        throw err;
      }
    }

    const now = new Date();
    const record: BranchRecord = {
      id: input.id,
      companyId: input.companyId,
      name: input.name.trim(),
      code: normalizedCode,
      countryCode: input.countryCode.trim().toUpperCase(),
      city: input.city.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      currencyCode: input.currencyCode.trim().toUpperCase(),
      timezone: input.timezone.trim(),
      workingDays: input.workingDays.trim(),
      workingHours: input.workingHours.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.branchesById.set(record.id, record);
    this.saveToDisk();
    return { ...record };
  }

  async updateBranch(
    branchId: string,
    companyId: string,
    input: UpdateBranchInput,
  ): Promise<BranchRecord | null> {
    const existing = this.branchesById.get(branchId);
    if (!existing || existing.companyId !== companyId) {
      return null;
    }

    const normalizedCode = input.code.trim().toUpperCase();
    for (const other of this.branchesById.values()) {
      if (
        other.id !== branchId &&
        other.companyId === companyId &&
        other.code.toUpperCase() === normalizedCode
      ) {
        const err = new Error(
          "Branch code already exists in this company",
        ) as Error & { code?: string };
        err.code = "23505";
        throw err;
      }
    }

    const updated: BranchRecord = {
      ...existing,
      name: input.name.trim(),
      code: normalizedCode,
      countryCode: input.countryCode.trim().toUpperCase(),
      city: input.city.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      currencyCode: input.currencyCode.trim().toUpperCase(),
      timezone: input.timezone.trim(),
      workingDays: input.workingDays.trim(),
      workingHours: input.workingHours.trim(),
      isActive: input.isActive,
      updatedAt: new Date(),
    };

    this.branchesById.set(branchId, updated);
    this.saveToDisk();
    return { ...updated };
  }

  async recordAuditLog(input: AuditLogInput): Promise<void> {
    this.auditLogs.push({
      id: crypto.randomUUID(),
      companyId: input.companyId ?? null,
      branchId: input.branchId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
      createdAt: new Date(),
    });
    this.saveToDisk();
  }
}
