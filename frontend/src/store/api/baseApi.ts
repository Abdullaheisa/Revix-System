import {
  createApi,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "http://localhost:4000/api/v1";

export interface BackendApiErrorPayload {
  ok: false;
  error?: {
    code?: string;
    message?: string;
    policyIssue?: string;
  };
}

export function extractApiErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "SERVICE_UNAVAILABLE";
  }

  const fbqError = error as FetchBaseQueryError;
  if (fbqError.status === "FETCH_ERROR" || fbqError.status === "TIMEOUT_ERROR") {
    return "SERVICE_UNAVAILABLE";
  }

  if (fbqError.status === 429) {
    return "RATE_LIMITED";
  }

  if (fbqError.data && typeof fbqError.data === "object") {
    const payload = fbqError.data as BackendApiErrorPayload;
    if (payload.error?.code) {
      return payload.error.code;
    }
  }

  if (fbqError.status === 401) {
    return "UNAUTHORIZED";
  }

  return "GENERIC_ERROR";
}

export const baseApi = createApi({
  reducerPath: "revixApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: "include",
    prepareHeaders: (headers) => {
      headers.set("Accept", "application/json");
      return headers;
    },
  }),
  tagTypes: ["AuthUser", "Company", "Branch", "TeamMember"],
  endpoints: () => ({}),
});
