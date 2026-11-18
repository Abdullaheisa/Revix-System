import crypto from "node:crypto";
import pg from "pg";
import type {
  ActionTokenRecord,
  ActionTokenType,
  AuditLogInput,
  AuthDataStore,
  BranchRecord,
  CompanyOperatingMode,
  CompanyRecord,
  CreateBranchInput,
  CreateCompanyInput,
  SessionRecord,
  UpdateBranchInput,
  UpdateCompanyInput,
  UserRecord,
  UserStatus,
} from "./store.ts";

interface DbUserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  email_verified_at: Date | null;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

interface DbSessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

interface DbActionTokenRow {
  id: string;
  user_id: string;
  token_type: ActionTokenType;
  token_hash: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

interface DbCompanyRow {
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

interface DbBranchRow {
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

function mapUserRow(row: DbUserRow): UserRecord {
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

function mapSessionRow(row: DbSessionRow): SessionRecord {
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

function mapActionTokenRow(row: DbActionTokenRow): ActionTokenRecord {
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

function mapCompanyRow(row: DbCompanyRow): CompanyRecord {
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

function mapBranchRow(row: DbBranchRow): BranchRecord {
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

export class PostgresAuthDataStore implements AuthDataStore {
  private readonly pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const res = await this.pool.query<DbUserRow>(
      `SELECT id, full_name, email, password_hash, email_verified_at, status, created_at, updated_at
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalized],
    );
    const row = res.rows[0];
    return row ? mapUserRow(row) : null;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    const res = await this.pool.query<DbUserRow>(
      `SELECT id, full_name, email, password_hash, email_verified_at, status, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );
    const row = res.rows[0];
    return row ? mapUserRow(row) : null;
  }

  async createUser(input: {
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const res = await this.pool.query<DbUserRow>(
      `INSERT INTO users (id, full_name, email, password_hash, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, full_name, email, password_hash, email_verified_at, status, created_at, updated_at`,
      [input.id, input.fullName.trim(), normalizedEmail, input.passwordHash],
    );
    return mapUserRow(res.rows[0]);
  }

  async markUserEmailVerified(userId: string, verifiedAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, $2),
           updated_at = $2
       WHERE id = $1`,
      [userId, verifiedAt],
    );
  }

  async updateUserPassword(
    userId: string,
    newPasswordHash: string,
    updatedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET password_hash = $2,
           updated_at = $3
       WHERE id = $1`,
      [userId, newPasswordHash, updatedAt],
    );
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET status = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [userId, status],
    );
  }

  async createSession(input: {
    id: string;
    userId: string;
    tokenHash: string;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: Date;
  }): Promise<SessionRecord> {
    const res = await this.pool.query<DbSessionRow>(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, token_hash, ip_address, user_agent, expires_at, revoked_at, created_at`,
      [
        input.id,
        input.userId,
        input.tokenHash,
        input.ipAddress,
        input.userAgent,
        input.expiresAt,
      ],
    );
    return mapSessionRow(res.rows[0]);
  }

  async findActiveSessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<SessionRecord | null> {
    const res = await this.pool.query<DbSessionRow>(
      `SELECT id, user_id, token_hash, ip_address, user_agent, expires_at, revoked_at, created_at
       FROM user_sessions
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at > $2
       LIMIT 1`,
      [tokenHash, now],
    );
    const row = res.rows[0];
    return row ? mapSessionRow(row) : null;
  }

  async revokeSessionByTokenHash(
    tokenHash: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE user_sessions
       SET revoked_at = COALESCE(revoked_at, $2)
       WHERE token_hash = $1`,
      [tokenHash, revokedAt],
    );
  }

  async revokeAllUserSessions(userId: string, revokedAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE user_sessions
       SET revoked_at = COALESCE(revoked_at, $2)
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId, revokedAt],
    );
  }

  async createActionToken(input: {
    id: string;
    userId: string;
    tokenType: ActionTokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<ActionTokenRecord> {
    const res = await this.pool.query<DbActionTokenRow>(
      `INSERT INTO auth_action_tokens (id, user_id, token_type, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, token_type, token_hash, expires_at, consumed_at, created_at`,
      [
        input.id,
        input.userId,
        input.tokenType,
        input.tokenHash,
        input.expiresAt,
      ],
    );
    return mapActionTokenRow(res.rows[0]);
  }

  async invalidateUnusedActionTokens(
    userId: string,
    tokenType: ActionTokenType,
    consumedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE auth_action_tokens
       SET consumed_at = $3
       WHERE user_id = $1
         AND token_type = $2
         AND consumed_at IS NULL`,
      [userId, tokenType, consumedAt],
    );
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
    const existingRes = await this.pool.query<DbActionTokenRow>(
      `SELECT id, user_id, token_type, token_hash, expires_at, consumed_at, created_at
       FROM auth_action_tokens
       WHERE token_hash = $1 AND token_type = $2
       LIMIT 1`,
      [tokenHash, tokenType],
    );

    const existing = existingRes.rows[0];
    if (!existing || existing.consumed_at !== null) {
      return { status: "invalid" };
    }

    if (new Date(existing.expires_at).getTime() <= now.getTime()) {
      return { status: "expired" };
    }

    const updatedRes = await this.pool.query<DbActionTokenRow>(
      `UPDATE auth_action_tokens
       SET consumed_at = $2
       WHERE id = $1 AND consumed_at IS NULL
       RETURNING id, user_id, token_type, token_hash, expires_at, consumed_at, created_at`,
      [existing.id, now],
    );

    const updated = updatedRes.rows[0];
    if (!updated) {
      return { status: "invalid" };
    }

    return {
      status: "consumed",
      token: mapActionTokenRow(updated),
    };
  }

  async findCompanyByOwnerUserId(
    userId: string,
  ): Promise<CompanyRecord | null> {
    const res = await this.pool.query<DbCompanyRow>(
      `SELECT * FROM companies WHERE owner_user_id = $1 LIMIT 1`,
      [userId],
    );
    const row = res.rows[0];
    return row ? mapCompanyRow(row) : null;
  }

  async findCompanyById(companyId: string): Promise<CompanyRecord | null> {
    const res = await this.pool.query<DbCompanyRow>(
      `SELECT * FROM companies WHERE id = $1 LIMIT 1`,
      [companyId],
    );
    const row = res.rows[0];
    return row ? mapCompanyRow(row) : null;
  }

  async createCompany(input: CreateCompanyInput): Promise<CompanyRecord> {
    const res = await this.pool.query<DbCompanyRow>(
      `INSERT INTO companies (
        id, owner_user_id, name, legal_name, logo_url, brand_color,
        phone, email, country_code, city, address, postal_code,
        base_currency, timezone, business_reg_number, tax_reg_number,
        operating_mode, parent_company_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16,
        $17, $18
      ) RETURNING *`,
      [
        input.id,
        input.ownerUserId,
        input.name.trim(),
        input.legalName.trim(),
        input.logoUrl?.trim() || null,
        input.brandColor.trim(),
        input.phone.trim(),
        input.email.trim().toLowerCase(),
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address.trim(),
        input.postalCode.trim(),
        input.baseCurrency.trim().toUpperCase(),
        input.timezone.trim(),
        input.businessRegNumber.trim(),
        input.taxRegNumber.trim(),
        input.operatingMode,
        input.parentCompanyId ?? null,
      ],
    );
    return mapCompanyRow(res.rows[0]);
  }

  async updateCompany(
    companyId: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyRecord | null> {
    const res = await this.pool.query<DbCompanyRow>(
      `UPDATE companies SET
        name = $2,
        legal_name = $3,
        logo_url = $4,
        brand_color = $5,
        phone = $6,
        email = $7,
        country_code = $8,
        city = $9,
        address = $10,
        postal_code = $11,
        base_currency = $12,
        timezone = $13,
        business_reg_number = $14,
        tax_reg_number = $15,
        operating_mode = $16,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        companyId,
        input.name.trim(),
        input.legalName.trim(),
        input.logoUrl?.trim() || null,
        input.brandColor.trim(),
        input.phone.trim(),
        input.email.trim().toLowerCase(),
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address.trim(),
        input.postalCode.trim(),
        input.baseCurrency.trim().toUpperCase(),
        input.timezone.trim(),
        input.businessRegNumber.trim(),
        input.taxRegNumber.trim(),
        input.operatingMode,
      ],
    );
    const row = res.rows[0];
    return row ? mapCompanyRow(row) : null;
  }

  async listBranchesByCompanyId(companyId: string): Promise<BranchRecord[]> {
    const res = await this.pool.query<DbBranchRow>(
      `SELECT * FROM branches WHERE company_id = $1 ORDER BY created_at ASC`,
      [companyId],
    );
    return res.rows.map(mapBranchRow);
  }

  async findBranchById(branchId: string): Promise<BranchRecord | null> {
    const res = await this.pool.query<DbBranchRow>(
      `SELECT * FROM branches WHERE id = $1 LIMIT 1`,
      [branchId],
    );
    const row = res.rows[0];
    return row ? mapBranchRow(row) : null;
  }

  async createBranch(input: CreateBranchInput): Promise<BranchRecord> {
    const res = await this.pool.query<DbBranchRow>(
      `INSERT INTO branches (
        id, company_id, name, code, country_code, city, address,
        phone, email, currency_code, timezone, working_days, working_hours
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      ) RETURNING *`,
      [
        input.id,
        input.companyId,
        input.name.trim(),
        input.code.trim().toUpperCase(),
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address.trim(),
        input.phone.trim(),
        input.email.trim().toLowerCase(),
        input.currencyCode.trim().toUpperCase(),
        input.timezone.trim(),
        input.workingDays.trim(),
        input.workingHours.trim(),
      ],
    );
    return mapBranchRow(res.rows[0]);
  }

  async updateBranch(
    branchId: string,
    companyId: string,
    input: UpdateBranchInput,
  ): Promise<BranchRecord | null> {
    const res = await this.pool.query<DbBranchRow>(
      `UPDATE branches SET
        name = $3,
        code = $4,
        country_code = $5,
        city = $6,
        address = $7,
        phone = $8,
        email = $9,
        currency_code = $10,
        timezone = $11,
        working_days = $12,
        working_hours = $13,
        is_active = $14,
        updated_at = NOW()
      WHERE id = $1 AND company_id = $2
      RETURNING *`,
      [
        branchId,
        companyId,
        input.name.trim(),
        input.code.trim().toUpperCase(),
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address.trim(),
        input.phone.trim(),
        input.email.trim().toLowerCase(),
        input.currencyCode.trim().toUpperCase(),
        input.timezone.trim(),
        input.workingDays.trim(),
        input.workingHours.trim(),
        input.isActive,
      ],
    );
    const row = res.rows[0];
    return row ? mapBranchRow(row) : null;
  }

  async recordAuditLog(input: AuditLogInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_logs (id, company_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        crypto.randomUUID(),
        input.companyId ?? null,
        input.branchId ?? null,
        input.actorUserId ?? null,
        input.action,
        input.entityType,
        input.entityId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
