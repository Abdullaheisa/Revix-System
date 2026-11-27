import { baseApi } from "./baseApi";
import type { AuthUserDto } from "./authApi";

export type CompanyOperatingMode =
  | "independent"
  | "network_main"
  | "local_partner";

export interface CompanyDto {
  id: string;
  ownerUserId: string;
  name: string;
  legalName: string;
  logoUrl: string | null;
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
  parentCompanyId: string | null;
  contractTermsAr?: string | null;
  contractTermsEn?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchDto {
  id: string;
  companyId: string;
  name: string;
  code: string;
  countryCode: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  currencyCode: string;
  timezone: string;
  workingDays: string;
  workingHours: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembershipDto {
  id: string;
  roleId: string;
  roleCode: string;
  roleNameEn: string;
  roleNameAr: string;
  scopeType: "company_wide" | "assigned_branches";
  permissions: Record<string, string[]>;
  branchIds: string[];
  status: "active" | "suspended";
}

export interface WorkspaceContextResponseDto {
  ok: true;
  data: {
    user: AuthUserDto;
    company: CompanyDto | null;
    branches: BranchDto[];
    membership: WorkspaceMembershipDto | null;
    onboardingState: "needs_company" | "needs_first_branch" | "ready";
  };
}

export interface UpsertCompanyRequestDto {
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
  operatingMode: "independent" | "network_main";
  contractTermsAr?: string | null;
  contractTermsEn?: string | null;
}

export interface CompanyResponseDto {
  ok: true;
  data: {
    company: CompanyDto;
  };
}

export interface CreateBranchRequestDto {
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
}

export interface UpdateBranchRequestDto extends CreateBranchRequestDto {
  branchId: string;
  isActive: boolean;
}

export interface BranchResponseDto {
  ok: true;
  data: {
    branch: BranchDto;
  };
}

export const workspaceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkspaceContext: builder.query<WorkspaceContextResponseDto, void>({
      query: () => ({
        url: "/workspace/context",
        method: "GET",
      }),
      providesTags: ["Company", "Branch", "AuthUser"],
    }),

    createCompany: builder.mutation<
      CompanyResponseDto,
      UpsertCompanyRequestDto
    >({
      query: (body) => ({
        url: "/workspace/company",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Company", "AuthUser"],
    }),

    updateCompany: builder.mutation<
      CompanyResponseDto,
      UpsertCompanyRequestDto
    >({
      query: (body) => ({
        url: "/workspace/company",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Company"],
    }),

    createBranch: builder.mutation<BranchResponseDto, CreateBranchRequestDto>({
      query: (body) => ({
        url: "/workspace/branches",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Branch", "Company"],
    }),

    updateBranch: builder.mutation<BranchResponseDto, UpdateBranchRequestDto>({
      query: ({ branchId, ...body }) => ({
        url: `/workspace/branches/${encodeURIComponent(branchId)}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Branch"],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetWorkspaceContextQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useCreateBranchMutation,
  useUpdateBranchMutation,
} = workspaceApi;
