"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { SectionCard } from "@/components/ui/SectionCard";
import { StudioBadge } from "@/components/shared/workspace";
import {
  useChangePasswordMutation,
  useUpdateMySignatureMutation,
  type AuthUserDto,
} from "@/store/api/authApi";
import { SignaturePadModal } from "@/components/shared/SignaturePadModal";
import type {
  BranchDto,
  CompanyDto,
  WorkspaceMembershipDto,
} from "@/store/api/workspaceApi";
import { getApiErrorMessage } from "@/lib/api/errors";

export interface AccountSecurityPanelProps {
  isRtl: boolean;
  user: AuthUserDto;
  membership?: WorkspaceMembershipDto | null;
  company?: CompanyDto | null;
  branches?: BranchDto[];
}

export function AccountSecurityPanel({
  isRtl,
  user,
  membership,
  company,
  branches = [],
}: AccountSecurityPanelProps) {
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();
  const [updateMySignature, { isLoading: isSavingSignature }] =
    useUpdateMySignatureMutation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [isSignPadOpen, setIsSignPadOpen] = useState(false);
  const [sigSuccess, setSigSuccess] = useState<string | null>(null);
  const [sigError, setSigError] = useState<string | null>(null);

  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const branchNames =
    membership?.scopeType === "company_wide"
      ? isRtl
        ? "جميع فروع الشركة"
        : "All company branches"
      : membership?.branchIds?.length
        ? membership.branchIds
            .map((id) => branches.find((b) => b.id === id)?.name || id.slice(0, 8))
            .join("، ")
        : "—";

  const roleLabel = membership
    ? isRtl
      ? membership.roleNameAr
      : membership.roleNameEn
    : isRtl
      ? "مالك الشركة"
      : "Owner";

  const isSuspended = membership?.status === "suspended";

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwSuccess(null);
    setPwError(null);

    if (newPassword.length < 8) {
      setPwError(
        isRtl
          ? "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل."
          : "New password must be at least 8 characters.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(
        isRtl
          ? "كلمة المرور الجديدة وتأكيدها غير متطابقين."
          : "New password and confirmation do not match.",
      );
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setPwSuccess(
        isRtl ? "تم تحديث كلمة المرور بنجاح." : "Password updated successfully.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(
        getApiErrorMessage(err) ??
          (isRtl
            ? "تعذر تغيير كلمة المرور. تأكد من كلمة المرور الحالية."
            : "Failed to change password. Verify your current password."),
      );
    }
  }

  return (
    <div className="space-y-4 pb-8" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "الملف الشخصي والأمان" : "My Profile & Security"}
          </h1>
          <p className="mt-0.5 text-xs text-revix-secondary">
            {isRtl
              ? "بيانات حسابك الشخصي، الدور الوظيفي، وإدارة كلمة المرور."
              : "Your personal account details, role permissions, and password security."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StudioBadge variant={isSuspended ? "amber" : "success"}>
            {isSuspended
              ? isRtl
                ? "موقوف"
                : "Suspended"
              : isRtl
                ? "نشط"
                : "Active"}
          </StudioBadge>
          <StudioBadge variant={user.emailVerified ? "success" : "amber"}>
            {user.emailVerified
              ? isRtl
                ? "البريد مؤكد"
                : "Email Verified"
              : isRtl
                ? "البريد غير مؤكد"
                : "Unverified"}
          </StudioBadge>
        </div>
      </div>

      <SectionCard title={isRtl ? "١. البيانات الشخصية والوظيفية" : "1. Personal & Role Details"}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: isRtl ? "الاسم الكامل" : "Full Name",
              value: user.fullName,
            },
            {
              label: isRtl ? "البريد الإلكتروني" : "Email Address",
              value: (
                <span dir="ltr" className="inline-block truncate max-w-full font-mono text-[11px]">
                  {user.email}
                </span>
              ),
            },
            {
              label: isRtl ? "هاتف الشركة" : "Company Phone",
              value: (
                <span dir="ltr" className="inline-block font-mono text-xs">
                  {company?.phone || "—"}
                </span>
              ),
            },
            {
              label: isRtl ? "الشركة" : "Company",
              value: company?.name || "—",
            },
            {
              label: isRtl ? "الدور الوظيفي" : "Role",
              value: <StudioBadge variant="primary">{roleLabel}</StudioBadge>,
            },
            {
              label: isRtl ? "نطاق الفروع" : "Branch Scope",
              value: branchNames,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-emerald-900/10 bg-emerald-50/50 px-3 py-2.5"
            >
              <div className="text-[10.5px] text-revix-secondary">{item.label}</div>
              <div className="mt-1 truncate text-xs font-bold text-revix-dark">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={isRtl ? "٢. تغيير كلمة المرور" : "2. Change Password"}>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {pwSuccess && (
            <Alert
              variant="success"
              message={pwSuccess}
              onClose={() => setPwSuccess(null)}
            />
          )}
          {pwError && (
            <Alert
              variant="error"
              message={pwError}
              onClose={() => setPwError(null)}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput
              label={isRtl ? "كلمة المرور الحالية" : "Current password"}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "كلمة المرور الجديدة" : "New password"}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "تأكيد كلمة المرور الجديدة" : "Confirm new password"}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={isChangingPassword}
              className="rounded-xl px-5"
            >
              {isChangingPassword
                ? isRtl
                  ? "جاري التحديث..."
                  : "Updating..."
                : isRtl
                  ? "تحديث كلمة المرور"
                  : "Update Password"}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title={isRtl ? "٣. توقيعي الشخصي للعقود" : "3. My Personal Contract Signature"}
      >
        <div className="space-y-3">
          <p className="text-xs text-revix-secondary">
            {isRtl
              ? "يُحفظ هذا التوقيع على حسابك الشخصي ويُطبع تلقائياً كتوقيع المؤجر (الموظف المسؤول) في جميع العقود التي تنشئها."
              : "Saved exclusively on your employee account and printed automatically as the Lessor's signature on contracts you issue."}
          </p>

          {sigSuccess && (
            <Alert
              variant="success"
              message={sigSuccess}
              onClose={() => setSigSuccess(null)}
            />
          )}
          {sigError && (
            <Alert
              variant="error"
              message={sigError}
              onClose={() => setSigError(null)}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-revix-border bg-revix-surface/40 p-4">
            {user.signatureDataUrl ? (
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-revix-border bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.signatureDataUrl}
                    alt={isRtl ? "توقيع الموظف" : "Employee Signature"}
                    className="h-14 w-44 object-contain"
                  />
                </div>
                <StudioBadge variant="success">
                  {isRtl ? "التوقيع محفوظ" : "Signature Saved"}
                </StudioBadge>
              </div>
            ) : (
              <div className="text-xs font-medium text-revix-secondary">
                {isRtl ? "لم تقم بإضافة توقيعك الشخصي بعد." : "No personal signature saved yet."}
              </div>
            )}

            <div className="flex items-center gap-2">
              {user.signatureDataUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSavingSignature}
                  onClick={async () => {
                    setSigSuccess(null);
                    setSigError(null);
                    try {
                      await updateMySignature({ signatureDataUrl: null }).unwrap();
                      setSigSuccess(isRtl ? "تم حذف التوقيع." : "Signature cleared.");
                    } catch (err) {
                      setSigError(getApiErrorMessage(err) ?? (isRtl ? "تعذر حذف التوقيع." : "Failed to clear signature."));
                    }
                  }}
                >
                  {isRtl ? "مسح التوقيع" : "Clear"}
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                disabled={isSavingSignature}
                onClick={() => setIsSignPadOpen(true)}
              >
                {user.signatureDataUrl
                  ? isRtl
                    ? "تحديث التوقيع"
                    : "Update Signature"
                  : isRtl
                    ? "إضافة توقيعي"
                    : "Add Signature"}
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SignaturePadModal
        isOpen={isSignPadOpen}
        isRtl={isRtl}
        title={isRtl ? "توقيعي الشخصي (الموظف)" : "My Personal Signature"}
        initialSignatureUrl={user.signatureDataUrl ?? null}
        isSaving={isSavingSignature}
        onClose={() => setIsSignPadOpen(false)}
        onSave={async (dataUrl) => {
          setSigSuccess(null);
          setSigError(null);
          try {
            await updateMySignature({ signatureDataUrl: dataUrl }).unwrap();
            setIsSignPadOpen(false);
            setSigSuccess(
              isRtl
                ? "تم حفظ توقيعك الشخصي بنجاح."
                : "Your personal signature has been saved.",
            );
          } catch (err) {
            setSigError(
              getApiErrorMessage(err) ??
                (isRtl ? "تعذر حفظ التوقيع." : "Failed to save signature."),
            );
          }
        }}
      />
    </div>
  );
}
