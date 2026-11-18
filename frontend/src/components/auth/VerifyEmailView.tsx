"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  useDevVerifySessionMutation,
  useGetMeQuery,
  useResendVerificationMutation,
} from "@/store/api/authApi";
import { extractApiErrorCode } from "@/store/api/baseApi";
import { useAppSelector } from "@/store/hooks";

export interface VerifyEmailCopy {
  brandName: string;
  brandDescriptor: string;
  title: string;
  description: string;
  sentToLabel: string;
  resendButton: string;
  resending: string;
  cooldownLabel: string;
  resentSuccess: string;
  alreadyVerified: string;
  sessionLostMessage: string;
  goToLogin: string;
  useAnotherAccount: string;
  backToHome: string;
  closeAlert: string;
  errors: {
    title: string;
    rateLimited: string;
    serviceUnavailable: string;
  };
}

export interface VerifyEmailViewProps {
  locale: "en" | "ar";
  isRtl: boolean;
  copy: VerifyEmailCopy;
}

export function VerifyEmailView({ locale, isRtl, copy }: VerifyEmailViewProps) {
  const router = useRouter();
  const pendingEmail = useAppSelector(
    (state) => state.auth.pendingVerificationEmail || state.auth.user?.email,
  );
  const { data: meData } = useGetMeQuery();
  const [resendVerification, { isLoading: isResending }] =
    useResendVerificationMutation();
  const [devVerifySession, { isLoading: isDevVerifying }] =
    useDevVerifySessionMutation();

  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const isLocalDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const targetEmail = meData?.data.user.email ?? pendingEmail;

  async function handleDevInstantVerify() {
    setErrorMessage(undefined);
    setStatusMessage(undefined);
    try {
      await devVerifySession().unwrap();
      setStatusMessage(copy.alreadyVerified);
      window.setTimeout(() => {
        router.push("/workspace");
      }, 650);
    } catch (err) {
      const code = extractApiErrorCode(err);
      setErrorMessage(
        code === "UNAUTHORIZED"
          ? copy.sessionLostMessage
          : copy.errors.serviceUnavailable,
      );
    }
  }

  async function handleResend() {
    setErrorMessage(undefined);
    setStatusMessage(undefined);

    try {
      const response = await resendVerification({ locale }).unwrap();
      if (response.data.alreadyVerified) {
        setStatusMessage(copy.alreadyVerified);
      } else {
        setStatusMessage(copy.resentSuccess);
        setCooldown(30);
      }
    } catch (err) {
      const code = extractApiErrorCode(err);
      if (code === "RATE_LIMITED") {
        setErrorMessage(copy.errors.rateLimited);
      } else if (code === "UNAUTHORIZED") {
        setErrorMessage(copy.sessionLostMessage);
      } else {
        setErrorMessage(copy.errors.serviceUnavailable);
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
      <div className="space-y-5">
        <div>
          <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.025em] text-revix-dark sm:text-[28px] rtl:leading-[1.35] rtl:tracking-normal">
            {copy.title}
          </h1>
          <p className="mt-1.5 text-[14.5px] leading-[1.55] text-revix-secondary">
            {copy.description}
          </p>
        </div>

        {targetEmail ? (
          <div className="rounded-award border border-revix-border bg-revix-surface/75 px-4 py-3.5">
            <p className="text-[12.5px] font-medium text-revix-secondary">
              {copy.sentToLabel}
            </p>
            <p
              dir="ltr"
              className="mt-1 break-all text-start text-[15px] font-semibold text-revix-dark"
            >
              {targetEmail}
            </p>
          </div>
        ) : null}

        {statusMessage ? (
          <Alert
            variant="success"
            title={copy.title}
            message={statusMessage}
            onClose={() => setStatusMessage(undefined)}
            closeLabel={copy.closeAlert}
          />
        ) : null}

        {errorMessage ? (
          <Alert
            variant="error"
            title={copy.errors.title}
            message={errorMessage}
            onClose={() => setErrorMessage(undefined)}
            closeLabel={copy.closeAlert}
          />
        ) : null}

        <div className="space-y-3 pt-1">
          {isLocalDev ? (
            <Button
              type="button"
              variant="primary"
              fullWidth
              disabled={isDevVerifying}
              onClick={handleDevInstantVerify}
              className="rounded-full"
            >
              {isDevVerifying
                ? copy.resending
                : isRtl
                  ? "تأكيد البريد فوريًا (وضع التطوير المحلي)"
                  : "Verify email instantly (Local Dev Mode)"}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={isResending || cooldown > 0}
            onClick={handleResend}
            className="rounded-full"
          >
            {isResending
              ? copy.resending
              : cooldown > 0
                ? copy.cooldownLabel.replace("{seconds}", String(cooldown))
                : copy.resendButton}
          </Button>

          <ButtonLink href="/login" variant="secondary" fullWidth className="rounded-full">
            {copy.goToLogin}
          </ButtonLink>
        </div>
      </div>
    </AuthShell>
  );
}
