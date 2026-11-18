"use client";

import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/Button";
import type { AuthUserDto } from "@/store/api/authApi";

export interface AccountSecurityPanelProps {
  isRtl: boolean;
  user: AuthUserDto;
}

export function AccountSecurityPanel({
  isRtl,
  user,
}: AccountSecurityPanelProps) {
  return (
    <div className="max-w-[640px] space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold text-revix-dark">
          {isRtl ? "الأمان وكلمة المرور" : "Account & Password"}
        </h1>
        <p className="mt-0.5 text-[13px] text-revix-secondary">
          {isRtl
            ? "إدارة حسابك الشخصي المسجل على منصة ريفيكس سيستم."
            : "Manage your signed-in Revix System account credentials."}
        </p>
      </div>
      <div className="space-y-4 rounded-[8px] border border-revix-border bg-revix-white p-5">
        <div>
          <p className="text-[12px] font-medium text-revix-secondary">
            {isRtl ? "الاسم الكامل" : "Full name"}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-revix-dark">
            {user.fullName}
          </p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-revix-secondary">
            {isRtl ? "البريد الإلكتروني" : "Email address"}
          </p>
          <p
            dir="ltr"
            className="mt-0.5 text-start text-[15px] font-semibold text-revix-dark"
          >
            {user.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-revix-border pt-4">
          <ButtonLink
            href="/account/security"
            variant="primary"
            className="rounded-[8px]"
          >
            {isRtl ? "تغيير كلمة المرور" : "Change password"}
          </ButtonLink>
          <Link
            href="/account"
            className="inline-flex h-[44px] items-center justify-center rounded-[8px] border border-revix-border px-4 text-[13.5px] font-semibold text-revix-dark hover:bg-revix-surface"
          >
            {isRtl ? "صفحة الحساب" : "Account page"}
          </Link>
        </div>
      </div>
    </div>
  );
}
