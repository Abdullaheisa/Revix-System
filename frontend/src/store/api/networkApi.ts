import { baseApi } from "./baseApi";
import type { BranchDto, CompanyDto } from "./workspaceApi";

export type NetworkLinkStatus = "active" | "paused";

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
  permittedBranches: BranchDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CompanyNetworkInvitationDto {
  id: string;
  mainCompanyId: string;
  inviteeEmail: string;
  localCompanyName: string;
  contactName?: string;
  contactPhone?: string;
  logoUrl?: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedByUserId?: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
}

export interface ParentLinkDto {
  linkId: string;
  mainCompany: CompanyDto;
  status: NetworkLinkStatus;
  permittedBranches: BranchDto[];
}

export interface NetworkOverviewDto {
  operatingMode: "independent" | "network_main" | "local_partner";
  isMainCompany: boolean;
  isLocalPartner: boolean;
  connectedPartners: ConnectedLocalPartnerDto[];
  pendingInvitations: CompanyNetworkInvitationDto[];
  parentLinks?: ParentLinkDto[];
}

export interface NetworkOverviewResponseDto {
  ok: true;
  data: NetworkOverviewDto;
}

export interface InviteLocalPartnerInput {
  inviteeEmail: string;
  localCompanyName: string;
  contactName?: string;
  contactPhone?: string;
  logoUrl?: string | null;
  locale?: "en" | "ar";
}

export interface InviteLocalPartnerResponseDto {
  ok: true;
  data: {
    invitation: CompanyNetworkInvitationDto;
    inviteLink: string;
  };
}

export interface PreviewNetworkInvitationResponseDto {
  ok: true;
  data: {
    invitation: {
      id: string;
      localCompanyName: string;
      inviteeEmail: string;
      expiresAt: string;
      createdAt: string;
    };
    mainCompany: {
      id: string;
      name: string;
      legalName: string;
      logoUrl: string | null;
      brandColor: string;
      countryCode: string;
      city: string;
    };
  };
}

export interface AcceptNetworkInvitationInput {
  token: string;
  permittedBranchIds: string[];
}

export const networkApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNetworkOverview: builder.query<NetworkOverviewResponseDto, void>({
      query: () => "/network/overview",
      providesTags: ["Network"],
    }),

    inviteLocalPartner: builder.mutation<
      InviteLocalPartnerResponseDto,
      InviteLocalPartnerInput
    >({
      query: (body) => ({
        url: "/network/invite",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Network"],
    }),

    previewNetworkInvitation: builder.query<
      PreviewNetworkInvitationResponseDto,
      string
    >({
      query: (token) => `/network/invitations/preview?token=${encodeURIComponent(token)}`,
    }),

    acceptNetworkInvitation: builder.mutation<
      { ok: true; data: { link: any } },
      AcceptNetworkInvitationInput
    >({
      query: (body) => ({
        url: "/network/invitations/accept",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Network", "Company", "Branch"],
    }),

    updateLinkStatus: builder.mutation<
      { ok: true; data: { link: any } },
      { linkId: string; status: NetworkLinkStatus }
    >({
      query: ({ linkId, status }) => ({
        url: `/network/links/${linkId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Network"],
    }),

    updatePermittedBranches: builder.mutation<
      { ok: true; data: { permittedBranches: any[] } },
      { linkId: string; branchIds: string[] }
    >({
      query: ({ linkId, branchIds }) => ({
        url: `/network/links/${linkId}/branches`,
        method: "PUT",
        body: { branchIds },
      }),
      invalidatesTags: ["Network"],
    }),

    terminateLink: builder.mutation<
      { ok: true; data: { terminated: boolean } },
      string
    >({
      query: (linkId) => ({
        url: `/network/links/${linkId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Network", "Company"],
    }),
  }),
});

export const {
  useGetNetworkOverviewQuery,
  useInviteLocalPartnerMutation,
  usePreviewNetworkInvitationQuery,
  useAcceptNetworkInvitationMutation,
  useUpdateLinkStatusMutation,
  useUpdatePermittedBranchesMutation,
  useTerminateLinkMutation,
} = networkApi;
