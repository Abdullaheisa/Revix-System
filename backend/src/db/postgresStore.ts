import { mapCompanyRoleRow, mapCompanyMembershipRow, mapEmployeeInvitationRow, mapNetworkLinkRow, mapPermittedBranchRow, mapNetworkInvitationRow, mapVehicleVariantRow, mapVendorRow, mapPurchaseOrderRow, mapPurchaseOrderItemRow, mapFleetVehicleRow, mapVehiclePhotoRow, mapRentalInclusionRow, mapUserRow, mapSessionRow, mapActionTokenRow, mapCompanyRow, mapBranchRow, type DbUserRow, type DbSessionRow, type DbActionTokenRow, type DbCompanyRow, type DbBranchRow, type DbCompanyRoleRow, type DbCompanyMembershipRow, type DbEmployeeInvitationRow, type DbNetworkLinkRow, type DbPermittedBranchRow, type DbNetworkInvitationRow, type DbVehicleVariantRow, type DbVendorRow, type DbPurchaseOrderRow, type DbPurchaseOrderItemRow, type DbFleetVehicleRow, type DbVehiclePhotoRow, type DbRentalInclusionRow } from "./postgres/rowMappers.ts";
import crypto from "node:crypto";
import pg from "pg";
import type { ActionTokenRecord, ActionTokenType, AuditLogInput, AuditLogRecord, AuthDataStore, BranchRecord, CompanyMembershipRecord, CompanyNetworkInvitationRecord, CompanyNetworkLinkRecord, CompanyOperatingMode, CompanyRecord, CompanyRoleRecord, CreateBranchInput, CreateCompanyInput, CreateCompanyMembershipInput, CreateCompanyRoleInput, CreateEmployeeInvitationInput, CreateFleetPriceListInput, CreateFleetVehicleInput, CreateNetworkInvitationInput, CreateNetworkLinkInput, CreatePurchaseOrderInput, CreateRentalInclusionInput, CreateVehicleBodyStyleInput, CreateVehicleColorInput, CreateVehiclePhotoInput, CreateVehicleVariantInput, CreateVendorInput, CustomerRecord, DriverRecord, EmployeeInvitationRecord, FleetPriceListRecord, FleetVehicleFilterOptions, FleetVehicleRecord, FleetVehicleStatus, NetworkInvitationStatus, NetworkLinkStatus, NetworkPermittedBranchRecord, PurchaseOrderItemRecord, PurchaseOrderRecord, PurchaseOrderStatus, ReceiveVehicleFromPoInput, RentalContractRecord, RentalContractStatus, RentalInclusionRecord, SessionRecord, UpdateBranchInput, UpdateCompanyInput, UpdateCompanyMembershipInput, UpdateCompanyRoleInput, UpdateFleetPriceListInput, UpdateFleetVehicleInput, UpdateRentalInclusionInput, UpdateVehicleVariantInput, UpdateVendorInput, UserRecord, UserStatus, VehicleBodyStyleRecord, VehicleCategory, VehicleColorRecord, VehicleMovementRecord, VehiclePhotoRecord, VehicleVariantRecord, VendorCategory, VendorRecord } from "./store.ts";













































































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

  async updateUserSignature(
    userId: string,
    signatureDataUrl: string | null,
  ): Promise<UserRecord | null> {
    const res = await this.pool.query<DbUserRow>(
      `UPDATE users
       SET signature_data_url = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [userId, signatureDataUrl],
    );
    const row = res.rows[0];
    return row ? mapUserRow(row) : null;
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
        contract_terms_ar = $17,
        contract_terms_en = $18,
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
        input.contractTermsAr?.trim() || null,
        input.contractTermsEn?.trim() || null,
      ],
    );
    const row = res.rows[0];
    return row ? mapCompanyRow(row) : null;
  }

  async updateCompanyOperatingMode(
    companyId: string,
    operatingMode: CompanyOperatingMode,
    parentCompanyId?: string | null,
  ): Promise<CompanyRecord | null> {
    const res = await this.pool.query<DbCompanyRow>(
      `UPDATE companies SET
        operating_mode = $2,
        parent_company_id = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [companyId, operatingMode, parentCompanyId ?? null],
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
    if (row) {
      // Bug 15: keep all branches in the same country on a single unified currency
      await this.pool.query(
        `UPDATE branches
         SET currency_code = $1,
             updated_at = NOW()
         WHERE company_id = $2 AND UPPER(country_code) = $3 AND id <> $4`,
        [
          input.currencyCode.trim().toUpperCase(),
          companyId,
          input.countryCode.trim().toUpperCase(),
          branchId,
        ],
      );
    }
    return row ? mapBranchRow(row) : null;
  }

  // Phase 3: Team Roles, Memberships, Branch Scopes & Invitations
  async listCompanyRoles(companyId: string): Promise<CompanyRoleRecord[]> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `SELECT * FROM company_roles WHERE company_id = $1 ORDER BY created_at ASC`,
      [companyId],
    );
    return res.rows.map(mapCompanyRoleRow);
  }

  async findCompanyRoleById(roleId: string): Promise<CompanyRoleRecord | null> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `SELECT * FROM company_roles WHERE id = $1 LIMIT 1`,
      [roleId],
    );
    const row = res.rows[0];
    return row ? mapCompanyRoleRow(row) : null;
  }

  async findCompanyRoleByCode(
    companyId: string,
    code: string,
  ): Promise<CompanyRoleRecord | null> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `SELECT * FROM company_roles WHERE company_id = $1 AND LOWER(code) = LOWER($2) LIMIT 1`,
      [companyId, code.trim()],
    );
    const row = res.rows[0];
    return row ? mapCompanyRoleRow(row) : null;
  }

  async createCompanyRole(
    input: CreateCompanyRoleInput,
  ): Promise<CompanyRoleRecord> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `INSERT INTO company_roles (
        id, company_id, code, name_en, name_ar, description_en, description_ar,
        scope_type, permissions, is_system
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
      RETURNING *`,
      [
        input.id,
        input.companyId,
        input.code.trim().toLowerCase(),
        input.nameEn.trim(),
        input.nameAr.trim(),
        input.descriptionEn.trim(),
        input.descriptionAr.trim(),
        input.scopeType,
        JSON.stringify(input.permissions ?? {}),
        input.isSystem,
      ],
    );
    return mapCompanyRoleRow(res.rows[0]);
  }

  async updateCompanyRole(
    roleId: string,
    companyId: string,
    input: UpdateCompanyRoleInput,
  ): Promise<CompanyRoleRecord | null> {
    const res = await this.pool.query<DbCompanyRoleRow>(
      `UPDATE company_roles SET
        name_en = COALESCE($3, name_en),
        name_ar = COALESCE($4, name_ar),
        description_en = COALESCE($5, description_en),
        description_ar = COALESCE($6, description_ar),
        scope_type = $7,
        permissions = $8::jsonb,
        updated_at = NOW()
      WHERE id = $1 AND company_id = $2
      RETURNING *`,
      [
        roleId,
        companyId,
        input.nameEn?.trim() ?? null,
        input.nameAr?.trim() ?? null,
        input.descriptionEn?.trim() ?? null,
        input.descriptionAr?.trim() ?? null,
        input.scopeType,
        JSON.stringify(input.permissions ?? {}),
      ],
    );
    const row = res.rows[0];
    return row ? mapCompanyRoleRow(row) : null;
  }

  async deleteCompanyRole(roleId: string, companyId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM company_roles WHERE id = $1 AND company_id = $2 AND is_system = false`,
      [roleId, companyId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async findMembershipByUserId(
    userId: string,
  ): Promise<CompanyMembershipRecord | null> {
    const res = await this.pool.query<DbCompanyMembershipRow>(
      `SELECT m.*,
        COALESCE(
          (SELECT array_agg(s.branch_id ORDER BY s.created_at ASC)
           FROM member_branch_scopes s
           WHERE s.membership_id = m.id),
          ARRAY[]::uuid[]
        ) AS branch_ids
       FROM company_memberships m
       WHERE m.user_id = $1
       LIMIT 1`,
      [userId],
    );
    const row = res.rows[0];
    return row ? mapCompanyMembershipRow(row) : null;
  }

  async findMembershipById(
    membershipId: string,
  ): Promise<CompanyMembershipRecord | null> {
    const res = await this.pool.query<DbCompanyMembershipRow>(
      `SELECT m.*,
        COALESCE(
          (SELECT array_agg(s.branch_id ORDER BY s.created_at ASC)
           FROM member_branch_scopes s
           WHERE s.membership_id = m.id),
          ARRAY[]::uuid[]
        ) AS branch_ids
       FROM company_memberships m
       WHERE m.id = $1
       LIMIT 1`,
      [membershipId],
    );
    const row = res.rows[0];
    return row ? mapCompanyMembershipRow(row) : null;
  }

  async listCompanyMemberships(
    companyId: string,
  ): Promise<CompanyMembershipRecord[]> {
    const res = await this.pool.query<DbCompanyMembershipRow>(
      `SELECT m.*,
        COALESCE(
          (SELECT array_agg(s.branch_id ORDER BY s.created_at ASC)
           FROM member_branch_scopes s
           WHERE s.membership_id = m.id),
          ARRAY[]::uuid[]
        ) AS branch_ids
       FROM company_memberships m
       WHERE m.company_id = $1
       ORDER BY m.created_at ASC`,
      [companyId],
    );
    return res.rows.map(mapCompanyMembershipRow);
  }

  async createCompanyMembership(
    input: CreateCompanyMembershipInput,
  ): Promise<CompanyMembershipRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query<DbCompanyMembershipRow>(
        `INSERT INTO company_memberships (id, user_id, company_id, role_id, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          input.id,
          input.userId,
          input.companyId,
          input.roleId,
          input.phone.trim(),
          input.status ?? "active",
        ],
      );

      const uniqueBranches = Array.from(new Set(input.branchIds));
      for (const branchId of uniqueBranches) {
        await client.query(
          `INSERT INTO member_branch_scopes (membership_id, branch_id)
           VALUES ($1, $2)
           ON CONFLICT (membership_id, branch_id) DO NOTHING`,
          [input.id, branchId],
        );
      }

      await client.query("COMMIT");
      return mapCompanyMembershipRow({
        ...res.rows[0],
        branch_ids: uniqueBranches,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async updateCompanyMembership(
    membershipId: string,
    companyId: string,
    input: UpdateCompanyMembershipInput,
  ): Promise<CompanyMembershipRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query<DbCompanyMembershipRow>(
        `UPDATE company_memberships SET
          role_id = $3,
          phone = $4,
          status = $5,
          updated_at = NOW()
         WHERE id = $1 AND company_id = $2
         RETURNING *`,
        [
          membershipId,
          companyId,
          input.roleId,
          input.phone.trim(),
          input.status,
        ],
      );
      const row = res.rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `DELETE FROM member_branch_scopes WHERE membership_id = $1`,
        [membershipId],
      );

      const uniqueBranches = Array.from(new Set(input.branchIds));
      for (const branchId of uniqueBranches) {
        await client.query(
          `INSERT INTO member_branch_scopes (membership_id, branch_id)
           VALUES ($1, $2)
           ON CONFLICT (membership_id, branch_id) DO NOTHING`,
          [membershipId, branchId],
        );
      }

      await client.query("COMMIT");
      return mapCompanyMembershipRow({
        ...row,
        branch_ids: uniqueBranches,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async createEmployeeInvitation(
    input: CreateEmployeeInvitationInput,
  ): Promise<EmployeeInvitationRecord> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `INSERT INTO employee_invitations (
        id, company_id, email, full_name, phone, role_id, branch_ids,
        token_hash, invited_by_user_id, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
      RETURNING *`,
      [
        input.id,
        input.companyId,
        input.email.trim().toLowerCase(),
        input.fullName.trim(),
        input.phone.trim(),
        input.roleId,
        JSON.stringify(Array.from(new Set(input.branchIds))),
        input.tokenHash,
        input.invitedByUserId,
        input.expiresAt,
      ],
    );
    return mapEmployeeInvitationRow(res.rows[0]);
  }

  async findInvitationById(
    invitationId: string,
  ): Promise<EmployeeInvitationRecord | null> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `SELECT * FROM employee_invitations WHERE id = $1 LIMIT 1`,
      [invitationId],
    );
    const row = res.rows[0];
    return row ? mapEmployeeInvitationRow(row) : null;
  }

  async findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<EmployeeInvitationRecord | null> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `SELECT * FROM employee_invitations WHERE token_hash = $1 LIMIT 1`,
      [tokenHash],
    );
    const row = res.rows[0];
    return row ? mapEmployeeInvitationRow(row) : null;
  }

  async listCompanyInvitations(
    companyId: string,
  ): Promise<EmployeeInvitationRecord[]> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `SELECT * FROM employee_invitations WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId],
    );
    return res.rows.map(mapEmployeeInvitationRow);
  }

  async revokePendingInvitationsForEmail(
    companyId: string,
    email: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE employee_invitations
       SET revoked_at = $3
       WHERE company_id = $1
         AND LOWER(email) = LOWER($2)
         AND accepted_at IS NULL
         AND revoked_at IS NULL`,
      [companyId, email.trim(), revokedAt],
    );
  }

  async revokeInvitationById(
    invitationId: string,
    companyId: string,
    revokedAt: Date,
  ): Promise<EmployeeInvitationRecord | null> {
    const res = await this.pool.query<DbEmployeeInvitationRow>(
      `UPDATE employee_invitations
       SET revoked_at = COALESCE(revoked_at, $3)
       WHERE id = $1 AND company_id = $2
       RETURNING *`,
      [invitationId, companyId, revokedAt],
    );
    const row = res.rows[0];
    return row ? mapEmployeeInvitationRow(row) : null;
  }

  async markInvitationAccepted(
    invitationId: string,
    acceptedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE employee_invitations
       SET accepted_at = $2
       WHERE id = $1`,
      [invitationId, acceptedAt],
    );
  }

  // Phase 4: Company Network Implementation
  async createNetworkLink(
    input: CreateNetworkLinkInput,
  ): Promise<CompanyNetworkLinkRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbNetworkLinkRow>(
      `INSERT INTO company_network_links (
        id, main_company_id, local_company_id, status, permitted_countries, notes, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
      RETURNING *`,
      [
        id,
        input.mainCompanyId,
        input.localCompanyId,
        input.status ?? "active",
        JSON.stringify(input.permittedCountries ?? []),
        input.notes ?? null,
        input.createdByUserId ?? null,
      ],
    );
    return mapNetworkLinkRow(res.rows[0]);
  }

  async findNetworkLinkById(
    linkId: string,
  ): Promise<CompanyNetworkLinkRecord | null> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `SELECT * FROM company_network_links WHERE id = $1 LIMIT 1`,
      [linkId],
    );
    const row = res.rows[0];
    return row ? mapNetworkLinkRow(row) : null;
  }

  async findNetworkLink(
    mainCompanyId: string,
    localCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord | null> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `SELECT * FROM company_network_links
       WHERE main_company_id = $1 AND local_company_id = $2
       LIMIT 1`,
      [mainCompanyId, localCompanyId],
    );
    const row = res.rows[0];
    return row ? mapNetworkLinkRow(row) : null;
  }

  async listNetworkLinksForMain(
    mainCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord[]> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `SELECT * FROM company_network_links
       WHERE main_company_id = $1
       ORDER BY created_at DESC`,
      [mainCompanyId],
    );
    return res.rows.map(mapNetworkLinkRow);
  }

  async listNetworkLinksForLocal(
    localCompanyId: string,
  ): Promise<CompanyNetworkLinkRecord[]> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `SELECT * FROM company_network_links
       WHERE local_company_id = $1
       ORDER BY created_at DESC`,
      [localCompanyId],
    );
    return res.rows.map(mapNetworkLinkRow);
  }

  async updateNetworkLinkStatus(
    linkId: string,
    status: NetworkLinkStatus,
  ): Promise<CompanyNetworkLinkRecord | null> {
    const res = await this.pool.query<DbNetworkLinkRow>(
      `UPDATE company_network_links
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [linkId, status],
    );
    const row = res.rows[0];
    return row ? mapNetworkLinkRow(row) : null;
  }

  async deleteNetworkLink(linkId: string): Promise<void> {
    await this.pool.query(`DELETE FROM company_network_links WHERE id = $1`, [
      linkId,
    ]);
  }

  async setNetworkPermittedBranches(
    linkId: string,
    localCompanyId: string,
    branchIds: string[],
  ): Promise<NetworkPermittedBranchRecord[]> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM network_permitted_branches WHERE link_id = $1`,
        [linkId],
      );

      const uniqueBranchIds = Array.from(new Set(branchIds));
      const records: NetworkPermittedBranchRecord[] = [];
      for (const branchId of uniqueBranchIds) {
        const res = await client.query<DbPermittedBranchRow>(
          `INSERT INTO network_permitted_branches (id, link_id, local_company_id, branch_id)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [crypto.randomUUID(), linkId, localCompanyId, branchId],
        );
        records.push(mapPermittedBranchRow(res.rows[0]));
      }

      await client.query("COMMIT");
      return records;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async listNetworkPermittedBranches(
    linkId: string,
  ): Promise<NetworkPermittedBranchRecord[]> {
    const res = await this.pool.query<DbPermittedBranchRow>(
      `SELECT * FROM network_permitted_branches WHERE link_id = $1 ORDER BY created_at ASC`,
      [linkId],
    );
    return res.rows.map(mapPermittedBranchRow);
  }

  async createNetworkInvitation(
    input: CreateNetworkInvitationInput,
  ): Promise<CompanyNetworkInvitationRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `INSERT INTO company_network_invitations (
        id, main_company_id, invitee_email, local_company_name, contact_name, contact_phone, logo_url, token_hash, expires_at, invited_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        input.mainCompanyId,
        input.inviteeEmail.trim().toLowerCase(),
        input.localCompanyName.trim(),
        input.contactName?.trim() || null,
        input.contactPhone?.trim() || null,
        input.logoUrl ?? null,
        input.tokenHash,
        input.expiresAt,
        input.invitedByUserId ?? null,
      ],
    );
    return mapNetworkInvitationRow(res.rows[0]);
  }

  async findNetworkInvitationById(
    invitationId: string,
  ): Promise<CompanyNetworkInvitationRecord | null> {
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `SELECT * FROM company_network_invitations WHERE id = $1 LIMIT 1`,
      [invitationId],
    );
    const row = res.rows[0];
    return row ? mapNetworkInvitationRow(row) : null;
  }

  async findNetworkInvitationByTokenHash(
    tokenHash: string,
  ): Promise<CompanyNetworkInvitationRecord | null> {
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `SELECT * FROM company_network_invitations WHERE token_hash = $1 LIMIT 1`,
      [tokenHash],
    );
    const row = res.rows[0];
    return row ? mapNetworkInvitationRow(row) : null;
  }

  async listNetworkInvitationsForMain(
    mainCompanyId: string,
  ): Promise<CompanyNetworkInvitationRecord[]> {
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `SELECT * FROM company_network_invitations WHERE main_company_id = $1 ORDER BY created_at DESC`,
      [mainCompanyId],
    );
    return res.rows.map(mapNetworkInvitationRow);
  }

  async updateNetworkInvitationStatus(
    invitationId: string,
    status: NetworkInvitationStatus,
    acceptedAt?: Date,
  ): Promise<CompanyNetworkInvitationRecord | null> {
    const res = await this.pool.query<DbNetworkInvitationRow>(
      `UPDATE company_network_invitations
       SET status = $2, accepted_at = COALESCE($3, accepted_at)
       WHERE id = $1
       RETURNING *`,
      [invitationId, status, acceptedAt ?? null],
    );
    const row = res.rows[0];
    return row ? mapNetworkInvitationRow(row) : null;
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

  async listAuditLogs(
    companyId: string,
    filter?: {
      entityType?: string;
      entityId?: string;
      actorUserId?: string;
      limit?: number;
    },
  ): Promise<AuditLogRecord[]> {
    let query = `
      SELECT al.*, COALESCE(u.full_name, u.email) AS actor_name, u.email AS actor_email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_user_id
      WHERE al.company_id = $1
    `;
    const params: unknown[] = [companyId];

    if (filter?.entityType) {
      params.push(filter.entityType);
      query += ` AND al.entity_type = $${params.length}`;
    }
    if (filter?.entityId) {
      params.push(filter.entityId);
      query += ` AND al.entity_id = $${params.length}`;
    }
    if (filter?.actorUserId) {
      params.push(filter.actorUserId);
      query += ` AND al.actor_user_id = $${params.length}`;
    }

    const limit = Math.min(Math.max(Number(filter?.limit ?? 100), 1), 300);
    params.push(limit);
    query += ` ORDER BY al.created_at DESC LIMIT $${params.length}`;

    const res = await this.pool.query(query, params);
    return res.rows.map((r) => ({
      id: r.id,
      companyId: r.company_id ?? null,
      branchId: r.branch_id ?? null,
      actorUserId: r.actor_user_id ?? null,
      actorName: r.actor_name ?? null,
      actorEmail: r.actor_email ?? null,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id ?? null,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      createdAt: new Date(r.created_at),
    }));
  }

  // --- Phase 5: Vehicle Variants ---
  async createVehicleVariant(
    input: CreateVehicleVariantInput,
  ): Promise<VehicleVariantRecord> {
    const id = input.id ?? crypto.randomUUID();
    const variantCode = `V${Math.floor(100 + Math.random() * 900)}`;
    const res = await this.pool.query<DbVehicleVariantRow>(
      `INSERT INTO vehicle_variants
        (id, variant_code, company_id, make, model, model_year, trim, category, transmission, fuel_type,
         seating_capacity, sipp_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        variantCode,
        input.companyId,
        input.make.trim(),
        input.model.trim(),
        input.modelYear,
        input.trim?.trim() || "Standard",
        input.category,
        input.transmission ?? "automatic",
        input.fuelType ?? "petrol",
        input.seatingCapacity ?? 5,
        input.sippCode?.trim() || "ICAR",
      ],
    );
    return mapVehicleVariantRow(res.rows[0]!);
  }

  async findVehicleVariantById(
    variantId: string,
  ): Promise<VehicleVariantRecord | null> {
    const res = await this.pool.query<DbVehicleVariantRow>(
      `SELECT * FROM vehicle_variants WHERE id = $1`,
      [variantId],
    );
    const row = res.rows[0];
    return row ? mapVehicleVariantRow(row) : null;
  }

  async listVehicleVariants(
    companyId: string,
    filter?: { category?: VehicleCategory; search?: string },
  ): Promise<VehicleVariantRecord[]> {
    let query = `SELECT * FROM vehicle_variants WHERE company_id = $1`;
    const params: unknown[] = [companyId];

    if (filter?.category) {
      params.push(filter.category);
      query += ` AND category = $${params.length}`;
    }

    if (filter?.search) {
      params.push(`%${filter.search.trim()}%`);
      query += ` AND (make ILIKE $${params.length} OR model ILIKE $${params.length} OR trim ILIKE $${params.length} OR sipp_code ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;
    const res = await this.pool.query<DbVehicleVariantRow>(query, params);
    return res.rows.map(mapVehicleVariantRow);
  }

  async updateVehicleVariant(
    variantId: string,
    input: UpdateVehicleVariantInput,
  ): Promise<VehicleVariantRecord | null> {
    const existing = await this.findVehicleVariantById(variantId);
    if (!existing) return null;

    const res = await this.pool.query<DbVehicleVariantRow>(
      `UPDATE vehicle_variants
       SET make = COALESCE($2, make),
           model = COALESCE($3, model),
           model_year = COALESCE($4, model_year),
           trim = COALESCE($5, trim),
           category = COALESCE($6, category),
           transmission = COALESCE($7, transmission),
           fuel_type = COALESCE($8, fuel_type),
           seating_capacity = COALESCE($9, seating_capacity),
           sipp_code = COALESCE($10, sipp_code),
           status = COALESCE($11, status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        variantId,
        input.make?.trim() ?? null,
        input.model?.trim() ?? null,
        input.modelYear ?? null,
        input.trim?.trim() ?? null,
        input.category ?? null,
        input.transmission ?? null,
        input.fuelType ?? null,
        input.seatingCapacity ?? null,
        input.sippCode?.trim() ?? null,
        input.status ?? null,
      ],
    );
    const row = res.rows[0];
    return row ? mapVehicleVariantRow(row) : null;
  }

  async deleteVehicleVariant(variantId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE vehicle_variants SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [variantId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Phase 5: Vendors Directory ---
  async createVendor(input: CreateVendorInput): Promise<VendorRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbVendorRow>(
      `INSERT INTO vendors
        (id, company_id, name, legal_name, category, contact_person, phone, email, country_code,
         city, address, tax_number, commercial_register, bank_name, iban, payment_terms_days,
         payment_terms_type, payment_terms_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        id,
        input.companyId,
        input.name.trim(),
        input.legalName?.trim() || null,
        input.category ?? "dealership",
        input.contactPerson.trim(),
        input.phone.trim(),
        input.email?.trim().toLowerCase() || null,
        input.countryCode.trim().toUpperCase(),
        input.city.trim(),
        input.address?.trim() || null,
        input.taxNumber?.trim() || null,
        input.commercialRegister?.trim() || null,
        input.bankName?.trim() || null,
        input.iban?.trim() || null,
        input.paymentTermsDays ?? 30,
        input.paymentTermsType ?? (input.paymentTermsDays === 0 ? "cash" : "net_terms"),
        input.paymentTermsConfig?.trim() || null,
      ],
    );
    return mapVendorRow(res.rows[0]!);
  }

  async findVendorById(vendorId: string): Promise<VendorRecord | null> {
    const res = await this.pool.query<DbVendorRow>(
      `SELECT * FROM vendors WHERE id = $1`,
      [vendorId],
    );
    const row = res.rows[0];
    return row ? mapVendorRow(row) : null;
  }

  async listVendors(
    companyId: string,
    filter?: { category?: VendorCategory; search?: string },
  ): Promise<VendorRecord[]> {
    let query = `SELECT * FROM vendors WHERE company_id = $1`;
    const params: unknown[] = [companyId];

    if (filter?.category) {
      params.push(filter.category);
      query += ` AND category = $${params.length}`;
    }

    if (filter?.search) {
      params.push(`%${filter.search.trim()}%`);
      query += ` AND (name ILIKE $${params.length} OR legal_name ILIKE $${params.length} OR contact_person ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;
    const res = await this.pool.query<DbVendorRow>(query, params);
    return res.rows.map(mapVendorRow);
  }

  async updateVendor(
    vendorId: string,
    input: UpdateVendorInput,
  ): Promise<VendorRecord | null> {
    const res = await this.pool.query<DbVendorRow>(
      `UPDATE vendors
       SET name = COALESCE($2, name),
           legal_name = COALESCE($3, legal_name),
           category = COALESCE($4, category),
           contact_person = COALESCE($5, contact_person),
           phone = COALESCE($6, phone),
           email = COALESCE($7, email),
           country_code = COALESCE($8, country_code),
           city = COALESCE($9, city),
           address = COALESCE($10, address),
           tax_number = COALESCE($11, tax_number),
           commercial_register = COALESCE($12, commercial_register),
           bank_name = COALESCE($13, bank_name),
           iban = COALESCE($14, iban),
           payment_terms_days = COALESCE($15, payment_terms_days),
           payment_terms_type = COALESCE($16, payment_terms_type),
           payment_terms_config = COALESCE($17, payment_terms_config),
           status = COALESCE($18, status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        vendorId,
        input.name?.trim() ?? null,
        input.legalName !== undefined ? input.legalName?.trim() || null : null,
        input.category ?? null,
        input.contactPerson?.trim() ?? null,
        input.phone?.trim() ?? null,
        input.email !== undefined ? input.email?.trim().toLowerCase() || null : null,
        input.countryCode?.trim().toUpperCase() ?? null,
        input.city?.trim() ?? null,
        input.address !== undefined ? input.address?.trim() || null : null,
        input.taxNumber !== undefined ? input.taxNumber?.trim() || null : null,
        input.commercialRegister !== undefined ? input.commercialRegister?.trim() || null : null,
        input.bankName !== undefined ? input.bankName?.trim() || null : null,
        input.iban !== undefined ? input.iban?.trim() || null : null,
        input.paymentTermsDays ?? null,
        input.paymentTermsType ?? null,
        input.paymentTermsConfig !== undefined ? input.paymentTermsConfig?.trim() || null : null,
        input.status ?? null,
      ],
    );
    const row = res.rows[0];
    return row ? mapVendorRow(row) : null;
  }

  // --- Phase 5: Purchase Orders (PO) ---
  async createPurchaseOrder(
    input: CreatePurchaseOrderInput,
  ): Promise<PurchaseOrderRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const totalAmount =
        input.totalAmount ??
        input.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
      const upfrontPaid = input.upfrontPaid ?? 0;
      const remainingAmount = Math.max(0, totalAmount - upfrontPaid);

      // Serialize numbering within a company, including concurrent requests.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.companyId]);
      const year = (input.orderDate || new Date().toISOString()).slice(0, 4);
      const prefix = `PO-${year}-`;
      const sequence = await client.query<{ next: string }>(
        `SELECT COALESCE(MAX(substring(po_number from 9)::bigint), 0) + 1 AS next
         FROM purchase_orders WHERE company_id = $1 AND po_number ~ $2`,
        [input.companyId, `^PO-${year}-[0-9]+$`],
      );
      const poNumber = prefix + String(sequence.rows[0].next).padStart(4, "0");

      const id = input.id ?? crypto.randomUUID();
      const poRes = await client.query<DbPurchaseOrderRow>(
        `INSERT INTO purchase_orders
          (id, company_id, branch_id, vendor_id, po_number, status, order_date,
           expected_delivery_date, currency, total_amount, upfront_paid, remaining_amount,
           installments_count, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          id,
          input.companyId,
          input.branchId ?? null,
          input.vendorId,
          poNumber,
          "draft",
          input.orderDate ?? new Date().toISOString().slice(0, 10),
          input.expectedDeliveryDate ?? null,
          input.currency ?? "EGP",
          totalAmount,
          upfrontPaid,
          remainingAmount,
          input.installmentsCount ?? 1,
          input.notes?.trim() || null,
          input.createdByUserId ?? null,
        ],
      );

      const items: PurchaseOrderItemRecord[] = [];
      for (const item of input.items) {
        const itemRes = await client.query<DbPurchaseOrderItemRow>(
          `INSERT INTO purchase_order_items
            (id, purchase_order_id, variant_id, quantity, unit_price, received_count, vin, color, notes)
           VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8)
           RETURNING *`,
          [
            crypto.randomUUID(),
            id,
            item.variantId,
            item.quantity,
            item.unitPrice,
            item.vin?.trim() || null,
            item.color?.trim() || null,
            item.notes?.trim() || null,
          ],
        );
        items.push(mapPurchaseOrderItemRow(itemRes.rows[0]!));
      }

      await client.query("COMMIT");

      const record = mapPurchaseOrderRow(poRes.rows[0]!);
      record.items = items;
      return record;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async findPurchaseOrderById(poId: string): Promise<PurchaseOrderRecord | null> {
    const poRes = await this.pool.query<DbPurchaseOrderRow>(
      `SELECT po.*, v.name as vendor_name, b.name as branch_name, c.name as company_name,
              c.logo_url as company_logo_url, c.timezone as company_timezone, c.country_code as company_country_code,
              pc.name as parent_company_name, pc.logo_url as parent_company_logo_url,
              COALESCE(cu.full_name, cu.email) as created_by_user_name,
              COALESCE(au.full_name, au.email) as approved_by_user_name
       FROM purchase_orders po
       LEFT JOIN vendors v ON v.id = po.vendor_id
       LEFT JOIN branches b ON b.id = po.branch_id
       LEFT JOIN companies c ON c.id = po.company_id
       LEFT JOIN companies pc ON pc.id = c.parent_company_id
       LEFT JOIN users cu ON cu.id = po.created_by_user_id
       LEFT JOIN users au ON au.id = po.approved_by_user_id
       WHERE po.id = $1`,
      [poId],
    );
    const poRow = poRes.rows[0];
    if (!poRow) return null;

    const itemsRes = await this.pool.query<DbPurchaseOrderItemRow>(
      `SELECT * FROM purchase_order_items WHERE purchase_order_id = $1 ORDER BY created_at ASC`,
      [poId],
    );

    const record = mapPurchaseOrderRow(poRow);
    record.items = itemsRes.rows.map(mapPurchaseOrderItemRow);
    return record;
  }

  async listPurchaseOrders(
    companyId: string,
    filter?: {
      branchId?: string;
      vendorId?: string;
      status?: PurchaseOrderStatus;
    },
  ): Promise<PurchaseOrderRecord[]> {
    let query = `
      SELECT po.*, v.name as vendor_name, b.name as branch_name, c.name as company_name,
             c.logo_url as company_logo_url, c.timezone as company_timezone, c.country_code as company_country_code,
             pc.name as parent_company_name, pc.logo_url as parent_company_logo_url,
             COALESCE(cu.full_name, cu.email) as created_by_user_name,
             COALESCE(au.full_name, au.email) as approved_by_user_name
      FROM purchase_orders po
      LEFT JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN branches b ON b.id = po.branch_id
      LEFT JOIN companies c ON c.id = po.company_id
      LEFT JOIN companies pc ON pc.id = c.parent_company_id
      LEFT JOIN users cu ON cu.id = po.created_by_user_id
      LEFT JOIN users au ON au.id = po.approved_by_user_id
      WHERE po.company_id = $1
    `;
    const params: unknown[] = [companyId];

    if (filter?.branchId) {
      params.push(filter.branchId);
      query += ` AND po.branch_id = $${params.length}`;
    }
    if (filter?.vendorId) {
      params.push(filter.vendorId);
      query += ` AND po.vendor_id = $${params.length}`;
    }
    if (filter?.status) {
      params.push(filter.status);
      query += ` AND po.status = $${params.length}`;
    }

    query += ` ORDER BY po.created_at DESC`;
    const res = await this.pool.query<DbPurchaseOrderRow>(query, params);

    // Fetch items for all listed POs
    const poIds = res.rows.map((r) => r.id);
    let itemsByPoId = new Map<string, PurchaseOrderItemRecord[]>();
    if (poIds.length > 0) {
      const itemsRes = await this.pool.query<DbPurchaseOrderItemRow>(
        `SELECT * FROM purchase_order_items WHERE purchase_order_id = ANY($1::uuid[])`,
        [poIds],
      );
      for (const row of itemsRes.rows) {
        const list = itemsByPoId.get(row.purchase_order_id) ?? [];
        list.push(mapPurchaseOrderItemRow(row));
        itemsByPoId.set(row.purchase_order_id, list);
      }
    }

    return res.rows.map((row) => {
      const record = mapPurchaseOrderRow(row);
      record.items = itemsByPoId.get(row.id) ?? [];
      return record;
    });
  }

  async updatePurchaseOrderStatus(
    poId: string,
    status: PurchaseOrderStatus,
    approvedByUserId?: string,
  ): Promise<PurchaseOrderRecord | null> {
    await this.pool.query(
      `UPDATE purchase_orders
       SET status = $2::varchar,
           approved_by_user_id = CASE WHEN $2::text = 'approved' THEN $3::uuid ELSE approved_by_user_id END,
           approved_at = CASE WHEN $2::text = 'approved' THEN NOW() ELSE approved_at END,
           updated_at = NOW()
       WHERE id = $1`,
      [poId, status, approvedByUserId ?? null],
    );
    return this.findPurchaseOrderById(poId);
  }

  async receiveVehicleFromPo(
    input: ReceiveVehicleFromPoInput,
  ): Promise<{ vehicle: FleetVehicleRecord; po: PurchaseOrderRecord }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const poRes = await client.query<DbPurchaseOrderRow>(
        `SELECT * FROM purchase_orders WHERE id = $1 FOR UPDATE`,
        [input.purchaseOrderId],
      );
      const poRow = poRes.rows[0];
      if (!poRow) throw new Error("Purchase order not found");

      const itemRes = await client.query<DbPurchaseOrderItemRow>(
        `SELECT * FROM purchase_order_items WHERE id = $1 AND purchase_order_id = $2 FOR UPDATE`,
        [input.itemId, input.purchaseOrderId],
      );
      const itemRow = itemRes.rows[0];
      if (!itemRow) throw new Error("Purchase order line item not found");
      if (itemRow.received_count >= itemRow.quantity) {
        throw new Error("All vehicles for this purchase line have already been received");
      }

      // Inherit existing variant-level pricing if new vehicle doesn't specify rates
      const existingVariantPriceRes = await client.query<{
        daily_rate_1_to_2: string | number;
        daily_rate_3_to_7: string | number;
        daily_rate_8_plus: string | number;
        damage_excess: string | number;
        mileage_policy: "unlimited" | "limited";
        daily_km_limit: number;
        extra_km_rate: string | number;
        photo_url: string | null;
        location_type: string | null;
        fuel_policy: string | null;
        instant_confirmation: boolean | null;
        description: string | null;
        delivery_policy: string | null;
        inclusions: string[] | null;
        seats: number | null;
        doors: number | null;
        air_conditioning: boolean | null;
        fuel_type: string | null;
        luggage_capacity: string | null;
        transmission: string | null;
      }>(
        `SELECT daily_rate_1_to_2, daily_rate_3_to_7, daily_rate_8_plus, damage_excess,
                mileage_policy, daily_km_limit, extra_km_rate,
                photo_url, location_type, fuel_policy, instant_confirmation, description,
                delivery_policy, inclusions, seats, doors, air_conditioning, fuel_type,
                luggage_capacity, transmission
         FROM fleet_vehicles
         WHERE company_id = $1 AND variant_id = $2
         ORDER BY (daily_rate_1_to_2 > 0 OR daily_rate_3_to_7 > 0 OR daily_rate_8_plus > 0) DESC,
                  (photo_url IS NOT NULL OR COALESCE(array_length(inclusions, 1), 0) > 0) DESC,
                  (branch_id = $3) DESC NULLS LAST,
                  updated_at DESC
         LIMIT 1`,
        [poRow.company_id, itemRow.variant_id, input.branchId ?? null],
      );
      const inheritedPricing = existingVariantPriceRes.rows[0];
      const variantDefaultsRes = await client.query<{
        daily_rate_1_to_2: string | null;
        daily_rate_3_to_7: string | null;
        daily_rate_8_plus: string | null;
        damage_excess: string | null;
        photo_url: string | null;
      }>(
        `SELECT daily_rate_1_to_2, daily_rate_3_to_7, daily_rate_8_plus, damage_excess, photo_url
         FROM vehicle_variants WHERE id = $1 AND company_id = $2`,
        [itemRow.variant_id, poRow.company_id],
      );
      const variantDefaults = variantDefaultsRes.rows[0];
      const mergedInherited = inheritedPricing
        ? {
            ...inheritedPricing,
            daily_rate_1_to_2:
              Number(inheritedPricing.daily_rate_1_to_2) > 0
                ? inheritedPricing.daily_rate_1_to_2
                : (variantDefaults?.daily_rate_1_to_2 ?? "0"),
            daily_rate_3_to_7:
              Number(inheritedPricing.daily_rate_3_to_7) > 0
                ? inheritedPricing.daily_rate_3_to_7
                : (variantDefaults?.daily_rate_3_to_7 ?? "0"),
            daily_rate_8_plus:
              Number(inheritedPricing.daily_rate_8_plus) > 0
                ? inheritedPricing.daily_rate_8_plus
                : (variantDefaults?.daily_rate_8_plus ?? "0"),
            damage_excess:
              Number(inheritedPricing.damage_excess) > 0
                ? inheritedPricing.damage_excess
                : (variantDefaults?.damage_excess ?? "0"),
            photo_url: inheritedPricing.photo_url ?? variantDefaults?.photo_url ?? null,
          }
        : variantDefaults
          ? {
              daily_rate_1_to_2: variantDefaults.daily_rate_1_to_2 ?? "0",
              daily_rate_3_to_7: variantDefaults.daily_rate_3_to_7 ?? "0",
              daily_rate_8_plus: variantDefaults.daily_rate_8_plus ?? "0",
              damage_excess: variantDefaults.damage_excess ?? "0",
              mileage_policy: null,
              daily_km_limit: null,
              extra_km_rate: "0",
              photo_url: variantDefaults.photo_url ?? null,
              location_type: null,
              fuel_policy: null,
              instant_confirmation: null,
              description: null,
              delivery_policy: null,
              inclusions: null,
              seats: null,
              doors: null,
              air_conditioning: null,
              fuel_type: null,
              luggage_capacity: null,
              transmission: null,
            }
          : undefined;

      // Create vehicle with a unique 4-digit sequential Asset ID (0001...)
      const vehicleId = crypto.randomUUID();
      const maxAssetRes = await client.query<{ max_seq: number }>(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(asset_code FROM '^(?:VEH-)?([0-9]+)$') AS INTEGER)), 0) AS max_seq
         FROM fleet_vehicles WHERE company_id = $1`,
        [poRow.company_id],
      );
      const nextSeq = Number(maxAssetRes.rows[0]?.max_seq ?? 0) + 1;
      const assetCode = String(nextSeq).padStart(4, "0");
      const vehicleRes = await client.query<DbFleetVehicleRow>(
        `INSERT INTO fleet_vehicles
          (id, asset_code, company_id, branch_id, variant_id, purchase_order_id, vin, license_plate,
           key_number, color, mileage_odometer, status, notes,
           photo_url, location_type, fuel_policy, instant_confirmation, description, delivery_policy,
           daily_rate_1_to_2, daily_rate_3_to_7, daily_rate_8_plus, damage_excess,
           mileage_policy, daily_km_limit, extra_km_rate, inclusions,
         seats, doors, air_conditioning, fuel_type, luggage_capacity, transmission,
         is_bookable, published_to_fleet_at, in_service_date, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'available', $12,
                 $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
                 $33, CASE WHEN $33 THEN NOW() ELSE NULL END, COALESCE($34::date, CURRENT_DATE), $35)
         RETURNING *`,
        [
          vehicleId,
          assetCode,
          poRow.company_id,
          input.branchId ?? null,
          itemRow.variant_id,
          poRow.id,
          input.vin.trim().toUpperCase(),
          input.licensePlate.trim().toUpperCase(),
          input.keyNumber?.trim() || null,
          input.color.trim(),
          input.mileageOdometer ?? 0,
          input.notes?.trim() || null,
          input.photoUrl?.trim() || inheritedPricing?.photo_url || null,
          input.locationType ?? inheritedPricing?.location_type ?? "airport_terminal",
          input.fuelPolicy ?? inheritedPricing?.fuel_policy ?? "full_to_full",
          input.instantConfirmation ?? inheritedPricing?.instant_confirmation ?? false,
          input.description?.trim() || inheritedPricing?.description || null,
          input.deliveryPolicy?.trim() || inheritedPricing?.delivery_policy || null,
          (input.dailyRate1to2 && input.dailyRate1to2 > 0)
            ? input.dailyRate1to2
            : (mergedInherited ? Number(mergedInherited.daily_rate_1_to_2) : 0),
          (input.dailyRate3to7 && input.dailyRate3to7 > 0)
            ? input.dailyRate3to7
            : (mergedInherited ? Number(mergedInherited.daily_rate_3_to_7) : 0),
          (input.dailyRate8Plus && input.dailyRate8Plus > 0)
            ? input.dailyRate8Plus
            : (mergedInherited ? Number(mergedInherited.daily_rate_8_plus) : 0),
          (input.damageExcess && input.damageExcess > 0)
            ? input.damageExcess
            : (mergedInherited ? Number(mergedInherited.damage_excess) : 0),
          input.mileagePolicy ?? mergedInherited?.mileage_policy ?? "unlimited",
          input.dailyKmLimit ?? mergedInherited?.daily_km_limit ?? 0,
          input.extraKmRate ?? (mergedInherited ? Number(mergedInherited.extra_km_rate) : 0),
          (input.inclusions && input.inclusions.length > 0)
            ? input.inclusions
            : (mergedInherited?.inclusions ?? []),
          input.seats ?? mergedInherited?.seats ?? 5,
          input.doors ?? mergedInherited?.doors ?? 4,
          input.airConditioning !== undefined
            ? input.airConditioning
            : (mergedInherited?.air_conditioning ?? true),
          input.fuelType ?? mergedInherited?.fuel_type ?? "petrol",
          input.luggageCapacity ?? mergedInherited?.luggage_capacity ?? "2 Bags",
          input.transmission ?? mergedInherited?.transmission ?? "automatic",
          Boolean(input.isBookable),
          input.inServiceDate ?? null,
          input.createdByUserId ?? null,
        ],
      );

      const resolvedInsProvider =
        input.insuranceProviderName?.trim() ||
        (input.insuranceCompanyId ? "Insurance Provider" : null);
      if (resolvedInsProvider && input.insuranceExpiry) {
        await client.query(
          `INSERT INTO vehicle_insurance_policies
            (company_id, vehicle_id, insurance_company_id, provider_name, policy_number,
             coverage_type, premium_amount, deductible_amount, start_date, expiry_date, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 0, COALESCE($8::date, CURRENT_DATE), $9::date, 'active')`,
          [
            poRow.company_id,
            vehicleId,
            input.insuranceCompanyId ?? null,
            resolvedInsProvider,
            input.insurancePolicyNumber?.trim() || `POL-${input.licensePlate.trim().toUpperCase()}`,
            input.insuranceCoverageType || "comprehensive",
            Number(input.insurancePremiumAmount ?? 0),
            input.insuranceStartDate ?? input.inServiceDate ?? null,
            input.insuranceExpiry,
          ],
        );
      }

      // Increment received_count
      await client.query(
        `UPDATE purchase_order_items SET received_count = received_count + 1 WHERE id = $1`,
        [input.itemId],
      );

      // Check total received
      const totalRes = await client.query(
        `SELECT SUM(quantity)::int as total_qty, SUM(received_count)::int as total_rcv
         FROM purchase_order_items WHERE purchase_order_id = $1`,
        [input.purchaseOrderId],
      );
      const totalQty = totalRes.rows[0]?.total_qty ?? 0;
      const totalRcv = totalRes.rows[0]?.total_rcv ?? 0;

      const nextStatus: PurchaseOrderStatus =
        totalRcv >= totalQty ? "completed" : "partially_received";

      await client.query(
        `UPDATE purchase_orders SET status = $2, updated_at = NOW() WHERE id = $1`,
        [input.purchaseOrderId, nextStatus],
      );

      await client.query("COMMIT");

      const vehicle = mapFleetVehicleRow(vehicleRes.rows[0]!);
      const po = await this.findPurchaseOrderById(input.purchaseOrderId);
      return { vehicle, po: po! };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // --- Phase 5: Fleet Vehicles Asset Register ---
  async createFleetVehicle(
    input: CreateFleetVehicleInput,
  ): Promise<FleetVehicleRecord> {
    const id = input.id ?? crypto.randomUUID();
    let assetCode = input.assetCode?.trim() || "";
    if (!assetCode) {
      const maxAssetRes = await this.pool.query<{ max_seq: number }>(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(asset_code FROM '^(?:VEH-)?([0-9]+)$') AS INTEGER)), 0) AS max_seq
         FROM fleet_vehicles WHERE company_id = $1`,
        [input.companyId],
      );
      const nextSeq = Number(maxAssetRes.rows[0]?.max_seq ?? 0) + 1;
      assetCode = String(nextSeq).padStart(4, "0");
    }
    const hasExplicitPricing =
      (input.dailyRate1to2 ?? 0) > 0 ||
      (input.dailyRate3to7 ?? 0) > 0 ||
      (input.dailyRate8Plus ?? 0) > 0;
    const inheritedPricingRes = await this.pool.query<{
      daily_rate_1_to_2: string | number;
      daily_rate_3_to_7: string | number;
      daily_rate_8_plus: string | number;
      damage_excess: string | number;
      mileage_policy: "unlimited" | "limited";
      daily_km_limit: number;
      extra_km_rate: string | number;
      photo_url: string | null;
      location_type: string | null;
      fuel_policy: string | null;
      instant_confirmation: boolean | null;
      description: string | null;
      delivery_policy: string | null;
      inclusions: string[] | null;
      seats: number | null;
      doors: number | null;
      air_conditioning: boolean | null;
      fuel_type: string | null;
      luggage_capacity: string | null;
      transmission: string | null;
    }>(
      `SELECT daily_rate_1_to_2, daily_rate_3_to_7, daily_rate_8_plus, damage_excess,
              mileage_policy, daily_km_limit, extra_km_rate,
              photo_url, location_type, fuel_policy, instant_confirmation, description,
              delivery_policy, inclusions, seats, doors, air_conditioning, fuel_type,
              luggage_capacity, transmission
       FROM fleet_vehicles
       WHERE company_id = $1 AND variant_id = $2
       ORDER BY (daily_rate_1_to_2 > 0 OR daily_rate_3_to_7 > 0 OR daily_rate_8_plus > 0) DESC,
                (photo_url IS NOT NULL OR COALESCE(array_length(inclusions, 1), 0) > 0) DESC,
                (branch_id = $3) DESC NULLS LAST,
                updated_at DESC
       LIMIT 1`,
      [input.companyId, input.variantId, input.branchId ?? null],
    );
    const inheritedPricing = inheritedPricingRes.rows[0];
    const variantDefaultsRes = await this.pool.query<{
      daily_rate_1_to_2: string | null;
      daily_rate_3_to_7: string | null;
      daily_rate_8_plus: string | null;
      damage_excess: string | null;
      photo_url: string | null;
    }>(
      `SELECT daily_rate_1_to_2, daily_rate_3_to_7, daily_rate_8_plus, damage_excess, photo_url
       FROM vehicle_variants WHERE id = $1 AND company_id = $2`,
      [input.variantId, input.companyId],
    );
    const variantDefaults = variantDefaultsRes.rows[0];
    const mergedInherited = inheritedPricing
      ? {
          ...inheritedPricing,
          daily_rate_1_to_2:
            Number(inheritedPricing.daily_rate_1_to_2) > 0
              ? inheritedPricing.daily_rate_1_to_2
              : (variantDefaults?.daily_rate_1_to_2 ?? "0"),
          daily_rate_3_to_7:
            Number(inheritedPricing.daily_rate_3_to_7) > 0
              ? inheritedPricing.daily_rate_3_to_7
              : (variantDefaults?.daily_rate_3_to_7 ?? "0"),
          daily_rate_8_plus:
            Number(inheritedPricing.daily_rate_8_plus) > 0
              ? inheritedPricing.daily_rate_8_plus
              : (variantDefaults?.daily_rate_8_plus ?? "0"),
          damage_excess:
            Number(inheritedPricing.damage_excess) > 0
              ? inheritedPricing.damage_excess
              : (variantDefaults?.damage_excess ?? "0"),
          photo_url: inheritedPricing.photo_url ?? variantDefaults?.photo_url ?? null,
        }
      : variantDefaults
        ? {
            daily_rate_1_to_2: variantDefaults.daily_rate_1_to_2 ?? "0",
            daily_rate_3_to_7: variantDefaults.daily_rate_3_to_7 ?? "0",
            daily_rate_8_plus: variantDefaults.daily_rate_8_plus ?? "0",
            damage_excess: variantDefaults.damage_excess ?? "0",
            mileage_policy: null,
            daily_km_limit: null,
            extra_km_rate: "0",
            photo_url: variantDefaults.photo_url ?? null,
            location_type: null,
            fuel_policy: null,
            instant_confirmation: null,
            description: null,
            delivery_policy: null,
            inclusions: null,
            seats: null,
            doors: null,
            air_conditioning: null,
            fuel_type: null,
            luggage_capacity: null,
            transmission: null,
          }
        : undefined;
    const res = await this.pool.query<DbFleetVehicleRow>(
      `INSERT INTO fleet_vehicles
        (id, asset_code, company_id, branch_id, variant_id, purchase_order_id, vin, license_plate,
         key_number, color, mileage_odometer, status, notes,
         photo_url, location_type, fuel_policy, instant_confirmation, description, delivery_policy,
         daily_rate_1_to_2, daily_rate_3_to_7, daily_rate_8_plus, damage_excess,
         mileage_policy, daily_km_limit, extra_km_rate, inclusions,
         seats, doors, air_conditioning, fuel_type, luggage_capacity, transmission,
         is_bookable, published_to_fleet_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
               $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33,
               $34, CASE WHEN $34 THEN NOW() ELSE NULL END, $35)
       RETURNING *`,
      [
        id,
        assetCode,
        input.companyId,
        input.branchId,
        input.variantId,
        input.purchaseOrderId ?? null,
        input.vin.trim().toUpperCase(),
        input.licensePlate.trim().toUpperCase(),
        input.keyNumber?.trim() || null,
        input.color.trim(),
        input.mileageOdometer ?? 0,
        input.status ?? "available",
        input.notes?.trim() || null,
        input.photoUrl?.trim() || inheritedPricing?.photo_url || null,
        input.locationType ?? inheritedPricing?.location_type ?? "airport_terminal",
        input.fuelPolicy ?? inheritedPricing?.fuel_policy ?? "full_to_full",
        input.instantConfirmation ?? inheritedPricing?.instant_confirmation ?? false,
        input.description?.trim() || inheritedPricing?.description || null,
        input.deliveryPolicy?.trim() || inheritedPricing?.delivery_policy || null,
        hasExplicitPricing ? (input.dailyRate1to2 ?? 0) : Number(mergedInherited?.daily_rate_1_to_2 ?? 0),
        hasExplicitPricing ? (input.dailyRate3to7 ?? 0) : Number(mergedInherited?.daily_rate_3_to_7 ?? 0),
        hasExplicitPricing ? (input.dailyRate8Plus ?? 0) : Number(mergedInherited?.daily_rate_8_plus ?? 0),
        (input.damageExcess && input.damageExcess > 0)
          ? input.damageExcess
          : Number(mergedInherited?.damage_excess ?? 0),
        input.mileagePolicy ?? inheritedPricing?.mileage_policy ?? "unlimited",
        input.dailyKmLimit ?? inheritedPricing?.daily_km_limit ?? 0,
        input.extraKmRate ?? Number(inheritedPricing?.extra_km_rate ?? 0),
        (input.inclusions && input.inclusions.length > 0)
          ? input.inclusions
          : (inheritedPricing?.inclusions ?? []),
        input.seats ?? inheritedPricing?.seats ?? 5,
        input.doors ?? inheritedPricing?.doors ?? 4,
        input.airConditioning !== undefined
          ? input.airConditioning
          : (inheritedPricing?.air_conditioning ?? true),
        input.fuelType ?? inheritedPricing?.fuel_type ?? "petrol",
        input.luggageCapacity ?? inheritedPricing?.luggage_capacity ?? "2 Bags",
        input.transmission ?? inheritedPricing?.transmission ?? "automatic",
        Boolean(input.isBookable),
        input.createdByUserId ?? null,
      ],
    );
    return (await this.findFleetVehicleById(res.rows[0]!.id))!;
  }

  async findFleetVehicleById(
    vehicleId: string,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `SELECT v.*, b.name as branch_name, c.name as company_name,
              COALESCE(fcu.full_name, fcu.email) as created_by_user_name,
              po.po_number as po_number, po.order_date as po_order_date,
              ven.name as vendor_name,
              poi.unit_price as purchase_price,
              var.make as variant_make, var.model as variant_model,
              var.model_year as variant_model_year, var.trim as variant_trim,
              var.category as variant_category, var.transmission as variant_transmission,
              var.fuel_type as variant_fuel_type, var.seating_capacity as variant_seating_capacity,
              var.sipp_code as variant_sipp_code, var.status as variant_status
       FROM fleet_vehicles v
       LEFT JOIN branches b ON b.id = v.branch_id
       LEFT JOIN companies c ON c.id = v.company_id
       LEFT JOIN users fcu ON fcu.id = v.created_by_user_id
       LEFT JOIN purchase_orders po ON po.id = v.purchase_order_id
       LEFT JOIN vendors ven ON ven.id = po.vendor_id
       LEFT JOIN LATERAL (
         SELECT unit_price FROM purchase_order_items
         WHERE purchase_order_id = v.purchase_order_id AND variant_id = v.variant_id
           AND (vin IS NULL OR UPPER(vin) = UPPER(v.vin))
         LIMIT 1
       ) poi ON TRUE
       LEFT JOIN vehicle_variants var ON var.id = v.variant_id
       WHERE v.id = $1`,
      [vehicleId],
    );
    const row = res.rows[0];
    return row ? mapFleetVehicleRow(row) : null;
  }

  async findFleetVehicleByVin(
    companyId: string,
    vin: string,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `SELECT id FROM fleet_vehicles WHERE company_id = $1 AND UPPER(vin) = UPPER($2)`,
      [companyId, vin.trim()],
    );
    const row = res.rows[0];
    return row ? this.findFleetVehicleById(row.id) : null;
  }

  async findFleetVehicleByLicensePlate(
    companyId: string,
    licensePlate: string,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `SELECT id FROM fleet_vehicles WHERE company_id = $1 AND UPPER(license_plate) = UPPER($2)`,
      [companyId, licensePlate.trim()],
    );
    const row = res.rows[0];
    return row ? this.findFleetVehicleById(row.id) : null;
  }

  async listFleetVehicles(
    companyId: string,
    filter?: FleetVehicleFilterOptions,
    permittedBranchIds?: string[],
  ): Promise<FleetVehicleRecord[]> {
    let query = `
      SELECT v.*, b.name as branch_name, c.name as company_name,
             COALESCE(fcu.full_name, fcu.email) as created_by_user_name,
             po.po_number as po_number, po.order_date as po_order_date,
             ven.name as vendor_name,
             poi.unit_price as purchase_price,
             var.make as variant_make, var.model as variant_model,
             var.model_year as variant_model_year, var.trim as variant_trim,
             var.category as variant_category, var.transmission as variant_transmission,
             var.fuel_type as variant_fuel_type, var.seating_capacity as variant_seating_capacity,
             var.sipp_code as variant_sipp_code, var.status as variant_status,
             CASE
               WHEN v.status IN ('maintenance', 'out_of_service') THEN v.status
               WHEN EXISTS (
                 SELECT 1 FROM vehicle_maintenance_logs vml
                 WHERE vml.vehicle_id = v.id AND vml.status IN ('in_progress', 'pending')
               ) THEN 'maintenance'
               WHEN EXISTS (
                 SELECT 1 FROM rental_contracts rc
                 WHERE rc.vehicle_id = v.id AND rc.status = 'active'
                   AND CURRENT_DATE >= rc.start_date AND CURRENT_DATE <= rc.end_date
               ) THEN 'on_rent'
               WHEN EXISTS (
                 SELECT 1 FROM rental_contracts rc
                 WHERE rc.vehicle_id = v.id AND rc.status = 'active'
                   AND rc.start_date > CURRENT_DATE
               ) THEN 'reserved'
               ELSE 'available'
             END AS computed_status,
             FALSE as is_partner_vehicle
      FROM fleet_vehicles v
      LEFT JOIN branches b ON b.id = v.branch_id
      LEFT JOIN companies c ON c.id = v.company_id
      LEFT JOIN users fcu ON fcu.id = v.created_by_user_id
      LEFT JOIN purchase_orders po ON po.id = v.purchase_order_id
      LEFT JOIN vendors ven ON ven.id = po.vendor_id
      LEFT JOIN LATERAL (
        SELECT unit_price FROM purchase_order_items
        WHERE purchase_order_id = v.purchase_order_id AND variant_id = v.variant_id
          AND (vin IS NULL OR UPPER(vin) = UPPER(v.vin))
        LIMIT 1
      ) poi ON TRUE
      LEFT JOIN vehicle_variants var ON var.id = v.variant_id
      WHERE v.company_id = $1
    `;
    const params: unknown[] = [companyId];

    if (permittedBranchIds !== undefined) {
      if (permittedBranchIds.length === 0) return [];
      params.push(permittedBranchIds);
      query += ` AND v.branch_id = ANY($${params.length}::uuid[])`;
    }

    if (filter?.branchId) {
      params.push(filter.branchId);
      query += ` AND v.branch_id = $${params.length}`;
    }

    if (filter?.status) {
      params.push(filter.status);
      query += ` AND v.status = $${params.length}`;
    }

    if (filter?.variantId) {
      params.push(filter.variantId);
      query += ` AND v.variant_id = $${params.length}`;
    }

    if (typeof filter?.isBookable === "boolean") {
      params.push(filter.isBookable);
      query += ` AND v.is_bookable = $${params.length}`;
    }

    if (filter?.search) {
      params.push(`%${filter.search.trim()}%`);
      query += ` AND (v.asset_code ILIKE $${params.length} OR v.vin ILIKE $${params.length} OR v.license_plate ILIKE $${params.length} OR var.make ILIKE $${params.length} OR var.model ILIKE $${params.length})`;
    }

    query += ` ORDER BY v.created_at DESC`;
    const res = await this.pool.query<
      DbFleetVehicleRow & { is_partner_vehicle?: boolean; computed_status?: string }
    >(query, params);
    const directVehicles = res.rows.map((r) => {
      const rec = mapFleetVehicleRow(r);
      if (r.computed_status) {
        rec.status = r.computed_status as FleetVehicleRecord["status"];
      }
      rec.isPartnerVehicle = false;
      return rec;
    });

    // Check if network vehicles should be included
    if (filter?.includeNetwork) {
      const compRes = await this.pool.query(
        `SELECT operating_mode FROM companies WHERE id = $1`,
        [companyId],
      );
      if (compRes.rows[0]?.operating_mode === "network_main") {
        const partnerRes = await this.pool.query<
          DbFleetVehicleRow & { is_partner_vehicle?: boolean }
        >(
          `SELECT v.*,
                  COALESCE(b.city, b.name, c.country_code) as branch_name,
                  c.name as company_name,
                  c.country_code as company_country_code,
                  var.make as variant_make, var.model as variant_model,
                  var.model_year as variant_model_year, var.trim as variant_trim,
                  var.category as variant_category, var.transmission as variant_transmission,
                  var.fuel_type as variant_fuel_type, var.seating_capacity as variant_seating_capacity,
                  var.sipp_code as variant_sipp_code, var.status as variant_status,
                  TRUE as is_partner_vehicle
           FROM fleet_vehicles v
           JOIN company_network_links cnl ON cnl.local_company_id = v.company_id AND cnl.status = 'active'
           LEFT JOIN branches b ON b.id = v.branch_id
           LEFT JOIN companies c ON c.id = v.company_id
           LEFT JOIN vehicle_variants var ON var.id = v.variant_id
           WHERE cnl.main_company_id = $1
             AND (
               NOT EXISTS (SELECT 1 FROM network_permitted_branches npb WHERE npb.link_id = cnl.id)
               OR v.branch_id IS NULL
               OR EXISTS (SELECT 1 FROM network_permitted_branches npb WHERE npb.link_id = cnl.id AND npb.branch_id = v.branch_id)
             )
           ORDER BY v.created_at DESC`,
          [companyId],
        );
        const partnerVehicles = partnerRes.rows.map((r) => {
          const rec = mapFleetVehicleRow(r);
          rec.isPartnerVehicle = true;
          return rec;
        });
        return [...directVehicles, ...partnerVehicles];
      }
    }

    return directVehicles;
  }

  async updateFleetVehicle(
    vehicleId: string,
    input: UpdateFleetVehicleInput,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `UPDATE fleet_vehicles
       SET branch_id = COALESCE($2, branch_id),
           key_number = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE key_number END,
           color = COALESCE($4, color),
           mileage_odometer = COALESCE($5, mileage_odometer),
           status = COALESCE($6, status),
           notes = CASE WHEN $7::text IS NOT NULL THEN $7 ELSE notes END,
           photo_url = CASE WHEN $8::text IS NOT NULL THEN $8 ELSE photo_url END,
           location_type = COALESCE($9, location_type),
           fuel_policy = COALESCE($10, fuel_policy),
           instant_confirmation = COALESCE($11, instant_confirmation),
           description = CASE WHEN $12::text IS NOT NULL THEN $12 ELSE description END,
           delivery_policy = CASE WHEN $13::text IS NOT NULL THEN $13 ELSE delivery_policy END,
           daily_rate_1_to_2 = COALESCE($14, daily_rate_1_to_2),
           daily_rate_3_to_7 = COALESCE($15, daily_rate_3_to_7),
           daily_rate_8_plus = COALESCE($16, daily_rate_8_plus),
           damage_excess = COALESCE($17, damage_excess),
           mileage_policy = COALESCE($18, mileage_policy),
           daily_km_limit = COALESCE($19, daily_km_limit),
           extra_km_rate = COALESCE($20, extra_km_rate),
           inclusions = COALESCE($21, inclusions),
           seats = COALESCE($22, seats),
           doors = COALESCE($23, doors),
           air_conditioning = COALESCE($24, air_conditioning),
           fuel_type = COALESCE($25, fuel_type),
           luggage_capacity = COALESCE($26, luggage_capacity),
           transmission = COALESCE($27, transmission),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        vehicleId,
        input.branchId ?? null,
        input.keyNumber !== undefined ? input.keyNumber?.trim() || null : null,
        input.color?.trim() ?? null,
        input.mileageOdometer ?? null,
        input.status ?? null,
        input.notes !== undefined ? input.notes?.trim() || null : null,
        input.photoUrl !== undefined ? input.photoUrl?.trim() || null : null,
        input.locationType ?? null,
        input.fuelPolicy ?? null,
        input.instantConfirmation ?? null,
        input.description !== undefined ? input.description?.trim() || null : null,
        input.deliveryPolicy !== undefined ? input.deliveryPolicy?.trim() || null : null,
        input.dailyRate1to2 ?? null,
        input.dailyRate3to7 ?? null,
        input.dailyRate8Plus ?? null,
        input.damageExcess ?? null,
        input.mileagePolicy ?? null,
        input.dailyKmLimit ?? null,
        input.extraKmRate ?? null,
        input.inclusions ?? null,
        input.seats ?? null,
        input.doors ?? null,
        input.airConditioning ?? null,
        input.fuelType ?? null,
        input.luggageCapacity ?? null,
        input.transmission ?? null,
      ],
    );
    const row = res.rows[0];
    return row ? this.findFleetVehicleById(row.id) : null;
  }

  async updateFleetVehicleStatus(
    vehicleId: string,
    status: FleetVehicleStatus,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `UPDATE fleet_vehicles SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [vehicleId, status],
    );
    const row = res.rows[0];
    return row ? this.findFleetVehicleById(row.id) : null;
  }

  // --- Phase 5: Vehicle Photo Catalog ---
  async createVehiclePhoto(
    input: CreateVehiclePhotoInput,
  ): Promise<VehiclePhotoRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbVehiclePhotoRow>(
      `INSERT INTO vehicle_photos (id, company_id, vehicle_name, photo_url, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        input.companyId,
        input.vehicleName.trim(),
        input.photoUrl.trim(),
        input.category?.trim() || "General",
      ],
    );
    return mapVehiclePhotoRow(res.rows[0]!);
  }

  async listVehiclePhotos(
    companyId: string,
    search?: string,
  ): Promise<VehiclePhotoRecord[]> {
    let query = `SELECT * FROM vehicle_photos WHERE company_id = $1`;
    const params: unknown[] = [companyId];
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND vehicle_name ILIKE $${params.length}`;
    }
    query += ` ORDER BY created_at DESC`;
    const res = await this.pool.query<DbVehiclePhotoRow>(query, params);
    return res.rows.map(mapVehiclePhotoRow);
  }

  async getVehiclePhotoById(id: string): Promise<VehiclePhotoRecord | null> {
    const res = await this.pool.query<DbVehiclePhotoRow>(
      `SELECT * FROM vehicle_photos WHERE id = $1`,
      [id],
    );
    return res.rows[0] ? mapVehiclePhotoRow(res.rows[0]) : null;
  }

  async updateVehiclePhoto(
    id: string,
    input: { vehicleName?: string; photoUrl?: string; category?: string },
  ): Promise<VehiclePhotoRecord | null> {
    const existing = await this.getVehiclePhotoById(id);
    if (!existing) return null;
    const vehicleName = input.vehicleName !== undefined ? input.vehicleName.trim() : existing.vehicleName;
    const photoUrl = input.photoUrl !== undefined ? input.photoUrl.trim() : existing.photoUrl;
    const category = input.category !== undefined ? input.category.trim() || "General" : existing.category;
    const res = await this.pool.query<DbVehiclePhotoRow>(
      `UPDATE vehicle_photos
       SET vehicle_name = $1, photo_url = $2, category = $3
       WHERE id = $4
       RETURNING *`,
      [vehicleName, photoUrl, category, id],
    );
    return res.rows[0] ? mapVehiclePhotoRow(res.rows[0]) : null;
  }

  async deleteVehiclePhoto(id: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM vehicle_photos WHERE id = $1 RETURNING id`,
      [id],
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Rental Inclusions ---
  async createRentalInclusion(
    input: CreateRentalInclusionInput,
  ): Promise<RentalInclusionRecord> {
    const id = input.id ?? crypto.randomUUID();
    const res = await this.pool.query<DbRentalInclusionRow>(
      `INSERT INTO rental_inclusions (id, company_id, name, description, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        input.companyId,
        input.name.trim(),
        input.description?.trim() || null,
        input.isActive ?? true,
      ],
    );
    return mapRentalInclusionRow(res.rows[0]!);
  }

  async getRentalInclusionById(id: string): Promise<RentalInclusionRecord | null> {
    const res = await this.pool.query<DbRentalInclusionRow>(
      `SELECT * FROM rental_inclusions WHERE id = $1`,
      [id],
    );
    return res.rows[0] ? mapRentalInclusionRow(res.rows[0]) : null;
  }

  async listRentalInclusions(
    companyId: string,
    search?: string,
    activeOnly?: boolean,
  ): Promise<RentalInclusionRecord[]> {
    let query = `SELECT * FROM rental_inclusions WHERE company_id = $1`;
    const params: unknown[] = [companyId];
    if (activeOnly) {
      params.push(true);
      query += ` AND is_active = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND name ILIKE $${params.length}`;
    }
    query += ` ORDER BY name ASC`;
    const res = await this.pool.query<DbRentalInclusionRow>(query, params);
    return res.rows.map(mapRentalInclusionRow);
  }

  async updateRentalInclusion(
    id: string,
    input: UpdateRentalInclusionInput,
  ): Promise<RentalInclusionRecord | null> {
    const existing = await this.getRentalInclusionById(id);
    if (!existing) return null;
    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const description = input.description !== undefined ? input.description?.trim() || null : existing.description;
    const isActive = input.isActive !== undefined ? input.isActive : existing.isActive;
    const res = await this.pool.query<DbRentalInclusionRow>(
      `UPDATE rental_inclusions
       SET name = $1, description = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, description, isActive, id],
    );
    return res.rows[0] ? mapRentalInclusionRow(res.rows[0]) : null;
  }

  async deleteRentalInclusion(id: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM rental_inclusions WHERE id = $1 RETURNING id`,
      [id],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async signPurchaseOrder(
    poId: string,
    signatureDataUrl: string,
    signedByName: string,
  ): Promise<PurchaseOrderRecord | null> {
    const result = await this.pool.query(
      `UPDATE purchase_orders
       SET signature_data_url = $1,
           signed_by_name = $2,
           signed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 AND signed_at IS NULL AND NULLIF(signature_data_url, '') IS NULL`,
      [signatureDataUrl, signedByName, poId],
    );
    if (!result.rowCount) return null;
    return this.findPurchaseOrderById(poId);
  }

  async listVehicleMakes(companyId: string): Promise<
    Array<{
      id: string;
      companyId: string;
      name: string;
      models: Array<{ id: string; makeId: string; name: string }>;
    }>
  > {
    const makesRes = await this.pool.query<{
      id: string;
      company_id: string;
      name: string;
    }>(
      `SELECT id, company_id, name
       FROM vehicle_makes
       WHERE company_id = $1
       ORDER BY LOWER(name) ASC`,
      [companyId],
    );

    const modelsRes = await this.pool.query<{
      id: string;
      make_id: string;
      name: string;
    }>(
      `SELECT id, make_id, name
       FROM vehicle_models
       WHERE company_id = $1
       ORDER BY LOWER(name) ASC`,
      [companyId],
    );

    const modelsByMake = new Map<
      string,
      Array<{ id: string; makeId: string; name: string }>
    >();
    for (const row of modelsRes.rows) {
      const list = modelsByMake.get(row.make_id) ?? [];
      list.push({ id: row.id, makeId: row.make_id, name: row.name });
      modelsByMake.set(row.make_id, list);
    }

    return makesRes.rows.map((m) => ({
      id: m.id,
      companyId: m.company_id,
      name: m.name,
      models: modelsByMake.get(m.id) ?? [],
    }));
  }

  async createVehicleMake(
    companyId: string,
    name: string,
  ): Promise<{
    id: string;
    companyId: string;
    name: string;
    models: Array<{ id: string; makeId: string; name: string }>;
  }> {
    const cleanName = name.trim();
    const existing = await this.pool.query<{
      id: string;
      company_id: string;
      name: string;
    }>(
      `SELECT id, company_id, name
       FROM vehicle_makes
       WHERE company_id = $1 AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [companyId, cleanName],
    );

    if (existing.rows[0]) {
      const m = existing.rows[0];
      const modelsRes = await this.pool.query<{
        id: string;
        make_id: string;
        name: string;
      }>(
        `SELECT id, make_id, name
         FROM vehicle_models
         WHERE make_id = $1
         ORDER BY LOWER(name) ASC`,
        [m.id],
      );
      return {
        id: m.id,
        companyId: m.company_id,
        name: m.name,
        models: modelsRes.rows.map((r) => ({
          id: r.id,
          makeId: r.make_id,
          name: r.name,
        })),
      };
    }

    const inserted = await this.pool.query<{
      id: string;
      company_id: string;
      name: string;
    }>(
      `INSERT INTO vehicle_makes (company_id, name)
       VALUES ($1, $2)
       RETURNING id, company_id, name`,
      [companyId, cleanName],
    );

    const row = inserted.rows[0]!;
    return {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      models: [],
    };
  }

  async createVehicleModel(
    companyId: string,
    makeId: string,
    name: string,
  ): Promise<{ id: string; makeId: string; name: string }> {
    const cleanName = name.trim();
    const existing = await this.pool.query<{
      id: string;
      make_id: string;
      name: string;
    }>(
      `SELECT id, make_id, name
       FROM vehicle_models
       WHERE company_id = $1 AND make_id = $2 AND LOWER(name) = LOWER($3)
       LIMIT 1`,
      [companyId, makeId, cleanName],
    );

    if (existing.rows[0]) {
      const r = existing.rows[0];
      return { id: r.id, makeId: r.make_id, name: r.name };
    }

    const inserted = await this.pool.query<{
      id: string;
      make_id: string;
      name: string;
    }>(
      `INSERT INTO vehicle_models (company_id, make_id, name)
       VALUES ($1, $2, $3)
       RETURNING id, make_id, name`,
      [companyId, makeId, cleanName],
    );

    const row = inserted.rows[0]!;
    return { id: row.id, makeId: row.make_id, name: row.name };
  }

  async listInsuranceCompanies(companyId: string) {
    const res = await this.pool.query(
      `SELECT id, company_id, name, contact_person, phone, email, address, created_at
       FROM insurance_companies
       WHERE company_id = $1
       ORDER BY LOWER(name) ASC`,
      [companyId],
    );
    return res.rows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      name: r.name,
      contactPerson: r.contact_person ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      address: r.address ?? null,
      createdAt: new Date(r.created_at),
    }));
  }

  async listInsurancePoliciesByInsuranceCompany(
    companyId: string,
    insuranceCompanyId: string,
  ) {
    const res = await this.pool.query(
      `SELECT p.id, p.vehicle_id, p.provider_name, p.policy_number, p.coverage_type,
              p.premium_amount, p.deductible_amount, p.start_date, p.expiry_date, p.status,
              v.license_plate, v.vin, b.name AS branch_name,
              vv.make, vv.model, vv.trim, vv.model_year
       FROM vehicle_insurance_policies p
       INNER JOIN fleet_vehicles v ON v.id = p.vehicle_id
       LEFT JOIN vehicle_variants vv ON vv.id = v.variant_id
       LEFT JOIN branches b ON b.id = v.branch_id
       LEFT JOIN insurance_companies ic ON ic.id = $2 AND ic.company_id = $1
       WHERE p.company_id = $1
         AND (
           p.insurance_company_id = $2
           OR (ic.name IS NOT NULL AND LOWER(TRIM(p.provider_name)) = LOWER(TRIM(ic.name)))
         )
       ORDER BY p.expiry_date DESC, p.created_at DESC`,
      [companyId, insuranceCompanyId],
    );
    const fmtDate = (d: unknown) =>
      d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? "").slice(0, 10);
    return res.rows.map((r) => ({
      id: r.id as string,
      vehicleId: r.vehicle_id as string,
      vehicleTitle: r.make
        ? `${r.make} ${r.model}${r.trim ? ` ${r.trim}` : ""} ${r.model_year}`
        : (r.license_plate as string),
      licensePlate: (r.license_plate as string) || "",
      vin: (r.vin as string) || "",
      branchName: (r.branch_name as string | null) ?? null,
      providerName: (r.provider_name as string) || "",
      policyNumber: (r.policy_number as string) || "",
      coverageType: (r.coverage_type as string) || "comprehensive",
      premiumAmount: Number(r.premium_amount ?? 0),
      deductibleAmount: Number(r.deductible_amount ?? 0),
      startDate: fmtDate(r.start_date),
      expiryDate: fmtDate(r.expiry_date),
      status: (r.status as string) || "active",
    }));
  }

  async createInsuranceCompany(input: {
    companyId: string;
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  }) {
    const res = await this.pool.query(
      `INSERT INTO insurance_companies (company_id, name, contact_person, phone, email, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (company_id, LOWER(name))
       DO UPDATE SET
         contact_person = COALESCE(EXCLUDED.contact_person, insurance_companies.contact_person),
         phone = COALESCE(EXCLUDED.phone, insurance_companies.phone),
         email = COALESCE(EXCLUDED.email, insurance_companies.email),
         address = COALESCE(EXCLUDED.address, insurance_companies.address)
       RETURNING id, company_id, name, contact_person, phone, email, address, created_at`,
      [
        input.companyId,
        input.name.trim(),
        input.contactPerson?.trim() || null,
        input.phone?.trim() || null,
        input.email?.trim() || null,
        input.address?.trim() || null,
      ],
    );
    const r = res.rows[0]!;
    return {
      id: r.id,
      companyId: r.company_id,
      name: r.name,
      contactPerson: r.contact_person ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      address: r.address ?? null,
      createdAt: new Date(r.created_at),
    };
  }

  async deleteInsuranceCompany(companyId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM insurance_companies WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, companyId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getVehicleLifecycleProfile(companyId: string, vehicleId: string) {
    const [insRes, odoRes, maintRes, inspRes, dmgRes] = await Promise.all([
      this.pool.query(
        `SELECT * FROM vehicle_insurance_policies WHERE company_id = $1 AND vehicle_id = $2 ORDER BY created_at DESC`,
        [companyId, vehicleId],
      ),
      this.pool.query(
        `SELECT * FROM vehicle_odometer_logs WHERE company_id = $1 AND vehicle_id = $2 ORDER BY recorded_at DESC`,
        [companyId, vehicleId],
      ),
      this.pool.query(
        `SELECT vml.*, COALESCE(u.full_name, u.email) AS created_by_user_name
         FROM vehicle_maintenance_logs vml
         LEFT JOIN users u ON u.id = vml.created_by_user_id
         WHERE vml.company_id = $1 AND vml.vehicle_id = $2
         ORDER BY vml.service_date DESC, vml.created_at DESC`,
        [companyId, vehicleId],
      ),
      this.pool.query(
        `SELECT * FROM vehicle_inspections WHERE company_id = $1 AND vehicle_id = $2 ORDER BY inspected_at DESC`,
        [companyId, vehicleId],
      ),
      this.pool.query(
        `SELECT * FROM vehicle_damage_points WHERE vehicle_id = $1 ORDER BY created_at DESC`,
        [vehicleId],
      ),
    ]);

    const fmtDate = (d: any) =>
      typeof d === "string" ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);

    const damagePoints = dmgRes.rows.map((d) => ({
      id: d.id,
      inspectionId: d.inspection_id,
      vehicleId: d.vehicle_id,
      zoneKey: d.zone_key,
      severity: d.severity,
      description: d.description ?? null,
      repairCost: Number(d.repair_cost ?? 0),
      isResolved: Boolean(d.is_resolved),
      createdAt: new Date(d.created_at),
    }));

    return {
      insurancePolicies: insRes.rows.map((p) => ({
        id: p.id,
        companyId: p.company_id,
        vehicleId: p.vehicle_id,
        insuranceCompanyId: p.insurance_company_id ?? null,
        providerName: p.provider_name,
        policyNumber: p.policy_number,
        coverageType: p.coverage_type,
        premiumAmount: Number(p.premium_amount ?? 0),
        deductibleAmount: Number(p.deductible_amount ?? 0),
        startDate: fmtDate(p.start_date),
        expiryDate: fmtDate(p.expiry_date),
        status: p.status,
        notes: p.notes ?? null,
        createdAt: new Date(p.created_at),
      })),
      odometerLogs: odoRes.rows.map((o) => ({
        id: o.id,
        companyId: o.company_id,
        vehicleId: o.vehicle_id,
        source: o.source,
        referenceLabel: o.reference_label ?? null,
        odometerKm: Number(o.odometer_km),
        deltaKm: Number(o.delta_km ?? 0),
        recordedBy: o.recorded_by ?? null,
        recordedAt: new Date(o.recorded_at),
      })),
      maintenanceLogs: maintRes.rows.map((m) => ({
        id: m.id,
        companyId: m.company_id,
        vehicleId: m.vehicle_id,
        serviceType: m.service_type,
        workshopName: m.workshop_name ?? null,
        odometerAtService: Number(m.odometer_at_service ?? 0),
        nextServiceKm: m.next_service_km != null ? Number(m.next_service_km) : null,
        nextServiceDate: m.next_service_date ? fmtDate(m.next_service_date) : null,
        cost: Number(m.cost ?? 0),
        status: m.status,
        notes: m.notes ?? null,
        serviceDate: fmtDate(m.service_date),
        createdByUserId: m.created_by_user_id ?? null,
        createdByUserName: m.created_by_user_name ?? null,
        createdAt: new Date(m.created_at),
      })),
      inspections: inspRes.rows.map((i) => ({
        id: i.id,
        companyId: i.company_id,
        vehicleId: i.vehicle_id,
        inspectionType: i.inspection_type,
        bookingRef: i.booking_ref ?? null,
        customerName: i.customer_name ?? null,
        odometerKm: Number(i.odometer_km ?? 0),
        hasAccident: Boolean(i.has_accident),
        accidentNotes: i.accident_notes ?? null,
        inspectedBy: i.inspected_by ?? null,
        inspectedAt: new Date(i.inspected_at),
        damagePoints: damagePoints.filter((dp) => dp.inspectionId === i.id),
      })),
      damagePoints,
      movements: await this.listVehicleMovements(companyId, { vehicleId }),
    };
  }

  async upsertVehicleInsurancePolicy(input: {
    companyId: string;
    vehicleId: string;
    insuranceCompanyId?: string | null;
    providerName: string;
    policyNumber: string;
    coverageType: string;
    premiumAmount: number;
    deductibleAmount: number;
    startDate: string;
    expiryDate: string;
    notes?: string | null;
  }) {
    const res = await this.pool.query(
      `INSERT INTO vehicle_insurance_policies
        (company_id, vehicle_id, insurance_company_id, provider_name, policy_number, coverage_type, premium_amount, deductible_amount, start_date, expiry_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        input.companyId,
        input.vehicleId,
        input.insuranceCompanyId || null,
        input.providerName.trim(),
        input.policyNumber.trim(),
        input.coverageType,
        input.premiumAmount,
        input.deductibleAmount,
        input.startDate,
        input.expiryDate,
        input.notes?.trim() || null,
      ],
    );

    await this.pool.query(
      `UPDATE fleet_vehicles
       SET insurance_expiry = $1,
           insurance_company = $2,
           insurance_policy_number = $3,
           updated_at = NOW()
       WHERE id = $4 AND company_id = $5`,
      [
        input.expiryDate,
        input.providerName.trim(),
        input.policyNumber.trim(),
        input.vehicleId,
        input.companyId,
      ],
    );

    const p = res.rows[0]!;
    return {
      id: p.id,
      companyId: p.company_id,
      vehicleId: p.vehicle_id,
      insuranceCompanyId: p.insurance_company_id ?? null,
      providerName: p.provider_name,
      policyNumber: p.policy_number,
      coverageType: p.coverage_type,
      premiumAmount: Number(p.premium_amount ?? 0),
      deductibleAmount: Number(p.deductible_amount ?? 0),
      startDate: input.startDate,
      expiryDate: input.expiryDate,
      status: p.status,
      notes: p.notes ?? null,
      createdAt: new Date(p.created_at),
    };
  }

  async updateVehiclePricingTiers(
    companyId: string,
    vehicleId: string,
    input: {
      dailyRate1to2: number;
      dailyRate3to7: number;
      dailyRate8Plus: number;
      damageExcess: number;
      securityDeposit?: number;
      mileagePolicy: "unlimited" | "limited";
      dailyKmLimit: number;
      extraKmRate: number;
    },
  ) {
    await this.pool.query(
      `UPDATE fleet_vehicles
       SET daily_rate_1_to_2 = $1,
           daily_rate_3_to_7 = $2,
           daily_rate_8_plus = $3,
           damage_excess = $4,
           mileage_policy = $5,
           daily_km_limit = $6,
           extra_km_rate = $7,
           security_deposit = $8,
           updated_at = NOW()
       WHERE id = $9 AND company_id = $10`,
      [
        input.dailyRate1to2,
        input.dailyRate3to7,
        input.dailyRate8Plus,
        input.damageExcess,
        input.mileagePolicy,
        input.dailyKmLimit,
        input.extraKmRate,
        input.securityDeposit ?? 0,
        vehicleId,
        companyId,
      ],
    );
    return this.findFleetVehicleById(vehicleId);
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
  ): Promise<{ updatedCount: number }> {
    const params: unknown[] = [
      input.dailyRate1to2,
      input.dailyRate3to7,
      input.dailyRate8Plus,
      input.damageExcess,
      input.mileagePolicy ?? null,
      input.dailyKmLimit ?? null,
      input.extraKmRate ?? null,
      input.securityDeposit ?? null,
      variantId,
      companyId,
    ];
    let whereClause = "WHERE variant_id = $9 AND company_id = $10";
    if (input.unassignedOnly) {
      whereClause += " AND branch_id IS NULL";
    } else if (Array.isArray(input.branchIds) && input.branchIds.length > 0) {
      params.push(input.branchIds);
      whereClause += " AND branch_id = ANY($11::uuid[])";
    }
    const res = await this.pool.query(
      `UPDATE fleet_vehicles
       SET daily_rate_1_to_2 = $1,
           daily_rate_3_to_7 = $2,
           daily_rate_8_plus = $3,
           damage_excess = $4,
           mileage_policy = COALESCE($5, mileage_policy),
           daily_km_limit = COALESCE($6, daily_km_limit),
           extra_km_rate = COALESCE($7, extra_km_rate),
           security_deposit = COALESCE($8, security_deposit),
           updated_at = NOW()
       ${whereClause}`,
      params,
    );
    await this.pool.query(
      `UPDATE vehicle_variants
       SET daily_rate_1_to_2 = $1,
           daily_rate_3_to_7 = $2,
           daily_rate_8_plus = $3,
           damage_excess = $4,
           security_deposit = COALESCE($5, security_deposit),
           updated_at = NOW()
       WHERE id = $6 AND company_id = $7`,
      [
        input.dailyRate1to2,
        input.dailyRate3to7,
        input.dailyRate8Plus,
        input.damageExcess,
        input.securityDeposit ?? null,
        variantId,
        companyId,
      ],
    );
    return { updatedCount: res.rowCount ?? 0 };
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
  ): Promise<{ updatedCount: number }> {
    const hasBranchFilter = Array.isArray(input.branchIds) && input.branchIds.length > 0;
    const params: unknown[] = [
      input.photoUrl !== undefined ? input.photoUrl?.trim() || null : null,
      input.photoUrl !== undefined,
      input.locationType ?? null,
      input.fuelPolicy ?? null,
      input.instantConfirmation ?? null,
      input.description !== undefined ? input.description?.trim() || null : null,
      input.description !== undefined,
      input.deliveryPolicy !== undefined ? input.deliveryPolicy?.trim() || null : null,
      input.deliveryPolicy !== undefined,
      input.dailyRate1to2 ?? null,
      input.dailyRate3to7 ?? null,
      input.dailyRate8Plus ?? null,
      input.damageExcess ?? null,
      input.mileagePolicy ?? null,
      input.dailyKmLimit ?? null,
      input.extraKmRate ?? null,
      input.inclusions !== undefined ? input.inclusions : null,
      input.seats ?? null,
      input.doors ?? null,
      input.airConditioning ?? null,
      input.fuelType ?? null,
      input.luggageCapacity ?? null,
      input.transmission ?? null,
      input.publishToFleet === true,
      variantId,
      companyId,
    ];
    let whereClause = "WHERE variant_id = $25 AND company_id = $26";
    if (hasBranchFilter) {
      params.push(input.branchIds);
      whereClause += ` AND branch_id = ANY($27::uuid[])`;
    }
    const res = await this.pool.query(
      `UPDATE fleet_vehicles
       SET photo_url = CASE WHEN $2 THEN $1 ELSE photo_url END,
           location_type = COALESCE($3, location_type),
           fuel_policy = COALESCE($4, fuel_policy),
           instant_confirmation = COALESCE($5, instant_confirmation),
           description = CASE WHEN $7 THEN $6 ELSE description END,
           delivery_policy = CASE WHEN $9 THEN $8 ELSE delivery_policy END,
           daily_rate_1_to_2 = COALESCE($10, daily_rate_1_to_2),
           daily_rate_3_to_7 = COALESCE($11, daily_rate_3_to_7),
           daily_rate_8_plus = COALESCE($12, daily_rate_8_plus),
           damage_excess = COALESCE($13, damage_excess),
           mileage_policy = COALESCE($14, mileage_policy),
           daily_km_limit = COALESCE($15, daily_km_limit),
           extra_km_rate = COALESCE($16, extra_km_rate),
           inclusions = COALESCE($17::text[], inclusions),
           seats = COALESCE($18, seats),
           doors = COALESCE($19, doors),
           air_conditioning = COALESCE($20, air_conditioning),
           fuel_type = COALESCE($21, fuel_type),
           luggage_capacity = COALESCE($22, luggage_capacity),
           transmission = COALESCE($23, transmission),
           is_bookable = CASE WHEN $24 THEN TRUE ELSE is_bookable END,
           updated_at = NOW()
       ${whereClause}`,
      params,
    );
    await this.pool.query(
      `UPDATE vehicle_variants
       SET daily_rate_1_to_2 = COALESCE($1, daily_rate_1_to_2),
           daily_rate_3_to_7 = COALESCE($2, daily_rate_3_to_7),
           daily_rate_8_plus = COALESCE($3, daily_rate_8_plus),
           damage_excess = COALESCE($4, damage_excess),
           photo_url = CASE WHEN $5 THEN $6 ELSE photo_url END,
           updated_at = NOW()
       WHERE id = $7 AND company_id = $8`,
      [
        input.dailyRate1to2 ?? null,
        input.dailyRate3to7 ?? null,
        input.dailyRate8Plus ?? null,
        input.damageExcess ?? null,
        input.photoUrl !== undefined,
        input.photoUrl !== undefined ? input.photoUrl?.trim() || null : null,
        variantId,
        companyId,
      ],
    );
    return { updatedCount: res.rowCount ?? 0 };
  }

  async addVehicleMaintenanceLog(input: {
    companyId: string;
    vehicleId: string;
    serviceType: string;
    workshopName?: string | null;
    odometerAtService: number;
    nextServiceKm?: number | null;
    nextServiceDate?: string | null;
    cost: number;
    status: string;
    notes?: string | null;
    serviceDate: string;
    createdByUserId?: string | null;
  }) {
    const res = await this.pool.query(
      `INSERT INTO vehicle_maintenance_logs
        (company_id, vehicle_id, service_type, workshop_name, odometer_at_service, next_service_km, next_service_date, cost, status, notes, service_date, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        input.companyId,
        input.vehicleId,
        input.serviceType.trim(),
        input.workshopName?.trim() || null,
        input.odometerAtService,
        input.nextServiceKm ?? null,
        input.nextServiceDate || null,
        input.cost,
        input.status,
        input.notes?.trim() || null,
        input.serviceDate,
        input.createdByUserId ?? null,
      ],
    );
    const m = res.rows[0]!;
    if (input.status === "in_progress" || input.status === "pending") {
      await this.pool.query(
        `UPDATE fleet_vehicles SET status = 'maintenance', updated_at = NOW() WHERE id = $1 AND company_id = $2`,
        [input.vehicleId, input.companyId],
      );
    } else if (input.status === "completed") {
      await this.pool.query(
        `UPDATE fleet_vehicles SET status = 'available', updated_at = NOW() WHERE id = $1 AND company_id = $2 AND status = 'maintenance'`,
        [input.vehicleId, input.companyId],
      );
    }
    if (input.odometerAtService > 0) {
      const prevRes = await this.pool.query(
        `SELECT mileage_odometer FROM fleet_vehicles WHERE id = $1 AND company_id = $2`,
        [input.vehicleId, input.companyId],
      );
      const prevOdo = Number(prevRes.rows[0]?.mileage_odometer ?? 0);
      await this.pool.query(
        `UPDATE fleet_vehicles SET mileage_odometer = GREATEST(mileage_odometer, $2), updated_at = NOW() WHERE id = $1 AND company_id = $3`,
        [input.vehicleId, input.odometerAtService, input.companyId],
      );
      await this.pool.query(
        `INSERT INTO vehicle_odometer_logs (company_id, vehicle_id, source, reference_label, odometer_km, delta_km)
         VALUES ($1, $2, 'maintenance', $3, $4, $5)`,
        [
          input.companyId,
          input.vehicleId,
          input.serviceType.trim(),
          input.odometerAtService,
          Math.max(0, input.odometerAtService - prevOdo),
        ],
      );
    }
    return {
      id: m.id,
      companyId: m.company_id,
      vehicleId: m.vehicle_id,
      serviceType: m.service_type,
      workshopName: m.workshop_name ?? null,
      odometerAtService: Number(m.odometer_at_service ?? 0),
      nextServiceKm: m.next_service_km != null ? Number(m.next_service_km) : null,
      nextServiceDate: input.nextServiceDate || null,
      cost: Number(m.cost ?? 0),
      status: m.status,
      notes: m.notes ?? null,
      serviceDate: input.serviceDate,
      createdByUserId: m.created_by_user_id ?? null,
      createdAt: new Date(m.created_at),
    };
  }

  async addVehicleInspection(input: {
    companyId: string;
    vehicleId: string;
    inspectionType: string;
    bookingRef?: string | null;
    customerName?: string | null;
    odometerKm: number;
    hasAccident: boolean;
    accidentNotes?: string | null;
    inspectedBy?: string | null;
    damagePoints: Array<{
      zoneKey: string;
      severity: string;
      description?: string | null;
      repairCost?: number;
    }>;
  }) {
    const prevRes = await this.pool.query<{ mileage_odometer: number }>(
      `SELECT mileage_odometer FROM fleet_vehicles WHERE id = $1 AND company_id = $2`,
      [input.vehicleId, input.companyId],
    );
    const prevKm = Number(prevRes.rows[0]?.mileage_odometer ?? 0);
    const deltaKm = Math.max(0, input.odometerKm - prevKm);

    const inspRes = await this.pool.query(
      `INSERT INTO vehicle_inspections
        (company_id, vehicle_id, inspection_type, booking_ref, customer_name, odometer_km, has_accident, accident_notes, inspected_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.companyId,
        input.vehicleId,
        input.inspectionType,
        input.bookingRef?.trim() || null,
        input.customerName?.trim() || null,
        input.odometerKm,
        input.hasAccident,
        input.accidentNotes?.trim() || null,
        input.inspectedBy || null,
      ],
    );
    const insp = inspRes.rows[0]!;

    const insertedDamage = [];
    for (const dp of input.damagePoints) {
      const dpRes = await this.pool.query(
        `INSERT INTO vehicle_damage_points
          (inspection_id, vehicle_id, zone_key, severity, description, repair_cost)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          insp.id,
          input.vehicleId,
          dp.zoneKey,
          dp.severity,
          dp.description?.trim() || null,
          dp.repairCost ?? 0,
        ],
      );
      const r = dpRes.rows[0]!;
      insertedDamage.push({
        id: r.id,
        inspectionId: r.inspection_id,
        vehicleId: r.vehicle_id,
        zoneKey: r.zone_key,
        severity: r.severity,
        description: r.description ?? null,
        repairCost: Number(r.repair_cost ?? 0),
        isResolved: Boolean(r.is_resolved),
        createdAt: new Date(r.created_at),
      });
    }

    await this.pool.query(
      `INSERT INTO vehicle_odometer_logs
        (company_id, vehicle_id, source, reference_label, odometer_km, delta_km, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.companyId,
        input.vehicleId,
        input.inspectionType,
        input.bookingRef?.trim() || input.customerName?.trim() || "Inspection",
        input.odometerKm,
        deltaKm,
        input.inspectedBy || null,
      ],
    );

    if (input.odometerKm > prevKm) {
      await this.pool.query(
        `UPDATE fleet_vehicles SET mileage_odometer = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
        [input.odometerKm, input.vehicleId, input.companyId],
      );
    }

    return {
      id: insp.id,
      companyId: insp.company_id,
      vehicleId: insp.vehicle_id,
      inspectionType: insp.inspection_type,
      bookingRef: insp.booking_ref ?? null,
      customerName: insp.customer_name ?? null,
      odometerKm: Number(insp.odometer_km ?? 0),
      hasAccident: Boolean(insp.has_accident),
      accidentNotes: insp.accident_notes ?? null,
      inspectedBy: insp.inspected_by ?? null,
      inspectedAt: new Date(insp.inspected_at),
      damagePoints: insertedDamage,
    };
  }

  // ============================================================================
  // Phase 2: Bookable Fleet, Customers & Rental Contracts
  // ============================================================================

  async toggleFleetVehicleBookable(
    companyId: string,
    vehicleId: string,
    isBookable: boolean,
  ): Promise<FleetVehicleRecord | null> {
    const res = await this.pool.query<DbFleetVehicleRow>(
      `UPDATE fleet_vehicles
       SET is_bookable = $1,
           published_to_fleet_at = CASE WHEN $1 THEN COALESCE(published_to_fleet_at, NOW()) ELSE NULL END,
           updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [isBookable, vehicleId, companyId],
    );
    const row = res.rows[0];
    return row ? mapFleetVehicleRow(row) : null;
  }

  private mapCustomerRow(r: Record<string, unknown>): CustomerRecord {
    return {
      id: String(r.id),
      customerCode: (r.customer_code as string | undefined) ?? undefined,
      companyId: String(r.company_id),
      fullName: String(r.full_name),
      phone: String(r.phone),
      secondaryPhone: (r.secondary_phone as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      nationalId: (r.national_id as string | null) ?? null,
      nationalIdExpiry: r.national_id_expiry ? new Date(String(r.national_id_expiry)).toISOString().slice(0, 10) : null,
      driverLicenseNo: (r.driver_license_no as string | null) ?? null,
      licenseExpiry: r.license_expiry ? new Date(String(r.license_expiry)).toISOString().slice(0, 10) : null,
      nationality: (r.nationality as string | null) ?? null,
      address: (r.address as string | null) ?? null,
      workAddress: (r.work_address as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
      signatureDataUrl: (r.signature_data_url as string | null) ?? null,
      createdAt: new Date(String(r.created_at)),
      updatedAt: new Date(String(r.updated_at)),
    };
  }

  async listCustomers(companyId: string): Promise<CustomerRecord[]> {
    const res = await this.pool.query(
      `SELECT * FROM customers WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId],
    );
    return res.rows.map((r) => this.mapCustomerRow(r));
  }

  async createCustomer(input: {
    companyId: string;
    fullName: string;
    phone: string;
    secondaryPhone?: string | null;
    email?: string | null;
    nationalId?: string | null;
    nationalIdExpiry?: string | null;
    driverLicenseNo?: string | null;
    licenseExpiry?: string | null;
    nationality?: string | null;
    address?: string | null;
    workAddress?: string | null;
    notes?: string | null;
  }): Promise<CustomerRecord> {
    const seqRes = await this.pool.query<{ max_seq: number }>(
      `SELECT COALESCE(MAX((REGEXP_MATCH(customer_code, '^(?:CUS-)?(\\d+)$'))[1]::int), 0) AS max_seq
       FROM customers
       WHERE company_id = $1`,
      [input.companyId],
    );
    const customerCode = String(Number(seqRes.rows[0]?.max_seq ?? 0) + 1).padStart(4, "0");

    const res = await this.pool.query(
      `INSERT INTO customers
        (company_id, customer_code, full_name, phone, secondary_phone, email, national_id, national_id_expiry, driver_license_no, license_expiry, nationality, address, work_address, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        input.companyId,
        customerCode,
        input.fullName.trim(),
        input.phone.trim(),
        input.secondaryPhone?.trim() || null,
        input.email?.trim() || null,
        input.nationalId?.trim() || null,
        input.nationalIdExpiry || null,
        input.driverLicenseNo?.trim() || null,
        input.licenseExpiry || null,
        input.nationality?.trim() || null,
        input.address?.trim() || null,
        input.workAddress?.trim() || null,
        input.notes?.trim() || null,
      ],
    );
    return this.mapCustomerRow(res.rows[0]!);
  }

  async updateCustomer(
    companyId: string,
    customerId: string,
    input: {
      fullName: string;
      phone: string;
      secondaryPhone?: string | null;
      email?: string | null;
      nationalId?: string | null;
      nationalIdExpiry?: string | null;
      driverLicenseNo?: string | null;
      licenseExpiry?: string | null;
      nationality?: string | null;
      address?: string | null;
      workAddress?: string | null;
      notes?: string | null;
    },
  ): Promise<CustomerRecord | null> {
    const res = await this.pool.query(
      `UPDATE customers
       SET full_name = $1, phone = $2, secondary_phone = $3, email = $4, national_id = $5,
           national_id_expiry = $6, driver_license_no = $7, license_expiry = $8, nationality = $9,
           address = $10, work_address = $11, notes = $12, updated_at = NOW()
       WHERE id = $13 AND company_id = $14
       RETURNING *`,
      [
        input.fullName.trim(),
        input.phone.trim(),
        input.secondaryPhone?.trim() || null,
        input.email?.trim() || null,
        input.nationalId?.trim() || null,
        input.nationalIdExpiry || null,
        input.driverLicenseNo?.trim() || null,
        input.licenseExpiry || null,
        input.nationality?.trim() || null,
        input.address?.trim() || null,
        input.workAddress?.trim() || null,
        input.notes?.trim() || null,
        customerId,
        companyId,
      ],
    );
    return res.rows[0] ? this.mapCustomerRow(res.rows[0]) : null;
  }

  async deleteCustomer(companyId: string, customerId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM customers WHERE id = $1 AND company_id = $2`,
      [customerId, companyId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  private formatPgDate(val: unknown): string {
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return String(val ?? "").slice(0, 10);
  }

  private mapRentalContractRow(r: Record<string, unknown>): RentalContractRecord {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      branchId: String(r.branch_id),
      contractNumber: String(r.contract_number),
      vehicleId: String(r.vehicle_id),
      customerId: String(r.customer_id),
      status: r.status as RentalContractStatus,
      startDate: this.formatPgDate(r.start_date),
      endDate: this.formatPgDate(r.end_date),
      pickupOdometer: Number(r.pickup_odometer ?? 0),
      returnOdometer: r.return_odometer != null ? Number(r.return_odometer) : null,
      dailyRate: Number(r.daily_rate ?? 0),
      totalDays: Number(r.total_days ?? 1),
      subtotal: Number(r.subtotal ?? 0),
      discount: Number(r.discount ?? 0),
      insuranceFee: Number(r.insurance_fee ?? 0),
      extraCharges: Number(r.extra_charges ?? 0),
      totalAmount: Number(r.total_amount ?? 0),
      paidAmount: Number(r.paid_amount ?? 0),
      depositAmount: Number(r.deposit_amount ?? 0),
      notes: (r.notes as string | null) ?? null,
      returnCondition: (r.return_condition as string | null) ?? null,
      secondDriverName: (r.second_driver_name as string | null) ?? null,
      secondDriverLicenseNo: (r.second_driver_license_no as string | null) ?? null,
      sponsorName: (r.sponsor_name as string | null) ?? null,
      sponsorNationalId: (r.sponsor_national_id as string | null) ?? null,
      sponsorPhone: (r.sponsor_phone as string | null) ?? null,
      returnedAt: r.returned_at ? new Date(String(r.returned_at)) : null,
      customerSignatureDataUrl: (r.customer_signature_data_url as string | null) ?? null,
      signedAt: r.signed_at ? new Date(String(r.signed_at)) : null,
      createdByUserId: (r.created_by_user_id as string | null) ?? null,
      createdByUserName: (r.created_by_user_name as string | null) ?? null,
      createdByUserSignatureDataUrl: (r.created_by_user_signature_data_url as string | null) ?? null,
      createdAt: new Date(String(r.created_at)),
      updatedAt: new Date(String(r.updated_at)),
      vehicleAssetCode: (r.vehicle_asset_code as string | undefined) ?? undefined,
      vehiclePlate: (r.vehicle_plate as string | undefined) ?? undefined,
      vehicleName: (r.vehicle_name as string | undefined) ?? undefined,
      vehicleMake: (r.vehicle_make as string | undefined) ?? undefined,
      vehicleModel: (r.vehicle_model as string | undefined) ?? undefined,
      vehicleModelYear: r.vehicle_model_year != null ? Number(r.vehicle_model_year) : undefined,
      vehicleCategory: (r.vehicle_category as string | undefined) ?? undefined,
      vehicleColor: (r.vehicle_color as string | undefined) ?? undefined,
      vehicleInsuranceCompany: (r.vehicle_insurance_company as string | null) ?? null,
      vehicleInsuranceExpiry: r.vehicle_insurance_expiry
        ? this.formatPgDate(r.vehicle_insurance_expiry)
        : null,
      vehicleDailyKmLimit: r.vehicle_daily_km_limit != null ? Number(r.vehicle_daily_km_limit) : null,
      vehicleExtraKmRate: r.vehicle_extra_km_rate != null ? Number(r.vehicle_extra_km_rate) : null,
      customerName: (r.customer_name as string | undefined) ?? undefined,
      customerPhone: (r.customer_phone as string | undefined) ?? undefined,
      customerSecondaryPhone: (r.customer_secondary_phone as string | null) ?? null,
      customerNationality: (r.customer_nationality as string | null) ?? null,
      customerNationalId: (r.customer_national_id as string | null) ?? null,
      customerNationalIdExpiry: r.customer_national_id_expiry
        ? this.formatPgDate(r.customer_national_id_expiry)
        : null,
      customerDriverLicenseNo: (r.customer_driver_license_no as string | null) ?? null,
      customerLicenseExpiry: r.customer_license_expiry
        ? this.formatPgDate(r.customer_license_expiry)
        : null,
      customerAddress: (r.customer_address as string | null) ?? null,
      customerWorkAddress: (r.customer_work_address as string | null) ?? null,
      branchName: (r.branch_name as string | undefined) ?? undefined,
      currencyCode: (r.currency_code as string | undefined)?.trim() || undefined,
    };
  }

  async listRentalContracts(companyId: string): Promise<RentalContractRecord[]> {
    const res = await this.pool.query(
      `SELECT rc.*,
              fv.asset_code AS vehicle_asset_code,
              fv.license_plate AS vehicle_plate,
              CONCAT_WS(' ', vv.make, vv.model, vv.model_year) AS vehicle_name,
              vv.make AS vehicle_make,
              vv.model AS vehicle_model,
              vv.model_year AS vehicle_model_year,
              vv.category AS vehicle_category,
              fv.color AS vehicle_color,
              fv.insurance_company AS vehicle_insurance_company,
              fv.insurance_expiry AS vehicle_insurance_expiry,
              fv.daily_km_limit AS vehicle_daily_km_limit,
              fv.extra_km_rate AS vehicle_extra_km_rate,
              cu.full_name AS customer_name,
              cu.phone AS customer_phone,
              cu.secondary_phone AS customer_secondary_phone,
              cu.nationality AS customer_nationality,
              cu.national_id AS customer_national_id,
              cu.national_id_expiry AS customer_national_id_expiry,
              cu.driver_license_no AS customer_driver_license_no,
              cu.license_expiry AS customer_license_expiry,
              cu.address AS customer_address,
              cu.work_address AS customer_work_address,
              br.name AS branch_name,
              COALESCE(NULLIF(TRIM(br.currency_code), ''), NULLIF(TRIM(comp.base_currency), ''), 'EGP') AS currency_code,
              COALESCE(rcu.full_name, rcu.email) AS created_by_user_name,
              rcu.signature_data_url AS created_by_user_signature_data_url
       FROM rental_contracts rc
       JOIN fleet_vehicles fv ON fv.id = rc.vehicle_id
       LEFT JOIN vehicle_variants vv ON vv.id = fv.variant_id
       JOIN customers cu ON cu.id = rc.customer_id
       LEFT JOIN branches br ON br.id = rc.branch_id
       LEFT JOIN companies comp ON comp.id = rc.company_id
       LEFT JOIN users rcu ON rcu.id = rc.created_by_user_id
       WHERE rc.company_id = $1
       ORDER BY rc.created_at DESC`,
      [companyId],
    );
    return res.rows.map((r) => this.mapRentalContractRow(r));
  }

  async createRentalContract(input: {
    companyId: string;
    branchId: string;
    vehicleId: string;
    customerId: string;
    startDate: string;
    endDate: string;
    pickupOdometer: number;
    dailyRate: number;
    totalDays: number;
    subtotal: number;
    discount?: number;
    insuranceFee?: number;
    extraCharges?: number;
    totalAmount: number;
    paidAmount?: number;
    depositAmount?: number;
    notes?: string | null;
    secondDriverName?: string | null;
    secondDriverLicenseNo?: string | null;
    sponsorName?: string | null;
    sponsorNationalId?: string | null;
    sponsorPhone?: string | null;
    customerSignatureDataUrl?: string | null;
    createdByUserId?: string | null;
  }): Promise<RentalContractRecord> {
    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM rental_contracts WHERE company_id = $1`,
      [input.companyId],
    );
    const nextNum = Number(countRes.rows[0]?.cnt ?? 0) + 1;
    const contractNumber = `RC-${String(nextNum).padStart(4, "0")}`;

    let effectiveSignature = input.customerSignatureDataUrl?.trim() || null;
    if (!effectiveSignature) {
      const custSigRes = await this.pool.query<{ signature_data_url: string | null }>(
        `SELECT signature_data_url FROM customers WHERE id = $1 AND company_id = $2`,
        [input.customerId, input.companyId],
      );
      effectiveSignature = custSigRes.rows[0]?.signature_data_url?.trim() || null;
    }

    const res = await this.pool.query(
      `INSERT INTO rental_contracts
        (company_id, branch_id, contract_number, vehicle_id, customer_id, status,
         start_date, end_date, pickup_odometer, daily_rate, total_days,
         subtotal, discount, insurance_fee, extra_charges, total_amount, paid_amount, deposit_amount,
         notes, second_driver_name, second_driver_license_no, sponsor_name, sponsor_national_id, sponsor_phone,
         customer_signature_data_url, signed_at, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24::text, CASE WHEN $24::text IS NOT NULL THEN NOW() ELSE NULL END, $25)
       RETURNING *`,
      [
        input.companyId,
        input.branchId,
        contractNumber,
        input.vehicleId,
        input.customerId,
        input.startDate,
        input.endDate,
        input.pickupOdometer,
        input.dailyRate,
        input.totalDays,
        input.subtotal,
        input.discount ?? 0,
        input.insuranceFee ?? 0,
        input.extraCharges ?? 0,
        input.totalAmount,
        input.paidAmount ?? 0,
        input.depositAmount ?? 0,
        input.notes?.trim() || null,
        input.secondDriverName?.trim() || null,
        input.secondDriverLicenseNo?.trim() || null,
        input.sponsorName?.trim() || null,
        input.sponsorNationalId?.trim() || null,
        input.sponsorPhone?.trim() || null,
        effectiveSignature,
        input.createdByUserId || null,
      ],
    );

    // Mark vehicle on_rent if start_date <= today and log pickup odometer
    const prevVehRes = await this.pool.query(
      `SELECT mileage_odometer FROM fleet_vehicles WHERE id = $1 AND company_id = $2`,
      [input.vehicleId, input.companyId],
    );
    const prevOdo = Number(prevVehRes.rows[0]?.mileage_odometer ?? 0);
    const todayIso = this.formatPgDate(new Date());
    const nextVehicleStatus = input.startDate <= todayIso ? "on_rent" : "reserved";
    await this.pool.query(
      `UPDATE fleet_vehicles SET status = $4, mileage_odometer = GREATEST(mileage_odometer, $3), updated_at = NOW() WHERE id = $1 AND company_id = $2`,
      [input.vehicleId, input.companyId, input.pickupOdometer, nextVehicleStatus],
    );
    await this.pool.query(
      `INSERT INTO vehicle_odometer_logs (company_id, vehicle_id, source, reference_label, odometer_km, delta_km)
       VALUES ($1, $2, 'contract_pickup', $3, $4, $5)`,
      [
        input.companyId,
        input.vehicleId,
        contractNumber,
        input.pickupOdometer,
        Math.max(0, input.pickupOdometer - prevOdo),
      ],
    );

    const contracts = await this.listRentalContracts(input.companyId);
    const created = contracts.find((c) => c.id === res.rows[0]!.id);
    return created ?? this.mapRentalContractRow(res.rows[0]!);
  }

  async signRentalContract(
    companyId: string,
    contractId: string,
    signatureDataUrl: string,
  ): Promise<RentalContractRecord | null> {
    const res = await this.pool.query<{ id: string; customer_id: string }>(
      `UPDATE rental_contracts
       SET customer_signature_data_url = $1,
           signed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING id, customer_id`,
      [signatureDataUrl, contractId, companyId],
    );
    if (!res.rows[0]) return null;
    await this.pool.query(
      `UPDATE customers
       SET signature_data_url = $1,
           updated_at = NOW()
       WHERE id = $2 AND company_id = $3`,
      [signatureDataUrl, res.rows[0].customer_id, companyId],
    );
    const list = await this.listRentalContracts(companyId);
    return list.find((c) => c.id === contractId) ?? null;
  }

  async completeRentalContract(
    companyId: string,
    contractId: string,
    input: {
      returnOdometer: number;
      extraCharges?: number;
      paidAmount?: number;
      returnCondition?: string | null;
      notes?: string | null;
    },
  ): Promise<RentalContractRecord | null> {
    const existingRes = await this.pool.query(
      `SELECT * FROM rental_contracts WHERE id = $1 AND company_id = $2`,
      [contractId, companyId],
    );
    const existing = existingRes.rows[0];
    if (!existing) return null;

    const extra = Number(input.extraCharges ?? existing.extra_charges ?? 0);
    const newTotal =
      Number(existing.subtotal ?? 0) -
      Number(existing.discount ?? 0) +
      Number(existing.insurance_fee ?? 0) +
      extra;

    await this.pool.query(
      `UPDATE rental_contracts
       SET status = 'completed',
           return_odometer = $1,
           extra_charges = $2,
           total_amount = $3,
           paid_amount = COALESCE($4, paid_amount),
           return_condition = COALESCE($5, return_condition),
           notes = COALESCE($6, notes),
           returned_at = NOW(),
           updated_at = NOW()
       WHERE id = $7 AND company_id = $8`,
      [
        input.returnOdometer,
        extra,
        newTotal,
        input.paidAmount ?? null,
        input.returnCondition?.trim() || null,
        input.notes?.trim() || null,
        contractId,
        companyId,
      ],
    );

    const deltaKm = Math.max(0, input.returnOdometer - Number(existing.pickup_odometer ?? 0));
    await this.pool.query(
      `INSERT INTO vehicle_odometer_logs
        (company_id, vehicle_id, source, reference_label, odometer_km, delta_km)
       VALUES ($1, $2, 'contract_return', $3, $4, $5)`,
      [companyId, existing.vehicle_id, existing.contract_number, input.returnOdometer, deltaKm],
    );

    await this.pool.query(
      `UPDATE fleet_vehicles
       SET status = 'available',
           mileage_odometer = GREATEST(mileage_odometer, $1),
           updated_at = NOW()
       WHERE id = $2 AND company_id = $3`,
      [input.returnOdometer, existing.vehicle_id, companyId],
    );

    const list = await this.listRentalContracts(companyId);
    return list.find((c) => c.id === contractId) ?? null;
  }

  async cancelRentalContract(
    companyId: string,
    contractId: string,
  ): Promise<RentalContractRecord | null> {
    const existingRes = await this.pool.query(
      `SELECT * FROM rental_contracts WHERE id = $1 AND company_id = $2`,
      [contractId, companyId],
    );
    const existing = existingRes.rows[0];
    if (!existing) return null;

    await this.pool.query(
      `UPDATE rental_contracts SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND company_id = $2`,
      [contractId, companyId],
    );

    if (existing.status === "active") {
      await this.pool.query(
        `UPDATE fleet_vehicles SET status = 'available', updated_at = NOW() WHERE id = $1 AND company_id = $2`,
        [existing.vehicle_id, companyId],
      );
    }

    const list = await this.listRentalContracts(companyId);
    return list.find((c) => c.id === contractId) ?? null;
  }

  // --- Drivers Directory ---
  private mapDriverRow(r: Record<string, unknown>): DriverRecord {
    const fmtDate = (d: unknown) =>
      typeof d === "string" ? d.slice(0, 10) : new Date(String(d)).toISOString().slice(0, 10);
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      fullName: String(r.full_name),
      phonePrimary: String(r.phone_primary),
      phoneSecondary: (r.phone_secondary as string | null) ?? null,
      email: (r.email as string | null) ?? null,
      licenseNumber: String(r.license_number),
      licenseIssueDate: fmtDate(r.license_issue_date),
      licenseExpiryDate: fmtDate(r.license_expiry_date),
      passportNumber: (r.passport_number as string | null) ?? null,
      nationalIdNumber: (r.national_id_number as string | null) ?? null,
      idCardPhotoUrl: (r.id_card_photo_url as string | null) ?? null,
      passportPhotoUrl: (r.passport_photo_url as string | null) ?? null,
      licensePhotoUrl: (r.license_photo_url as string | null) ?? null,
      address: (r.address as string | null) ?? null,
      status: (r.status as "active" | "inactive") ?? "active",
      createdByUserId: (r.created_by_user_id as string | null) ?? null,
      createdByUserName: (r.created_by_user_name as string | null) ?? null,
      createdAt: new Date(String(r.created_at)),
      updatedAt: new Date(String(r.updated_at)),
    };
  }

  async listDrivers(companyId: string): Promise<DriverRecord[]> {
    const res = await this.pool.query(
      `SELECT d.*, COALESCE(u.full_name, u.email) AS created_by_user_name
       FROM drivers d
       LEFT JOIN users u ON u.id = d.created_by_user_id
       WHERE d.company_id = $1
       ORDER BY d.created_at DESC`,
      [companyId],
    );
    return res.rows.map((r) => this.mapDriverRow(r));
  }

  async createDriver(input: {
    companyId: string;
    fullName: string;
    phonePrimary: string;
    phoneSecondary?: string | null;
    email?: string | null;
    licenseNumber: string;
    licenseIssueDate: string;
    licenseExpiryDate: string;
    passportNumber?: string | null;
    nationalIdNumber?: string | null;
    idCardPhotoUrl?: string | null;
    passportPhotoUrl?: string | null;
    licensePhotoUrl?: string | null;
    address?: string | null;
    status?: "active" | "inactive";
    createdByUserId?: string | null;
  }): Promise<DriverRecord> {
    const res = await this.pool.query(
      `INSERT INTO drivers
        (company_id, full_name, phone_primary, phone_secondary, email,
         license_number, license_issue_date, license_expiry_date, passport_number,
         national_id_number, id_card_photo_url, passport_photo_url, license_photo_url,
         address, status, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        input.companyId,
        input.fullName.trim(),
        input.phonePrimary.trim(),
        input.phoneSecondary?.trim() || null,
        input.email?.trim() || null,
        input.licenseNumber.trim(),
        input.licenseIssueDate,
        input.licenseExpiryDate,
        input.passportNumber?.trim() || null,
        input.nationalIdNumber?.trim() || null,
        input.idCardPhotoUrl || null,
        input.passportPhotoUrl || null,
        input.licensePhotoUrl || null,
        input.address?.trim() || null,
        input.status ?? "active",
        input.createdByUserId ?? null,
      ],
    );
    const list = await this.listDrivers(input.companyId);
    return list.find((d) => d.id === res.rows[0]!.id) ?? this.mapDriverRow(res.rows[0]!);
  }

  async updateDriver(
    companyId: string,
    driverId: string,
    input: {
      fullName: string;
      phonePrimary: string;
      phoneSecondary?: string | null;
      email?: string | null;
      licenseNumber: string;
      licenseIssueDate: string;
      licenseExpiryDate: string;
      passportNumber?: string | null;
      nationalIdNumber?: string | null;
      idCardPhotoUrl?: string | null;
      passportPhotoUrl?: string | null;
      licensePhotoUrl?: string | null;
      address?: string | null;
      status?: "active" | "inactive";
    },
  ): Promise<DriverRecord | null> {
    const res = await this.pool.query(
      `UPDATE drivers
       SET full_name = $3,
           phone_primary = $4,
           phone_secondary = $5,
           email = $6,
           license_number = $7,
           license_issue_date = $8::date,
           license_expiry_date = $9::date,
           passport_number = $10,
           national_id_number = $11,
           id_card_photo_url = $12,
           passport_photo_url = $13,
           license_photo_url = $14,
           address = $15,
           status = COALESCE($16, status),
           updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [
        driverId,
        companyId,
        input.fullName.trim(),
        input.phonePrimary.trim(),
        input.phoneSecondary?.trim() || null,
        input.email?.trim() || null,
        input.licenseNumber.trim(),
        input.licenseIssueDate,
        input.licenseExpiryDate,
        input.passportNumber?.trim() || null,
        input.nationalIdNumber?.trim() || null,
        input.idCardPhotoUrl || null,
        input.passportPhotoUrl || null,
        input.licensePhotoUrl || null,
        input.address?.trim() || null,
        input.status ?? null,
      ],
    );
    if (!res.rows[0]) return null;
    const list = await this.listDrivers(companyId);
    return list.find((d) => d.id === driverId) ?? null;
  }

  async deleteDriver(companyId: string, driverId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM drivers WHERE id = $1 AND company_id = $2`,
      [driverId, companyId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Vehicle Movements & Branch Transfers ---
  private mapVehicleMovementRow(r: Record<string, unknown>): VehicleMovementRecord {
    return {
      id: String(r.id),
      companyId: String(r.company_id),
      movementNumber: String(r.movement_number),
      vehicleId: String(r.vehicle_id),
      fromBranchId: r.from_branch_id ? String(r.from_branch_id) : null,
      toBranchId: String(r.to_branch_id),
      driverId: String(r.driver_id),
      status: r.status as "in_transit" | "received" | "cancelled",
      dispatchOdometerKm: Number(r.dispatch_odometer_km ?? 0),
      arrivalOdometerKm: r.arrival_odometer_km != null ? Number(r.arrival_odometer_km) : null,
      dispatchedByUserId: (r.dispatched_by_user_id as string | null) ?? null,
      receivedByUserId: (r.received_by_user_id as string | null) ?? null,
      dispatchedAt: new Date(String(r.dispatched_at)),
      receivedAt: r.received_at ? new Date(String(r.received_at)) : null,
      notes: (r.notes as string | null) ?? null,
      createdAt: new Date(String(r.created_at)),
      updatedAt: new Date(String(r.updated_at)),
      vehicleName: (r.vehicle_name as string | null) ?? null,
      vehicleAssetCode: (r.vehicle_asset_code as string | null) ?? null,
      vehiclePlate: (r.vehicle_plate as string | null) ?? null,
      fromBranchName: (r.from_branch_name as string | null) ?? null,
      toBranchName: (r.to_branch_name as string | null) ?? null,
      driverName: (r.driver_name as string | null) ?? null,
      driverPhone: (r.driver_phone as string | null) ?? null,
      dispatchedByUserName: (r.dispatched_by_user_name as string | null) ?? null,
      receivedByUserName: (r.received_by_user_name as string | null) ?? null,
    };
  }

  async listVehicleMovements(
    companyId: string,
    filter?: { vehicleId?: string; status?: string; toBranchId?: string },
  ): Promise<VehicleMovementRecord[]> {
    let query = `
      SELECT vm.*,
             fv.asset_code AS vehicle_asset_code,
             fv.license_plate AS vehicle_plate,
             CONCAT_WS(' ', vv.make, vv.model, vv.trim, vv.model_year) AS vehicle_name,
             fb.name AS from_branch_name,
             tb.name AS to_branch_name,
             dr.full_name AS driver_name,
             dr.phone_primary AS driver_phone,
             COALESCE(du.full_name, du.email) AS dispatched_by_user_name,
             COALESCE(ru.full_name, ru.email) AS received_by_user_name
      FROM vehicle_movements vm
      JOIN fleet_vehicles fv ON fv.id = vm.vehicle_id
      LEFT JOIN vehicle_variants vv ON vv.id = fv.variant_id
      LEFT JOIN branches fb ON fb.id = vm.from_branch_id
      LEFT JOIN branches tb ON tb.id = vm.to_branch_id
      LEFT JOIN drivers dr ON dr.id = vm.driver_id
      LEFT JOIN users du ON du.id = vm.dispatched_by_user_id
      LEFT JOIN users ru ON ru.id = vm.received_by_user_id
      WHERE vm.company_id = $1
    `;
    const params: unknown[] = [companyId];
    if (filter?.vehicleId) {
      params.push(filter.vehicleId);
      query += ` AND vm.vehicle_id = $${params.length}`;
    }
    if (filter?.status) {
      params.push(filter.status);
      query += ` AND vm.status = $${params.length}`;
    }
    if (filter?.toBranchId) {
      params.push(filter.toBranchId);
      query += ` AND vm.to_branch_id = $${params.length}`;
    }
    query += ` ORDER BY vm.dispatched_at DESC`;
    const res = await this.pool.query(query, params);
    return res.rows.map((r) => this.mapVehicleMovementRow(r));
  }

  async dispatchVehicleMovement(input: {
    companyId: string;
    vehicleId: string;
    fromBranchId?: string | null;
    toBranchId: string;
    driverId: string;
    dispatchOdometerKm: number;
    dispatchedByUserId?: string | null;
    dispatchedByName?: string | null;
    notes?: string | null;
  }): Promise<VehicleMovementRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM vehicle_movements WHERE company_id = $1`,
        [input.companyId],
      );
      const nextNum = Number(countRes.rows[0]?.cnt ?? 0) + 1;
      const movementNumber = `MV-${String(nextNum).padStart(4, "0")}`;

      const prevVehRes = await client.query(
        `SELECT mileage_odometer FROM fleet_vehicles WHERE id = $1 AND company_id = $2`,
        [input.vehicleId, input.companyId],
      );
      const prevOdo = Number(prevVehRes.rows[0]?.mileage_odometer ?? 0);

      const insRes = await client.query(
        `INSERT INTO vehicle_movements
          (company_id, movement_number, vehicle_id, from_branch_id, to_branch_id,
           driver_id, status, dispatch_odometer_km, dispatched_by_user_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'in_transit', $7, $8, $9)
         RETURNING id`,
        [
          input.companyId,
          movementNumber,
          input.vehicleId,
          input.fromBranchId ?? null,
          input.toBranchId,
          input.driverId,
          input.dispatchOdometerKm,
          input.dispatchedByUserId ?? null,
          input.notes?.trim() || null,
        ],
      );

      await client.query(
        `UPDATE fleet_vehicles
         SET mileage_odometer = GREATEST(mileage_odometer, $2),
             is_bookable = FALSE,
             updated_at = NOW()
         WHERE id = $1 AND company_id = $3`,
        [input.vehicleId, input.dispatchOdometerKm, input.companyId],
      );

      await client.query(
        `INSERT INTO vehicle_odometer_logs
          (company_id, vehicle_id, source, reference_label, odometer_km, delta_km, recorded_by)
         VALUES ($1, $2, 'movement_dispatch', $3, $4, $5, $6)`,
        [
          input.companyId,
          input.vehicleId,
          movementNumber,
          input.dispatchOdometerKm,
          Math.max(0, input.dispatchOdometerKm - prevOdo),
          input.dispatchedByName ?? null,
        ],
      );

      await client.query("COMMIT");
      const list = await this.listVehicleMovements(input.companyId, { vehicleId: input.vehicleId });
      return list.find((m) => m.id === insRes.rows[0]!.id)!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async receiveVehicleMovement(
    companyId: string,
    movementId: string,
    input: {
      arrivalOdometerKm: number;
      receivedByUserId?: string | null;
      receivedByName?: string | null;
      notes?: string | null;
    },
  ): Promise<VehicleMovementRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const exRes = await client.query(
        `SELECT * FROM vehicle_movements WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [movementId, companyId],
      );
      const ex = exRes.rows[0];
      if (!ex || ex.status !== "in_transit") {
        await client.query("ROLLBACK");
        return null;
      }

      const dispatchOdo = Number(ex.dispatch_odometer_km ?? 0);
      const deltaKm = Math.max(0, input.arrivalOdometerKm - dispatchOdo);

      await client.query(
        `UPDATE vehicle_movements
         SET status = 'received',
             arrival_odometer_km = $3,
             received_by_user_id = $4,
             received_at = NOW(),
             notes = COALESCE($5, notes),
             updated_at = NOW()
         WHERE id = $1 AND company_id = $2`,
        [
          movementId,
          companyId,
          input.arrivalOdometerKm,
          input.receivedByUserId ?? null,
          input.notes?.trim() || null,
        ],
      );

      await client.query(
        `UPDATE fleet_vehicles
         SET branch_id = $2,
             mileage_odometer = GREATEST(mileage_odometer, $3),
             updated_at = NOW()
         WHERE id = $1 AND company_id = $4`,
        [ex.vehicle_id, ex.to_branch_id, input.arrivalOdometerKm, companyId],
      );

      await client.query(
        `INSERT INTO vehicle_odometer_logs
          (company_id, vehicle_id, source, reference_label, odometer_km, delta_km, recorded_by)
         VALUES ($1, $2, 'movement_arrival', $3, $4, $5, $6)`,
        [
          companyId,
          ex.vehicle_id,
          ex.movement_number,
          input.arrivalOdometerKm,
          deltaKm,
          input.receivedByName ?? null,
        ],
      );

      await client.query("COMMIT");
      const list = await this.listVehicleMovements(companyId, { vehicleId: ex.vehicle_id });
      return list.find((m) => m.id === movementId) ?? null;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async cancelVehicleMovement(companyId: string, movementId: string): Promise<VehicleMovementRecord | null> {
    const res = await this.pool.query(
      `UPDATE vehicle_movements
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND status = 'in_transit'
       RETURNING vehicle_id`,
      [movementId, companyId],
    );
    if (!res.rows[0]) return null;
    const list = await this.listVehicleMovements(companyId, { vehicleId: res.rows[0].vehicle_id });
    return list.find((m) => m.id === movementId) ?? null;
  }

  private masterCatalogsEnsured = false;

  private async ensureMasterCatalogTables(): Promise<void> {
    if (this.masterCatalogsEnsured) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_colors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        color_type VARCHAR(120) NOT NULL DEFAULT 'exterior',
        name_en VARCHAR(120) NOT NULL,
        name_ar VARCHAR(120) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE vehicle_colors DROP COLUMN IF EXISTS hex_code;
      ALTER TABLE vehicle_colors ALTER COLUMN color_type TYPE VARCHAR(120);
      CREATE INDEX IF NOT EXISTS idx_vehicle_colors_company ON vehicle_colors(company_id);

      CREATE TABLE IF NOT EXISTS vehicle_body_styles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        code VARCHAR(64) NOT NULL,
        name_en VARCHAR(120) NOT NULL,
        name_ar VARCHAR(120) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE vehicle_body_styles DROP COLUMN IF EXISTS sipp_prefix;
      CREATE INDEX IF NOT EXISTS idx_vehicle_body_styles_company ON vehicle_body_styles(company_id);

      CREATE TABLE IF NOT EXISTS fleet_price_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(160) NOT NULL,
        price_list_type VARCHAR(64) NOT NULL DEFAULT 'spot',
        currency_code VARCHAR(16) NOT NULL,
        effective_from DATE,
        effective_to DATE,
        price_type VARCHAR(64) NOT NULL DEFAULT 'daily_bands',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE fleet_price_lists DROP COLUMN IF EXISTS remarks;
      CREATE INDEX IF NOT EXISTS idx_fleet_price_lists_company ON fleet_price_lists(company_id);
    `);
    this.masterCatalogsEnsured = true;
  }

  async deleteVehicleMake(companyId: string, makeId: string): Promise<boolean> {
    await this.pool.query(`DELETE FROM vehicle_models WHERE company_id = $1 AND make_id = $2`, [
      companyId,
      makeId,
    ]);
    const res = await this.pool.query(
      `DELETE FROM vehicle_makes WHERE company_id = $1 AND id = $2`,
      [companyId, makeId],
    );
    return Boolean(res.rowCount && res.rowCount > 0);
  }

  async deleteVehicleModel(companyId: string, modelId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM vehicle_models WHERE company_id = $1 AND id = $2`,
      [companyId, modelId],
    );
    return Boolean(res.rowCount && res.rowCount > 0);
  }

  async listVehicleColors(companyId: string): Promise<VehicleColorRecord[]> {
    await this.ensureMasterCatalogTables();
    const res = await this.pool.query<{
      id: string;
      company_id: string;
      color_type: string;
      name_en: string;
      name_ar: string;
      created_at: Date;
    }>(
      `SELECT id, company_id, color_type, name_en, name_ar, created_at FROM vehicle_colors WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId],
    );
    return res.rows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      colorType: r.color_type || "exterior",
      nameEn: r.name_en,
      nameAr: r.name_ar,
      createdAt: new Date(r.created_at),
    }));
  }

  async createVehicleColor(input: CreateVehicleColorInput): Promise<VehicleColorRecord> {
    await this.ensureMasterCatalogTables();
    const colorType = input.colorType?.trim() || "exterior";
    const nameEn = (input.nameEn || input.nameAr).trim();
    const nameAr = input.nameAr.trim();
    const res = await this.pool.query<{
      id: string;
      company_id: string;
      color_type: string;
      name_en: string;
      name_ar: string;
      created_at: Date;
    }>(
      `INSERT INTO vehicle_colors (company_id, color_type, name_en, name_ar)
       VALUES ($1, $2, $3, $4)
       RETURNING id, company_id, color_type, name_en, name_ar, created_at`,
      [input.companyId, colorType, nameEn, nameAr],
    );
    const r = res.rows[0]!;
    return {
      id: r.id,
      companyId: r.company_id,
      colorType: r.color_type || "exterior",
      nameEn: r.name_en,
      nameAr: r.name_ar,
      createdAt: new Date(r.created_at),
    };
  }

  async deleteVehicleColor(companyId: string, colorId: string): Promise<boolean> {
    await this.ensureMasterCatalogTables();
    const res = await this.pool.query(
      `DELETE FROM vehicle_colors WHERE company_id = $1 AND id = $2`,
      [companyId, colorId],
    );
    return Boolean(res.rowCount && res.rowCount > 0);
  }

  async listVehicleBodyStyles(companyId: string): Promise<VehicleBodyStyleRecord[]> {
    await this.ensureMasterCatalogTables();
    const res = await this.pool.query<{
      id: string;
      company_id: string;
      code: string;
      name_en: string;
      name_ar: string;
      created_at: Date;
    }>(
      `SELECT id, company_id, code, name_en, name_ar, created_at FROM vehicle_body_styles WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId],
    );
    return res.rows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      code: r.code,
      nameEn: r.name_en,
      nameAr: r.name_ar,
      createdAt: new Date(r.created_at),
    }));
  }

  async createVehicleBodyStyle(input: CreateVehicleBodyStyleInput): Promise<VehicleBodyStyleRecord> {
    await this.ensureMasterCatalogTables();
    const code = (input.code || input.nameEn || input.nameAr)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const nameEn = (input.nameEn || input.nameAr).trim();
    const nameAr = input.nameAr.trim();
    const res = await this.pool.query<{
      id: string;
      company_id: string;
      code: string;
      name_en: string;
      name_ar: string;
      created_at: Date;
    }>(
      `INSERT INTO vehicle_body_styles (company_id, code, name_en, name_ar)
       VALUES ($1, $2, $3, $4)
       RETURNING id, company_id, code, name_en, name_ar, created_at`,
      [input.companyId, code, nameEn, nameAr],
    );
    const r = res.rows[0]!;
    return {
      id: r.id,
      companyId: r.company_id,
      code: r.code,
      nameEn: r.name_en,
      nameAr: r.name_ar,
      createdAt: new Date(r.created_at),
    };
  }

  async deleteVehicleBodyStyle(companyId: string, styleId: string): Promise<boolean> {
    await this.ensureMasterCatalogTables();
    const res = await this.pool.query(
      `DELETE FROM vehicle_body_styles WHERE company_id = $1 AND id = $2`,
      [companyId, styleId],
    );
    return Boolean(res.rowCount && res.rowCount > 0);
  }

  private mapPriceListRow(r: {
    id: string;
    company_id: string;
    name: string;
    price_list_type: string;
    currency_code: string;
    effective_from: string | Date | null;
    effective_to: string | Date | null;
    price_type: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): FleetPriceListRecord {
    const fmtDate = (val: string | Date | null): string | null => {
      if (!val) return null;
      if (typeof val === "string") return val.slice(0, 10);
      return val.toISOString().slice(0, 10);
    };
    return {
      id: r.id,
      companyId: r.company_id,
      name: r.name,
      priceListType: r.price_list_type,
      currencyCode: r.currency_code,
      effectiveFrom: fmtDate(r.effective_from),
      effectiveTo: fmtDate(r.effective_to),
      priceType: r.price_type,
      isActive: Boolean(r.is_active),
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    };
  }

  async listFleetPriceLists(companyId: string): Promise<FleetPriceListRecord[]> {
    await this.ensureMasterCatalogTables();
    const res = await this.pool.query(
      `SELECT * FROM fleet_price_lists WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId],
    );
    return res.rows.map((r) => this.mapPriceListRow(r));
  }

  async createFleetPriceList(input: CreateFleetPriceListInput): Promise<FleetPriceListRecord> {
    await this.ensureMasterCatalogTables();
    const res = await this.pool.query(
      `INSERT INTO fleet_price_lists
        (company_id, name, price_list_type, currency_code, effective_from, effective_to, price_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.companyId,
        input.name.trim(),
        input.priceListType?.trim() || "spot",
        input.currencyCode.trim().toUpperCase(),
        input.effectiveFrom || null,
        input.effectiveTo || null,
        input.priceType?.trim() || "daily_bands",
      ],
    );
    return this.mapPriceListRow(res.rows[0]!);
  }

  async updateFleetPriceList(
    companyId: string,
    priceListId: string,
    input: UpdateFleetPriceListInput,
  ): Promise<FleetPriceListRecord | null> {
    await this.ensureMasterCatalogTables();
    const res = await this.pool.query(
      `UPDATE fleet_price_lists
       SET name = COALESCE($3, name),
           price_list_type = COALESCE($4, price_list_type),
           currency_code = COALESCE($5, currency_code),
           effective_from = CASE WHEN $6::boolean THEN $7::date ELSE effective_from END,
           effective_to = CASE WHEN $8::boolean THEN $9::date ELSE effective_to END,
           price_type = COALESCE($10, price_type),
           is_active = COALESCE($11, is_active),
           updated_at = NOW()
       WHERE company_id = $1 AND id = $2
       RETURNING *`,
      [
        companyId,
        priceListId,
        input.name !== undefined ? input.name.trim() : null,
        input.priceListType !== undefined ? input.priceListType.trim() : null,
        input.currencyCode !== undefined ? input.currencyCode.trim().toUpperCase() : null,
        input.effectiveFrom !== undefined,
        input.effectiveFrom || null,
        input.effectiveTo !== undefined,
        input.effectiveTo || null,
        input.priceType !== undefined ? input.priceType.trim() : null,
        input.isActive !== undefined ? input.isActive : null,
      ],
    );
    return res.rows[0] ? this.mapPriceListRow(res.rows[0]) : null;
  }

  async deleteFleetPriceList(companyId: string, priceListId: string): Promise<boolean> {
    await this.ensureMasterCatalogTables();
    const res = await this.pool.query(
      `DELETE FROM fleet_price_lists WHERE company_id = $1 AND id = $2`,
      [companyId, priceListId],
    );
    return Boolean(res.rowCount && res.rowCount > 0);
  }
}

