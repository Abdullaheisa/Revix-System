"use client";

import { useState, type FormEvent } from "react";
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
  useChangePasswordMutation,
  useGetMeQuery,
} from "@/store/api/authApi";
import { extractApiErrorCode } from "@/store/api/baseApi";

export interface ChangePasswordCopy {
  brandName: string;
  brandDescriptor: string;
  title: string;
  description: string;
  accountEmailLabel: string;
  currentPasswordLabel: string;
  currentPasswordPlaceholder: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  passwordHelper: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  submitting: string;
  backToAccount: string;
  backToHome: string;
  successTitle: string;
  successDescription: string;
  goToLogin: string;
  closeAlert: string;
  validation: {
    currentPasswordRequired: string;
    passwordTooShort: string;
    passwordTooLong: string;
    passwordMissingUppercase: string;
    passwordMissingLowercase: string;
    passwordMissingNumber: string;
    confirmPasswordRequired: string;
    passwordsMismatch: string;
  };
  errors: {
    title: string;
    wrongCurrentPassword: string;
    uidMismatch: string;
    weakPassword: string;
    rateLimited: string;
    serviceUnavailable: string;
    genericError: string;
  };
}

export interface ChangePasswordFormProps {
  isRtl: boolean;
  displayEmail: string;
  copy: ChangePasswordCopy;
}

export function ChangePasswordForm({
  isRtl,
  displayEmail,
  copy,
}: ChangePasswordFormProps) {
  const { data: meData } = useGetMeQuery();
  const [changePassword, { isLoading: isUpdating }] =
    useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | undefined
  >();
  const [newPasswordError, setNewPasswordError] = useState<
    string | undefined
  >();
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | undefined
  >();
  const [formError, setFormError] = useState<string | undefined>();
  const [passwordChanged, setPasswordChanged] = useState(false);

  const activeEmail = meData?.data.user.email ?? displayEmail;

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

  function mapErrorCode(code: string): string {
    switch (code) {
      case "WRONG_CURRENT_PASSWORD":
        return copy.errors.wrongCurrentPassword;
      case "UNAUTHORIZED":
        return copy.errors.uidMismatch;
      case "WEAK_PASSWORD":
        return copy.errors.weakPassword;
      case "RATE_LIMITED":
        return copy.errors.rateLimited;
      case "SERVICE_UNAVAILABLE":
        return copy.errors.serviceUnavailable;
      default:
        return copy.errors.genericError;
    }
  }

  function validateFields(): boolean {
    let nextCurrentError: string | undefined;
    if (currentPassword.length === 0) {
      nextCurrentError = copy.validation.currentPasswordRequired;
    }

    const policyIssue = validateNewPassword(newPassword);
    const nextNewError = policyIssue
      ? resolvePolicyError(policyIssue)
      : undefined;

    let nextConfirmError: string | undefined;
    if (confirmPassword.length === 0) {
      nextConfirmError = copy.validation.confirmPasswordRequired;
    } else if (confirmPassword !== newPassword) {
      nextConfirmError = copy.validation.passwordsMismatch;
    }

    setCurrentPasswordError(nextCurrentError);
    setNewPasswordError(nextNewError);
    setConfirmPasswordError(nextConfirmError);

    return !nextCurrentError && !nextNewError && !nextConfirmError;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    if (!validateFields()) {
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      }).unwrap();

      setPasswordChanged(true);
    } catch (err) {
      setFormError(mapErrorCode(extractApiErrorCode(err)));
    }
  }

  return (
    <AuthShell
      isRtl={isRtl}
      brandName={copy.brandName}
      brandDescriptor={copy.brandDescriptor}
      backToHome={copy.backToHome}
      headerExtraLink={{
        href: "/account",
        label: copy.backToAccount,
      }}
    >
      {passwordChanged ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-[24px] font-bold text-revix-dark">
              {copy.successTitle}
            </h1>
            <p className="mt-1.5 text-[14.5px] text-revix-secondary">
              {copy.successDescription}
            </p>
          </div>
          <ButtonLink href="/login" fullWidth className="rounded-full">
            {copy.goToLogin}
          </ButtonLink>
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.025em] text-revix-dark sm:text-[28px] rtl:leading-[1.35] rtl:tracking-normal">
              {copy.title}
            </h1>
            <p className="mt-1.5 text-[14.5px] leading-[1.55] text-revix-secondary">
              {copy.description}
            </p>
          </div>

          <div className="mt-6 rounded-award border border-revix-border bg-revix-surface/75 px-4 py-3.5">
            <p className="text-[12.5px] font-medium text-revix-secondary">
              {copy.accountEmailLabel}
            </p>
            <p
              dir="ltr"
              className="mt-1 break-all text-start text-[15px] font-semibold text-revix-dark"
            >
              {activeEmail}
            </p>
          </div>

          {formError ? (
            <div className="mt-5">
              <Alert
                variant="error"
                title={copy.errors.title}
                message={formError}
                onClose={() => setFormError(undefined)}
                closeLabel={copy.closeAlert}
              />
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <FormInput
              label={copy.currentPasswordLabel}
              type={showCurrentPassword ? "text" : "password"}
              name="currentPassword"
              autoComplete="current-password"
              placeholder={copy.currentPasswordPlaceholder}
              value={currentPassword}
              disabled={isUpdating}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                if (currentPasswordError) setCurrentPasswordError(undefined);
              }}
              error={currentPasswordError}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  aria-label={
                    showCurrentPassword ? copy.hidePassword : copy.showPassword
                  }
                  aria-pressed={showCurrentPassword}
                  disabled={isUpdating}
                  className="inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-control text-revix-secondary transition-colors hover:bg-revix-tint hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RevixIcon
                    name={showCurrentPassword ? "eye-off" : "eye"}
                    size={18}
                  />
                </button>
              }
            />

            <FormInput
              label={copy.newPasswordLabel}
              type={showNewPassword ? "text" : "password"}
              name="newPassword"
              autoComplete="new-password"
              placeholder={copy.newPasswordPlaceholder}
              helperText={copy.passwordHelper}
              value={newPassword}
              disabled={isUpdating}
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
                  disabled={isUpdating}
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
              disabled={isUpdating}
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
                  disabled={isUpdating}
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
                disabled={isUpdating}
                className="rounded-full"
              >
                {isUpdating ? copy.submitting : copy.submit}
              </Button>
            </div>
          </form>
        </>
      )}
    </AuthShell>
  );
}
