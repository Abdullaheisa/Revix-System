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
  CreateFleetPriceListInput,
  CreateFleetVehicleInput,
  CreateNetworkInvitationInput,
  CreateNetworkLinkInput,
  CreatePurchaseOrderInput,
  CreateRentalInclusionInput,
  CreateVehicleBodyStyleInput,
  CreateVehicleColorInput,
  CreateVehiclePhotoInput,
  CreateVehicleVariantInput,
  CreateVendorInput,
  EmployeeInvitationRecord,
  FleetPriceListRecord,
  FleetVehicleFilterOptions,
  FleetVehicleRecord,
  FleetVehicleStatus,
  NetworkInvitationStatus,
  NetworkLinkStatus,
  NetworkPermittedBranchRecord,
  PurchaseOrderItemRecord,
  PurchaseOrderRecord,
  PurchaseOrderStatus,
  ReceiveVehicleFromPoInput,
  RentalInclusionRecord,
  SessionRecord,
  UpdateBranchInput,
  UpdateCompanyInput,
  UpdateCompanyMembershipInput,
  UpdateCompanyRoleInput,
  UpdateFleetPriceListInput,
  UpdateFleetVehicleInput,
  UpdateRentalInclusionInput,
  UpdateVehicleVariantInput,
  UpdateVendorInput,
  UserRecord,
  UserStatus,
  VehicleBodyStyleRecord,
  VehicleCategory,
  VehicleColorRecord,
  VehiclePhotoRecord,
  VehicleVariantRecord,
  VendorCategory,
  VendorRecord,
} from "./store.ts";

interface SerializedStoreSnapshot {
  users: UserRecord[];
  sessions: SessionRecord[];
  actionTokens: ActionTokenRecord[];
  companies: CompanyRecord[];
  branches: BranchRecord[];
  roles: CompanyRoleRecord[];
  memberships: CompanyMembershipRecord[];
  invitations: EmployeeInvitationRecord[];
  variants?: VehicleVariantRecord[];
  vendors?: VendorRecord[];
  purchaseOrders?: PurchaseOrderRecord[];
  purchaseOrderItems?: PurchaseOrderItemRecord[];
  vehicles?: FleetVehicleRecord[];
  vehiclePhotos?: VehiclePhotoRecord[];
  rentalInclusions?: RentalInclusionRecord[];
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
  private readonly rolesById = new Map<string, CompanyRoleRecord>();
  private readonly membershipsById = new Map<string, CompanyMembershipRecord>();
  private readonly membershipIdByUserId = new Map<string, string>();
  private readonly invitationsById = new Map<string, EmployeeInvitationRecord>();
  private readonly invitationIdByTokenHash = new Map<string, string>();
  private readonly networkLinksById = new Map<string, CompanyNetworkLinkRecord>();
  private readonly permittedBranchesByLinkId = new Map<string, NetworkPermittedBranchRecord[]>();
  private readonly networkInvitationsById = new Map<string, CompanyNetworkInvitationRecord>();
  private readonly networkInvitationIdByTokenHash = new Map<string, string>();
  private readonly variantsById = new Map<string, VehicleVariantRecord>();
  private readonly vendorsById = new Map<string, VendorRecord>();
  private readonly purchaseOrdersById = new Map<string, PurchaseOrderRecord>();
  private readonly purchaseOrderItemsByPoId = new Map<string, PurchaseOrderItemRecord[]>();
  private readonly vehiclesById = new Map<string, FleetVehicleRecord>();
  private readonly vehiclePhotosById = new Map<string, VehiclePhotoRecord>();
  private readonly rentalInclusionsById = new Map<string, RentalInclusionRecord>();
  private readonly vehicleColorsById = new Map<string, VehicleColorRecord>();
  private readonly vehicleBodyStylesById = new Map<string, VehicleBodyStyleRecord>();
  private readonly fleetPriceListsById = new Map<string, FleetPriceListRecord>();
  public readonly auditLogs: AuditLogRecord[] = [];
  private readonly persistFilePath: string | null;

  constructor(options?: { persistFilePath?: string }) {
    this.persistFilePath = options?.persistFilePath ?? null;
    if (this.persistFilePath) {
      this.loadFromDisk();
    }
    this.seedDefaultVehiclePhotos();
    this.seedDefaultRentalInclusions();
  }

  private seedDefaultVehiclePhotos(): void {
    if (this.vehiclePhotosById.size > 0) return;
    const defaults = [
      { name: "Hyundai i20 Automatic", url: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80", category: "General" },
      { name: "Hyundai i10 Manual", url: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80", category: "General" },
      { name: "Hyundai i10 Automatic", url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80", category: "General" },
      { name: "Hyundai H1 Automatic", url: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80", category: "General" },
      { name: "Toyota Yaris 2024", url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80", category: "General" },
      { name: "Toyota Corolla 2024", url: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=800&q=80", category: "General" },
      { name: "Toyota Camry 2024", url: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80", category: "General" },
      { name: "Nissan Sunny 2024", url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80", category: "General" },
      { name: "BMW 5 Series", url: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80", category: "General" },
      { name: "Kia Sportage 2024", url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80", category: "General" },
    ];
    for (const d of defaults) {
      const id = crypto.randomUUID();
      this.vehiclePhotosById.set(id, {
        id,
        companyId: "global",
        vehicleName: d.name,
        photoUrl: d.url,
        category: d.category,
        createdAt: new Date(),
      });
    }
  }

  private seedDefaultRentalInclusions(): void {
    if (this.rentalInclusionsById.size > 0) return;
    const defaults = [
      { name: "Free Cancellation (24)", description: "Free cancellation up to 24-48 hours before pickup" },
      { name: "Free Amendment", description: "Modify dates and details without extra fees" },
      { name: "Third Party Liability (TPL)", description: "Mandatory third party liability protection" },
      { name: "Unlimited Mileage", description: "No daily distance limitations" },
      { name: "24/7 Customer Support", description: "Round-the-clock road and concierge assistance" },
      { name: "Collision Damage Waiver (CDW)", description: "Reduces financial liability in case of vehicle body damage" },
      { name: "Theft Protection (TP)", description: "Protection against full or partial vehicle theft" },
      { name: "Airport Surcharge Included", description: "Airport terminal concession fees and taxes included" },
      { name: "Sanitized & Clean Vehicle", description: "Deeply cleaned and sanitized before every handover" },
      { name: "Free Additional Driver", description: "One supplementary authorized driver included at zero charge" },
      { name: "GPS Navigation System", description: "Satellite GPS unit or integrated smart car navigation" },
      { name: "Roadside Assistance 24/7", description: "Emergency breakdown, towing, and tire replacement assistance" },
    ];
    for (const d of defaults) {
      const id = crypto.randomUUID();
      this.rentalInclusionsById.set(id, {
        id,
        companyId: "global",
        name: d.name,
        description: d.description,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
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

      for (const r of parsed.roles ?? []) {
        const record: CompanyRoleRecord = {
          ...r,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        };
        this.rolesById.set(record.id, record);
      }

      for (const m of parsed.memberships ?? []) {
        const record: CompanyMembershipRecord = {
          ...m,
          branchIds: Array.isArray(m.branchIds) ? [...m.branchIds] : [],
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
        };
        this.membershipsById.set(record.id, record);
        this.membershipIdByUserId.set(record.userId, record.id);
      }

      for (const inv of parsed.invitations ?? []) {
        const record: EmployeeInvitationRecord = {
          ...inv,
          branchIds: Array.isArray(inv.branchIds) ? [...inv.branchIds] : [],
          expiresAt: new Date(inv.expiresAt),
          acceptedAt: inv.acceptedAt ? new Date(inv.acceptedAt) : null,
          revokedAt: inv.revokedAt ? new Date(inv.revokedAt) : null,
          createdAt: new Date(inv.createdAt),
        };
        this.invitationsById.set(record.id, record);
        this.invitationIdByTokenHash.set(record.tokenHash, record.id);
      }

      for (const a of parsed.auditLogs ?? []) {
        this.auditLogs.push({
          ...a,
          createdAt: new Date(a.createdAt),
        });
      }

      for (const v of parsed.variants ?? []) {
        this.variantsById.set(v.id, {
          ...v,
          createdAt: new Date(v.createdAt),
          updatedAt: new Date(v.updatedAt),
        });
      }

      for (const vd of parsed.vendors ?? []) {
        this.vendorsById.set(vd.id, {
          ...vd,
          createdAt: new Date(vd.createdAt),
          updatedAt: new Date(vd.updatedAt),
        });
      }

      for (const po of parsed.purchaseOrders ?? []) {
        this.purchaseOrdersById.set(po.id, {
          ...po,
          approvedAt: po.approvedAt ? new Date(po.approvedAt) : null,
          createdAt: new Date(po.createdAt),
          updatedAt: new Date(po.updatedAt),
        });
      }

      for (const item of parsed.purchaseOrderItems ?? []) {
        const list = this.purchaseOrderItemsByPoId.get(item.purchaseOrderId) ?? [];
        list.push({
          ...item,
          createdAt: new Date(item.createdAt),
        });
        this.purchaseOrderItemsByPoId.set(item.purchaseOrderId, list);
      }

      for (const vh of parsed.vehicles ?? []) {
        this.vehiclesById.set(vh.id, {
          ...vh,
          createdAt: new Date(vh.createdAt),
          updatedAt: new Date(vh.updatedAt),
        });
      }

      for (const vp of parsed.vehiclePhotos ?? []) {
        this.vehiclePhotosById.set(vp.id, {
          ...vp,
          createdAt: new Date(vp.createdAt),
        });
      }

      for (const ri of parsed.rentalInclusions ?? []) {
        this.rentalInclusionsById.set(ri.id, {
          ...ri,
          createdAt: new Date(ri.createdAt),
          updatedAt: new Date(ri.updatedAt),
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
        roles: Array.from(this.rolesById.values()),
        memberships: Array.from(this.membershipsById.values()),
        invitations: Array.from(this.invitationsById.values()),
        variants: Array.from(this.variantsById.values()),
        vendors: Array.from(this.vendorsById.values()),
        purchaseOrders: Array.from(this.purchaseOrdersById.values()),
        purchaseOrderItems: Array.from(this.purchaseOrderItemsByPoId.values()).flat(),
        vehicles: Array.from(this.vehiclesById.values()),
        vehiclePhotos: Array.from(this.vehiclePhotosById.values()),
        rentalInclusions: Array.from(this.rentalInclusionsById.values()),
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

  async updateCompanyOperatingMode(
    companyId: string,
    operatingMode: CompanyOperatingMode,
    parentCompanyId?: string | null,
  ): Promise<CompanyRecord | null> {
    const existing = this.companiesById.get(companyId);
    if (!existing) {
      return null;
    }

    const updated: CompanyRecord = {
      ...existing,
      operatingMode,
      parentCompanyId: parentCompanyId ?? null,
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

  // Phase 3: Team Roles, Memberships, Branch Scopes & Invitations
  async listCompanyRoles(companyId: string): Promise<CompanyRoleRecord[]> {
    const roles: CompanyRoleRecord[] = [];
    for (const r of this.rolesById.values()) {
      if (r.companyId === companyId) {
        roles.push({ ...r, permissions: { ...r.permissions } });
      }
    }
    return roles.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findCompanyRoleById(roleId: string): Promise<CompanyRoleRecord | null> {
    const r = this.rolesById.get(roleId);
    return r ? { ...r, permissions: { ...r.permissions } } : null;
  }

  async findCompanyRoleByCode(
    companyId: string,
    code: string,
  ): Promise<CompanyRoleRecord | null> {
    const normalized = code.trim().toLowerCase();
    for (const r of this.rolesById.values()) {
      if (r.companyId === companyId && r.code.toLowerCase() === normalized) {
        return { ...r, permissions: { ...r.permissions } };
      }
    }
    return null;
  }

  async createCompanyRole(
    input: CreateCompanyRoleInput,
  ): Promise<CompanyRoleRecord> {
    const normalizedCode = input.code.trim().toLowerCase();
    const existing = await this.findCompanyRoleByCode(
      input.companyId,
      normalizedCode,
    );
    if (existing) {
      const err = new Error("Role code already exists in company") as Error & {
        code?: string;
      };
      err.code = "23505";
      throw err;
    }

    const now = new Date();
    const record: CompanyRoleRecord = {
      id: input.id,
      companyId: input.companyId,
      code: normalizedCode,
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      descriptionEn: input.descriptionEn.trim(),
      descriptionAr: input.descriptionAr.trim(),
      scopeType: input.scopeType,
      permissions: { ...input.permissions },
      isSystem: input.isSystem,
      createdAt: now,
      updatedAt: now,
    };

    this.rolesById.set(record.id, record);
    this.saveToDisk();
    return { ...record, permissions: { ...record.permissions } };
  }

  async updateCompanyRole(
    roleId: string,
    companyId: string,
    input: UpdateCompanyRoleInput,
  ): Promise<CompanyRoleRecord | null> {
    const existing = this.rolesById.get(roleId);
    if (!existing || existing.companyId !== companyId) {
      return null;
    }

    const updated: CompanyRoleRecord = {
      ...existing,
      nameEn: input.nameEn?.trim() ?? existing.nameEn,
      nameAr: input.nameAr?.trim() ?? existing.nameAr,
      descriptionEn: input.descriptionEn?.trim() ?? existing.descriptionEn,
      descriptionAr: input.descriptionAr?.trim() ?? existing.descriptionAr,
      scopeType: input.scopeType,
      permissions: { ...input.permissions },
      updatedAt: new Date(),
    };

    this.rolesById.set(roleId, updated);
    this.saveToDisk();
    return { ...updated, permissions: { ...updated.permissions } };
  }

  async deleteCompanyRole(roleId: string, companyId: string): Promise<boolean> {
    const existing = this.rolesById.get(roleId);
    if (!existing || existing.companyId !== companyId || existing.isSystem) {
      return false;
    }
    this.rolesById.delete(roleId);
    this.saveToDisk();
    return true;
  }

  async findMembershipByUserId(
    userId: string,
  ): Promise<CompanyMembershipRecord | null> {
    const id = this.membershipIdByUserId.get(userId);
    if (!id) return null;
    const m = this.membershipsById.get(id);
    return m ? { ...m, branchIds: [...m.branchIds] } : null;
  }

  async findMembershipById(
    membershipId: string,
  ): Promise<CompanyMembershipRecord | null> {
    const m = this.membershipsById.get(membershipId);
    return m ? { ...m, branchIds: [...m.branchIds] } : null;
  }

  async listCompanyMemberships(
    companyId: string,
  ): Promise<CompanyMembershipRecord[]> {
    const list: CompanyMembershipRecord[] = [];
    for (const m of this.membershipsById.values()) {
      if (m.companyId === companyId) {
        list.push({ ...m, branchIds: [...m.branchIds] });
      }
    }
    return list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createCompanyMembership(
    input: CreateCompanyMembershipInput,
  ): Promise<CompanyMembershipRecord> {
    if (this.membershipIdByUserId.has(input.userId)) {
      const err = new Error(
        "User already belongs to a company",
      ) as Error & { code?: string };
      err.code = "23505";
      throw err;
    }

    const now = new Date();
    const record: CompanyMembershipRecord = {
      id: input.id,
      userId: input.userId,
      companyId: input.companyId,
      roleId: input.roleId,
      phone: input.phone.trim(),
      status: input.status ?? "active",
      branchIds: Array.from(new Set(input.branchIds)),
      createdAt: now,
      updatedAt: now,
    };

    this.membershipsById.set(record.id, record);
    this.membershipIdByUserId.set(record.userId, record.id);
    this.saveToDisk();
    return { ...record, branchIds: [...record.branchIds] };
  }

  async updateCompanyMembership(
    membershipId: string,
    companyId: string,
    input: UpdateCompanyMembershipInput,
  ): Promise<CompanyMembershipRecord | null> {
    const existing = this.membershipsById.get(membershipId);
    if (!existing || existing.companyId !== companyId) {
      return null;
    }

    const updated: CompanyMembershipRecord = {
      ...existing,
      roleId: input.roleId,
      phone: input.phone.trim(),
      status: input.status,
      branchIds: Array.from(new Set(input.branchIds)),
      updatedAt: new Date(),
    };

    this.membershipsById.set(membershipId, updated);
    this.saveToDisk();
    return { ...updated, branchIds: [...updated.branchIds] };
  }

  async createEmployeeInvitation(
    input: CreateEmployeeInvitationInput,
  ): Promise<EmployeeInvitationRecord> {
    const record: EmployeeInvitationRecord = {
      id: input.id,
      companyId: input.companyId,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      roleId: input.roleId,
      branchIds: Array.from(new Set(input.branchIds)),
      tokenHash: input.tokenHash,
      invitedByUserId: input.invitedByUserId,
      expiresAt: input.expiresAt,
      acceptedAt: null,
      revokedAt: null,
      createdAt: new Date(),
    };

    this.invitationsById.set(record.id, record);
    this.invitationIdByTokenHash.set(record.tokenHash, record.id);
    this.saveToDisk();
    return { ...record, branchIds: [...record.branchIds] };
  }

  async findInvitationById(
    invitationId: string,
  ): Promise<EmployeeInvitationRecord | null> {
    const inv = this.invitationsById.get(invitationId);
    return inv ? { ...inv, branchIds: [...inv.branchIds] } : null;
  }

  async findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<EmployeeInvitationRecord | null> {
    const id = this.invitationIdByTokenHash.get(tokenHash);
    if (!id) return null;
    const inv = this.invitationsById.get(id);
    return inv ? { ...inv, branchIds: [...inv.branchIds] } : null;
  }

  async listCompanyInvitations(
    companyId: string,
  ): Promise<EmployeeInvitationRecord[]> {
    const list: EmployeeInvitationRecord[] = [];
    for (const inv of this.invitationsById.values()) {
      if (inv.companyId === companyId) {
        list.push({ ...inv, branchIds: [...inv.branchIds] });
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async revokePendingInvitationsForEmail(
    companyId: string,
    email: string,
    revokedAt: Date,
  ): Promise<void> {
    const normalized = email.trim().toLowerCase();
    for (const inv of this.invitationsById.values()) {
      if (
        inv.companyId === companyId &&
        inv.email === normalized &&
        !inv.acceptedAt &&
        !inv.revokedAt
      ) {
        inv.revokedAt = revokedAt;
      }
    }
    this.saveToDisk();
  }

  async revokeInvitationById(
    invitationId: string,
    companyId: string,
    revokedAt: Date,
  ): Promise<EmployeeInvitationRecord | null> {
    const inv = this.invitationsById.get(invitationId);
    if (!inv || inv.companyId !== companyId) {
      return null;
    }
    if (!inv.acceptedAt && !inv.revokedAt) {
      inv.revokedAt = revokedAt;
      this.saveToDisk();
    }
    return { ...inv, branchIds: [...inv.branchIds] };
  }

  async markInvitationAccepted(
    invitationId: string,
    acceptedAt: Date,
  ): Promise<void> {
    const inv = this.invitationsById.get(invitationId);
    if (inv) {
      inv.acceptedAt = acceptedAt;
      this.saveToDisk();
    }
  }

  // Phase 4: Company Network Implementation
  async createNetworkLink(
    input: CreateNetworkLinkInput,
  ): Promise<CompanyNetworkLinkRecord> {
    const existing = await this.findNetworkLink(
      input.mainCompanyId,
      input.localCompanyId,
    );
    if (existing) {
      const err = new Error("Network link already exists") as Error & {
        code?: string;
      };
      err.code = "23505";
      throw err;
    }

    const now = new Date();
    const record: CompanyNetworkLinkRecord = {
      id: input.id ?? crypto.randomUUID(),
      mainCompanyId: input.mainCompanyId,
      localCompanyId: input.localCompanyId,
      status: input.status ?? "active",
      permittedCountries: [...(input.permittedCountries ?? [])],
      notes: input.notes,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    };

    this.networkLinksById.set(record.id, record);
    this.saveToDisk();
    return { ...record, permittedCountries: [...record.permittedCountries] };
  }

  async findNetworkLinkById(
    linkId: string,
  ): Promise<CompanyNetworkLinkRecord | null> {
    const link = this.networkLinksById.get(linkId);
    return link
      ? { ...link, permittedCountries: [...link.permittedCountries] }
      : null;
  }

  async findNetworkLink(
    mainCompanyId: string,
    localCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord | null> {
    for (const link of this.networkLinksById.values()) {
      if (
        link.mainCompanyId === mainCompanyId &&
        link.localCompanyId === localCompanyId
      ) {
        return { ...link, permittedCountries: [...link.permittedCountries] };
      }
    }
    return null;
  }

  async listNetworkLinksForMain(
    mainCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord[]> {
    const list: CompanyNetworkLinkRecord[] = [];
    for (const link of this.networkLinksById.values()) {
      if (link.mainCompanyId === mainCompanyId) {
        list.push({ ...link, permittedCountries: [...link.permittedCountries] });
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listNetworkLinksForLocal(
    localCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord[]> {
    const list: CompanyNetworkLinkRecord[] = [];
    for (const link of this.networkLinksById.values()) {
      if (link.localCompanyId === localCompanyId) {
        list.push({ ...link, permittedCountries: [...link.permittedCountries] });
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateNetworkLinkStatus(
    linkId: string,
    status: NetworkLinkStatus,
  ): Promise<CompanyNetworkLinkRecord | null> {
    const link = this.networkLinksById.get(linkId);
    if (!link) return null;
    link.status = status;
    link.updatedAt = new Date();
    this.saveToDisk();
    return { ...link, permittedCountries: [...link.permittedCountries] };
  }

  async deleteNetworkLink(linkId: string): Promise<void> {
    this.networkLinksById.delete(linkId);
    this.permittedBranchesByLinkId.delete(linkId);
    this.saveToDisk();
  }

  async setNetworkPermittedBranches(
    linkId: string,
    localCompanyId: string,
    branchIds: string[],
  ): Promise<NetworkPermittedBranchRecord[]> {
    const uniqueIds = Array.from(new Set(branchIds));
    const records: NetworkPermittedBranchRecord[] = uniqueIds.map((bId) => ({
      id: crypto.randomUUID(),
      linkId,
      localCompanyId,
      branchId: bId,
      createdAt: new Date(),
    }));

    this.permittedBranchesByLinkId.set(linkId, records);
    this.saveToDisk();
    return records.map((r) => ({ ...r }));
  }

  async listNetworkPermittedBranches(
    linkId: string,
  ): Promise<NetworkPermittedBranchRecord[]> {
    const list = this.permittedBranchesByLinkId.get(linkId) ?? [];
    return list.map((r) => ({ ...r }));
  }

  async createNetworkInvitation(
    input: CreateNetworkInvitationInput,
  ): Promise<CompanyNetworkInvitationRecord> {
    const record: CompanyNetworkInvitationRecord = {
      id: input.id ?? crypto.randomUUID(),
      mainCompanyId: input.mainCompanyId,
      inviteeEmail: input.inviteeEmail.trim().toLowerCase(),
      localCompanyName: input.localCompanyName.trim(),
      contactName: input.contactName?.trim() || undefined,
      contactPhone: input.contactPhone?.trim() || undefined,
      logoUrl: input.logoUrl ?? null,
      tokenHash: input.tokenHash,
      status: "pending",
      invitedByUserId: input.invitedByUserId,
      expiresAt: input.expiresAt,
      acceptedAt: null,
      createdAt: new Date(),
    };

    this.networkInvitationsById.set(record.id, record);
    this.networkInvitationIdByTokenHash.set(record.tokenHash, record.id);
    this.saveToDisk();
    return { ...record };
  }

  async findNetworkInvitationById(
    invitationId: string,
  ): Promise<CompanyNetworkInvitationRecord | null> {
    const inv = this.networkInvitationsById.get(invitationId);
    return inv ? { ...inv } : null;
  }

  async findNetworkInvitationByTokenHash(
    tokenHash: string,
  ): Promise<CompanyNetworkInvitationRecord | null> {
    const id = this.networkInvitationIdByTokenHash.get(tokenHash);
    if (!id) return null;
    const inv = this.networkInvitationsById.get(id);
    return inv ? { ...inv } : null;
  }

  async listNetworkInvitationsForMain(
    mainCompanyId: string,
  ): Promise<CompanyNetworkInvitationRecord[]> {
    const list: CompanyNetworkInvitationRecord[] = [];
    for (const inv of this.networkInvitationsById.values()) {
      if (inv.mainCompanyId === mainCompanyId) {
        list.push({ ...inv });
      }
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateNetworkInvitationStatus(
    invitationId: string,
    status: NetworkInvitationStatus,
    acceptedAt?: Date,
  ): Promise<CompanyNetworkInvitationRecord | null> {
    const inv = this.networkInvitationsById.get(invitationId);
    if (!inv) return null;
    inv.status = status;
    if (acceptedAt) inv.acceptedAt = acceptedAt;
    this.saveToDisk();
    return { ...inv };
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

  async listAuditLogs(
    companyId: string,
    filter?: {
      entityType?: string;
      entityId?: string;
      actorUserId?: string;
      limit?: number;
    },
  ): Promise<AuditLogRecord[]> {
    const limit = Math.min(Math.max(Number(filter?.limit ?? 100), 1), 300);
    return this.auditLogs
      .filter((a) => {
        if (a.companyId !== companyId) return false;
        if (filter?.entityType && a.entityType !== filter.entityType) return false;
        if (filter?.entityId && a.entityId !== filter.entityId) return false;
        if (filter?.actorUserId && a.actorUserId !== filter.actorUserId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((a) => {
        const user = a.actorUserId ? this.usersById.get(a.actorUserId) : null;
        return {
          ...a,
          actorName: user ? user.fullName || user.email : null,
          actorEmail: user?.email ?? null,
        };
      });
  }

  // --- Phase 5: Vehicle Variants ---
  async createVehicleVariant(
    input: CreateVehicleVariantInput,
  ): Promise<VehicleVariantRecord> {
    const record: VehicleVariantRecord = {
      id: input.id ?? crypto.randomUUID(),
      companyId: input.companyId,
      make: input.make.trim(),
      model: input.model.trim(),
      modelYear: input.modelYear,
      trim: input.trim?.trim() || "Standard",
      category: input.category ?? "sedan",
      transmission: input.transmission ?? "automatic",
      fuelType: input.fuelType ?? "petrol",
      seatingCapacity: input.seatingCapacity ?? 5,
      sippCode: input.sippCode?.trim() || "ICAR",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.variantsById.set(record.id, record);
    this.saveToDisk();
    return { ...record };
  }

  async findVehicleVariantById(
    variantId: string,
  ): Promise<VehicleVariantRecord | null> {
    const v = this.variantsById.get(variantId);
    return v ? { ...v } : null;
  }

  async listVehicleVariants(
    companyId: string,
    filter?: { category?: VehicleCategory; search?: string },
  ): Promise<VehicleVariantRecord[]> {
    const list: VehicleVariantRecord[] = [];
    const search = filter?.search?.toLowerCase().trim();
    for (const v of this.variantsById.values()) {
      if (v.companyId !== companyId) continue;
      if (filter?.category && v.category !== filter.category) continue;
      if (search) {
        const match =
          v.make.toLowerCase().includes(search) ||
          v.model.toLowerCase().includes(search) ||
          v.trim.toLowerCase().includes(search) ||
          v.sippCode.toLowerCase().includes(search);
        if (!match) continue;
      }
      list.push({ ...v });
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateVehicleVariant(
    variantId: string,
    input: UpdateVehicleVariantInput,
  ): Promise<VehicleVariantRecord | null> {
    const v = this.variantsById.get(variantId);
    if (!v) return null;
    if (input.make !== undefined) v.make = input.make.trim();
    if (input.model !== undefined) v.model = input.model.trim();
    if (input.modelYear !== undefined) v.modelYear = input.modelYear;
    if (input.trim !== undefined) v.trim = input.trim.trim();
    if (input.category !== undefined) v.category = input.category;
    if (input.transmission !== undefined) v.transmission = input.transmission;
    if (input.fuelType !== undefined) v.fuelType = input.fuelType;
    if (input.seatingCapacity !== undefined) v.seatingCapacity = input.seatingCapacity;
    if (input.sippCode !== undefined) v.sippCode = input.sippCode.trim();
    if (input.status !== undefined) v.status = input.status;
    v.updatedAt = new Date();
    this.saveToDisk();
    return { ...v };
  }

  async deleteVehicleVariant(variantId: string): Promise<boolean> {
    const v = this.variantsById.get(variantId);
    if (!v) return false;
    v.status = "archived";
    v.updatedAt = new Date();
    this.saveToDisk();
    return true;
  }

  // --- Phase 5: Vendors Directory ---
  async createVendor(input: CreateVendorInput): Promise<VendorRecord> {
    const record: VendorRecord = {
      id: input.id ?? crypto.randomUUID(),
      companyId: input.companyId,
      name: input.name.trim(),
      legalName: input.legalName?.trim() || null,
      category: input.category ?? "dealership",
      contactPerson: input.contactPerson.trim(),
      phone: input.phone.trim(),
      email: input.email ? input.email.trim().toLowerCase() : null,
      countryCode: input.countryCode.trim().toUpperCase(),
      city: input.city.trim(),
      address: input.address?.trim() || null,
      taxNumber: input.taxNumber?.trim() || null,
      commercialRegister: input.commercialRegister?.trim() || null,
      bankName: input.bankName?.trim() || null,
      iban: input.iban?.trim() || null,
      paymentTermsDays: input.paymentTermsDays ?? 30,
      paymentTermsType: input.paymentTermsType ?? (input.paymentTermsDays === 0 ? "cash" : "net_terms"),
      paymentTermsConfig: input.paymentTermsConfig ? input.paymentTermsConfig.trim() : null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.vendorsById.set(record.id, record);
    this.saveToDisk();
    return { ...record };
  }

  async findVendorById(vendorId: string): Promise<VendorRecord | null> {
    const vd = this.vendorsById.get(vendorId);
    return vd ? { ...vd } : null;
  }

  async listVendors(
    companyId: string,
    filter?: { category?: VendorCategory; search?: string },
  ): Promise<VendorRecord[]> {
    const list: VendorRecord[] = [];
    const search = filter?.search?.toLowerCase().trim();
    for (const vd of this.vendorsById.values()) {
      if (vd.companyId !== companyId) continue;
      if (filter?.category && vd.category !== filter.category) continue;
      if (search) {
        const match =
          vd.name.toLowerCase().includes(search) ||
          (vd.legalName && vd.legalName.toLowerCase().includes(search)) ||
          vd.contactPerson.toLowerCase().includes(search) ||
          vd.phone.toLowerCase().includes(search);
        if (!match) continue;
      }
      list.push({ ...vd });
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateVendor(
    vendorId: string,
    input: UpdateVendorInput,
  ): Promise<VendorRecord | null> {
    const vd = this.vendorsById.get(vendorId);
    if (!vd) return null;
    if (input.name !== undefined) vd.name = input.name.trim();
    if (input.legalName !== undefined) vd.legalName = input.legalName ? input.legalName.trim() : null;
    if (input.category !== undefined) vd.category = input.category;
    if (input.contactPerson !== undefined) vd.contactPerson = input.contactPerson.trim();
    if (input.phone !== undefined) vd.phone = input.phone.trim();
    if (input.email !== undefined) vd.email = input.email ? input.email.trim().toLowerCase() : null;
    if (input.countryCode !== undefined) vd.countryCode = input.countryCode.trim().toUpperCase();
    if (input.city !== undefined) vd.city = input.city.trim();
    if (input.address !== undefined) vd.address = input.address ? input.address.trim() : null;
    if (input.taxNumber !== undefined) vd.taxNumber = input.taxNumber ? input.taxNumber.trim() : null;
    if (input.commercialRegister !== undefined) vd.commercialRegister = input.commercialRegister ? input.commercialRegister.trim() : null;
    if (input.bankName !== undefined) vd.bankName = input.bankName ? input.bankName.trim() : null;
    if (input.iban !== undefined) vd.iban = input.iban ? input.iban.trim() : null;
    if (input.paymentTermsDays !== undefined) vd.paymentTermsDays = input.paymentTermsDays;
    if (input.paymentTermsType !== undefined) vd.paymentTermsType = input.paymentTermsType;
    if (input.paymentTermsConfig !== undefined) vd.paymentTermsConfig = input.paymentTermsConfig ? input.paymentTermsConfig.trim() : null;
    if (input.status !== undefined) vd.status = input.status;
    vd.updatedAt = new Date();
    this.saveToDisk();
    return { ...vd };
  }

  // --- Phase 5: Purchase Orders (PO) ---
  async createPurchaseOrder(
    input: CreatePurchaseOrderInput,
  ): Promise<PurchaseOrderRecord> {
    const totalAmount =
      input.totalAmount ??
      input.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const upfrontPaid = input.upfrontPaid ?? 0;
    const remainingAmount = Math.max(0, totalAmount - upfrontPaid);

    const year = (input.orderDate || new Date().toISOString()).slice(0, 4);
    const prefix = `PO-${year}-`;
    const highest = Array.from(this.purchaseOrdersById.values())
      .filter(po => po.companyId === input.companyId && new RegExp(`^PO-${year}-[0-9]+$`).test(po.poNumber))
      .reduce((max, po) => Math.max(max, Number(po.poNumber.slice(prefix.length))), 0);
    const poNumber = prefix + String(highest + 1).padStart(4, "0");

    const poRecord: PurchaseOrderRecord = {
      id: input.id ?? crypto.randomUUID(),
      companyId: input.companyId,
      branchId: input.branchId ?? null,
      vendorId: input.vendorId,
      poNumber,
      status: "draft",
      orderDate: input.orderDate ?? new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: input.expectedDeliveryDate ?? null,
      currency: input.currency ?? "EGP",
      totalAmount,
      upfrontPaid,
      remainingAmount,
      installmentsCount: input.installmentsCount ?? 1,
      notes: input.notes?.trim() || null,
      createdByUserId: input.createdByUserId ?? null,
      approvedByUserId: null,
      approvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const items: PurchaseOrderItemRecord[] = input.items.map((it) => ({
      id: crypto.randomUUID(),
      purchaseOrderId: poRecord.id,
      variantId: it.variantId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      receivedCount: 0,
      notes: it.notes?.trim() || null,
      createdAt: new Date(),
    }));

    this.purchaseOrdersById.set(poRecord.id, poRecord);
    this.purchaseOrderItemsByPoId.set(poRecord.id, items);
    this.saveToDisk();

    return {
      ...poRecord,
      items: items.map((i) => ({ ...i })),
      vendorName: this.vendorsById.get(poRecord.vendorId)?.name,
      branchName: poRecord.branchId ? this.branchesById.get(poRecord.branchId)?.name : undefined,
    };
  }

  async findPurchaseOrderById(poId: string): Promise<PurchaseOrderRecord | null> {
    const po = this.purchaseOrdersById.get(poId);
    if (!po) return null;
    const items = (this.purchaseOrderItemsByPoId.get(poId) ?? []).map((i) => ({
      ...i,
    }));
    return {
      ...po,
      items,
      vendorName: this.vendorsById.get(po.vendorId)?.name,
      branchName: po.branchId ? this.branchesById.get(po.branchId)?.name : undefined,
    };
  }

  async listPurchaseOrders(
    companyId: string,
    filter?: {
      branchId?: string;
      vendorId?: string;
      status?: PurchaseOrderStatus;
    },
  ): Promise<PurchaseOrderRecord[]> {
    const list: PurchaseOrderRecord[] = [];
    for (const po of this.purchaseOrdersById.values()) {
      if (po.companyId !== companyId) continue;
      if (filter?.branchId && po.branchId !== filter.branchId) continue;
      if (filter?.vendorId && po.vendorId !== filter.vendorId) continue;
      if (filter?.status && po.status !== filter.status) continue;
      const items = (this.purchaseOrderItemsByPoId.get(po.id) ?? []).map((i) => ({
        ...i,
      }));
      list.push({
        ...po,
        items,
        vendorName: this.vendorsById.get(po.vendorId)?.name,
        branchName: po.branchId ? this.branchesById.get(po.branchId)?.name : undefined,
      });
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updatePurchaseOrderStatus(
    poId: string,
    status: PurchaseOrderStatus,
    approvedByUserId?: string,
  ): Promise<PurchaseOrderRecord | null> {
    const po = this.purchaseOrdersById.get(poId);
    if (!po) return null;
    po.status = status;
    if (status === "approved") {
      po.approvedByUserId = approvedByUserId ?? null;
      po.approvedAt = new Date();
    }
    po.updatedAt = new Date();
    this.saveToDisk();
    return this.findPurchaseOrderById(poId);
  }

  async receiveVehicleFromPo(
    input: ReceiveVehicleFromPoInput,
  ): Promise<{ vehicle: FleetVehicleRecord; po: PurchaseOrderRecord }> {
    const po = this.purchaseOrdersById.get(input.purchaseOrderId);
    if (!po) throw new Error("Purchase order not found");
    const items = this.purchaseOrderItemsByPoId.get(input.purchaseOrderId) ?? [];
    const item = items.find((it) => it.id === input.itemId);
    if (!item) throw new Error("Purchase order line item not found");
    if (item.receivedCount >= item.quantity) {
      throw new Error("All vehicles for this purchase line have already been received");
    }

    // Create the vehicle asset
    const vehicle = await this.createFleetVehicle({
      companyId: po.companyId,
      branchId: input.branchId ?? po.branchId ?? "",
      variantId: item.variantId,
      purchaseOrderId: po.id,
      vin: input.vin,
      licensePlate: input.licensePlate,
      keyNumber: input.keyNumber,
      color: input.color,
      mileageOdometer: input.mileageOdometer ?? 0,
      isBookable: Boolean(input.isBookable),
      notes: input.notes,
      photoUrl: input.photoUrl,
      locationType: input.locationType,
      fuelPolicy: input.fuelPolicy,
      instantConfirmation: input.instantConfirmation,
      description: input.description,
      deliveryPolicy: input.deliveryPolicy,
      dailyRate1to2: input.dailyRate1to2,
      dailyRate3to7: input.dailyRate3to7,
      dailyRate8Plus: input.dailyRate8Plus,
      damageExcess: input.damageExcess,
      mileagePolicy: input.mileagePolicy,
      dailyKmLimit: input.dailyKmLimit,
      extraKmRate: input.extraKmRate,
      inclusions: input.inclusions,
      seats: input.seats,
      doors: input.doors,
      airConditioning: input.airConditioning,
      fuelType: input.fuelType,
      luggageCapacity: input.luggageCapacity,
      transmission: input.transmission,
      status: "available",
    });

    item.receivedCount += 1;

    // Check if entire PO is completed
    const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
    const totalRcv = items.reduce((sum, it) => sum + it.receivedCount, 0);
    if (totalRcv >= totalQty) {
      po.status = "completed";
    } else {
      po.status = "partially_received";
    }
    po.updatedAt = new Date();
    this.saveToDisk();

    const fullPo = await this.findPurchaseOrderById(po.id);
    return { vehicle, po: fullPo! };
  }

  // --- Phase 5: Fleet Vehicles Asset Register ---
  async createFleetVehicle(
    input: CreateFleetVehicleInput,
  ): Promise<FleetVehicleRecord> {
    const vin = input.vin.trim().toUpperCase();
    const licensePlate = input.licensePlate.trim().toUpperCase();

    // Check duplicate VIN in company
    for (const existing of this.vehiclesById.values()) {
      if (existing.companyId === input.companyId) {
        if (existing.vin.toUpperCase() === vin) {
          throw new Error("VIN/Chassis already registered in company");
        }
        if (existing.licensePlate.toUpperCase() === licensePlate) {
          throw new Error("License plate already registered in company");
        }
      }
    }

    let maxSeq = 0;
    for (const existing of this.vehiclesById.values()) {
      if (existing.companyId === input.companyId && existing.assetCode) {
        const m = /^(?:VEH-)?(\d+)$/.exec(existing.assetCode);
        if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
      }
    }

    const record: FleetVehicleRecord = {
      id: input.id ?? crypto.randomUUID(),
      assetCode: input.assetCode?.trim() || String(maxSeq + 1).padStart(4, "0"),
      companyId: input.companyId,
      branchId: input.branchId,
      variantId: input.variantId,
      purchaseOrderId: input.purchaseOrderId ?? null,
      vin,
      licensePlate,
      keyNumber: input.keyNumber?.trim() || null,
      color: input.color.trim(),
      mileageOdometer: input.mileageOdometer ?? 0,
      isBookable: Boolean(input.isBookable),
      publishedToFleetAt: input.isBookable ? new Date() : null,
      status: input.status ?? "available",
      notes: input.notes?.trim() || null,
      photoUrl: input.photoUrl?.trim() || null,
      locationType: input.locationType || "airport_terminal",
      fuelPolicy: input.fuelPolicy || "full_to_full",
      instantConfirmation: Boolean(input.instantConfirmation),
      description: input.description?.trim() || null,
      deliveryPolicy: input.deliveryPolicy?.trim() || null,
      dailyRate1to2: Number(input.dailyRate1to2) || 0,
      dailyRate3to7: Number(input.dailyRate3to7) || 0,
      dailyRate8Plus: Number(input.dailyRate8Plus) || 0,
      damageExcess: Number(input.damageExcess) || 0,
      mileagePolicy: input.mileagePolicy || "unlimited",
      dailyKmLimit: Number(input.dailyKmLimit) || 0,
      extraKmRate: Number(input.extraKmRate) || 0,
      inclusions: input.inclusions || [],
      seats: Number(input.seats) || 5,
      doors: Number(input.doors) || 4,
      airConditioning: input.airConditioning ?? true,
      fuelType: input.fuelType || "petrol",
      luggageCapacity: input.luggageCapacity || "2 Bags",
      transmission: input.transmission || "automatic",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.vehiclesById.set(record.id, record);
    this.saveToDisk();

    const variant = this.variantsById.get(record.variantId);
    const branch = record.branchId ? this.branchesById.get(record.branchId) : undefined;
    return {
      ...record,
      variant: variant ? { ...variant } : undefined,
      branchName: branch?.name,
    };
  }

  async findFleetVehicleById(
    vehicleId: string,
  ): Promise<FleetVehicleRecord | null> {
    const v = this.vehiclesById.get(vehicleId);
    if (!v) return null;
    const variant = this.variantsById.get(v.variantId);
    const branch = v.branchId ? this.branchesById.get(v.branchId) : undefined;
    const company = this.companiesById.get(v.companyId);
    return {
      ...v,
      variant: variant ? { ...variant } : undefined,
      branchName: branch?.name,
      companyName: company?.name,
    };
  }

  async findFleetVehicleByVin(
    companyId: string,
    vin: string,
  ): Promise<FleetVehicleRecord | null> {
    const upper = vin.trim().toUpperCase();
    for (const v of this.vehiclesById.values()) {
      if (v.companyId === companyId && v.vin.toUpperCase() === upper) {
        return this.findFleetVehicleById(v.id);
      }
    }
    return null;
  }

  async findFleetVehicleByLicensePlate(
    companyId: string,
    licensePlate: string,
  ): Promise<FleetVehicleRecord | null> {
    const upper = licensePlate.trim().toUpperCase();
    for (const v of this.vehiclesById.values()) {
      if (v.companyId === companyId && v.licensePlate.toUpperCase() === upper) {
        return this.findFleetVehicleById(v.id);
      }
    }
    return null;
  }

  async listFleetVehicles(
    companyId: string,
    filter?: FleetVehicleFilterOptions,
    permittedBranchIds?: string[],
  ): Promise<FleetVehicleRecord[]> {
    const list: FleetVehicleRecord[] = [];
    const search = filter?.search?.toLowerCase().trim();

    // 1. Direct company vehicles
    for (const v of this.vehiclesById.values()) {
      if (v.companyId !== companyId) continue;
      if (permittedBranchIds && (!v.branchId || !permittedBranchIds.includes(v.branchId))) continue;
      if (filter?.branchId && v.branchId !== filter.branchId) continue;
      if (filter?.status && v.status !== filter.status) continue;
      if (filter?.variantId && v.variantId !== filter.variantId) continue;

      const variant = this.variantsById.get(v.variantId);
      if (search) {
        const match =
          v.vin.toLowerCase().includes(search) ||
          v.licensePlate.toLowerCase().includes(search) ||
          v.color.toLowerCase().includes(search) ||
          (variant &&
            (variant.make.toLowerCase().includes(search) ||
              variant.model.toLowerCase().includes(search)));
        if (!match) continue;
      }

      const branch = v.branchId ? this.branchesById.get(v.branchId) : undefined;
      list.push({
        ...v,
        variant: variant ? { ...variant } : undefined,
        branchName: branch?.name,
        isPartnerVehicle: false,
      });
    }

    // 2. Network partner vehicles if requested and permitted
    if (filter?.includeNetwork) {
      const company = this.companiesById.get(companyId);
      if (company && company.operatingMode === "network_main") {
        for (const link of this.networkLinksById.values()) {
          if (link.mainCompanyId === companyId && link.status === "active") {
            const permittedBranches = this.permittedBranchesByLinkId.get(link.id) ?? [];
            const permittedPartnerBranchIds = new Set(permittedBranches.map((pb) => pb.branchId));
            const partnerCompany = this.companiesById.get(link.localCompanyId);

            for (const v of this.vehiclesById.values()) {
              if (v.companyId !== link.localCompanyId) continue;
              if (!v.branchId || !permittedPartnerBranchIds.has(v.branchId)) continue;
              if (filter?.status && v.status !== filter.status) continue;

              const variant = this.variantsById.get(v.variantId);
              if (search) {
                const match =
                  v.vin.toLowerCase().includes(search) ||
                  v.licensePlate.toLowerCase().includes(search) ||
                  (variant &&
                    (variant.make.toLowerCase().includes(search) ||
                      variant.model.toLowerCase().includes(search)));
                if (!match) continue;
              }

              const branch = v.branchId ? this.branchesById.get(v.branchId) : undefined;
              list.push({
                ...v,
                variant: variant ? { ...variant } : undefined,
                branchName: branch?.name,
                companyName: partnerCompany?.name,
                isPartnerVehicle: true,
              });
            }
          }
        }
      }
    }

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateFleetVehicle(
    vehicleId: string,
    input: UpdateFleetVehicleInput,
  ): Promise<FleetVehicleRecord | null> {
    const v = this.vehiclesById.get(vehicleId);
    if (!v) return null;
    if (input.branchId !== undefined) v.branchId = input.branchId;
    if (input.keyNumber !== undefined) v.keyNumber = input.keyNumber ? input.keyNumber.trim() : null;
    if (input.color !== undefined) v.color = input.color.trim();
    if (input.mileageOdometer !== undefined) v.mileageOdometer = input.mileageOdometer;
    if (input.status !== undefined) v.status = input.status;
    if (input.notes !== undefined) v.notes = input.notes ? input.notes.trim() : null;
    if (input.photoUrl !== undefined) v.photoUrl = input.photoUrl ? input.photoUrl.trim() : null;
    if (input.locationType !== undefined) v.locationType = input.locationType;
    if (input.fuelPolicy !== undefined) v.fuelPolicy = input.fuelPolicy;
    if (input.instantConfirmation !== undefined) v.instantConfirmation = input.instantConfirmation;
    if (input.description !== undefined) v.description = input.description ? input.description.trim() : null;
    if (input.deliveryPolicy !== undefined) v.deliveryPolicy = input.deliveryPolicy ? input.deliveryPolicy.trim() : null;
    if (input.dailyRate1to2 !== undefined) v.dailyRate1to2 = Number(input.dailyRate1to2);
    if (input.dailyRate3to7 !== undefined) v.dailyRate3to7 = Number(input.dailyRate3to7);
    if (input.dailyRate8Plus !== undefined) v.dailyRate8Plus = Number(input.dailyRate8Plus);
    if (input.damageExcess !== undefined) v.damageExcess = Number(input.damageExcess);
    if (input.mileagePolicy !== undefined) v.mileagePolicy = input.mileagePolicy;
    if (input.dailyKmLimit !== undefined) v.dailyKmLimit = Number(input.dailyKmLimit);
    if (input.extraKmRate !== undefined) v.extraKmRate = Number(input.extraKmRate);
    if (input.inclusions !== undefined) v.inclusions = input.inclusions;
    if (input.seats !== undefined) v.seats = Number(input.seats);
    if (input.doors !== undefined) v.doors = Number(input.doors);
    if (input.airConditioning !== undefined) v.airConditioning = input.airConditioning;
    if (input.fuelType !== undefined) v.fuelType = input.fuelType;
    if (input.luggageCapacity !== undefined) v.luggageCapacity = input.luggageCapacity;
    if (input.transmission !== undefined) v.transmission = input.transmission;
    v.updatedAt = new Date();
    this.saveToDisk();
    return this.findFleetVehicleById(vehicleId);
  }

  async updateFleetVehicleStatus(
    vehicleId: string,
    status: FleetVehicleStatus,
  ): Promise<FleetVehicleRecord | null> {
    const v = this.vehiclesById.get(vehicleId);
    if (!v) return null;
    v.status = status;
    v.updatedAt = new Date();
    this.saveToDisk();
    return this.findFleetVehicleById(vehicleId);
  }

  // --- Vehicle Photos Library ---
  async createVehiclePhoto(
    input: CreateVehiclePhotoInput,
  ): Promise<VehiclePhotoRecord> {
    const record: VehiclePhotoRecord = {
      id: input.id ?? crypto.randomUUID(),
      companyId: input.companyId,
      vehicleName: input.vehicleName.trim(),
      photoUrl: input.photoUrl.trim(),
      category: input.category?.trim() || "General",
      createdAt: new Date(),
    };
    this.vehiclePhotosById.set(record.id, record);
    this.saveToDisk();
    return { ...record };
  }

  async listVehiclePhotos(
    companyId: string,
    search?: string,
  ): Promise<VehiclePhotoRecord[]> {
    const list: VehiclePhotoRecord[] = [];
    const q = search?.toLowerCase().trim();
    for (const p of this.vehiclePhotosById.values()) {
      if (p.companyId !== companyId && p.companyId !== "global") continue;
      if (
        q &&
        !p.vehicleName.toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q)
      ) {
        continue;
      }
      list.push({ ...p });
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getVehiclePhotoById(id: string): Promise<VehiclePhotoRecord | null> {
    const record = this.vehiclePhotosById.get(id);
    return record ? { ...record } : null;
  }

  async updateVehiclePhoto(
    id: string,
    input: { vehicleName?: string; photoUrl?: string; category?: string },
  ): Promise<VehiclePhotoRecord | null> {
    const existing = this.vehiclePhotosById.get(id);
    if (!existing) return null;
    const updated: VehiclePhotoRecord = {
      ...existing,
      vehicleName:
        input.vehicleName !== undefined ? input.vehicleName.trim() : existing.vehicleName,
      photoUrl: input.photoUrl !== undefined ? input.photoUrl.trim() : existing.photoUrl,
      category:
        input.category !== undefined ? input.category.trim() || "General" : existing.category,
    };
    this.vehiclePhotosById.set(id, updated);
    this.saveToDisk();
    return { ...updated };
  }

  async deleteVehiclePhoto(id: string): Promise<boolean> {
    const exists = this.vehiclePhotosById.has(id);
    if (exists) {
      this.vehiclePhotosById.delete(id);
      this.saveToDisk();
    }
    return exists;
  }

  // --- Rental Inclusions (What is Included) ---
  async createRentalInclusion(
    input: CreateRentalInclusionInput,
  ): Promise<RentalInclusionRecord> {
    const record: RentalInclusionRecord = {
      id: input.id ?? crypto.randomUUID(),
      companyId: input.companyId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isActive: input.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rentalInclusionsById.set(record.id, record);
    this.saveToDisk();
    return { ...record };
  }

  async getRentalInclusionById(id: string): Promise<RentalInclusionRecord | null> {
    const record = this.rentalInclusionsById.get(id);
    return record ? { ...record } : null;
  }

  async listRentalInclusions(
    companyId: string,
    search?: string,
    activeOnly?: boolean,
  ): Promise<RentalInclusionRecord[]> {
    const list: RentalInclusionRecord[] = [];
    const q = search?.toLowerCase().trim();
    for (const item of this.rentalInclusionsById.values()) {
      if (item.companyId !== companyId && item.companyId !== "global") continue;
      if (activeOnly && !item.isActive) continue;
      if (q && !item.name.toLowerCase().includes(q) && !(item.description && item.description.toLowerCase().includes(q))) {
        continue;
      }
      list.push({ ...item });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateRentalInclusion(
    id: string,
    input: UpdateRentalInclusionInput,
  ): Promise<RentalInclusionRecord | null> {
    const existing = this.rentalInclusionsById.get(id);
    if (!existing) return null;
    const updated: RentalInclusionRecord = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description: input.description !== undefined ? input.description?.trim() || null : existing.description,
      isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
      updatedAt: new Date(),
    };
    this.rentalInclusionsById.set(id, updated);
    this.saveToDisk();
    return { ...updated };
  }

  async deleteRentalInclusion(id: string): Promise<boolean> {
    const exists = this.rentalInclusionsById.has(id);
    if (exists) {
      this.rentalInclusionsById.delete(id);
      this.saveToDisk();
    }
    return exists;
  }

  async signPurchaseOrder(
    poId: string,
    signatureDataUrl: string,
    signedByName: string,
  ): Promise<PurchaseOrderRecord | null> {
    const existing = this.purchaseOrdersById.get(poId);
    if (!existing || existing.signedAt || existing.signatureDataUrl) return null;
    const updated: PurchaseOrderRecord = {
      ...existing,
      signatureDataUrl,
      signedByName,
      signedAt: new Date(),
      updatedAt: new Date(),
    };
    this.purchaseOrdersById.set(poId, updated);
    this.saveToDisk();
    return updated;
  }

  private vehicleMakesById = new Map<
    string,
    {
      id: string;
      companyId: string;
      name: string;
      models: Array<{ id: string; makeId: string; name: string }>;
    }
  >();

  async listVehicleMakes(companyId: string) {
    return Array.from(this.vehicleMakesById.values())
      .filter((m) => m.companyId === companyId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createVehicleMake(companyId: string, name: string) {
    const clean = name.trim();
    const existing = Array.from(this.vehicleMakesById.values()).find(
      (m) => m.companyId === companyId && m.name.toLowerCase() === clean.toLowerCase(),
    );
    if (existing) return existing;
    const created = {
      id: crypto.randomUUID(),
      companyId,
      name: clean,
      models: [] as Array<{ id: string; makeId: string; name: string }>,
    };
    this.vehicleMakesById.set(created.id, created);
    return created;
  }

  async createVehicleModel(companyId: string, makeId: string, name: string) {
    const clean = name.trim();
    const make = this.vehicleMakesById.get(makeId);
    if (!make || make.companyId !== companyId) {
      throw new Error("Vehicle make not found");
    }
    const existing = make.models.find(
      (m) => m.name.toLowerCase() === clean.toLowerCase(),
    );
    if (existing) return existing;
    const created = { id: crypto.randomUUID(), makeId, name: clean };
    make.models.push(created);
    return created;
  }

  private insuranceCompaniesById = new Map<string, any>();
  private vehiclePoliciesByVehicleId = new Map<string, any[]>();
  private vehicleOdometerByVehicleId = new Map<string, any[]>();
  private vehicleMaintByVehicleId = new Map<string, any[]>();
  private vehicleInspectionsByVehicleId = new Map<string, any[]>();

  async listInsuranceCompanies(companyId: string) {
    return Array.from(this.insuranceCompaniesById.values()).filter(
      (c) => c.companyId === companyId,
    );
  }

  async listInsurancePoliciesByInsuranceCompany(
    companyId: string,
    insuranceCompanyId: string,
  ) {
    const insCompany = this.insuranceCompaniesById.get(insuranceCompanyId);
    const targetName = insCompany?.name?.trim().toLowerCase() ?? "";
    const out: Array<{
      id: string;
      vehicleId: string;
      vehicleTitle: string;
      licensePlate: string;
      vin: string;
      branchName: string | null;
      providerName: string;
      policyNumber: string;
      coverageType: string;
      premiumAmount: number;
      deductibleAmount: number;
      startDate: string;
      expiryDate: string;
      status: string;
    }> = [];
    for (const [vehicleId, policies] of this.vehiclePoliciesByVehicleId.entries()) {
      const vh = this.vehiclesById.get(vehicleId);
      if (!vh || vh.companyId !== companyId) continue;
      const variant = this.variantsById.get(vh.variantId);
      const branch = vh.branchId ? this.branchesById.get(vh.branchId) : null;
      const vehicleTitle = variant
        ? `${variant.make} ${variant.model}${variant.trim ? ` ${variant.trim}` : ""} ${variant.modelYear}`
        : vh.licensePlate;
      for (const p of policies) {
        if (
          p.insuranceCompanyId === insuranceCompanyId ||
          (targetName && String(p.providerName || "").trim().toLowerCase() === targetName)
        ) {
          out.push({
            id: p.id,
            vehicleId,
            vehicleTitle,
            licensePlate: vh.licensePlate,
            vin: vh.vin,
            branchName: branch?.name ?? null,
            providerName: p.providerName,
            policyNumber: p.policyNumber,
            coverageType: p.coverageType,
            premiumAmount: Number(p.premiumAmount) || 0,
            deductibleAmount: Number(p.deductibleAmount) || 0,
            startDate: p.startDate,
            expiryDate: p.expiryDate,
            status: p.status || "active",
          });
        }
      }
    }
    return out;
  }

  async createInsuranceCompany(input: any) {
    const created = {
      id: crypto.randomUUID(),
      companyId: input.companyId,
      name: input.name,
      contactPerson: input.contactPerson ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      createdAt: new Date(),
    };
    this.insuranceCompaniesById.set(created.id, created);
    return created;
  }

  async deleteInsuranceCompany(_companyId: string, id: string) {
    return this.insuranceCompaniesById.delete(id);
  }

  async getVehicleLifecycleProfile(_companyId: string, vehicleId: string) {
    const inspections = this.vehicleInspectionsByVehicleId.get(vehicleId) ?? [];
    return {
      insurancePolicies: this.vehiclePoliciesByVehicleId.get(vehicleId) ?? [],
      odometerLogs: this.vehicleOdometerByVehicleId.get(vehicleId) ?? [],
      maintenanceLogs: this.vehicleMaintByVehicleId.get(vehicleId) ?? [],
      inspections,
      damagePoints: inspections.flatMap((i: any) => i.damagePoints ?? []),
    };
  }

  async upsertVehicleInsurancePolicy(input: any) {
    const created = { ...input, id: crypto.randomUUID(), status: "active", createdAt: new Date() };
    const list = this.vehiclePoliciesByVehicleId.get(input.vehicleId) ?? [];
    this.vehiclePoliciesByVehicleId.set(input.vehicleId, [created, ...list]);
    return created;
  }

  async updateVehiclePricingTiers(_companyId: string, vehicleId: string, input: any) {
    const v = await this.findFleetVehicleById(vehicleId);
    if (!v) return null;
    return { ...v, ...input, updatedAt: new Date() };
  }

  async addVehicleMaintenanceLog(input: any) {
    const created = { ...input, id: crypto.randomUUID(), createdAt: new Date() };
    const list = this.vehicleMaintByVehicleId.get(input.vehicleId) ?? [];
    this.vehicleMaintByVehicleId.set(input.vehicleId, [created, ...list]);
    return created;
  }

  async addVehicleInspection(input: any) {
    const inspId = crypto.randomUUID();
    const damagePoints = (input.damagePoints ?? []).map((dp: any) => ({
      ...dp,
      id: crypto.randomUUID(),
      inspectionId: inspId,
      vehicleId: input.vehicleId,
      repairCost: dp.repairCost ?? 0,
      isResolved: false,
      createdAt: new Date(),
    }));
    const created = { ...input, id: inspId, inspectedAt: new Date(), damagePoints };
    const list = this.vehicleInspectionsByVehicleId.get(input.vehicleId) ?? [];
    this.vehicleInspectionsByVehicleId.set(input.vehicleId, [created, ...list]);
    return created;
  }

  private customersById = new Map<string, any>();
  private contractsById = new Map<string, any>();

  async toggleFleetVehicleBookable(companyId: string, vehicleId: string, isBookable: boolean) {
    const v = this.vehiclesById.get(vehicleId);
    if (!v || v.companyId !== companyId) return null;
    v.isBookable = isBookable;
    v.publishedToFleetAt = isBookable ? new Date() : null;
    v.updatedAt = new Date();
    return this.findFleetVehicleById(vehicleId);
  }

  async listCustomers(companyId: string) {
    return Array.from(this.customersById.values()).filter((c) => c.companyId === companyId);
  }

  async createCustomer(input: any) {
    let maxSeq = 0;
    for (const c of this.customersById.values()) {
      if (c.companyId === input.companyId && c.customerCode) {
        const m = /^(?:CUS-)?(\d+)$/.exec(c.customerCode);
        if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
      }
    }
    const rec = {
      ...input,
      id: crypto.randomUUID(),
      customerCode: String(maxSeq + 1).padStart(4, "0"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.customersById.set(rec.id, rec);
    return rec;
  }

  async updateCustomer(companyId: string, customerId: string, input: any) {
    const existing = this.customersById.get(customerId);
    if (!existing || existing.companyId !== companyId) return null;
    const updated = { ...existing, ...input, updatedAt: new Date() };
    this.customersById.set(customerId, updated);
    return updated;
  }

  async deleteCustomer(companyId: string, customerId: string) {
    const existing = this.customersById.get(customerId);
    if (!existing || existing.companyId !== companyId) return false;
    return this.customersById.delete(customerId);
  }

  async listRentalContracts(companyId: string) {
    return Array.from(this.contractsById.values()).filter((c) => c.companyId === companyId);
  }

  async createRentalContract(input: any) {
    const rec = {
      ...input,
      id: crypto.randomUUID(),
      contractNumber: `RC-${String(this.contractsById.size + 1).padStart(4, "0")}`,
      status: "active",
      returnOdometer: null,
      discount: input.discount ?? 0,
      insuranceFee: input.insuranceFee ?? 0,
      extraCharges: input.extraCharges ?? 0,
      paidAmount: input.paidAmount ?? 0,
      depositAmount: input.depositAmount ?? 0,
      customerSignatureDataUrl: input.customerSignatureDataUrl ?? null,
      signedAt: input.customerSignatureDataUrl ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contractsById.set(rec.id, rec);
    return rec;
  }

  async signRentalContract(companyId: string, contractId: string, signatureDataUrl: string) {
    const existing = this.contractsById.get(contractId);
    if (!existing || existing.companyId !== companyId) return null;
    const updated = {
      ...existing,
      customerSignatureDataUrl: signatureDataUrl,
      signedAt: new Date(),
      updatedAt: new Date(),
    };
    this.contractsById.set(contractId, updated);
    return updated;
  }

  async completeRentalContract(companyId: string, contractId: string, input: any) {
    const existing = this.contractsById.get(contractId);
    if (!existing || existing.companyId !== companyId) return null;
    const updated = { ...existing, ...input, status: "completed", updatedAt: new Date() };
    this.contractsById.set(contractId, updated);
    return updated;
  }

  async cancelRentalContract(companyId: string, contractId: string) {
    const existing = this.contractsById.get(contractId);
    if (!existing || existing.companyId !== companyId) return null;
    const updated = { ...existing, status: "cancelled", updatedAt: new Date() };
    this.contractsById.set(contractId, updated);
    return updated;
  }

  async updateVariantPricingTiers(
    companyId: string,
    variantId: string,
    input: {
      dailyRate1to2: number;
      dailyRate3to7: number;
      dailyRate8Plus: number;
      damageExcess: number;
      securityDeposit?: number;
      mileagePolicy?: "unlimited" | "limited";
      dailyKmLimit?: number;
      extraKmRate?: number;
      branchIds?: string[];
      unassignedOnly?: boolean;
    },
  ) {
    let updatedCount = 0;
    const hasBranchFilter = Array.isArray(input.branchIds) && input.branchIds.length > 0;
    for (const [id, v] of this.vehiclesById.entries()) {
      const branchMatch = input.unassignedOnly
        ? !v.branchId
        : !hasBranchFilter || (Boolean(v.branchId) && input.branchIds!.includes(v.branchId!));
      if (v.companyId === companyId && v.variantId === variantId && branchMatch) {
        this.vehiclesById.set(id, {
          ...v,
          dailyRate1to2: input.dailyRate1to2,
          dailyRate3to7: input.dailyRate3to7,
          dailyRate8Plus: input.dailyRate8Plus,
          damageExcess: input.damageExcess,
          securityDeposit: input.securityDeposit ?? v.securityDeposit,
          mileagePolicy: input.mileagePolicy ?? v.mileagePolicy,
          dailyKmLimit: input.dailyKmLimit ?? v.dailyKmLimit,
          extraKmRate: input.extraKmRate ?? v.extraKmRate,
          updatedAt: new Date(),
        });
        updatedCount += 1;
      }
    }
    return { updatedCount };
  }

  async applyVariantListingSetup(
    companyId: string,
    variantId: string,
    input: {
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
      publishToFleet?: boolean;
      branchIds?: string[];
    },
  ) {
    let updatedCount = 0;
    const hasBranchFilter = Array.isArray(input.branchIds) && input.branchIds.length > 0;
    for (const [id, v] of this.vehiclesById.entries()) {
      if (
        v.companyId === companyId &&
        v.variantId === variantId &&
        (!hasBranchFilter || (v.branchId && input.branchIds!.includes(v.branchId)))
      ) {
        this.vehiclesById.set(id, {
          ...v,
          photoUrl: input.photoUrl !== undefined ? input.photoUrl : v.photoUrl,
          locationType: input.locationType ?? v.locationType,
          fuelPolicy: input.fuelPolicy ?? v.fuelPolicy,
          instantConfirmation: input.instantConfirmation ?? v.instantConfirmation,
          description: input.description !== undefined ? input.description : v.description,
          deliveryPolicy: input.deliveryPolicy !== undefined ? input.deliveryPolicy : v.deliveryPolicy,
          dailyRate1to2: input.dailyRate1to2 ?? v.dailyRate1to2,
          dailyRate3to7: input.dailyRate3to7 ?? v.dailyRate3to7,
          dailyRate8Plus: input.dailyRate8Plus ?? v.dailyRate8Plus,
          damageExcess: input.damageExcess ?? v.damageExcess,
          mileagePolicy: input.mileagePolicy ?? v.mileagePolicy,
          dailyKmLimit: input.dailyKmLimit ?? v.dailyKmLimit,
          extraKmRate: input.extraKmRate ?? v.extraKmRate,
          inclusions: input.inclusions ?? v.inclusions,
          seats: input.seats ?? v.seats,
          doors: input.doors ?? v.doors,
          airConditioning: input.airConditioning ?? v.airConditioning,
          fuelType: input.fuelType ?? v.fuelType,
          luggageCapacity: input.luggageCapacity ?? v.luggageCapacity,
          transmission: input.transmission ?? v.transmission,
          isBookable: input.publishToFleet ? true : v.isBookable,
          updatedAt: new Date(),
        });
        updatedCount += 1;
      }
    }
    return { updatedCount };
  }

  async listDrivers() { return []; }
  async createDriver(input: any) { return { ...input, id: crypto.randomUUID(), status: input.status ?? "active", createdAt: new Date(), updatedAt: new Date() }; }
  async updateDriver() { return null; }
  async deleteDriver() { return false; }
  async listVehicleMovements() { return []; }
  async dispatchVehicleMovement(input: any) { return { ...input, id: crypto.randomUUID(), movementNumber: "MV-0001", status: "in_transit", dispatchedAt: new Date(), receivedAt: null, arrivalOdometerKm: null, createdAt: new Date(), updatedAt: new Date() }; }
  async receiveVehicleMovement() { return null; }
  async cancelVehicleMovement() { return null; }

  async deleteVehicleMake(_companyId: string, _makeId: string) {
    return true;
  }

  async deleteVehicleModel(_companyId: string, _modelId: string) {
    return true;
  }

  async listVehicleColors(companyId: string): Promise<VehicleColorRecord[]> {
    return Array.from(this.vehicleColorsById.values())
      .filter((c) => c.companyId === companyId)
      .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  }

  async createVehicleColor(input: CreateVehicleColorInput): Promise<VehicleColorRecord> {
    const rec: VehicleColorRecord = {
      id: crypto.randomUUID(),
      companyId: input.companyId,
      colorType: input.colorType?.trim() || "exterior",
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      createdAt: new Date(),
    };
    this.vehicleColorsById.set(rec.id, rec);
    return { ...rec };
  }

  async deleteVehicleColor(companyId: string, colorId: string): Promise<boolean> {
    const ex = this.vehicleColorsById.get(colorId);
    if (!ex || ex.companyId !== companyId) return false;
    this.vehicleColorsById.delete(colorId);
    return true;
  }

  async listVehicleBodyStyles(companyId: string): Promise<VehicleBodyStyleRecord[]> {
    return Array.from(this.vehicleBodyStylesById.values())
      .filter((s) => s.companyId === companyId)
      .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  }

  async createVehicleBodyStyle(input: CreateVehicleBodyStyleInput): Promise<VehicleBodyStyleRecord> {
    const rec: VehicleBodyStyleRecord = {
      id: crypto.randomUUID(),
      companyId: input.companyId,
      code: input.code.trim().toLowerCase(),
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      createdAt: new Date(),
    };
    this.vehicleBodyStylesById.set(rec.id, rec);
    return { ...rec };
  }

  async deleteVehicleBodyStyle(companyId: string, styleId: string): Promise<boolean> {
    const ex = this.vehicleBodyStylesById.get(styleId);
    if (!ex || ex.companyId !== companyId) return false;
    this.vehicleBodyStylesById.delete(styleId);
    return true;
  }

  async listFleetPriceLists(companyId: string): Promise<FleetPriceListRecord[]> {
    return Array.from(this.fleetPriceListsById.values())
      .filter((p) => p.companyId === companyId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createFleetPriceList(input: CreateFleetPriceListInput): Promise<FleetPriceListRecord> {
    const now = new Date();
    const rec: FleetPriceListRecord = {
      id: crypto.randomUUID(),
      companyId: input.companyId,
      name: input.name.trim(),
      priceListType: input.priceListType?.trim() || "spot",
      currencyCode: input.currencyCode.trim().toUpperCase(),
      effectiveFrom: input.effectiveFrom || null,
      effectiveTo: input.effectiveTo || null,
      priceType: input.priceType?.trim() || "daily_bands",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.fleetPriceListsById.set(rec.id, rec);
    return { ...rec };
  }

  async updateFleetPriceList(
    companyId: string,
    priceListId: string,
    input: UpdateFleetPriceListInput,
  ): Promise<FleetPriceListRecord | null> {
    const ex = this.fleetPriceListsById.get(priceListId);
    if (!ex || ex.companyId !== companyId) return null;
    const updated: FleetPriceListRecord = {
      ...ex,
      name: input.name !== undefined ? input.name.trim() : ex.name,
      priceListType: input.priceListType !== undefined ? input.priceListType.trim() : ex.priceListType,
      currencyCode: input.currencyCode !== undefined ? input.currencyCode.trim().toUpperCase() : ex.currencyCode,
      effectiveFrom: input.effectiveFrom !== undefined ? input.effectiveFrom : ex.effectiveFrom,
      effectiveTo: input.effectiveTo !== undefined ? input.effectiveTo : ex.effectiveTo,
      priceType: input.priceType !== undefined ? input.priceType.trim() : ex.priceType,
      isActive: input.isActive !== undefined ? input.isActive : ex.isActive,
      updatedAt: new Date(),
    };
    this.fleetPriceListsById.set(priceListId, updated);
    return { ...updated };
  }

  async deleteFleetPriceList(companyId: string, priceListId: string): Promise<boolean> {
    const ex = this.fleetPriceListsById.get(priceListId);
    if (!ex || ex.companyId !== companyId) return false;
    this.fleetPriceListsById.delete(priceListId);
    return true;
  }
}
