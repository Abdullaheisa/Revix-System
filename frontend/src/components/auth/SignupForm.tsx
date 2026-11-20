"use client";

import { useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  validateNewPassword,
  type PasswordPolicyIssue,
} from "@/lib/auth/passwordPolicy";
import {
  useResendVerificationMutation,
  useSignupMutation,
} from "@/store/api/authApi";
import { extractApiErrorCode } from "@/store/api/baseApi";

export interface SignupCopy {
  brandName: string;
  brandDescriptor: string;
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  passwordHelper: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  submitting: string;
  haveAccountPrompt: string;
  signInLink: string;
  backToHome: string;
  retryDelivery: string;
  retryingDelivery: string;
  validation: {
    nameRequired: string;
    emailRequired: string;
    emailInvalid: string;
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
    closeAlert: string;
    emailInUse: string;
    weakPassword: string;
    partialDelivery: string;
    sessionLost: string;
    rateLimited: string;
    serviceUnavailable: string;
    genericError: string;
  };
}

export interface SignupFormProps {
  locale: "en" | "ar";
  isRtl: boolean;
  copy: SignupCopy;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupForm({ locale, isRtl, copy }: SignupFormProps) {
  const router = useRouter();
  const [signup, { isLoading: isSigningUp }] = useSignupMutation();
  const [resendVerification, { isLoading: isResending }] =
    useResendVerificationMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmPasswordError, setConfirmPasswordError] = useState<
    string | undefined
  >();
  const [formError, setFormError] = useState<string | undefined>();
  const [needsDeliveryRetry, setNeedsDeliveryRetry] = useState(false);

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
      case "EMAIL_IN_USE":
        return copy.errors.emailInUse;
      case "WEAK_PASSWORD":
        return copy.errors.weakPassword;
      case "RATE_LIMITED":
        return copy.errors.rateLimited;
      case "SERVICE_UNAVAILABLE":
        return copy.errors.serviceUnavailable;
      case "UNAUTHORIZED":
        return copy.errors.sessionLost;
      default:
        return copy.errors.genericError;
    }
  }

  function validateFields(): {
    cleanName: string;
    cleanEmail: string;
  } | null {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    let nextNameError: string | undefined;
    let nextEmailError: string | undefined;
    let nextPasswordError: string | undefined;
    let nextConfirmError: string | undefined;

    if (cleanName.length === 0) {
      nextNameError = copy.validation.nameRequired;
    }

    if (cleanEmail.length === 0) {
      nextEmailError = copy.validation.emailRequired;
    } else if (!EMAIL_PATTERN.test(cleanEmail)) {
      nextEmailError = copy.validation.emailInvalid;
    }

    // Never trim passwords; validate raw characters against policy.
    const policyIssue = validateNewPassword(password);
    if (policyIssue) {
      nextPasswordError = resolvePolicyError(policyIssue);
    }

    if (confirmPassword.length === 0) {
      nextConfirmError = copy.validation.confirmPasswordRequired;
    } else if (confirmPassword !== password) {
      nextConfirmError = copy.validation.passwordsMismatch;
    }

    setNameError(nextNameError);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmError);

    if (
      nextNameError ||
      nextEmailError ||
      nextPasswordError ||
      nextConfirmError
    ) {
      return null;
    }

    return { cleanName, cleanEmail };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setNeedsDeliveryRetry(false);

    const valid = validateFields();
    if (!valid) {
      return;
    }

    try {
      const response = await signup({
        fullName: valid.cleanName,
        email: valid.cleanEmail,
        password,
        locale,
      }).unwrap();

      // TEMPORARILY DISABLED FOR TESTING: skip /verify-email and enter workspace directly
      router.push("/workspace");
      router.refresh();
    } catch (err) {
      setFormError(mapErrorCode(extractApiErrorCode(err)));
    }
  }

  async function handleRetryDelivery() {
    setFormError(undefined);
    try {
      await resendVerification({ locale }).unwrap();
      router.push("/verify-email");
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
    >
      <div>
        <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.025em] text-revix-dark sm:text-[28px] rtl:leading-[1.35] rtl:tracking-normal">
          {copy.title}
        </h1>
        <p className="mt-1.5 text-[14.5px] leading-[1.55] text-revix-secondary">
          {copy.description}
        </p>
      </div>

      {formError ? (
        <div className="mt-4 space-y-3">
          <Alert
            variant="error"
            title={copy.errors.title}
            message={formError}
            onClose={() => setFormError(undefined)}
            closeLabel={copy.errors.closeAlert}
          />
          {needsDeliveryRetry ? (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isResending}
              onClick={handleRetryDelivery}
              className="rounded-full"
            >
              {isResending ? copy.retryingDelivery : copy.retryDelivery}
            </Button>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3.5">
        <FormInput
          label={copy.nameLabel}
          type="text"
          name="name"
          autoComplete="name"
          placeholder={copy.namePlaceholder}
          value={name}
          disabled={isSigningUp}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(undefined);
          }}
          error={nameError}
          required
        />

        <FormInput
          label={copy.emailLabel}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          placeholder={copy.emailPlaceholder}
          value={email}
          disabled={isSigningUp}
          onChange={(event) => {
            setEmail(event.target.value);
            if (emailError) setEmailError(undefined);
          }}
          error={emailError}
          required
        />

        <FormInput
          label={copy.passwordLabel}
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="new-password"
          placeholder={copy.passwordPlaceholder}
          helperText={copy.passwordHelper}
          value={password}
          disabled={isSigningUp}
          onChange={(event) => {
            setPassword(event.target.value);
            if (passwordError) setPasswordError(undefined);
          }}
          error={passwordError}
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              aria-pressed={showPassword}
              disabled={isSigningUp}
              className="inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-control text-revix-secondary transition-colors hover:bg-revix-tint hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RevixIcon name={showPassword ? "eye-off" : "eye"} size={18} />
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
          disabled={isSigningUp}
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
              disabled={isSigningUp}
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
            disabled={isSigningUp}
            className="rounded-full"
          >
            {isSigningUp ? copy.submitting : copy.submit}
          </Button>
        </div>
      </form>

      <p className="mt-5 border-t border-revix-border/80 pt-4 text-center text-[14px] text-revix-secondary">
        <span>{copy.haveAccountPrompt}</span>{" "}
        <Link
          href="/login"
          className="font-semibold text-revix-primary underline decoration-revix-primary/45 underline-offset-4 transition-colors hover:text-revix-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
        >
          {copy.signInLink}
        </Link>
      </p>
    </AuthShell>
  );
}
