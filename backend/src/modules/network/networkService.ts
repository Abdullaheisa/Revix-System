import crypto from "node:crypto";
import type {
  AuthDataStore,
  BranchRecord,
  CompanyNetworkInvitationRecord,
  CompanyNetworkLinkRecord,
  CompanyRecord,
  NetworkLinkStatus,
  NetworkPermittedBranchRecord,
} from "../../db/store.ts";
import type { EmailDeliveryAdapter } from "../auth/emailDelivery.ts";
import { hashPassword, verifyPassword } from "../../security/passwordHash.ts";
import { validateNewPassword } from "../../security/passwordPolicy.ts";
import { generateSecureToken, hashOpaqueToken } from "../../security/tokens.ts";

export type NetworkErrorCode =
  | "COMPANY_NOT_FOUND"
  | "NOT_MAIN_COMPANY"
  | "INVITATION_NOT_FOUND"
  | "INVITATION_ALREADY_USED"
  | "INVITATION_EXPIRED"
  | "MAIN_COMPANY_NOT_FOUND"
  | "LOCAL_COMPANY_NOT_FOUND"
  | "CANNOT_LINK_SAME_COMPANY"
  | "FAILED_TO_CREATE_LINK"
  | "LINK_NOT_FOUND"
  | "FAILED_TO_UPDATE_LINK"
  | "FORBIDDEN_CROSS_TENANT"
  | "FORBIDDEN_NETWORK_VIEW_ONLY"
  | "WEAK_PASSWORD"
  | "INVALID_CREDENTIALS";

export class NetworkServiceError extends Error {
  public readonly code: NetworkErrorCode;
  public readonly status: number;

  constructor(code: NetworkErrorCode, message: string, status: number) {
    super(message);
    this.name = "NetworkServiceError";
    this.code = code;
    this.status = status;
  }
}

export interface ConnectedLocalPartnerDto {
  linkId: string;
  companyId: string;
  name: string;
  legalName: string;
  logoUrl: string | null;
  brandColor: string;
  countryCode: string;
  city: string;
  email: string;
  phone: string;
  baseCurrency: string;
  status: NetworkLinkStatus;
  permittedBranches: BranchRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkOverviewDto {
  operatingMode: "independent" | "network_main" | "local_partner";
  isMainCompany: boolean;
  isLocalPartner: boolean;
  connectedPartners: ConnectedLocalPartnerDto[];
  pendingInvitations: CompanyNetworkInvitationRecord[];
  parentLinks?: {
    linkId: string;
    mainCompany: CompanyRecord;
    status: NetworkLinkStatus;
    permittedBranches: BranchRecord[];
  }[];
}

export class NetworkService {
  private readonly store: AuthDataStore;
  private readonly emailDelivery: EmailDeliveryAdapter;

  constructor(store: AuthDataStore, emailDelivery: EmailDeliveryAdapter) {
    this.store = store;
    this.emailDelivery = emailDelivery;
  }

  async getNetworkOverview(companyId: string): Promise<NetworkOverviewDto> {
    const company = await this.store.findCompanyById(companyId);
    if (!company) {
      throw new NetworkServiceError(
        "COMPANY_NOT_FOUND",
        "Company workspace not found.",
        404,
      );
    }

    const isMainCompany = company.operatingMode === "network_main";
    const isLocalPartner = company.operatingMode === "local_partner";

    if (isMainCompany) {
      const links = await this.store.listNetworkLinksForMain(companyId);
      const connectedPartners: ConnectedLocalPartnerDto[] = [];

      for (const link of links) {
        const partnerCompany = await this.store.findCompanyById(link.localCompanyId);
        if (!partnerCompany) continue;

        const permittedBranchLinks =
          await this.store.listNetworkPermittedBranches(link.id);
        const permittedBranchIds = new Set(
          permittedBranchLinks.map((p: NetworkPermittedBranchRecord) => p.branchId),
        );

        const allPartnerBranches =
          await this.store.listBranchesByCompanyId(partnerCompany.id);
        const permittedBranches = allPartnerBranches.filter((b: BranchRecord) =>
          permittedBranchIds.has(b.id),
        );

        connectedPartners.push({
          linkId: link.id,
          companyId: partnerCompany.id,
          name: partnerCompany.name,
          legalName: partnerCompany.legalName,
          logoUrl: partnerCompany.logoUrl,
          brandColor: partnerCompany.brandColor,
          countryCode: partnerCompany.countryCode,
          city: partnerCompany.city,
          email: partnerCompany.email,
          phone: partnerCompany.phone,
          baseCurrency: partnerCompany.baseCurrency,
          status: link.status,
          permittedBranches,
          createdAt: link.createdAt,
          updatedAt: link.updatedAt,
        });
      }

      const pendingInvitations =
        await this.store.listNetworkInvitationsForMain(companyId);

      return {
        operatingMode: "network_main",
        isMainCompany: true,
        isLocalPartner: false,
        connectedPartners,
        pendingInvitations: pendingInvitations.filter(
          (inv: CompanyNetworkInvitationRecord) =>
            inv.status === "pending" && inv.expiresAt > new Date(),
        ),
      };
    }

    if (isLocalPartner) {
      const links = await this.store.listNetworkLinksForLocal(companyId);
      const parentLinks: NetworkOverviewDto["parentLinks"] = [];

      for (const link of links) {
        const mainCompany = await this.store.findCompanyById(link.mainCompanyId);
        if (!mainCompany) continue;

        const permittedBranchLinks =
          await this.store.listNetworkPermittedBranches(link.id);
        const permittedBranchIds = new Set(
          permittedBranchLinks.map((p: NetworkPermittedBranchRecord) => p.branchId),
        );

        const myBranches = await this.store.listBranchesByCompanyId(companyId);
        const permittedBranches = myBranches.filter((b: BranchRecord) =>
          permittedBranchIds.has(b.id),
        );

        parentLinks.push({
          linkId: link.id,
          mainCompany,
          status: link.status,
          permittedBranches,
        });
      }

      return {
        operatingMode: "local_partner",
        isMainCompany: false,
        isLocalPartner: true,
        connectedPartners: [],
        pendingInvitations: [],
        parentLinks,
      };
    }

    return {
      operatingMode: "independent",
      isMainCompany: false,
      isLocalPartner: false,
      connectedPartners: [],
      pendingInvitations: [],
    };
  }

  async inviteLocalPartner(
    mainCompanyId: string,
    actorUserId: string,
    input: {
      inviteeEmail: string;
      localCompanyName: string;
      contactName?: string;
      contactPhone?: string;
      logoUrl?: string | null;
      locale?: "en" | "ar";
    },
  ): Promise<{
    invitation: CompanyNetworkInvitationRecord;
    rawToken: string;
    inviteLink: string;
  }> {
    const mainCompany = await this.store.findCompanyById(mainCompanyId);
    if (!mainCompany) {
      throw new NetworkServiceError(
        "COMPANY_NOT_FOUND",
        "Company not found.",
        404,
      );
    }

    if (mainCompany.operatingMode !== "network_main") {
      throw new NetworkServiceError(
        "NOT_MAIN_COMPANY",
        "Only Main Network Companies can perform this operation.",
        403,
      );
    }

    const email = input.inviteeEmail.trim().toLowerCase();
    const rawToken = generateSecureToken(32);
    const tokenHash = hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days TTL

    const invitation = await this.store.createNetworkInvitation({
      id: crypto.randomUUID(),
      mainCompanyId,
      inviteeEmail: email,
      localCompanyName: input.localCompanyName.trim(),
      contactName: input.contactName?.trim() || undefined,
      contactPhone: input.contactPhone?.trim() || undefined,
      logoUrl: input.logoUrl ?? null,
      tokenHash,
      expiresAt,
      invitedByUserId: actorUserId,
    });

    if (this.emailDelivery.sendNetworkInvitationEmail) {
      await this.emailDelivery.sendNetworkInvitationEmail({
        toEmail: email,
        localCompanyName: input.localCompanyName.trim(),
        mainCompanyName: mainCompany.name,
        locale: input.locale ?? "en",
        rawToken,
      });
    }

    await this.store.recordAuditLog({
      companyId: mainCompanyId,
      actorUserId,
      action: "network.invitation_created",
      entityType: "company_network_invitations",
      entityId: invitation.id,
      metadata: {
        inviteeEmail: email,
        localCompanyName: input.localCompanyName,
      },
    });

    return {
      invitation,
      rawToken,
      inviteLink: `/invite/network?token=${rawToken}`,
    };
  }

  async previewNetworkInvitation(rawToken: string): Promise<{
    invitation: CompanyNetworkInvitationRecord;
    mainCompany: CompanyRecord;
    accountExists: boolean;
  }> {
    const tokenHash = hashOpaqueToken(rawToken.trim());
    const invitation =
      await this.store.findNetworkInvitationByTokenHash(tokenHash);

    if (!invitation) {
      throw new NetworkServiceError(
        "INVITATION_NOT_FOUND",
        "Network invitation not found.",
        404,
      );
    }

    if (invitation.status !== "pending") {
      throw new NetworkServiceError(
        "INVITATION_ALREADY_USED",
        "This network invitation has already been processed.",
        400,
      );
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new NetworkServiceError(
        "INVITATION_EXPIRED",
        "This network invitation has expired.",
        400,
      );
    }

    const mainCompany = await this.store.findCompanyById(invitation.mainCompanyId);
    if (!mainCompany) {
      throw new NetworkServiceError(
        "MAIN_COMPANY_NOT_FOUND",
        "Originating main company not found.",
        404,
      );
    }

    const existingUser = await this.store.findUserByEmail(invitation.inviteeEmail);

    return {
      invitation,
      mainCompany,
      accountExists: Boolean(existingUser),
    };
  }

  async completeNetworkInvitationOnboarding(input: {
    rawToken: string;
    password: string;
    fullName?: string;
    ipAddress: string | null;
    userAgent: string | null;
    sessionTtlHours: number;
    ensureCompanyRolesAndOwnerMembership: (company: CompanyRecord) => Promise<unknown>;
  }): Promise<{
    link: CompanyNetworkLinkRecord;
    rawSessionToken: string;
    sessionExpiresAt: Date;
  }> {
    const { invitation, mainCompany } = await this.previewNetworkInvitation(
      input.rawToken,
    );

    const now = new Date();
    const existingUser = await this.store.findUserByEmail(invitation.inviteeEmail);
    let userId: string;
    let localCompany: CompanyRecord | null = null;

    if (existingUser) {
      const ok = await verifyPassword(existingUser.passwordHash, input.password);
      if (!ok) {
        throw new NetworkServiceError(
          "INVALID_CREDENTIALS",
          "Incorrect password for this account.",
          401,
        );
      }
      userId = existingUser.id;
      if (!existingUser.emailVerifiedAt) {
        await this.store.markUserEmailVerified(userId, now);
      }

      const owned = await this.store.findCompanyByOwnerUserId(userId);
      if (owned) {
        localCompany = owned;
      } else {
        const membership = await this.store.findMembershipByUserId(userId);
        if (membership) {
          localCompany = await this.store.findCompanyById(membership.companyId);
        }
      }
    } else {
      const policyIssue = validateNewPassword(input.password);
      if (policyIssue) {
        throw new NetworkServiceError(
          "WEAK_PASSWORD",
          "Password does not meet security policy requirements.",
          400,
        );
      }

      const passwordHash = await hashPassword(input.password);
      const createdUser = await this.store.createUser({
        id: crypto.randomUUID(),
        fullName:
          input.fullName?.trim() ||
          invitation.contactName ||
          invitation.localCompanyName,
        email: invitation.inviteeEmail,
        passwordHash,
      });
      userId = createdUser.id;
      await this.store.markUserEmailVerified(userId, now);
    }

    if (!localCompany) {
      localCompany = await this.store.createCompany({
        id: crypto.randomUUID(),
        ownerUserId: userId,
        name: invitation.localCompanyName,
        legalName: invitation.localCompanyName,
        logoUrl: invitation.logoUrl ?? null,
        brandColor: mainCompany.brandColor,
        phone: invitation.contactPhone || "",
        email: invitation.inviteeEmail,
        countryCode: mainCompany.countryCode,
        city: mainCompany.city,
        address: "",
        postalCode: "",
        baseCurrency: mainCompany.baseCurrency,
        timezone: mainCompany.timezone,
        businessRegNumber: "",
        taxRegNumber: "",
        operatingMode: "local_partner",
      });

      await input.ensureCompanyRolesAndOwnerMembership(localCompany);
    }

    const localBranches = await this.store.listBranchesByCompanyId(
      localCompany.id,
    );
    const { link } = await this.acceptNetworkInvitation(
      input.rawToken,
      localCompany.id,
      userId,
      { permittedBranchIds: localBranches.map((b) => b.id) },
    );

    const rawSessionToken = generateSecureToken(32);
    const sessionExpiresAt = new Date(
      now.getTime() + input.sessionTtlHours * 60 * 60 * 1000,
    );

    await this.store.createSession({
      id: crypto.randomUUID(),
      userId,
      tokenHash: hashOpaqueToken(rawSessionToken),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      expiresAt: sessionExpiresAt,
    });

    return {
      link,
      rawSessionToken,
      sessionExpiresAt,
    };
  }

  async acceptNetworkInvitation(
    rawToken: string,
    localCompanyId: string,
    actorUserId: string,
    input: { permittedBranchIds: string[] },
  ): Promise<{ link: CompanyNetworkLinkRecord }> {
    const { invitation, mainCompany } =
      await this.previewNetworkInvitation(rawToken);

    const localCompany = await this.store.findCompanyById(localCompanyId);
    if (!localCompany) {
      throw new NetworkServiceError(
        "LOCAL_COMPANY_NOT_FOUND",
        "Target local company not found.",
        404,
      );
    }

    if (localCompany.id === mainCompany.id) {
      throw new NetworkServiceError(
        "CANNOT_LINK_SAME_COMPANY",
        "Cannot create a network link with the same company.",
        400,
      );
    }

    // Verify branches belong to local company
    const localBranches =
      await this.store.listBranchesByCompanyId(localCompany.id);
    const validBranchIds = new Set(localBranches.map((b: BranchRecord) => b.id));
    const selectedBranches = input.permittedBranchIds.filter((bId: string) =>
      validBranchIds.has(bId),
    );

    if (selectedBranches.length === 0 && localBranches.length > 0) {
      // Default to sharing the first branch if none explicitly chosen
      selectedBranches.push(localBranches[0].id);
    }

    // Check if link already exists
    let link = await this.store.findNetworkLink(mainCompany.id, localCompany.id);
    if (!link) {
      link = await this.store.createNetworkLink({
        id: crypto.randomUUID(),
        mainCompanyId: mainCompany.id,
        localCompanyId: localCompany.id,
        status: "active",
        permittedCountries: [localCompany.countryCode],
        createdByUserId: actorUserId,
      });
    } else {
      link = await this.store.updateNetworkLinkStatus(link.id, "active");
    }

    if (!link) {
      throw new NetworkServiceError(
        "FAILED_TO_CREATE_LINK",
        "Failed to establish network link.",
        500,
      );
    }

    await this.store.setNetworkPermittedBranches(
      link.id,
      localCompany.id,
      selectedBranches,
    );

    // Update local company operating mode to local_partner
    await this.store.updateCompanyOperatingMode(
      localCompany.id,
      "local_partner",
      mainCompany.id,
    );

    await this.store.updateNetworkInvitationStatus(
      invitation.id,
      "accepted",
      new Date(),
    );

    await this.store.recordAuditLog({
      companyId: mainCompany.id,
      actorUserId,
      action: "network.link_accepted",
      entityType: "company_network_links",
      entityId: link.id,
      metadata: {
        localCompanyId: localCompany.id,
        permittedBranchCount: selectedBranches.length,
      },
    });

    return { link };
  }

  async updateLinkStatus(
    mainCompanyId: string,
    actorUserId: string,
    linkId: string,
    status: NetworkLinkStatus,
  ): Promise<CompanyNetworkLinkRecord> {
    const link = await this.store.findNetworkLinkById(linkId);
    if (!link || link.mainCompanyId !== mainCompanyId) {
      throw new NetworkServiceError(
        "LINK_NOT_FOUND",
        "Company network link not found.",
        404,
      );
    }

    const updated = await this.store.updateNetworkLinkStatus(linkId, status);
    if (!updated) {
      throw new NetworkServiceError(
        "FAILED_TO_UPDATE_LINK",
        "Failed to update network link status.",
        500,
      );
    }

    await this.store.recordAuditLog({
      companyId: mainCompanyId,
      actorUserId,
      action: "network.link_status_updated",
      entityType: "company_network_links",
      entityId: linkId,
      metadata: { nextStatus: status },
    });

    return updated;
  }

  async updatePermittedBranches(
    callerCompanyId: string,
    linkId: string,
    branchIds: string[],
  ): Promise<NetworkPermittedBranchRecord[]> {
    const link = await this.store.findNetworkLinkById(linkId);
    if (
      !link ||
      (link.mainCompanyId !== callerCompanyId &&
        link.localCompanyId !== callerCompanyId)
    ) {
      throw new NetworkServiceError(
        "LINK_NOT_FOUND",
        "Company network link not found or access denied.",
        404,
      );
    }

    const localBranches =
      await this.store.listBranchesByCompanyId(link.localCompanyId);
    const validBranchIds = new Set(localBranches.map((b: BranchRecord) => b.id));
    const safeBranchIds = branchIds.filter((bId: string) => validBranchIds.has(bId));

    return this.store.setNetworkPermittedBranches(
      linkId,
      link.localCompanyId,
      safeBranchIds,
    );
  }

  async terminateLink(
    mainCompanyId: string,
    actorUserId: string,
    linkId: string,
  ): Promise<void> {
    const link = await this.store.findNetworkLinkById(linkId);
    if (!link || link.mainCompanyId !== mainCompanyId) {
      throw new NetworkServiceError(
        "LINK_NOT_FOUND",
        "Company network link not found.",
        404,
      );
    }

    await this.store.deleteNetworkLink(linkId);

    // Revert local company to independent if no other parent links exist
    const remainingParentLinks =
      await this.store.listNetworkLinksForLocal(link.localCompanyId);
    if (remainingParentLinks.length === 0) {
      await this.store.updateCompanyOperatingMode(
        link.localCompanyId,
        "independent",
        null,
      );
    }

    await this.store.recordAuditLog({
      companyId: mainCompanyId,
      actorUserId,
      action: "network.link_terminated",
      entityType: "company_network_links",
      entityId: linkId,
      metadata: { localCompanyId: link.localCompanyId },
    });
  }

  /**
   * Strict Access Guard: Enforces View-Only isolation for Main Companies.
   * If a main company attempts to write (modify or delete) a resource belonging to a connected local company,
   * this throws FORBIDDEN_NETWORK_VIEW_ONLY.
   */
  async assertViewOnlyProtection(
    mainCompanyId: string,
    targetCompanyId: string,
    operationType: "read" | "write",
  ): Promise<void> {
    if (mainCompanyId === targetCompanyId) {
      // Acting within own company, full access permitted
      return;
    }

    const link = await this.store.findNetworkLink(mainCompanyId, targetCompanyId);
    if (!link || link.status !== "active") {
      throw new NetworkServiceError(
        "FORBIDDEN_CROSS_TENANT",
        "Cross-tenant access forbidden without active network link.",
        403,
      );
    }

    if (operationType === "write") {
      throw new NetworkServiceError(
        "FORBIDDEN_NETWORK_VIEW_ONLY",
        "Main companies only have view-only access to local partner resources. Modifications are strictly forbidden.",
        403,
      );
    }
  }
}
