"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { useLoginMutation } from "@/store/api/authApi";
import { extractApiErrorCode } from "@/store/api/baseApi";
import { useAppDispatch } from "@/store/hooks";
import { setPendingVerificationEmail } from "@/store/slices/authSlice";

export interface LoginCopy {
  brandName: string;
  brandDescriptor: string;
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  submitting: string;
  forgotPasswordLink: string;
  noAccountPrompt: string;
  createAccountLink: string;
  backToHome: string;
  validation: {
    emailRequired: string;
    emailInvalid: string;
    passwordRequired: string;
  };
  errors: {
    title: string;
    closeAlert: string;
    invalidCredentials: string;
    emailNotVerified: string;
    userDisabled: string;
    rateLimited: string;
    serviceUnavailable: string;
    sessionError: string;
  };
}

export interface LoginFormProps {
  locale: "en" | "ar";
  isRtl: boolean;
  safeRedirectUrl: string;
  copy: LoginCopy;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({
  isRtl,
  safeRedirectUrl,
  copy,
}: LoginFormProps) {
  const dispatch = useAppDispatch();
  const [login, { isLoading: isSubmitting }] = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  function mapErrorCode(code: string): string {
    switch (code) {
      case "INVALID_CREDENTIALS":
        return copy.errors.invalidCredentials;
      case "EMAIL_NOT_VERIFIED":
        return copy.errors.emailNotVerified;
      case "USER_DISABLED":
        return copy.errors.userDisabled;
      case "RATE_LIMITED":
        return copy.errors.rateLimited;
      case "SERVICE_UNAVAILABLE":
        return copy.errors.serviceUnavailable;
      default:
        return copy.errors.sessionError;
    }
  }

  function validateFields(): { cleanEmail: string } | null {
    const cleanEmail = email.trim();
    let nextEmailError: string | undefined;
    let nextPasswordError: string | undefined;

    if (cleanEmail.length === 0) {
      nextEmailError = copy.validation.emailRequired;
    } else if (!EMAIL_PATTERN.test(cleanEmail)) {
      nextEmailError = copy.validation.emailInvalid;
    }

    // Do NOT trim or modify passwords; spaces can be part of a user's passphrase.
    if (password.length === 0) {
      nextPasswordError = copy.validation.passwordRequired;
    }

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      return null;
    }

    return { cleanEmail };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setNeedsEmailVerification(false);

    const valid = validateFields();
    if (!valid) {
      return;
    }

    try {
      await login({
        email: valid.cleanEmail,
        password,
      }).unwrap();

      window.location.assign(safeRedirectUrl);
    } catch (err) {
      const code = extractApiErrorCode(err);
      if (code === "EMAIL_NOT_VERIFIED") {
        dispatch(setPendingVerificationEmail(valid.cleanEmail));
        setNeedsEmailVerification(true);
      }
      setFormError(mapErrorCode(code));
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
          {needsEmailVerification ? (
            <ButtonLink
              href="/verify-email"
              variant="secondary"
              fullWidth
              className="rounded-full"
            >
              {isRtl
                ? "الانتقال لتأكيد البريد الإلكتروني"
                : "Go to email verification"}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <FormInput
          label={copy.emailLabel}
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          dir="ltr"
          placeholder={copy.emailPlaceholder}
          value={email}
          disabled={isSubmitting}
          onChange={(event) => {
            setEmail(event.target.value);
            if (emailError) setEmailError(undefined);
          }}
          error={emailError}
          required
        />

        <FormInput
          label={copy.passwordLabel}
          labelEnd={
            <Link
              href="/forgot-password"
              className="text-[13px] font-semibold text-revix-primary underline decoration-revix-primary/35 underline-offset-4 transition-colors hover:text-revix-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
            >
              {copy.forgotPasswordLink}
            </Link>
          }
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          placeholder={copy.passwordPlaceholder}
          value={password}
          disabled={isSubmitting}
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
              disabled={isSubmitting}
              className="inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-control text-revix-secondary transition-colors hover:bg-revix-tint hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RevixIcon name={showPassword ? "eye-off" : "eye"} size={18} />
            </button>
          }
        />

        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting}
            className="rounded-full"
          >
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
        </div>
      </form>

      <p className="mt-5 border-t border-revix-border/80 pt-4 text-center text-[14px] text-revix-secondary">
        <span>{copy.noAccountPrompt}</span>{" "}
        <Link
          href="/signup"
          className="font-semibold text-revix-primary underline decoration-revix-primary/45 underline-offset-4 transition-colors hover:text-revix-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
        >
          {copy.createAccountLink}
        </Link>
      </p>
    </AuthShell>
  );
}
