import crypto from "node:crypto";
import type {
  AuthDataStore,
  BranchRecord,
  CompanyOperatingMode,
  CompanyRecord,
} from "../../db/store.ts";
import { findCountryMetadata } from "./countryCatalog.ts";

export type WorkspaceErrorCode =
  | "UNAUTHORIZED"
  | "EMAIL_NOT_VERIFIED"
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

export interface WorkspaceContextPayload {
  company: CompanyRecord | null;
  branches: BranchRecord[];
  onboardingState: "needs_company" | "needs_first_branch" | "ready";
}

export class WorkspaceService {
  private readonly store: AuthDataStore;

  constructor(store: AuthDataStore) {
    this.store = store;
  }

  async getWorkspaceContext(userId: string): Promise<WorkspaceContextPayload> {
    const company = await this.store.findCompanyByOwnerUserId(userId);
    if (!company) {
      return {
        company: null,
        branches: [],
        onboardingState: "needs_company",
      };
    }

    const branches = await this.store.listBranchesByCompanyId(company.id);
    return {
      company,
      branches,
      onboardingState: branches.length === 0 ? "needs_first_branch" : "ready",
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
  }): Promise<CompanyRecord> {
    const existing = await this.store.findCompanyByOwnerUserId(input.userId);
    if (existing) {
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
  }): Promise<CompanyRecord> {
    const company = await this.store.findCompanyByOwnerUserId(input.userId);
    if (!company) {
      throw new WorkspaceServiceError(
        "COMPANY_NOT_FOUND",
        "Company setup is required first.",
        404,
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
    timezone?: string;
    workingDays: string;
    workingHours: string;
  }): Promise<BranchRecord> {
    const company = await this.store.findCompanyByOwnerUserId(input.userId);
    if (!company) {
      throw new WorkspaceServiceError(
        "COMPANY_NOT_FOUND",
        "Please complete company setup before adding a branch.",
        404,
      );
    }

    const country = findCountryMetadata(input.countryCode);
    if (!country) {
      throw new WorkspaceServiceError(
        "UNSUPPORTED_COUNTRY",
        "Selected branch country is not supported.",
        400,
      );
    }

    // Confirmed business rule: branch currency is automatically determined by the branch's country
    const branchCurrency = country.currencyCode;
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
    timezone?: string;
    workingDays: string;
    workingHours: string;
    isActive: boolean;
  }): Promise<BranchRecord> {
    const company = await this.store.findCompanyByOwnerUserId(input.userId);
    if (!company) {
      throw new WorkspaceServiceError(
        "COMPANY_NOT_FOUND",
        "Company not found.",
        404,
      );
    }

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
        currencyCode: country.currencyCode,
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
