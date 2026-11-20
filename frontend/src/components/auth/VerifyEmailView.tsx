"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  useGetMeQuery,
  useResendVerificationMutation,
  useVerifyEmailMutation,
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
  verifyingTitle?: string;
  verifyingDescription?: string;
  verifiedSuccessTitle?: string;
  verifiedSuccessDescription?: string;
  verifiedFailedTitle?: string;
  invalidTokenMessage?: string;
  expiredTokenMessage?: string;
  continueToWorkspace?: string;
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
  initialToken?: string;
}

export function VerifyEmailView({
  locale,
  isRtl,
  copy,
  initialToken,
}: VerifyEmailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get("token") || undefined;
  const token = initialToken || tokenFromQuery;

  const pendingEmail = useAppSelector(
    (state) => state.auth.pendingVerificationEmail || state.auth.user?.email,
  );
  const { data: meData } = useGetMeQuery();
  const [verifyEmail, { isLoading: isVerifying }] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: isResending }] =
    useResendVerificationMutation();

  const [verifyStatus, setVerifyStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >(token ? "verifying" : "idle");
  const [verifiedEmail, setVerifiedEmail] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);

  const verificationAttemptedRef = useRef(false);

  // Automatically verify when a token is present in the link
  useEffect(() => {
    if (!token || verificationAttemptedRef.current) return;
    verificationAttemptedRef.current = true;

    setVerifyStatus("verifying");
    setErrorMessage(undefined);

    verifyEmail({ token })
      .unwrap()
      .then((res) => {
        setVerifyStatus("success");
        setVerifiedEmail(res.data.user.email);
      })
      .catch((err) => {
        setVerifyStatus("error");
        const code = extractApiErrorCode(err);
        if (code === "EXPIRED_TOKEN") {
          setErrorMessage(
            copy.expiredTokenMessage ||
              (isRtl
                ? "انتهت صلاحية هذا الرابط. يرجى طلب إرسال رسالة تأكيد جديدة أو تسجيل الدخول."
                : "This verification link has expired. Please request a new verification email."),
          );
        } else if (code === "INVALID_TOKEN") {
          setErrorMessage(
            copy.invalidTokenMessage ||
              (isRtl
                ? "هذا الرابط غير صالح أو تم استخدامه من قبل. إذا كنت قد أكدت حسابك بالفعل، يمكنك تسجيل الدخول مباشرة."
                : "This verification link is invalid or has already been used. If you have already verified your email, please sign in directly."),
          );
        } else {
          setErrorMessage(copy.errors.serviceUnavailable);
        }
      });
  }, [token, verifyEmail, copy, isRtl]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const targetEmail =
    verifiedEmail || meData?.data.user.email || pendingEmail;

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
      <div className="space-y-6">
        {/* CASE 1: VERIFYING IN PROGRESS */}
        {verifyStatus === "verifying" && (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#14532D] ring-8 ring-emerald-50/50">
              <svg
                className="h-7 w-7 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-revix-dark sm:text-[25px]">
                {copy.verifyingTitle ||
                  (isRtl
                    ? "جاري تأكيد بريدك الإلكتروني..."
                    : "Verifying your email...")}
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-revix-secondary">
                {copy.verifyingDescription ||
                  (isRtl
                    ? "يرجى الانتظار لحظات بينما نتحقق من صحة الرابط ونفعّل حسابك."
                    : "Please wait while we verify your credentials and activate your account.")}
              </p>
            </div>
          </div>
        )}

        {/* CASE 2: VERIFICATION SUCCEEDED */}
        {verifyStatus === "success" && (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-[#14532D] ring-8 ring-emerald-50">
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-[24px] font-bold leading-tight text-revix-dark sm:text-[27px]">
                {copy.verifiedSuccessTitle ||
                  (isRtl
                    ? "تم تأكيد بريدك الإلكتروني بنجاح!"
                    : "Email verified successfully!")}
              </h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-revix-secondary">
                {copy.verifiedSuccessDescription ||
                  (isRtl
                    ? "تم التحقق من ملكية بريدك الإلكتروني بنجاح، وحسابك في ريفكس نشط وجاهز للعمل الآن."
                    : "Your email has been confirmed. Your Revix account is fully active and ready to use.")}
              </p>
            </div>

            {targetEmail && (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  {isRtl ? "الحساب المفعل" : "Verified Account"}
                </span>
                <p
                  dir="ltr"
                  className="mt-1 font-semibold text-revix-dark break-all text-sm"
                >
                  {targetEmail}
                </p>
              </div>
            )}

            <div className="pt-2 space-y-3">
              <ButtonLink
                href="/workspace"
                variant="primary"
                fullWidth
                className="rounded-full shadow-sm hover:shadow"
              >
                {copy.continueToWorkspace ||
                  (isRtl ? "الانتقال إلى مساحة العمل" : "Continue to Workspace")}
              </ButtonLink>

              <ButtonLink
                href="/login"
                variant="secondary"
                fullWidth
                className="rounded-full"
              >
                {copy.goToLogin}
              </ButtonLink>
            </div>
          </div>
        )}

        {/* CASE 3: VERIFICATION FAILED */}
        {verifyStatus === "error" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-8 ring-amber-50/60">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h1 className="mt-4 text-[23px] font-bold text-revix-dark">
                {copy.verifiedFailedTitle ||
                  (isRtl
                    ? "تعذّر تأكيد البريد الإلكتروني"
                    : "Verification failed")}
              </h1>
            </div>

            {errorMessage && (
              <Alert
                variant="error"
                title={copy.errors.title}
                message={errorMessage}
                onClose={() => setErrorMessage(undefined)}
                closeLabel={copy.closeAlert}
              />
            )}

            <div className="space-y-3 pt-2">
              <ButtonLink
                href="/login"
                variant="primary"
                fullWidth
                className="rounded-full"
              >
                {copy.goToLogin}
              </ButtonLink>

              {targetEmail && (
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
              )}
            </div>
          </div>
        )}

        {/* CASE 4: NO TOKEN PROVIDED -> CHECK YOUR INBOX PROMPT */}
        {verifyStatus === "idle" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#14532D] ring-8 ring-emerald-50/50">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>

              <h1 className="mt-4 text-[24px] font-bold leading-[1.2] tracking-[-0.025em] text-revix-dark sm:text-[28px] rtl:leading-[1.35] rtl:tracking-normal">
                {copy.title}
              </h1>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-revix-secondary">
                {copy.description}
              </p>
            </div>

            {targetEmail && (
              <div className="rounded-xl border border-revix-border bg-revix-surface/75 px-4 py-3.5">
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
            )}

            {statusMessage && (
              <Alert
                variant="success"
                title={copy.title}
                message={statusMessage}
                onClose={() => setStatusMessage(undefined)}
                closeLabel={copy.closeAlert}
              />
            )}

            {errorMessage && (
              <Alert
                variant="error"
                title={copy.errors.title}
                message={errorMessage}
                onClose={() => setErrorMessage(undefined)}
                closeLabel={copy.closeAlert}
              />
            )}

            <div className="space-y-3 pt-1">
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={isResending || cooldown > 0}
                onClick={handleResend}
                className="rounded-full shadow-sm hover:shadow"
              >
                {isResending
                  ? copy.resending
                  : cooldown > 0
                    ? copy.cooldownLabel.replace("{seconds}", String(cooldown))
                    : copy.resendButton}
              </Button>

              <ButtonLink
                href="/login"
                variant="secondary"
                fullWidth
                className="rounded-full"
              >
                {copy.goToLogin}
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
