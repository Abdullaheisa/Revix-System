"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  usePreviewNetworkInvitationQuery,
  useAcceptNetworkInvitationMutation,
} from "@/store/api/networkApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { extractApiErrorCode } from "@/store/api/baseApi";

export interface AcceptNetworkInviteViewProps {
  isRtl: boolean;
}

export function AcceptNetworkInviteView({ isRtl }: AcceptNetworkInviteViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const {
    data: previewData,
    isLoading: isLoadingPreview,
    error: previewErrorRaw,
  } = usePreviewNetworkInvitationQuery(token, { skip: !token });

  const { data: wsData } = useGetWorkspaceContextQuery();
  const currentCompany = wsData?.data.company;
  const currentBranches = wsData?.data.branches ?? [];

  const [acceptNetworkInvitation, { isLoading: isAccepting }] =
    useAcceptNetworkInvitationMutation();

  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [branchesInitialized, setBranchesInitialized] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize selected branches to all current company branches by default
  if (!branchesInitialized && currentBranches.length > 0) {
    setSelectedBranchIds(currentBranches.map((b) => b.id));
    setBranchesInitialized(true);
  }

  const preview = previewData?.data;
  const previewErrorCode = previewErrorRaw
    ? extractApiErrorCode(previewErrorRaw)
    : !token
      ? "MISSING_TOKEN"
      : null;

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!token) return;

    try {
      await acceptNetworkInvitation({
        token,
        permittedBranchIds: selectedBranchIds,
      }).unwrap();

      setSuccess(true);
      setTimeout(() => {
        router.push("/workspace");
      }, 2000);
    } catch (err) {
      const code = extractApiErrorCode(err);
      if (code === "INVITATION_ALREADY_USED") {
        setActionError(
          isRtl
            ? "تم قبول هذه الدعوة مسبقاً أو أصبحت غير صالحة."
            : "This invitation has already been used.",
        );
      } else if (code === "INVITATION_EXPIRED") {
        setActionError(
          isRtl
            ? "انتهت صلاحية رابط الدعوة هذا."
            : "This invitation link has expired.",
        );
      } else {
        setActionError(
          isRtl
            ? "تعذر قبول الدعوة. يرجى التحقق من تسجيل الدخول والمحاولة مجددًا."
            : "Failed to accept network invitation. Please try again.",
        );
      }
    }
  };

  return (
    <AuthShell
      isRtl={isRtl}
      brandName="Revix System"
      brandDescriptor={
        isRtl ? "دعوة ربط بشبكة الشركات" : "Company Network Invitation"
      }
      backToHome={isRtl ? "العودة للرئيسية" : "Back to home"}
    >
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-revix-dark">
            {isRtl ? "دعوة ربط بشبكة الشركات" : "Company Network Invitation"}
          </h2>
          <p className="mt-1 text-xs text-revix-secondary">
            {isRtl
              ? "الربط مع شركة رئيسية كشريك محلي مع حماية استقلالية أسطولك"
              : "Link with a Main Network Company under strict View-Only isolation"}
          </p>
        </div>

        {isLoadingPreview ? (
          <div className="py-10 text-center text-sm text-revix-secondary">
            <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-revix-primary border-t-transparent" />
            {isRtl ? "جاري التحقق من الدعوة..." : "Verifying invitation..."}
          </div>
        ) : previewErrorCode ? (
          <div className="space-y-4">
            <Alert
              variant="error"
              title={isRtl ? "دعوة غير صالحة" : "Invalid invitation"}
              message={
                previewErrorCode === "INVITATION_ALREADY_USED"
                  ? isRtl
                    ? "تم استخدام هذه الدعوة بالفعل."
                    : "This invitation has already been accepted or revoked."
                  : previewErrorCode === "INVITATION_EXPIRED"
                  ? isRtl
                    ? "انتهت صلاحية هذه الدعوة."
                    : "This invitation has expired."
                  : isRtl
                  ? "رابط الدعوة غير صالح أو غير موجود."
                  : "Invalid or nonexistent invitation link."
              }
            />

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/workspace")}
            >
              {isRtl ? "الانتقال إلى مساحة العمل" : "Go to Workspace"}
            </Button>
          </div>
        ) : preview ? (
          success ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-revix-primary">
                <RevixIcon name="check" size={24} />
              </div>
              <h3 className="text-base font-bold text-revix-dark">
                {isRtl ? "تم الانضمام للشبكة بنجاح!" : "Successfully Linked to Network!"}
              </h3>
              <p className="mx-auto max-w-xs text-xs text-revix-secondary">
                {isRtl
                  ? "تم تفعيل ربط الشراكة كشركة محلية مع مشاركة الفروع المختارة. جاري تحويلك لمساحة العمل..."
                  : "Your company is now linked as a local partner. Redirecting to workspace..."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleAccept} className="space-y-4">
              {actionError && (
                <Alert
                  variant="error"
                  title={isRtl ? "خطأ" : "Error"}
                  message={actionError}
                />
              )}

              {/* Main Company Card Preview */}
              <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-2xs"
                    style={{ backgroundColor: preview.mainCompany.brandColor || "#059669" }}
                  >
                    {preview.mainCompany.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-revix-dark">
                      {preview.mainCompany.name}
                    </h4>
                    <p className="text-xs text-revix-secondary">
                      {preview.mainCompany.legalName} • {preview.mainCompany.city},{" "}
                      {preview.mainCompany.countryCode}
                    </p>
                  </div>
                </div>
                <p className="border-t border-emerald-100 pt-2 text-xs text-emerald-800">
                  {isRtl
                    ? `تدعوك شركة "${preview.mainCompany.name}" لربط شركة "${preview.invitation.localCompanyName}" كشريك محلي بشبكتها.`
                    : `"${preview.mainCompany.name}" invites "${preview.invitation.localCompanyName}" to link as a local network partner.`}
                </p>
              </div>

              {/* Current Workspace & Branches to share */}
              {currentCompany ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-revix-dark">
                    {isRtl ? "الفروع المسموح للشبكة بمعاينتها (عرض فقط):" : "Branches permitted for network view:"}
                  </div>

                  {currentBranches.length === 0 ? (
                    <p className="text-xs text-revix-secondary">
                      {isRtl
                        ? "ليس لديك أي فروع مضافة حالياً. يمكنك إنشاء فروع لاحقاً ومشاركتها."
                        : "You have no branches added yet. You can share branches later."}
                    </p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {currentBranches.map((branch) => {
                        const isChecked = selectedBranchIds.includes(branch.id);
                        return (
                          <label
                            key={branch.id}
                            className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs transition-colors ${
                              isChecked
                                ? "border-revix-primary bg-emerald-50/30"
                                : "border-revix-border bg-white hover:bg-revix-surface"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBranchIds((prev) => [...prev, branch.id]);
                                  } else {
                                    setSelectedBranchIds((prev) =>
                                      prev.filter((id) => id !== branch.id),
                                    );
                                  }
                                }}
                                className="h-3.5 w-3.5 rounded border-revix-border text-revix-primary focus:ring-revix-primary"
                              />
                              <span className="font-medium text-revix-dark">
                                {branch.name} ({branch.code})
                              </span>
                            </div>
                            <span className="font-mono text-2xs text-revix-secondary">
                              {branch.city}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-start gap-2 rounded-lg border border-revix-border bg-revix-surface p-3 text-xs text-revix-secondary">
                    <RevixIcon name="shield" size={16} className="mt-0.5 shrink-0 text-revix-primary" />
                    <span>
                      {isRtl
                        ? "ضمان الخصوصية: الشركة الرئيسية لا يمكنها إطلاقاً تعديل أو حذف أي من سياراتك أو عقودك أو بيانات عملائك."
                        : "Privacy Guarantee: HQ has zero write permissions over your cars, contracts, or customers."}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={isAccepting}
                  >
                    {isRtl ? "قبول الشراكة والربط بالشبكة" : "Accept & Link with Network"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <Alert
                    variant="info"
                    title={isRtl ? "تنبيه" : "Notice"}
                    message={
                      isRtl
                        ? "يرجى تسجيل الدخول بحساب شركتك المحلية أولاً لقبول هذه الدعوة."
                        : "Please sign in to your local company account first to accept this invitation."
                    }
                  />
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => router.push(`/login?redirect=/invite/network?token=${token}`)}
                  >
                    {isRtl ? "تسجيل الدخول للمتابعة" : "Sign In to Continue"}
                  </Button>
                </div>
              )}
            </form>
          )
        ) : null}
      </div>
    </AuthShell>
  );
}
