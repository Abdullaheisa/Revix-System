import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { authApi, type AuthUserDto } from "../api/authApi";

export interface AuthSliceState {
  user: AuthUserDto | null;
  pendingVerificationEmail: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthSliceState = {
  user: null,
  pendingVerificationEmail: null,
  isAuthenticated: false,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setPendingVerificationEmail(state, action: PayloadAction<string | null>) {
      state.pendingVerificationEmail = action.payload;
    },
    clearAuthState(state) {
      state.user = null;
      state.pendingVerificationEmail = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        authApi.endpoints.signup.matchFulfilled,
        (state, { payload }) => {
          state.user = payload.data.user;
          state.pendingVerificationEmail = payload.data.user.email;
          state.isAuthenticated = payload.data.user.emailVerified;
        },
      )
      .addMatcher(
        authApi.endpoints.login.matchFulfilled,
        (state, { payload }) => {
          state.user = payload.data.user;
          state.pendingVerificationEmail = payload.data.user.emailVerified
            ? null
            : payload.data.user.email;
          state.isAuthenticated = payload.data.user.emailVerified;
        },
      )
      .addMatcher(
        authApi.endpoints.getMe.matchFulfilled,
        (state, { payload }) => {
          state.user = payload.data.user;
          state.pendingVerificationEmail = payload.data.user.emailVerified
            ? null
            : payload.data.user.email;
          state.isAuthenticated = payload.data.user.emailVerified;
        },
      )
      .addMatcher(
        authApi.endpoints.verifyEmail.matchFulfilled,
        (state, { payload }) => {
          state.user = payload.data.user;
          state.pendingVerificationEmail = null;
          state.isAuthenticated = true;
        },
      )
      .addMatcher(
        authApi.endpoints.devVerifySession.matchFulfilled,
        (state, { payload }) => {
          state.user = payload.data.user;
          state.pendingVerificationEmail = null;
          state.isAuthenticated = true;
        },
      )
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.pendingVerificationEmail = null;
        state.isAuthenticated = false;
      })
      .addMatcher(authApi.endpoints.changePassword.matchFulfilled, (state) => {
        state.user = null;
        state.pendingVerificationEmail = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setPendingVerificationEmail, clearAuthState } =
  authSlice.actions;
export default authSlice.reducer;
