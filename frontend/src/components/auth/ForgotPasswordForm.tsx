"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { useForgotPasswordMutation } from "@/store/api/authApi";
import { extractApiErrorCode } from "@/store/api/baseApi";

export interface ForgotPasswordCopy {
  brandName: string;
  brandDescriptor: string;
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  submitting: string;
  cooldownLabel: string;
  confirmationTitle: string;
  confirmationMessage: string;
  backToLogin: string;
  backToHome: string;
  closeAlert: string;
  validation: {
    emailRequired: string;
    emailInvalid: string;
  };
  errors: {
    title: string;
    rateLimited: string;
    serviceUnavailable: string;
  };
}

export interface ForgotPasswordFormProps {
  locale: "en" | "ar";
  isRtl: boolean;
  copy: ForgotPasswordCopy;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm({
  locale,
  isRtl,
  copy,
}: ForgotPasswordFormProps) {
  const [forgotPassword, { isLoading: isSubmitting }] =
    useForgotPasswordMutation();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function validateField(): string | null {
    const cleanEmail = email.trim();
    if (cleanEmail.length === 0) {
      setEmailError(copy.validation.emailRequired);
      return null;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setEmailError(copy.validation.emailInvalid);
      return null;
    }
    setEmailError(undefined);
    return cleanEmail;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    const cleanEmail = validateField();
    if (!cleanEmail) {
      return;
    }

    try {
      await forgotPassword({
        email: cleanEmail,
        locale,
      }).unwrap();

      setSubmittedSuccess(true);
      setCooldown(30);
    } catch (err) {
      const code = extractApiErrorCode(err);
      setFormError(
        code === "RATE_LIMITED"
          ? copy.errors.rateLimited
          : copy.errors.serviceUnavailable,
      );
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

      {submittedSuccess ? (
        <div className="mt-5">
          <Alert
            variant="success"
            title={copy.confirmationTitle}
            message={copy.confirmationMessage}
            onClose={() => setSubmittedSuccess(false)}
            closeLabel={copy.closeAlert}
          />
        </div>
      ) : null}

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
          label={copy.emailLabel}
          type="email"
          name="email"
          autoComplete="email"
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

        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting || cooldown > 0}
            className="rounded-full"
          >
            {isSubmitting
              ? copy.submitting
              : cooldown > 0
                ? copy.cooldownLabel.replace("{seconds}", String(cooldown))
                : copy.submit}
          </Button>
        </div>
      </form>

      <p className="mt-6 border-t border-revix-border/80 pt-5 text-center text-[14px]">
        <Link
          href="/login"
          className="font-semibold text-revix-primary underline decoration-revix-primary/45 underline-offset-4 transition-colors hover:text-revix-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
        >
          {copy.backToLogin}
        </Link>
      </p>
    </AuthShell>
  );
}
