"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  validateNewPassword,
  type PasswordPolicyIssue,
} from "@/lib/auth/passwordPolicy";
import {
  useResetPasswordMutation,
  useVerifyEmailMutation,
} from "@/store/api/authApi";
import { extractApiErrorCode } from "@/store/api/baseApi";

export interface AuthActionCopy {
  brandName: string;
  brandDescriptor: string;
  loadingTitle: string;
  loadingDescription: string;
  invalidTitle: string;
  invalidDescription: string;
  expiredTitle: string;
  expiredDescription: string;
  verifySuccessTitle: string;
  verifySuccessDescription: string;
  goToLogin: string;
  requestNewReset: string;
  resetTitle: string;
  resetDescription: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  passwordHelper: string;
  showPassword: string;
  hidePassword: string;
  resetSubmit: string;
  resetSubmitting: string;
  resetSuccessTitle: string;
  resetSuccessDescription: string;
  resetErrorTitle: string;
  backToHome: string;
  closeAlert: string;
  validation: {
    passwordTooShort: string;
    passwordTooLong: string;
    passwordMissingUppercase: string;
    passwordMissingLowercase: string;
    passwordMissingNumber: string;
    confirmPasswordRequired: string;
    passwordsMismatch: string;
  };
  errors: {
    weakPassword: string;
    serviceUnavailable: string;
  };
}

export interface AuthActionViewProps {
  locale: "en" | "ar";
  isRtl: boolean;
  copy: AuthActionCopy;
}

export function AuthActionView({ isRtl, copy }: AuthActionViewProps) {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const token = searchParams.get("token") ?? searchParams.get("oobCode") ?? "";

  const [verifyEmail] = useVerifyEmailMutation();
  const [resetPassword, { isLoading: isResetting }] =
    useResetPasswordMutation();

  const isTokenFormatValid = token.trim().length >= 16;

  const [verifyState, setVerifyState] = useState<
    "loading" | "verified" | "expired" | "invalid"
  >(() => (isTokenFormatValid ? "loading" : "invalid"));
  const [resetCompleted, setResetCompleted] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState<
    string | undefined
  >();
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | undefined
  >();
  const [formError, setFormError] = useState<string | undefined>();

  const verifyAttemptedRef = useRef(false);

  useEffect(() => {
    if (
      mode !== "verifyEmail" ||
      !isTokenFormatValid ||
      verifyAttemptedRef.current
    ) {
      return;
    }
    verifyAttemptedRef.current = true;

    verifyEmail({ token })
      .unwrap()
      .then(() => {
        setVerifyState("verified");
      })
      .catch((err) => {
        const code = extractApiErrorCode(err);
        setVerifyState(code === "EXPIRED_TOKEN" ? "expired" : "invalid");
      });
  }, [isTokenFormatValid, mode, token, verifyEmail]);

  function resolvePolicyError(issue: PasswordPolicyIssue): string {
    switch (issue) {
      case "too_short":
        return copy.validation.passwordTooShort;
      case "too_long":
        return copy.validation.passwordTooLong;
      case "missing_uppercase":
        return copy.validation.passwordMissingUppercase;
      case "missing_lowercase":
      case "missing_letter":
        return copy.validation.passwordMissingLowercase;
      case "missing_number":
        return copy.validation.passwordMissingNumber;
    }
  }

  function validateFields(): boolean {
    const issue = validateNewPassword(newPassword);
    const passwordError = issue ? resolvePolicyError(issue) : undefined;
    const confirmError = !confirmPassword
      ? copy.validation.confirmPasswordRequired
      : confirmPassword !== newPassword
        ? copy.validation.passwordsMismatch
        : undefined;

    setNewPasswordError(passwordError);
    setConfirmPasswordError(confirmError);
    return !passwordError && !confirmError;
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    if (!validateFields()) {
      return;
    }

    if (!token || token.trim().length < 16) {
      setFormError(copy.invalidDescription);
      return;
    }

    try {
      await resetPassword({
        token,
        newPassword,
      }).unwrap();

      setResetCompleted(true);
    } catch (err) {
      const code = extractApiErrorCode(err);
      if (code === "EXPIRED_TOKEN") {
        setFormError(copy.expiredDescription);
      } else if (code === "INVALID_TOKEN") {
        setFormError(copy.invalidDescription);
      } else if (code === "WEAK_PASSWORD") {
        setFormError(copy.errors.weakPassword);
      } else {
        setFormError(copy.errors.serviceUnavailable);
      }
    }
  }

  return (
    <AuthShell
      isRtl={isRtl}
      brandName={copy.brandName}
      brandDescriptor={copy.brandDescriptor}
      backToHome={copy.backToHome}
    >
      {mode === "verifyEmail" ? (
        <div className="space-y-5">
          {verifyState === "loading" ? (
            <div>
              <h1 className="text-[24px] font-bold text-revix-dark">
                {copy.loadingTitle}
              </h1>
              <p className="mt-1.5 text-[14.5px] text-revix-secondary">
                {copy.loadingDescription}
              </p>
            </div>
          ) : verifyState === "verified" ? (
            <div className="space-y-5">
              <div>
                <h1 className="text-[24px] font-bold text-revix-dark">
                  {copy.verifySuccessTitle}
                </h1>
                <p className="mt-1.5 text-[14.5px] text-revix-secondary">
                  {copy.verifySuccessDescription}
                </p>
              </div>
              <ButtonLink href="/login" fullWidth className="rounded-full">
                {copy.goToLogin}
              </ButtonLink>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h1 className="text-[24px] font-bold text-revix-dark">
                  {verifyState === "expired"
                    ? copy.expiredTitle
                    : copy.invalidTitle}
                </h1>
                <p className="mt-1.5 text-[14.5px] text-revix-secondary">
                  {verifyState === "expired"
                    ? copy.expiredDescription
                    : copy.invalidDescription}
                </p>
              </div>
              <ButtonLink href="/login" fullWidth className="rounded-full">
                {copy.goToLogin}
              </ButtonLink>
            </div>
          )}
        </div>
      ) : resetCompleted ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-[24px] font-bold text-revix-dark">
              {copy.resetSuccessTitle}
            </h1>
            <p className="mt-1.5 text-[14.5px] text-revix-secondary">
              {copy.resetSuccessDescription}
            </p>
          </div>
          <ButtonLink href="/login" fullWidth className="rounded-full">
            {copy.goToLogin}
          </ButtonLink>
        </div>
      ) : (
        <div>
          <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.025em] text-revix-dark sm:text-[28px] rtl:leading-[1.35] rtl:tracking-normal">
            {copy.resetTitle}
          </h1>
          <p className="mt-1.5 text-[14.5px] leading-[1.55] text-revix-secondary">
            {copy.resetDescription}
          </p>

          {formError ? (
            <div className="mt-5">
              <Alert
                variant="error"
                title={copy.resetErrorTitle}
                message={formError}
                onClose={() => setFormError(undefined)}
                closeLabel={copy.closeAlert}
              />
            </div>
          ) : null}

          <form
            onSubmit={handleResetSubmit}
            noValidate
            className="mt-6 space-y-5"
          >
            <FormInput
              label={copy.newPasswordLabel}
              type={showNewPassword ? "text" : "password"}
              name="newPassword"
              autoComplete="new-password"
              placeholder={copy.newPasswordPlaceholder}
              helperText={copy.passwordHelper}
              value={newPassword}
              disabled={isResetting}
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (newPasswordError) setNewPasswordError(undefined);
              }}
              error={newPasswordError}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={
                    showNewPassword ? copy.hidePassword : copy.showPassword
                  }
                  aria-pressed={showNewPassword}
                  disabled={isResetting}
                  className="inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-control text-revix-secondary transition-colors hover:bg-revix-tint hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RevixIcon
                    name={showNewPassword ? "eye-off" : "eye"}
                    size={18}
                  />
                </button>
              }
            />

            <FormInput
              label={copy.confirmPasswordLabel}
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              autoComplete="new-password"
              placeholder={copy.confirmPasswordPlaceholder}
              value={confirmPassword}
              disabled={isResetting}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (confirmPasswordError) setConfirmPasswordError(undefined);
              }}
              error={confirmPasswordError}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword ? copy.hidePassword : copy.showPassword
                  }
                  aria-pressed={showConfirmPassword}
                  disabled={isResetting}
                  className="inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-control text-revix-secondary transition-colors hover:bg-revix-tint hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RevixIcon
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={18}
                  />
                </button>
              }
            />

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isResetting}
                className="rounded-full"
              >
                {isResetting ? copy.resetSubmitting : copy.resetSubmit}
              </Button>
            </div>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
