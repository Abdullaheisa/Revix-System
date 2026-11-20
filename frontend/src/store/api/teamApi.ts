import { baseApi } from "./baseApi";
import type { AuthUserDto } from "./authApi";
import type { BranchDto } from "./workspaceApi";

export type RoleScopeType = "company_wide" | "assigned_branches";
export type MembershipStatus = "active" | "suspended";
export type PermissionMatrix = Record<string, string[]>;

export interface CompanyRoleDto {
  id: string;
  companyId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  scopeType: RoleScopeType;
  permissions: PermissionMatrix;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberDto {
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

export interface EmployeeInvitationDto {
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

export interface TeamOverviewResponseDto {
  ok: true;
  data: {
    roles: CompanyRoleDto[];
    members: TeamMemberDto[];
    invitations: EmployeeInvitationDto[];
    branches: BranchDto[];
  };
}

export interface CreateInvitationRequestDto {
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  branchIds: string[];
  locale: "en" | "ar";
}

export interface CreateInvitationResponseDto {
  ok: true;
  data: {
    invitation: EmployeeInvitationDto;
    invitePath: string;
  };
}

export interface UpdateMemberRequestDto {
  membershipId: string;
  roleId: string;
  phone: string;
  status: MembershipStatus;
  branchIds: string[];
}

export interface UpdateRoleRequestDto {
  roleId: string;
  scopeType: RoleScopeType;
  permissions: PermissionMatrix;
}

export interface InvitationPreviewDto {
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

export const teamApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTeamOverview: builder.query<TeamOverviewResponseDto, void>({
      query: () => ({
        url: "/team/overview",
        method: "GET",
      }),
      providesTags: ["TeamMember", "Branch"],
    }),

    createInvitation: builder.mutation<
      CreateInvitationResponseDto,
      CreateInvitationRequestDto
    >({
      query: (body) => ({
        url: "/team/invitations",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeamMember"],
    }),

    revokeInvitation: builder.mutation<{ ok: true }, string>({
      query: (invitationId) => ({
        url: `/team/invitations/${invitationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TeamMember"],
    }),

    updateMember: builder.mutation<
      { ok: true; data: { member: TeamMemberDto } },
      UpdateMemberRequestDto
    >({
      query: ({ membershipId, ...body }) => ({
        url: `/team/members/${membershipId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["TeamMember", "Company"],
    }),

    updateRole: builder.mutation<
      { ok: true; data: { role: CompanyRoleDto } },
      UpdateRoleRequestDto
    >({
      query: ({ roleId, ...body }) => ({
        url: `/team/roles/${roleId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["TeamMember", "Company"],
    }),

    previewInvitation: builder.mutation<
      { ok: true; data: { invitation: InvitationPreviewDto } },
      { token: string }
    >({
      query: (body) => ({
        url: "/team/invitations/preview",
        method: "POST",
        body,
      }),
    }),

    acceptInvitation: builder.mutation<
      { ok: true; data: { user: AuthUserDto } },
      { token: string; password: string; fullName?: string }
    >({
      query: (body) => ({
        url: "/team/invitations/accept",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AuthUser", "Company", "Branch", "TeamMember"],
    }),
  }),
});

export const {
  useGetTeamOverviewQuery,
  useCreateInvitationMutation,
  useRevokeInvitationMutation,
  useUpdateMemberMutation,
  useUpdateRoleMutation,
  usePreviewInvitationMutation,
  useAcceptInvitationMutation,
} = teamApi;
