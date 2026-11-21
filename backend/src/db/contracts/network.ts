

export type NetworkLinkStatus = "pending" | "active" | "paused" | "terminated";

export type NetworkInvitationStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";

export interface CompanyNetworkLinkRecord {
  id: string;
  mainCompanyId: string;
  localCompanyId: string;
  status: NetworkLinkStatus;
  permittedCountries: string[];
  notes?: string;
  createdByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkPermittedBranchRecord {
  id: string;
  linkId: string;
  localCompanyId: string;
  branchId: string;
  createdAt: Date;
}

export interface CompanyNetworkInvitationRecord {
  id: string;
  mainCompanyId: string;
  inviteeEmail: string;
  localCompanyName: string;
  contactName?: string;
  contactPhone?: string;
  logoUrl?: string | null;
  tokenHash: string;
  status: NetworkInvitationStatus;
  invitedByUserId?: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  createdAt: Date;
}

export interface CreateNetworkLinkInput {
  id?: string;
  mainCompanyId: string;
  localCompanyId: string;
  status?: NetworkLinkStatus;
  permittedCountries?: string[];
  notes?: string;
  createdByUserId?: string;
}

export interface CreateNetworkInvitationInput {
  id?: string;
  mainCompanyId: string;
  inviteeEmail: string;
  localCompanyName: string;
  contactName?: string;
  contactPhone?: string;
  logoUrl?: string | null;
  tokenHash: string;
  expiresAt: Date;
  invitedByUserId?: string;
}
