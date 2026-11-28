"use client";

import { useState, type FormEvent } from "react";
import {
  useCreatePartnerApiKeyMutation,
  useGetPartnerIntegrationsQuery,
  useUpdatePartnerApiKeyStatusMutation,
  type CompanyDto,
} from "@/store/api/workspaceApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { SectionCard } from "@/components/ui/SectionCard";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import { getApiErrorMessage } from "@/lib/api/errors";
import { openPartnerApiGuidePdf } from "./PartnerApiGuidePdf";

interface PartnerIntegrationsPanelProps {
  isRtl: boolean;
  company: CompanyDto;
}

export function PartnerIntegrationsPanel({
  isRtl,
  company,
}: PartnerIntegrationsPanelProps) {
  const { data, isLoading, error } = useGetPartnerIntegrationsQuery();
  const [createKey, { isLoading: isCreating }] = useCreatePartnerApiKeyMutation();
  const [updateStatus, { isLoading: isUpdating }] =
    useUpdatePartnerApiKeyStatusMutation();

  const [partnerName, setPartnerName] = useState("");
  const [partnerWebsiteUrl, setPartnerWebsiteUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [issuedRawKey, setIssuedRawKey] = useState<{
    partnerName: string;
    rawKey: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (isLoading || !data?.data || error) {
    return (
      <ResourceFeedback
        isRtl={isRtl}
        isLoading={isLoading}
        error={error ? getApiErrorMessage(error) : null}
      />
    );
  }

  const { baseUrl, keys } = data.data;

  async function copyText(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      // Ignore clipboard failures
    }
  }

  async function handleIssueKey(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!partnerName.trim() || !partnerWebsiteUrl.trim()) {
      setFormError(
        isRtl
          ? "يرجى إدخال اسم الموقع ورابط الموقع."
          : "Partner website name and URL are required.",
      );
      return;
    }

    try {
      const res = await createKey({
        partnerName: partnerName.trim(),
        partnerWebsiteUrl: partnerWebsiteUrl.trim(),
      }).unwrap();
      setIssuedRawKey({
        partnerName: res.data.key.partnerName,
        rawKey: res.data.rawApiKey,
      });
      setPartnerName("");
      setPartnerWebsiteUrl("");
    } catch (err) {
      setFormError(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر إصدار مفتاح الربط." : "Failed to issue API key."),
      );
    }
  }

  return (
    <div className="space-y-5" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "التكامل والربط الخارجي (Integrations)" : "Partner Integrations & API"}
          </h1>
          <p className="mt-1 text-xs text-revix-secondary">
            {isRtl
              ? "إصدار مفاتيح الربط (Production) لمواقع الحجز العالمية وتحميل دليل الربط الخاص بهوية الشركة الأم."
              : "Issue Production API keys for external booking websites and download your branded integration guide PDF."}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => openPartnerApiGuidePdf({ company, baseUrl })}
          className="gap-2"
        >
          <RevixIcon name="file-text" size={15} />
          <span>
            {isRtl ? "تحميل دليل الربط PDF" : "Download Integration Guide PDF"}
          </span>
        </Button>
      </div>

      {/* Dedicated Base URL Card */}
      <SectionCard
        title={isRtl ? "رابط الـ API الخاص بالشركة الأم" : "Dedicated Partner API Base URL"}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 rounded-xl border border-emerald-900/15 bg-emerald-50/50 px-4 py-3">
            <div className="text-[11px] font-semibold text-revix-secondary">
              {isRtl ? "Base URL (للقراءة فقط)" : "Base URL (Read-only)"}
            </div>
            <div
              dir="ltr"
              className="mt-1 break-all font-mono text-xs font-bold text-revix-primary sm:text-sm"
            >
              {baseUrl}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => copyText("base-url", baseUrl)}
          >
            {copiedId === "base-url"
              ? isRtl
                ? "تم النسخ ✓"
                : "Copied ✓"
              : isRtl
                ? "نسخ الرابط"
                : "Copy URL"}
          </Button>
        </div>
      </SectionCard>

      {/* One-time Raw API Key Display */}
      {issuedRawKey && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-emerald-900">
              {isRtl
                ? `تم إصدار مفتاح الربط لموقع "${issuedRawKey.partnerName}" — احفظه الآن فلن يظهر مرة أخرى:`
                : `API Key issued for "${issuedRawKey.partnerName}" — copy it now, it won't be shown again:`}
            </div>
            <button
              type="button"
              onClick={() => setIssuedRawKey(null)}
              className="cursor-pointer text-xs font-semibold text-emerald-700 hover:underline"
            >
              {isRtl ? "إغلاق" : "Dismiss"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <code
              dir="ltr"
              className="flex-1 break-all rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-xs font-bold text-revix-dark"
            >
              {issuedRawKey.rawKey}
            </code>
            <Button
              type="button"
              onClick={() => copyText("raw-key", issuedRawKey.rawKey)}
            >
              {copiedId === "raw-key"
                ? isRtl
                  ? "تم النسخ ✓"
                  : "Copied ✓"
                : isRtl
                  ? "نسخ المفتاح"
                  : "Copy Key"}
            </Button>
          </div>
        </div>
      )}

      {/* Issue New Partner Key */}
      <SectionCard
        title={isRtl ? "إصدار مفتاح ربط لموقع جديد (Production)" : "Issue New Partner API Key"}
      >
        <form onSubmit={handleIssueKey} className="space-y-4">
          {formError && (
            <Alert variant="error" message={formError} onClose={() => setFormError(null)} />
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
            <FormInput
              required
              label={isRtl ? "اسم الموقع الشريك *" : "Partner Website Name *"}
              placeholder={isRtl ? "مثال: Keynetic أو Rentalcars" : "e.g. Keynetic"}
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
            />
            <FormInput
              required
              type="url"
              dir="ltr"
              label={isRtl ? "رابط الموقع (URL) *" : "Website URL *"}
              placeholder="https://example.com"
              value={partnerWebsiteUrl}
              onChange={(e) => setPartnerWebsiteUrl(e.target.value)}
            />
            <Button type="submit" disabled={isCreating} className="h-10">
              {isCreating
                ? isRtl
                  ? "جاري الإصدار..."
                  : "Issuing..."
                : isRtl
                  ? "إصدار API Key"
                  : "Generate API Key"}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Issued Keys List */}
      <SectionCard
        title={isRtl ? `المواقع والمفاتيح المفعّلة (${keys.length})` : `Issued Partner Keys (${keys.length})`}
      >
        {keys.length === 0 ? (
          <p className="py-4 text-center text-xs text-revix-secondary">
            {isRtl
              ? "لم يتم إصدار أي مفاتيح ربط بعد."
              : "No partner API keys issued yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-revix-border text-[11px] font-bold text-revix-secondary">
                  <th className="py-2.5 pe-3 text-start">{isRtl ? "الموقع" : "Partner"}</th>
                  <th className="py-2.5 pe-3 text-start">{isRtl ? "الرابط" : "Website"}</th>
                  <th className="py-2.5 pe-3 text-start">{isRtl ? "المفتاح" : "Key Prefix"}</th>
                  <th className="py-2.5 pe-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                  <th className="py-2.5 pe-3 text-start">{isRtl ? "الطلبات" : "Requests"}</th>
                  <th className="py-2.5 text-end">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/60">
                {keys.map((k) => {
                  const statusBadge =
                    k.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : k.status === "suspended"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200";
                  const statusLabel =
                    k.status === "active"
                      ? isRtl
                        ? "نشط"
                        : "Active"
                      : k.status === "suspended"
                        ? isRtl
                          ? "موقوف"
                          : "Suspended"
                        : isRtl
                          ? "ملغي"
                          : "Revoked";

                  return (
                    <tr key={k.id} className="hover:bg-revix-surface/40">
                      <td className="py-3 pe-3 font-bold text-revix-dark">{k.partnerName}</td>
                      <td className="py-3 pe-3 font-mono text-[11px] text-revix-secondary" dir="ltr">
                        {k.partnerWebsiteUrl}
                      </td>
                      <td className="py-3 pe-3 font-mono text-[11px] text-revix-dark" dir="ltr">
                        {k.keyPrefix}...
                      </td>
                      <td className="py-3 pe-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${statusBadge}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 pe-3 font-mono font-semibold text-revix-dark">
                        {k.requestCount}
                      </td>
                      <td className="py-3 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          {k.status === "active" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateStatus({ id: k.id, status: "suspended" })}
                              className="cursor-pointer rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10.5px] font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              {isRtl ? "إيقاف" : "Suspend"}
                            </button>
                          )}
                          {k.status === "suspended" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateStatus({ id: k.id, status: "active" })}
                              className="cursor-pointer rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10.5px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              {isRtl ? "تفعيل" : "Activate"}
                            </button>
                          )}
                          {k.status !== "revoked" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateStatus({ id: k.id, status: "revoked" })}
                              className="cursor-pointer rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10.5px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              {isRtl ? "إلغاء" : "Revoke"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
