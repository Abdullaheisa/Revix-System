import { baseApi } from "./baseApi";

export interface AuthUserDto {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  status: "active" | "disabled";
  companyId: string | null;
  signatureDataUrl?: string | null;
}

export interface SignupRequestDto {
  fullName: string;
  email: string;
  password: string;
  locale: "en" | "ar";
}

export interface SignupResponseDto {
  ok: true;
  data: {
    user: AuthUserDto;
    verificationEmailSent: boolean;
  };
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface AuthUserResponseDto {
  ok: true;
  data: {
    user: AuthUserDto;
  };
}

export interface VerifyEmailRequestDto {
  token: string;
}

export interface ResendVerificationRequestDto {
  locale: "en" | "ar";
}

export interface ResendVerificationResponseDto {
  ok: true;
  data: {
    alreadyVerified: boolean;
  };
}

export interface ForgotPasswordRequestDto {
  email: string;
  locale: "en" | "ar";
}

export interface ResetPasswordRequestDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<AuthUserResponseDto, void>({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
      providesTags: ["AuthUser"],
    }),

    signup: builder.mutation<SignupResponseDto, SignupRequestDto>({
      query: (body) => ({
        url: "/auth/signup",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AuthUser"],
    }),

    login: builder.mutation<AuthUserResponseDto, LoginRequestDto>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AuthUser"],
    }),

    logout: builder.mutation<{ ok: true }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["AuthUser"],
    }),

    verifyEmail: builder.mutation<AuthUserResponseDto, VerifyEmailRequestDto>({
      query: (body) => ({
        url: "/auth/verify-email",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AuthUser"],
    }),

    resendVerification: builder.mutation<
      ResendVerificationResponseDto,
      ResendVerificationRequestDto
    >({
      query: (body) => ({
        url: "/auth/resend-verification",
        method: "POST",
        body,
      }),
    }),

    devVerifySession: builder.mutation<AuthUserResponseDto, void>({
      query: () => ({
        url: "/auth/dev-verify-session",
        method: "POST",
      }),
      invalidatesTags: ["AuthUser"],
    }),

    forgotPassword: builder.mutation<{ ok: true }, ForgotPasswordRequestDto>({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),

    resetPassword: builder.mutation<{ ok: true }, ResetPasswordRequestDto>({
      query: (body) => ({
        url: "/auth/reset-password",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AuthUser"],
    }),

    changePassword: builder.mutation<{ ok: true }, ChangePasswordRequestDto>({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AuthUser"],
    }),

    updateMySignature: builder.mutation<
      AuthUserResponseDto,
      { signatureDataUrl: string | null }
    >({
      query: (body) => ({
        url: "/auth/me/signature",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AuthUser"],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetMeQuery,
  useSignupMutation,
  useLoginMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useDevVerifySessionMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useUpdateMySignatureMutation,
} = authApi;
