"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { DetailTileCard } from "@/components/shared/workspace";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { vehicleHref } from "@/lib/workspace/resourceRoutes";
import {
  useListInsuranceCompanyPoliciesQuery,
  type InsuranceCompanyDto,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";

interface InsuranceCompanyDetailPageProps {
  company: InsuranceCompanyDto;
  isRtl: boolean;
  onBack: () => void;
}

export function InsuranceCompanyDetailPage({
  company,
  isRtl,
  onBack,
}: InsuranceCompanyDetailPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "policies">("overview");
  const [policyFilter, setPolicyFilter] = useState<"all" | "active" | "expired">("all");

  const { data: wsCtx } = useGetWorkspaceContextQuery();
  const currency = wsCtx?.data?.company?.baseCurrency || "EGP";

  const { data: policiesRes, isLoading } = useListInsuranceCompanyPoliciesQuery(company.id);
  const policies = useMemo(() => policiesRes?.data ?? [], [policiesRes?.data]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const summary = useMemo(() => {
    const uniqueVehicles = new Set(policies.map((p) => p.vehicleId)).size;
    const activePolicies = policies.filter((p) => !p.expiryDate || p.expiryDate >= todayIso);
    const expiredPolicies = policies.filter((p) => p.expiryDate && p.expiryDate < todayIso);
    const totalPaid = policies.reduce((sum, p) => sum + (Number(p.premiumAmount) || 0), 0);
    return {
      uniqueVehicles,
      activeCount: activePolicies.length,
      expiredCount: expiredPolicies.length,
      totalPaid,
    };
  }, [policies, todayIso]);

  const filteredPolicies = useMemo(() => {
    if (policyFilter === "active") {
      return policies.filter((p) => !p.expiryDate || p.expiryDate >= todayIso);
    }
    if (policyFilter === "expired") {
      return policies.filter((p) => p.expiryDate && p.expiryDate < todayIso);
    }
    return policies;
  }, [policies, policyFilter, todayIso]);

  const coverageLabel = (type: string) => {
    if (type === "compulsory_plate") return isRtl ? "إجباري (لوحة)" : "Compulsory Plate";
    if (type === "comprehensive") return isRtl ? "تأمين شامل" : "Comprehensive";
    if (type === "third_party") return isRtl ? "ضد الغير" : "Third-Party";
    return type;
  };

  const tabs = [
    { id: "overview" as const, label: isRtl ? "نظرة عامة" : "Overview" },
    {
      id: "policies" as const,
      label: `${isRtl ? "السيارات والبوالص" : "Insured Vehicles & Policies"} (${policies.length})`,
    },
  ];

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Clean Top Header — matches PO, Vehicle & Vendor detail pages */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            title={isRtl ? "العودة لشركات التأمين" : "Back to insurance companies"}
            aria-label={isRtl ? "العودة لشركات التأمين" : "Back to insurance companies"}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface"
          >
            <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
          </button>
          <h1 className="truncate text-lg font-bold text-revix-dark">{company.name}</h1>
        </div>
      </div>

      {/* Underline Tabs */}
      <nav
        aria-label={isRtl ? "أقسام شركة التأمين" : "Insurance company sections"}
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-revix-border"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "border-revix-primary font-semibold text-revix-primary"
                  : "border-transparent text-revix-secondary hover:text-revix-dark"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pb-4">
        {activeTab === "overview" && (
          <div className="grid items-start gap-5 md:grid-cols-2">
            {/* Company Info */}
            <DetailTileCard
              title={isRtl ? "بيانات شركة التأمين" : "Insurance Company Details"}
              items={[
                { label: isRtl ? "اسم الشركة" : "Company name", value: company.name },
                {
                  label: isRtl ? "مسؤول التواصل" : "Contact person",
                  value: company.contactPerson || "—",
                },
                { label: isRtl ? "الهاتف" : "Phone", value: company.phone || "—" },
                { label: isRtl ? "البريد الإلكتروني" : "Email", value: company.email || "—" },
                { label: isRtl ? "العنوان" : "Address", value: company.address || "—" },
              ]}
            />

            {/* Policies & Amounts Summary */}
            <DetailTileCard
              title={isRtl ? "ملخص التأمين والمبالغ" : "Policies & Amounts Summary"}
              items={[
                {
                  label: isRtl ? "إجمالي قيمة التأمين" : "Total insurance amount",
                  value: isLoading ? "…" : `${summary.totalPaid.toLocaleString()} ${currency}`,
                  valueClassName: "text-emerald-700",
                },
                {
                  label: isRtl ? "عدد السيارات المؤمّن عليها" : "Insured vehicles",
                  value: isLoading ? "…" : String(summary.uniqueVehicles),
                },
                {
                  label: isRtl ? "إجمالي البوالص" : "Total policies",
                  value: isLoading ? "…" : String(policies.length),
                },
                {
                  label: isRtl ? "بوالص سارية" : "Active policies",
                  value: isLoading ? "…" : String(summary.activeCount),
                  valueClassName: "text-emerald-700",
                },
                {
                  label: isRtl ? "بوالص منتهية" : "Expired policies",
                  value: isLoading ? "…" : String(summary.expiredCount),
                  valueClassName: summary.expiredCount > 0 ? "text-rose-600" : "text-revix-dark",
                },
              ]}
            />
          </div>
        )}

        {activeTab === "policies" && (
          <section className="overflow-hidden rounded-lg border border-revix-border bg-revix-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-revix-border bg-revix-surface px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-revix-dark">
                  {isRtl ? "السيارات والبوالص" : "Insured Vehicles & Policies"}
                </h3>
                <span className="rounded border border-revix-border bg-revix-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                  {filteredPolicies.length}
                </span>
              </div>

              <div className="flex items-center gap-1 rounded-md border border-revix-border bg-revix-white p-0.5 text-[11px]">
                {(
                  [
                    { id: "all", label: `${isRtl ? "الكل" : "All"} (${policies.length})` },
                    { id: "active", label: `${isRtl ? "سارية" : "Active"} (${summary.activeCount})` },
                    { id: "expired", label: `${isRtl ? "منتهية" : "Expired"} (${summary.expiredCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPolicyFilter(f.id)}
                    className={`cursor-pointer rounded px-2.5 py-1 font-medium transition-colors ${
                      policyFilter === f.id
                        ? "bg-revix-primary text-white"
                        : "text-revix-secondary hover:text-revix-dark"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-xs text-revix-secondary">
                {isRtl ? "جاري التحميل..." : "Loading..."}
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div className="py-10 text-center text-xs text-revix-secondary">
                {isRtl ? "لا توجد سيارات أو بوالص مسجلة على هذه الشركة." : "No insured vehicles or policies recorded for this company."}
              </div>
            ) : (
              <DataTable className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-revix-border bg-revix-surface/50 text-[11px] font-semibold text-revix-secondary">
                    <th className="px-4 py-2.5 text-start">{isRtl ? "السيارة" : "Vehicle"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "اللوحة" : "Plate"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "النوع" : "Coverage"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "رقم البوليصة" : "Policy #"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "القيمة" : "Amount"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "البدء" : "Start"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "الانتهاء" : "Expiry"}</th>
                    <th className="px-4 py-2.5 text-end">{isRtl ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-revix-border/60">
                  {filteredPolicies.map((p) => {
                    const isExpired = Boolean(p.expiryDate && p.expiryDate < todayIso);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => router.push(vehicleHref(p.vehicleId))}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") router.push(vehicleHref(p.vehicleId));
                        }}
                        className="cursor-pointer transition-colors hover:bg-revix-surface/60 focus:bg-revix-surface/60 focus:outline-none"
                      >
                        <td className="px-4 py-2.5 font-semibold text-revix-dark whitespace-nowrap">
                          {p.vehicleTitle}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-revix-dark whitespace-nowrap" dir="ltr">
                          {p.licensePlate}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                              p.coverageType === "compulsory_plate"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {coverageLabel(p.coverageType)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-revix-secondary whitespace-nowrap">
                          {p.policyNumber}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-revix-dark tabular-nums whitespace-nowrap" dir="ltr">
                          {p.premiumAmount.toLocaleString()} {currency}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-revix-secondary tabular-nums whitespace-nowrap">
                          {p.startDate || "—"}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-revix-dark tabular-nums whitespace-nowrap">
                          {p.expiryDate || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-end whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                              isExpired
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {isExpired ? (isRtl ? "منتهية" : "Expired") : isRtl ? "سارية" : "Active"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
