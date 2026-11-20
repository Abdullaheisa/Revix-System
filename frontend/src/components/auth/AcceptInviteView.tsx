"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { StudioBadge } from "@/components/shared/workspace";
import { validateNewPassword } from "@/lib/auth/passwordPolicy";
import { extractApiErrorCode, resolveAssetUrl } from "@/store/api/baseApi";
import {
  useAcceptInvitationMutation,
  usePreviewInvitationMutation,
  type InvitationPreviewDto,
} from "@/store/api/teamApi";

export interface AcceptInviteViewProps {
  isRtl: boolean;
}

export function AcceptInviteView({ isRtl }: AcceptInviteViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("token")?.trim() ?? "";

  const [previewInvitation] = usePreviewInvitationMutation();
  const [acceptInvitation, { isLoading: isAccepting }] =
    useAcceptInvitationMutation();

  const [preview, setPreview] = useState<InvitationPreviewDto | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | undefined>();

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    async function load() {
      if (!rawToken) {
        setPreviewError(
          isRtl
            ? "رابط الدعوة غير مكتمل أو غير صالح."
            : "This invitation link is missing or invalid.",
        );
        setIsLoadingPreview(false);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const res = await previewInvitation({ token: rawToken }).unwrap();
        if (!active) return;
        setPreview(res.data.invitation);
        setFullName(res.data.invitation.fullName);
      } catch {
        if (!active) return;
        setPreviewError(
          isRtl
            ? "انتهت صلاحية رابط الدعوة أو تم استخدامه بالفعل."
            : "This invitation link has expired or has already been used.",
        );
      } finally {
        if (active) setIsLoadingPreview(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [isRtl, previewInvitation, rawToken]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);

    const policyIssue = validateNewPassword(password);
    if (policyIssue) {
      setFormError(
        isRtl
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام."
          : "Password must be at least 8 characters with letters and numbers.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setFormError(
        isRtl
          ? "كلمتا المرور غير متطابقتين."
          : "Passwords do not match.",
      );
      return;
    }

    try {
      await acceptInvitation({
        token: rawToken,
        password,
        fullName: fullName.trim() || undefined,
      }).unwrap();
      router.push("/workspace");
    } catch (err) {
      const code = extractApiErrorCode(err);
      if (code === "EMAIL_ALREADY_IN_COMPANY") {
        setFormError(
          isRtl
            ? "هذا البريد الإلكتروني مرتبط بالفعل بشركة أخرى."
            : "This email already belongs to another company.",
        );
      } else {
        setFormError(
          isRtl
            ? "تعذّر تفعيل الدعوة. يرجى التأكد من صحة الرابط وكلمة المرور."
            : "Unable to accept invitation. Please check the link and password.",
        );
      }
    }
  }

  return (
    <AuthShell
      isRtl={isRtl}
      brandName="Revix System"
      brandDescriptor={
        isRtl ? "دعوة انضمام لفريق الشركة" : "Company Team Invitation"
      }
      backToHome={isRtl ? "العودة للرئيسية" : "Back to home"}
    >
      {isLoadingPreview ? (
        <div className="py-10 text-center text-[14px] text-revix-secondary">
          {isRtl ? "جاري التحقق من رابط الدعوة..." : "Verifying your invitation..."}
        </div>
      ) : previewError || !preview ? (
        <div className="space-y-5">
          <Alert
            variant="error"
            title={isRtl ? "دعوة غير صالحة" : "Invalid invitation"}
            message={
              previewError ??
              (isRtl
                ? "رابط الدعوة غير صالح."
                : "This invitation is no longer valid.")
            }
          />
          <Link
            href="/login"
            className="inline-flex text-[13.5px] font-semibold text-revix-primary hover:underline"
          >
            {isRtl ? "الانتقال لتسجيل الدخول" : "Go to sign in"}
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Company Header Card */}
          <div className="flex items-center gap-3 rounded-[10px] border border-revix-border bg-revix-surface p-3.5">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-revix-border bg-revix-white"
              style={
                !preview.companyLogoUrl
                  ? { backgroundColor: preview.companyBrandColor || "#14532D" }
                  : undefined
              }
            >
              {preview.companyLogoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={resolveAssetUrl(preview.companyLogoUrl)}
                  alt={preview.companyName}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <RevixIcon
                  name="building-2"
                  size={18}
                  className="text-revix-white"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-revix-dark">
                {preview.companyName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <StudioBadge variant="primary">
                  {isRtl ? preview.roleNameAr : preview.roleNameEn}
                </StudioBadge>
                {preview.scopeType === "company_wide" ? (
                  <StudioBadge variant="success">
                    {isRtl ? "جميع الفروع" : "All branches"}
                  </StudioBadge>
                ) : (
                  preview.branchNames.map((b) => (
                    <StudioBadge key={b} variant="amber">
                      {b}
                    </StudioBadge>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-[22px] font-bold text-revix-dark">
              {isRtl ? "تفعيل حسابك والانضمام للفريق" : "Activate your account"}
            </h1>
            <p className="mt-1 text-[13.5px] text-revix-secondary">
              {isRtl
                ? `اختر كلمة مرور قوية لحسابك (${preview.email}) للدخول إلى مساحة عمل الشركة.`
                : `Set a strong password for ${preview.email} to join your company workspace.`}
            </p>
          </div>

          {formError ? (
            <Alert
              variant="error"
              title={isRtl ? "تعذّر تفعيل الحساب" : "Activation failed"}
              message={formError}
              onClose={() => setFormError(undefined)}
            />
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label={isRtl ? "الاسم الكامل" : "Full name"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <FormInput
              label={isRtl ? "كلمة المرور" : "Password"}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText={
                isRtl
                  ? "8 أحرف على الأقل وتحتوي على حروف وأرقام."
                  : "At least 8 characters with letters and numbers."
              }
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="cursor-pointer text-revix-secondary hover:text-revix-dark"
                  aria-label={
                    showPassword
                      ? isRtl
                        ? "إخفاء كلمة المرور"
                        : "Hide password"
                      : isRtl
                        ? "إظهار كلمة المرور"
                        : "Show password"
                  }
                >
                  <RevixIcon
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                  />
                </button>
              }
              required
            />

            <FormInput
              label={isRtl ? "تأكيد كلمة المرور" : "Confirm password"}
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" fullWidth isLoading={isAccepting}>
              {isRtl ? "قبول الدعوة والدخول" : "Accept invitation & enter workspace"}
            </Button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
