import crypto from "node:crypto";
import type {
  AuthDataStore,
  BranchRecord,
  CompanyMembershipRecord,
  CompanyRecord,
  CompanyRoleRecord,
  EmployeeInvitationRecord,
  MembershipStatus,
  PermissionMatrix,
  RoleScopeType,
} from "../../db/store.ts";
import { hashPassword } from "../../security/passwordHash.ts";
import { validateNewPassword } from "../../security/passwordPolicy.ts";
import { generateSecureToken, hashOpaqueToken } from "../../security/tokens.ts";
import type { EmailDeliveryAdapter } from "../auth/emailDelivery.ts";
import type { PublicAuthUser } from "../auth/authService.ts";
import {
  DEFAULT_COMPANY_ROLES,
  sanitizePermissionMatrix,
} from "./defaultRoles.ts";

export type TeamErrorCode =
  | "UNAUTHORIZED"
  | "EMAIL_NOT_VERIFIED"
  | "FORBIDDEN"
  | "MEMBERSHIP_SUSPENDED"
  | "BRANCH_SCOPE_DENIED"
  | "COMPANY_NOT_FOUND"
  | "ROLE_NOT_FOUND"
  | "ROLE_LOCKED"
  | "ROLE_IN_USE"
  | "CANNOT_INVITE_OWNER"
  | "MEMBER_NOT_FOUND"
  | "CANNOT_MODIFY_OWNER"
  | "EMAIL_ALREADY_IN_COMPANY"
  | "INVALID_BRANCH_SCOPE"
  | "INVITATION_NOT_FOUND"
  | "INVITATION_INVALID_OR_EXPIRED"
  | "WEAK_PASSWORD"
  | "INVALID_INPUT";

export class TeamServiceError extends Error {
  public readonly code: TeamErrorCode;
  public readonly status: number;

  constructor(code: TeamErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface TenantActor {
  user: PublicAuthUser;
  company: CompanyRecord;
  membership: CompanyMembershipRecord;
  role: CompanyRoleRecord;
  branchIds: string[];
}

export interface PublicTeamMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  status: MembershipStatus;
  roleId: string;
  roleCode: string;
  roleNameEn: string;
  roleNameAr: string;
  scopeType: RoleScopeType;
  branchIds: string[];
  isOwner: boolean;
  createdAt: string;
}

export interface PublicEmployeeInvitation {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  roleId: string;
  roleCode: string;
  roleNameEn: string;
  roleNameAr: string;
  scopeType: RoleScopeType;
  branchIds: string[];
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface PublicInvitationPreview {
  companyName: string;
  companyLogoUrl: string | null;
  companyBrandColor: string;
  email: string;
  fullName: string;
  roleNameEn: string;
  roleNameAr: string;
  scopeType: RoleScopeType;
  branchNames: string[];
  expiresAt: string;
}

const INVITATION_TTL_HOURS = 72;

export class TeamService {
  private readonly store: AuthDataStore;
  private readonly emailAdapter: EmailDeliveryAdapter;
  private readonly sessionTtlHours: number;

  constructor(options: {
    store: AuthDataStore;
    emailAdapter: EmailDeliveryAdapter;
    sessionTtlHours: number;
  }) {
    this.store = options.store;
    this.emailAdapter = options.emailAdapter;
    this.sessionTtlHours = options.sessionTtlHours;
  }

  /**
   * Idempotently seeds the 6 default roles and ensures the company owner
   * has an active `owner` membership record (including for Phase 2 companies).
   */
  async ensureCompanyRolesAndOwnerMembership(
    company: CompanyRecord,
  ): Promise<CompanyRoleRecord[]> {
    let roles = await this.store.listCompanyRoles(company.id);
    const existingCodes = new Set(roles.map((r) => r.code.toLowerCase()));

    for (const def of DEFAULT_COMPANY_ROLES) {
      if (!existingCodes.has(def.code)) {
        try {
          const created = await this.store.createCompanyRole({
            id: crypto.randomUUID(),
            companyId: company.id,
            code: def.code,
            nameEn: def.nameEn,
            nameAr: def.nameAr,
            descriptionEn: def.descriptionEn,
            descriptionAr: def.descriptionAr,
            scopeType: def.scopeType,
            permissions: def.permissions,
            isSystem: true,
          });
          roles.push(created);
          existingCodes.add(def.code);
        } catch (err) {
          const code = (err as { code?: string })?.code;
          if (code !== "23505") {
            throw err;
          }
        }
      }
    }

    if (roles.length < DEFAULT_COMPANY_ROLES.length) {
      roles = await this.store.listCompanyRoles(company.id);
    }

    const ownerRole = roles.find((r) => r.code === "owner");
    if (ownerRole) {
      const existingOwnerMembership = await this.store.findMembershipByUserId(
        company.ownerUserId,
      );
      if (!existingOwnerMembership) {
        try {
          await this.store.createCompanyMembership({
            id: crypto.randomUUID(),
            userId: company.ownerUserId,
            companyId: company.id,
            roleId: ownerRole.id,
            phone: company.phone,
            status: "active",
            branchIds: [],
          });
        } catch (err) {
          const code = (err as { code?: string })?.code;
          if (code !== "23505") {
            throw err;
          }
        }
      }
    }

    return roles;
  }

  /**
   * Resolves the authenticated user's company membership, role, and branch scope.
   */
  async resolveTenantActor(user: PublicAuthUser): Promise<TenantActor | null> {
    let membership = await this.store.findMembershipByUserId(user.id);
    let company: CompanyRecord | null = null;

    if (membership) {
      company = await this.store.findCompanyById(membership.companyId);
    } else {
      company = await this.store.findCompanyByOwnerUserId(user.id);
      if (company) {
        await this.ensureCompanyRolesAndOwnerMembership(company);
        membership = await this.store.findMembershipByUserId(user.id);
      }
    }

    if (!company || !membership) {
      return null;
    }

    if (membership.status === "suspended") {
      throw new TeamServiceError(
        "MEMBERSHIP_SUSPENDED",
        "Your access to this company workspace has been suspended.",
        403,
      );
    }

    await this.ensureCompanyRolesAndOwnerMembership(company);
    const role = await this.store.findCompanyRoleById(membership.roleId);
    if (!role) {
      return null;
    }

    return {
      user,
      company,
      membership,
      role,
      branchIds:
        role.scopeType === "company_wide" ? [] : [...membership.branchIds],
    };
  }

  async getTeamOverview(actor: TenantActor): Promise<{
    roles: CompanyRoleRecord[];
    members: PublicTeamMember[];
    invitations: PublicEmployeeInvitation[];
    branches: BranchRecord[];
  }> {
    if (actor.role.code !== "owner" && actor.role.code !== "ceo") {
      throw new TeamServiceError(
        "FORBIDDEN",
        "Only the Owner or CEO can access team members and roles.",
        403,
      );
    }

    const [roles, memberships, invitations, branches] = await Promise.all([
      this.ensureCompanyRolesAndOwnerMembership(actor.company),
      this.store.listCompanyMemberships(actor.company.id),
      this.store.listCompanyInvitations(actor.company.id),
      this.store.listBranchesByCompanyId(actor.company.id),
    ]);

    const roleById = new Map(roles.map((r) => [r.id, r]));
    const now = new Date();

    const members: PublicTeamMember[] = [];
    for (const m of memberships) {
      const memberUser = await this.store.findUserById(m.userId);
      const role = roleById.get(m.roleId);
      if (!memberUser || !role) continue;

      members.push({
        id: m.id,
        userId: m.userId,
        fullName: memberUser.fullName,
        email: memberUser.email,
        phone: m.phone,
        status: m.status,
        roleId: role.id,
        roleCode: role.code,
        roleNameEn: role.nameEn,
        roleNameAr: role.nameAr,
        scopeType: role.scopeType,
        branchIds: role.scopeType === "company_wide" ? [] : m.branchIds,
        isOwner:
          role.code === "owner" || m.userId === actor.company.ownerUserId,
        createdAt: m.createdAt.toISOString(),
      });
    }

    const publicInvitations: PublicEmployeeInvitation[] = invitations.map(
      (inv) => {
        const role = roleById.get(inv.roleId);
        let status: PublicEmployeeInvitation["status"] = "pending";
        if (inv.acceptedAt) {
          status = "accepted";
        } else if (inv.revokedAt) {
          status = "revoked";
        } else if (inv.expiresAt.getTime() <= now.getTime()) {
          status = "expired";
        }

        return {
          id: inv.id,
          email: inv.email,
          fullName: inv.fullName,
          phone: inv.phone,
          roleId: inv.roleId,
          roleCode: role?.code ?? "unknown",
          roleNameEn: role?.nameEn ?? "Unknown",
          roleNameAr: role?.nameAr ?? "غير معروف",
          scopeType: role?.scopeType ?? "assigned_branches",
          branchIds: inv.branchIds,
          status,
          expiresAt: inv.expiresAt.toISOString(),
          acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
          revokedAt: inv.revokedAt ? inv.revokedAt.toISOString() : null,
          createdAt: inv.createdAt.toISOString(),
        };
      },
    );

    return { roles, members, invitations: publicInvitations, branches };
  }

  private async validateRoleAndBranches(
    companyId: string,
    roleId: string,
    branchIds: string[],
  ): Promise<{ role: CompanyRoleRecord; validBranchIds: string[] }> {
    const role = await this.store.findCompanyRoleById(roleId);
    if (!role || role.companyId !== companyId) {
      throw new TeamServiceError(
        "ROLE_NOT_FOUND",
        "Selected role does not exist in this company.",
        404,
      );
    }

    if (role.scopeType === "company_wide") {
      return { role, validBranchIds: [] };
    }

    const uniqueIds = Array.from(new Set(branchIds));
    if (uniqueIds.length === 0) {
      throw new TeamServiceError(
        "INVALID_BRANCH_SCOPE",
        "Please assign at least one branch for this role.",
        400,
      );
    }

    const companyBranches = await this.store.listBranchesByCompanyId(companyId);
    const allowedBranchIds = new Set(companyBranches.map((b) => b.id));
    for (const id of uniqueIds) {
      if (!allowedBranchIds.has(id)) {
        throw new TeamServiceError(
          "INVALID_BRANCH_SCOPE",
          "One or more selected branches do not belong to your company.",
          400,
        );
      }
    }

    return { role, validBranchIds: uniqueIds };
  }

  async createInvitation(
    actor: TenantActor,
    input: {
      fullName: string;
      email: string;
      phone: string;
      roleId: string;
      branchIds: string[];
      locale: "en" | "ar";
    },
  ): Promise<{
    invitation: PublicEmployeeInvitation;
    rawToken: string;
    invitePath: string;
  }> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const { role, validBranchIds } = await this.validateRoleAndBranches(
      actor.company.id,
      input.roleId,
      input.branchIds,
    );

    if (role.code === "owner") {
      throw new TeamServiceError(
        "CANNOT_INVITE_OWNER",
        "Owner role cannot be assigned through employee invitations.",
        400,
      );
    }

    // Enforce Single Company per Email rule
    const existingUser = await this.store.findUserByEmail(normalizedEmail);
    if (existingUser) {
      const existingMembership = await this.store.findMembershipByUserId(
        existingUser.id,
      );
      const existingOwnedCompany =
        await this.store.findCompanyByOwnerUserId(existingUser.id);
      if (existingMembership || existingOwnedCompany) {
        throw new TeamServiceError(
          "EMAIL_ALREADY_IN_COMPANY",
          "This email address already belongs to a company on Revix System.",
          409,
        );
      }
    }

    const now = new Date();
    await this.store.revokePendingInvitationsForEmail(
      actor.company.id,
      normalizedEmail,
      now,
    );

    const rawToken = generateSecureToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const expiresAt = new Date(
      now.getTime() + INVITATION_TTL_HOURS * 60 * 60 * 1000,
    );

    const record = await this.store.createEmployeeInvitation({
      id: crypto.randomUUID(),
      companyId: actor.company.id,
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      roleId: role.id,
      branchIds: validBranchIds,
      tokenHash,
      invitedByUserId: actor.user.id,
      expiresAt,
    });

    if (this.emailAdapter.sendEmployeeInvitationEmail) {
      await this.emailAdapter.sendEmployeeInvitationEmail({
        toEmail: normalizedEmail,
        fullName: record.fullName,
        companyName: actor.company.name,
        roleNameEn: role.nameEn,
        roleNameAr: role.nameAr,
        locale: input.locale,
        rawToken,
      });
    }

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "team.invitation.created",
      entityType: "employee_invitation",
      entityId: record.id,
      metadata: {
        email: normalizedEmail,
        roleCode: role.code,
        branchCount: validBranchIds.length,
      },
    });

    return {
      invitation: {
        id: record.id,
        email: record.email,
        fullName: record.fullName,
        phone: record.phone,
        roleId: role.id,
        roleCode: role.code,
        roleNameEn: role.nameEn,
        roleNameAr: role.nameAr,
        scopeType: role.scopeType,
        branchIds: record.branchIds,
        status: "pending",
        expiresAt: record.expiresAt.toISOString(),
        acceptedAt: null,
        revokedAt: null,
        createdAt: record.createdAt.toISOString(),
      },
      rawToken,
      invitePath: `/${input.locale}/invite?token=${encodeURIComponent(rawToken)}`,
    };
  }

  async revokeInvitation(
    actor: TenantActor,
    invitationId: string,
  ): Promise<void> {
    const existing = await this.store.findInvitationById(invitationId);
    if (!existing || existing.companyId !== actor.company.id) {
      throw new TeamServiceError(
        "INVITATION_NOT_FOUND",
        "Invitation not found.",
        404,
      );
    }

    await this.store.revokeInvitationById(
      invitationId,
      actor.company.id,
      new Date(),
    );

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "team.invitation.revoked",
      entityType: "employee_invitation",
      entityId: invitationId,
      metadata: { email: existing.email },
    });
  }

  private async resolveValidInvitation(
    rawToken: string,
  ): Promise<{
    invitation: EmployeeInvitationRecord;
    company: CompanyRecord;
    role: CompanyRoleRecord;
  }> {
    const trimmed = rawToken.trim();
    if (!trimmed) {
      throw new TeamServiceError(
        "INVITATION_INVALID_OR_EXPIRED",
        "This invitation link is invalid or has expired.",
        400,
      );
    }

    const tokenHash = hashOpaqueToken(trimmed);
    const invitation = await this.store.findInvitationByTokenHash(tokenHash);
    const now = new Date();

    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt.getTime() <= now.getTime()
    ) {
      throw new TeamServiceError(
        "INVITATION_INVALID_OR_EXPIRED",
        "This invitation link is invalid or has expired.",
        400,
      );
    }

    const company = await this.store.findCompanyById(invitation.companyId);
    const role = await this.store.findCompanyRoleById(invitation.roleId);
    if (!company || !role) {
      throw new TeamServiceError(
        "INVITATION_INVALID_OR_EXPIRED",
        "This invitation link is no longer valid.",
        400,
      );
    }

    return { invitation, company, role };
  }

  async previewInvitation(rawToken: string): Promise<PublicInvitationPreview> {
    const { invitation, company, role } =
      await this.resolveValidInvitation(rawToken);
    const branches = await this.store.listBranchesByCompanyId(company.id);
    const branchMap = new Map(branches.map((b) => [b.id, `${b.name} (${b.code})`]));
    const branchNames =
      role.scopeType === "company_wide"
        ? []
        : invitation.branchIds
            .map((id) => branchMap.get(id))
            .filter((name): name is string => Boolean(name));

    return {
      companyName: company.name,
      companyLogoUrl: company.logoUrl,
      companyBrandColor: company.brandColor,
      email: invitation.email,
      fullName: invitation.fullName,
      roleNameEn: role.nameEn,
      roleNameAr: role.nameAr,
      scopeType: role.scopeType,
      branchNames,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async acceptInvitation(input: {
    rawToken: string;
    password: string;
    fullName?: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<{
    user: PublicAuthUser;
    rawSessionToken: string;
    sessionExpiresAt: Date;
  }> {
    const policyIssue = validateNewPassword(input.password);
    if (policyIssue) {
      throw new TeamServiceError(
        "WEAK_PASSWORD",
        "Password does not meet security requirements.",
        400,
      );
    }

    const { invitation, company, role } = await this.resolveValidInvitation(
      input.rawToken,
    );

    const existingUser = await this.store.findUserByEmail(invitation.email);
    if (existingUser) {
      const existingMembership = await this.store.findMembershipByUserId(
        existingUser.id,
      );
      const existingOwnedCompany = await this.store.findCompanyByOwnerUserId(
        existingUser.id,
      );
      if (existingMembership || existingOwnedCompany) {
        throw new TeamServiceError(
          "EMAIL_ALREADY_IN_COMPANY",
          "This email address already belongs to a company on Revix System.",
          409,
        );
      }
    }

    const now = new Date();
    const passwordHash = await hashPassword(input.password);
    let userId: string;
    let finalFullName = input.fullName?.trim() || invitation.fullName;

    if (existingUser) {
      userId = existingUser.id;
      finalFullName = existingUser.fullName;
      await this.store.updateUserPassword(userId, passwordHash, now);
      if (!existingUser.emailVerifiedAt) {
        await this.store.markUserEmailVerified(userId, now);
      }
    } else {
      const createdUser = await this.store.createUser({
        id: crypto.randomUUID(),
        fullName: finalFullName,
        email: invitation.email,
        passwordHash,
      });
      userId = createdUser.id;
      await this.store.markUserEmailVerified(userId, now);
    }

    await this.store.createCompanyMembership({
      id: crypto.randomUUID(),
      userId,
      companyId: company.id,
      roleId: role.id,
      phone: invitation.phone,
      status: "active",
      branchIds:
        role.scopeType === "company_wide" ? [] : [...invitation.branchIds],
    });

    await this.store.markInvitationAccepted(invitation.id, now);

    const rawSessionToken = generateSecureToken();
    const sessionExpiresAt = new Date(
      now.getTime() + this.sessionTtlHours * 60 * 60 * 1000,
    );
    await this.store.createSession({
      id: crypto.randomUUID(),
      userId,
      tokenHash: hashOpaqueToken(rawSessionToken),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt: sessionExpiresAt,
    });

    await this.store.recordAuditLog({
      companyId: company.id,
      actorUserId: userId,
      action: "team.invitation.accepted",
      entityType: "employee_invitation",
      entityId: invitation.id,
      metadata: { email: invitation.email, roleCode: role.code },
    });

    return {
      user: {
        id: userId,
        fullName: finalFullName,
        email: invitation.email,
        emailVerified: true,
        status: "active",
        companyId: company.id,
      },
      rawSessionToken,
      sessionExpiresAt,
    };
  }

  async updateMember(
    actor: TenantActor,
    membershipId: string,
    input: {
      roleId: string;
      phone: string;
      status: MembershipStatus;
      branchIds: string[];
    },
  ): Promise<PublicTeamMember> {
    const target = await this.store.findMembershipById(membershipId);
    if (!target || target.companyId !== actor.company.id) {
      throw new TeamServiceError(
        "MEMBER_NOT_FOUND",
        "Team member not found in your company.",
        404,
      );
    }

    const currentRole = await this.store.findCompanyRoleById(target.roleId);
    const isTargetOwner =
      currentRole?.code === "owner" ||
      target.userId === actor.company.ownerUserId;

    if (isTargetOwner) {
      throw new TeamServiceError(
        "CANNOT_MODIFY_OWNER",
        "The company owner's role and active status cannot be changed.",
        400,
      );
    }

    const { role, validBranchIds } = await this.validateRoleAndBranches(
      actor.company.id,
      input.roleId,
      input.branchIds,
    );

    if (role.code === "owner") {
      throw new TeamServiceError(
        "CANNOT_MODIFY_OWNER",
        "Cannot promote another member to the unique owner role.",
        400,
      );
    }

    const updated = await this.store.updateCompanyMembership(
      membershipId,
      actor.company.id,
      {
        roleId: role.id,
        phone: input.phone,
        status: input.status,
        branchIds: validBranchIds,
      },
    );

    if (!updated) {
      throw new TeamServiceError(
        "MEMBER_NOT_FOUND",
        "Team member not found.",
        404,
      );
    }

    if (input.status === "suspended") {
      await this.store.revokeAllUserSessions(target.userId, new Date());
    }

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "team.member.updated",
      entityType: "company_membership",
      entityId: membershipId,
      metadata: {
        roleCode: role.code,
        status: input.status,
        branchCount: validBranchIds.length,
      },
    });

    const memberUser = await this.store.findUserById(updated.userId);
    return {
      id: updated.id,
      userId: updated.userId,
      fullName: memberUser?.fullName ?? "",
      email: memberUser?.email ?? "",
      phone: updated.phone,
      status: updated.status,
      roleId: role.id,
      roleCode: role.code,
      roleNameEn: role.nameEn,
      roleNameAr: role.nameAr,
      scopeType: role.scopeType,
      branchIds: role.scopeType === "company_wide" ? [] : updated.branchIds,
      isOwner: false,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async updateRole(
    actor: TenantActor,
    roleId: string,
    input: {
      scopeType: RoleScopeType;
      permissions: PermissionMatrix;
    },
  ): Promise<CompanyRoleRecord> {
    const existing = await this.store.findCompanyRoleById(roleId);
    if (!existing || existing.companyId !== actor.company.id) {
      throw new TeamServiceError(
        "ROLE_NOT_FOUND",
        "Role not found in your company.",
        404,
      );
    }

    if (existing.code === "owner") {
      throw new TeamServiceError(
        "ROLE_LOCKED",
        "Owner role permissions are locked and cannot be restricted.",
        400,
      );
    }

    const sanitized = sanitizePermissionMatrix(input.permissions);
    const updated = await this.store.updateCompanyRole(
      roleId,
      actor.company.id,
      {
        scopeType: input.scopeType,
        permissions: sanitized,
      },
    );

    if (!updated) {
      throw new TeamServiceError("ROLE_NOT_FOUND", "Role not found.", 404);
    }

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "team.role.updated",
      entityType: "company_role",
      entityId: roleId,
      metadata: {
        roleCode: updated.code,
        scopeType: updated.scopeType,
      },
    });

    return updated;
  }

  async createRole(
    actor: TenantActor,
    input: {
      nameEn: string;
      nameAr: string;
      descriptionEn?: string;
      descriptionAr?: string;
      scopeType: RoleScopeType;
      permissions: PermissionMatrix;
    },
  ): Promise<CompanyRoleRecord> {
    if (actor.role.code !== "owner" && actor.role.code !== "ceo") {
      throw new TeamServiceError(
        "FORBIDDEN",
        "Only the Owner or CEO can create custom roles.",
        403,
      );
    }

    const code = `custom_${crypto.randomUUID().slice(0, 8)}`;
    const role = await this.store.createCompanyRole({
      id: crypto.randomUUID(),
      companyId: actor.company.id,
      code,
      nameEn: input.nameEn.trim(),
      nameAr: input.nameAr.trim(),
      descriptionEn: input.descriptionEn?.trim() || input.nameEn.trim(),
      descriptionAr: input.descriptionAr?.trim() || input.nameAr.trim(),
      scopeType: input.scopeType,
      permissions: sanitizePermissionMatrix(input.permissions),
      isSystem: false,
    });

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "team.role.created",
      entityType: "company_role",
      entityId: role.id,
      metadata: { roleCode: role.code, nameEn: role.nameEn },
    });

    return role;
  }

  async deleteRole(actor: TenantActor, roleId: string): Promise<void> {
    if (actor.role.code !== "owner" && actor.role.code !== "ceo") {
      throw new TeamServiceError(
        "FORBIDDEN",
        "Only the Owner or CEO can delete custom roles.",
        403,
      );
    }

    const roles = await this.store.listCompanyRoles(actor.company.id);
    const target = roles.find((r) => r.id === roleId);
    if (!target) {
      throw new TeamServiceError("ROLE_NOT_FOUND", "Role not found.", 404);
    }
    if (target.isSystem) {
      throw new TeamServiceError(
        "ROLE_LOCKED",
        "System roles cannot be deleted.",
        400,
      );
    }

    const memberships = await this.store.listCompanyMemberships(actor.company.id);
    if (memberships.some((m) => m.roleId === roleId)) {
      throw new TeamServiceError(
        "ROLE_IN_USE",
        "Cannot delete a role that is currently assigned to team members.",
        409,
      );
    }

    await this.store.deleteCompanyRole(roleId, actor.company.id);

    await this.store.recordAuditLog({
      companyId: actor.company.id,
      actorUserId: actor.user.id,
      action: "team.role.deleted",
      entityType: "company_role",
      entityId: roleId,
      metadata: { roleCode: target.code },
    });
  }
}
