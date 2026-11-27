import crypto from "node:crypto";
import type {
  AuthDataStore,
  BranchRecord,
  CompanyOperatingMode,
  CompanyRecord,
  MembershipStatus,
  PermissionMatrix,
  PermissionResource,
  RoleScopeType,
} from "../../db/store.ts";
import { hasPermission } from "../team/defaultRoles.ts";
import type { TeamService } from "../team/teamService.ts";
import { findCountryMetadata } from "./countryCatalog.ts";

export type WorkspaceErrorCode =
  | "UNAUTHORIZED"
  | "EMAIL_NOT_VERIFIED"
  | "FORBIDDEN"
  | "MEMBERSHIP_SUSPENDED"
  | "BRANCH_SCOPE_DENIED"
  | "COMPANY_ALREADY_EXISTS"
  | "COMPANY_NOT_FOUND"
  | "BRANCH_NOT_FOUND"
  | "BRANCH_CODE_EXISTS"
  | "UNSUPPORTED_COUNTRY"
  | "INVALID_INPUT";

export class WorkspaceServiceError extends Error {
  public readonly code: WorkspaceErrorCode;
  public readonly status: number;

  constructor(code: WorkspaceErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface WorkspaceMembershipSummary {
  id: string;
  roleId: string;
  roleCode: string;
  roleNameEn: string;
  roleNameAr: string;
  scopeType: RoleScopeType;
  permissions: PermissionMatrix;
  branchIds: string[];
  status: MembershipStatus;
}

export interface WorkspaceContextPayload {
  company: CompanyRecord | null;
  branches: BranchRecord[];
  membership: WorkspaceMembershipSummary | null;
  onboardingState: "needs_company" | "needs_first_branch" | "ready";
}

export class WorkspaceService {
  private readonly store: AuthDataStore;
  private readonly teamService?: TeamService;

  constructor(store: AuthDataStore, teamService?: TeamService) {
    this.store = store;
    this.teamService = teamService;
  }

  private async resolveCompanyAndAuthorize(
    userId: string,
    required?: {
      resource: PermissionResource;
      action: string;
      branchId?: string;
    },
  ): Promise<{
    company: CompanyRecord;
    membershipSummary: WorkspaceMembershipSummary | null;
  }> {
    let membership = await this.store.findMembershipByUserId(userId);
    let company: CompanyRecord | null = null;

    if (membership) {
      company = await this.store.findCompanyById(membership.companyId);
    } else {
      company = await this.store.findCompanyByOwnerUserId(userId);
      if (company && this.teamService) {
        await this.teamService.ensureCompanyRolesAndOwnerMembership(company);
        membership = await this.store.findMembershipByUserId(userId);
      }
    }

    if (!company) {
      throw new WorkspaceServiceError(
        "COMPANY_NOT_FOUND",
        "Company setup is required first.",
        404,
      );
    }

    let membershipSummary: WorkspaceMembershipSummary | null = null;
    if (membership) {
      if (membership.status === "suspended") {
        throw new WorkspaceServiceError(
          "MEMBERSHIP_SUSPENDED",
          "Your access to this company workspace has been suspended.",
          403,
        );
      }

      const role = await this.store.findCompanyRoleById(membership.roleId);
      if (role) {
        membershipSummary = {
          id: membership.id,
          roleId: role.id,
          roleCode: role.code,
          roleNameEn: role.nameEn,
          roleNameAr: role.nameAr,
          scopeType: role.scopeType,
          permissions: role.permissions,
          branchIds:
            role.scopeType === "company_wide" ? [] : [...membership.branchIds],
          status: membership.status,
        };

        if (required) {
          if (
            !hasPermission(role.permissions, required.resource, required.action)
          ) {
            throw new WorkspaceServiceError(
              "FORBIDDEN",
              "You do not have permission to perform this action.",
              403,
            );
          }

          if (
            required.branchId &&
            role.scopeType === "assigned_branches" &&
            !membership.branchIds.includes(required.branchId)
          ) {
            throw new WorkspaceServiceError(
              "BRANCH_SCOPE_DENIED",
              "You do not have access to this branch.",
              403,
            );
          }
        }
      }
    }

    return { company, membershipSummary };
  }

  async getWorkspaceContext(userId: string): Promise<WorkspaceContextPayload> {
    let membership = await this.store.findMembershipByUserId(userId);
    let company: CompanyRecord | null = null;

    if (membership) {
      company = await this.store.findCompanyById(membership.companyId);
    } else {
      company = await this.store.findCompanyByOwnerUserId(userId);
    }

    if (!company) {
      return {
        company: null,
        branches: [],
        membership: null,
        onboardingState: "needs_company",
      };
    }

    if (this.teamService) {
      await this.teamService.ensureCompanyRolesAndOwnerMembership(company);
      membership = await this.store.findMembershipByUserId(userId);
    }

    if (membership && membership.status === "suspended") {
      throw new WorkspaceServiceError(
        "MEMBERSHIP_SUSPENDED",
        "Your access to this company workspace has been suspended.",
        403,
      );
    }

    let membershipSummary: WorkspaceMembershipSummary | null = null;
    if (membership) {
      const role = await this.store.findCompanyRoleById(membership.roleId);
      if (role) {
        membershipSummary = {
          id: membership.id,
          roleId: role.id,
          roleCode: role.code,
          roleNameEn: role.nameEn,
          roleNameAr: role.nameAr,
          scopeType: role.scopeType,
          permissions: role.permissions,
          branchIds:
            role.scopeType === "company_wide" ? [] : [...membership.branchIds],
          status: membership.status,
        };
      }
    }

    const allBranches = await this.store.listBranchesByCompanyId(company.id);
    const visibleBranches =
      membershipSummary?.scopeType === "assigned_branches"
        ? allBranches.filter((b) => membershipSummary.branchIds.includes(b.id))
        : allBranches;

    return {
      company,
      branches: visibleBranches,
      membership: membershipSummary,
      onboardingState: allBranches.length === 0 ? "needs_first_branch" : "ready",
    };
  }

  async createCompany(input: {
    userId: string;
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
    contractTermsAr?: string | null;
    contractTermsEn?: string | null;
  }): Promise<CompanyRecord> {
    const existingMembership = await this.store.findMembershipByUserId(
      input.userId,
    );
    const existing = await this.store.findCompanyByOwnerUserId(input.userId);
    if (existing || existingMembership) {
      throw new WorkspaceServiceError(
        "COMPANY_ALREADY_EXISTS",
        "This account already belongs to a registered company.",
        409,
      );
    }

    const country = findCountryMetadata(input.countryCode);
    if (!country) {
      throw new WorkspaceServiceError(
        "UNSUPPORTED_COUNTRY",
        "Selected country is not supported.",
        400,
      );
    }

    let company: CompanyRecord;
    try {
      company = await this.store.createCompany({
        id: crypto.randomUUID(),
        ownerUserId: input.userId,
        name: input.name,
        legalName: input.legalName,
        logoUrl: input.logoUrl ?? null,
        brandColor: input.brandColor,
        phone: input.phone,
        email: input.email,
        countryCode: country.code,
        city: input.city,
        address: input.address,
        postalCode: input.postalCode,
        baseCurrency: input.baseCurrency || country.currencyCode,
        timezone: input.timezone || country.defaultTimezone,
        businessRegNumber: input.businessRegNumber,
        taxRegNumber: input.taxRegNumber,
        operatingMode: input.operatingMode,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        throw new WorkspaceServiceError(
          "COMPANY_ALREADY_EXISTS",
          "This account already belongs to a registered company.",
          409,
        );
      }
      throw err;
    }

    if (this.teamService) {
      await this.teamService.ensureCompanyRolesAndOwnerMembership(company);
    }

    await this.store.recordAuditLog({
      companyId: company.id,
      actorUserId: input.userId,
      action: "workspace.company.created",
      entityType: "company",
      entityId: company.id,
      metadata: {
        countryCode: company.countryCode,
        baseCurrency: company.baseCurrency,
        operatingMode: company.operatingMode,
      },
    });

    return company;
  }

  async updateCompany(input: {
    userId: string;
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
    contractTermsAr?: string | null;
    contractTermsEn?: string | null;
  }): Promise<CompanyRecord> {
    const { company } = await this.resolveCompanyAndAuthorize(input.userId, {
      resource: "company",
      action: "update",
    });

    const country = findCountryMetadata(input.countryCode);
    if (!country) {
      throw new WorkspaceServiceError(
        "UNSUPPORTED_COUNTRY",
        "Selected country is not supported.",
        400,
      );
    }

    const updated = await this.store.updateCompany(company.id, {
      name: input.name,
      legalName: input.legalName,
      logoUrl: input.logoUrl ?? null,
      brandColor: input.brandColor,
      phone: input.phone,
      email: input.email,
      countryCode: country.code,
      city: input.city,
      address: input.address,
      postalCode: input.postalCode,
      baseCurrency: input.baseCurrency || country.currencyCode,
      timezone: input.timezone || country.defaultTimezone,
      businessRegNumber: input.businessRegNumber,
      taxRegNumber: input.taxRegNumber,
      operatingMode: input.operatingMode,
      contractTermsAr: input.contractTermsAr ?? null,
      contractTermsEn: input.contractTermsEn ?? null,
    });

    if (!updated) {
      throw new WorkspaceServiceError(
        "COMPANY_NOT_FOUND",
        "Company not found.",
        404,
      );
    }

    await this.store.recordAuditLog({
      companyId: updated.id,
      actorUserId: input.userId,
      action: "workspace.company.updated",
      entityType: "company",
      entityId: updated.id,
    });

    return updated;
  }

  async createBranch(input: {
    userId: string;
    name: string;
    code: string;
    countryCode: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    currencyCode?: string;
    timezone?: string;
    workingDays: string;
    workingHours: string;
  }): Promise<BranchRecord> {
    const { company } = await this.resolveCompanyAndAuthorize(input.userId, {
      resource: "branches",
      action: "create",
    });

    const country = findCountryMetadata(input.countryCode);
    if (!country) {
      throw new WorkspaceServiceError(
        "UNSUPPORTED_COUNTRY",
        "Selected branch country is not supported.",
        400,
      );
    }

    // Branch currency defaults to the branch's country currency, but can be overridden (e.g. USD/EUR)
    const branchCurrency =
      input.currencyCode?.trim().toUpperCase() || country.currencyCode;
    const branchTimezone = input.timezone?.trim() || country.defaultTimezone;

    let branch: BranchRecord;
    try {
      branch = await this.store.createBranch({
        id: crypto.randomUUID(),
        companyId: company.id,
        name: input.name,
        code: input.code,
        countryCode: country.code,
        city: input.city,
        address: input.address,
        phone: input.phone,
        email: input.email,
        currencyCode: branchCurrency,
        timezone: branchTimezone,
        workingDays: input.workingDays,
        workingHours: input.workingHours,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        throw new WorkspaceServiceError(
          "BRANCH_CODE_EXISTS",
          "A branch with this code already exists in your company.",
          409,
        );
      }
      throw err;
    }

    if (company.operatingMode === "local_partner") {
      const parentLinks = await this.store.listNetworkLinksForLocal(company.id);
      const allBranches = await this.store.listBranchesByCompanyId(company.id);
      const allBranchIds = allBranches.map((b) => b.id);
      for (const link of parentLinks) {
        await this.store.setNetworkPermittedBranches(
          link.id,
          company.id,
          allBranchIds,
        );
      }
    }

    await this.store.recordAuditLog({
      companyId: company.id,
      branchId: branch.id,
      actorUserId: input.userId,
      action: "workspace.branch.created",
      entityType: "branch",
      entityId: branch.id,
      metadata: {
        code: branch.code,
        countryCode: branch.countryCode,
        currencyCode: branch.currencyCode,
      },
    });

    return branch;
  }

  async updateBranch(input: {
    userId: string;
    branchId: string;
    name: string;
    code: string;
    countryCode: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    currencyCode?: string;
    timezone?: string;
    workingDays: string;
    workingHours: string;
    isActive: boolean;
  }): Promise<BranchRecord> {
    const { company } = await this.resolveCompanyAndAuthorize(input.userId, {
      resource: "branches",
      action: "update",
      branchId: input.branchId,
    });

    const country = findCountryMetadata(input.countryCode);
    if (!country) {
      throw new WorkspaceServiceError(
        "UNSUPPORTED_COUNTRY",
        "Selected branch country is not supported.",
        400,
      );
    }

    let updated: BranchRecord | null;
    try {
      updated = await this.store.updateBranch(input.branchId, company.id, {
        name: input.name,
        code: input.code,
        countryCode: country.code,
        city: input.city,
        address: input.address,
        phone: input.phone,
        email: input.email,
        currencyCode:
          input.currencyCode?.trim().toUpperCase() || country.currencyCode,
        timezone: input.timezone?.trim() || country.defaultTimezone,
        workingDays: input.workingDays,
        workingHours: input.workingHours,
        isActive: input.isActive,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        throw new WorkspaceServiceError(
          "BRANCH_CODE_EXISTS",
          "A branch with this code already exists in your company.",
          409,
        );
      }
      throw err;
    }

    if (!updated) {
      throw new WorkspaceServiceError(
        "BRANCH_NOT_FOUND",
        "Branch not found in your company workspace.",
        404,
      );
    }

    await this.store.recordAuditLog({
      companyId: company.id,
      branchId: updated.id,
      actorUserId: input.userId,
      action: "workspace.branch.updated",
      entityType: "branch",
      entityId: updated.id,
    });

    return updated;
  }
}
