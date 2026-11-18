"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useGetMeQuery, useLogoutMutation } from "@/store/api/authApi";
import { extractApiErrorCode } from "@/store/api/baseApi";

export interface AccountOverviewCopy {
  brandName: string;
  brandDescriptor: string;
  title: string;
  signedInStatus: string;
  signedInDescription: string;
  emailLabel: string;
  securityLink: string;
  logoutButton: string;
  loggingOut: string;
  logoutError: string;
  backToHome: string;
  unavailableTitle: string;
  unavailableDescription: string;
  retry: string;
  closeAlert: string;
  signInLink: string;
}

export interface AccountOverviewProps {
  isRtl: boolean;
  copy: AccountOverviewCopy;
}

export function AccountOverview({ isRtl, copy }: AccountOverviewProps) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useGetMeQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [logoutErr, setLogoutErr] = useState<string | undefined>();

  const user = data?.data.user ?? null;
  const errorCode = error ? extractApiErrorCode(error) : null;

  async function handleLogout() {
    setLogoutErr(undefined);
    try {
      await logout().unwrap();
      router.push("/login");
    } catch {
      setLogoutErr(copy.logoutError);
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
        <div>
          <h1 className="text-[24px] font-bold leading-[1.2] tracking-[-0.025em] text-revix-dark sm:text-[28px] rtl:leading-[1.35] rtl:tracking-normal">
            {copy.title}
          </h1>
          {user ? (
            <p className="mt-1.5 text-[14.5px] leading-[1.55] text-revix-secondary">
              {copy.signedInDescription}
            </p>
          ) : null}
        </div>

        {logoutErr ? (
          <Alert
            variant="error"
            title={copy.title}
            message={logoutErr}
            onClose={() => setLogoutErr(undefined)}
            closeLabel={copy.closeAlert}
          />
        ) : null}

        {isLoading ? (
          <div className="rounded-award border border-revix-border bg-revix-surface/75 px-4 py-4">
            <p className="text-[14px] text-revix-secondary">...</p>
          </div>
        ) : user ? (
          <>
            <div className="rounded-award border border-revix-border bg-revix-surface/75 px-4 py-3.5">
              <p className="text-[12.5px] font-medium text-revix-secondary">
                {copy.emailLabel}
              </p>
              <p
                dir="ltr"
                className="mt-1 break-all text-start text-[16px] font-semibold text-revix-dark"
              >
                {user.email}
              </p>
            </div>

            <div className="space-y-3">
              <ButtonLink
                href="/workspace"
                variant="primary"
                fullWidth
                className="rounded-full"
              >
                {isRtl ? "الدخول إلى مساحة عمل الشركة" : "Open company workspace"}
              </ButtonLink>

              <ButtonLink
                href="/account/security"
                variant="secondary"
                fullWidth
                className="rounded-full"
              >
                {copy.securityLink}
              </ButtonLink>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="rounded-full"
              >
                {isLoggingOut ? copy.loggingOut : copy.logoutButton}
              </Button>
            </div>
          </>
        ) : errorCode === "UNAUTHORIZED" ? (
          <div className="space-y-4">
            <ButtonLink href="/login" fullWidth className="rounded-full">
              {copy.signInLink}
            </ButtonLink>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert
              variant="error"
              title={copy.unavailableTitle}
              message={copy.unavailableDescription}
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => refetch()}
              className="rounded-full"
            >
              {copy.retry}
            </Button>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
