"use client";

import { RevixIcon } from "@/components/ui/RevixIcons";
import { StudioBadge } from "@/components/shared/workspace";
import { findCountryMetadata } from "@/lib/workspace/countryCatalog";
import type { BranchDto, CompanyDto } from "@/store/api/workspaceApi";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";

export interface WorkspaceOverviewPanelProps {
  isRtl: boolean;
  company: CompanyDto;
  branches: BranchDto[];
  onNavigate: (section: WorkspaceSectionId, subPage: string) => void;
  onOpenCommandPalette: () => void;
}

export function WorkspaceOverviewPanel({
  isRtl,
  company,
  branches,
  onNavigate,
  onOpenCommandPalette,
}: WorkspaceOverviewPanelProps) {
  const uniqueCurrencies = Array.from(
    new Set(branches.map((b) => b.currencyCode)),
  );

  const quickShortcuts: {
    label: string;
    key: string;
    section: WorkspaceSectionId;
    subPage: string;
  }[] = [
    {
      label: isRtl ? "الفروع واللوكيشنات" : "Locations",
      key: "G L",
      section: "settings",
      subPage: "locations",
    },
    {
      label: isRtl ? "بيانات الشركة" : "Company Profile",
      key: "G C",
      section: "settings",
      subPage: "company-profile",
    },
    {
      label: isRtl ? "أوامر الشراء PO" : "Purchase Orders",
      key: "G P",
      section: "fleet",
      subPage: "purchase-orders",
    },
    {
      label: isRtl ? "اعتمادات المالية" : "Finance Approvals",
      key: "G F",
      section: "finance",
      subPage: "approvals",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-revix-dark">
            {company.name}
          </h1>
          <p className="mt-0.5 text-[13px] text-revix-secondary">
            {company.legalName} ·{" "}
            {isRtl
              ? `العملة المرجعية: ${company.baseCurrency}`
              : `Reference currency: ${company.baseCurrency}`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("settings", "locations")}
          className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[6px] border border-revix-primary bg-revix-primary px-3 text-[13px] font-medium text-revix-white hover:bg-revix-primary-hover"
        >
          <RevixIcon name="plus" size={14} />
          <span>{isRtl ? "إدارة الفروع" : "Manage locations"}</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[8px] border border-revix-border bg-revix-white p-4">
          <p className="text-[12px] font-medium text-revix-secondary">
            {isRtl ? "الفروع النشطة" : "Active branches"}
          </p>
          <p className="mt-1 text-[24px] font-bold tabular-nums text-revix-dark">
            {branches.filter((b) => b.isActive).length}
          </p>
        </div>

        <div className="rounded-[8px] border border-revix-border bg-revix-white p-4">
          <p className="text-[12px] font-medium text-revix-secondary">
            {isRtl ? "عملات الفروع المسجلة" : "Branch currencies"}
          </p>
          <p
            dir="ltr"
            className="mt-1 text-start font-mono text-[20px] font-bold text-revix-primary"
          >
            {uniqueCurrencies.join(" · ")}
          </p>
        </div>

        <div className="rounded-[8px] border border-revix-border bg-revix-white p-4">
          <p className="text-[12px] font-medium text-revix-secondary">
            {isRtl ? "نموذج التشغيل" : "Operating mode"}
          </p>
          <p className="mt-1 text-[16px] font-bold text-revix-dark">
            {company.operatingMode === "network_main"
              ? isRtl
                ? "شركة رئيسية + شبكة محلية"
                : "Main Network Company"
              : isRtl
                ? "شركة مستقلة"
                : "Independent Company"}
          </p>
        </div>
      </div>

      {/* Independent Branch Currency List */}
      <div className="rounded-[8px] border border-revix-border bg-revix-white">
        <div className="flex items-center justify-between border-b border-revix-border bg-revix-surface/70 px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-revix-dark">
            {isRtl
              ? "فروع الشركة (كل فرع بعملة دولته المستقلة)"
              : "Company locations (independent branch currencies)"}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate("settings", "locations")}
            className="cursor-pointer text-[12px] font-semibold text-revix-primary hover:underline"
          >
            {isRtl ? "عرض الكل (G L)" : "View all (G L)"}
          </button>
        </div>
        <div className="divide-y divide-revix-border/80">
          {branches.map((branch) => {
            const meta = findCountryMetadata(branch.countryCode);
            return (
              <div
                key={branch.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-revix-dark">
                    {branch.name}{" "}
                    <span className="font-mono text-[12px] text-revix-secondary">
                      ({branch.code})
                    </span>
                  </p>
                  <p className="text-[12px] text-revix-secondary">
                    {meta
                      ? isRtl
                        ? meta.nameAr
                        : meta.nameEn
                      : branch.countryCode}{" "}
                    · {branch.city} · {branch.workingHours}
                  </p>
                </div>
                <StudioBadge variant="currency" dir="ltr">
                  {branch.currencyCode}
                </StudioBadge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shortcuts Quick Reference */}
      <div className="rounded-[8px] border border-revix-border bg-revix-surface/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-revix-dark">
            {isRtl ? "اختصارات لوحة المفاتيح السريعة" : "Quick keyboard shortcuts"}
          </p>
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="cursor-pointer text-[12px] font-semibold text-revix-primary hover:underline"
          >
            {isRtl ? "فتح البحث السريع (Ctrl+K)" : "Open palette (Ctrl+K)"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickShortcuts.map((sc) => (
            <button
              key={sc.key}
              type="button"
              onClick={() => onNavigate(sc.section, sc.subPage)}
              className="flex cursor-pointer items-center justify-between rounded-[6px] border border-revix-border bg-revix-white px-3 py-2 text-start text-[12px] hover:border-revix-primary/40 hover:bg-revix-tint/40"
            >
              <span className="truncate font-medium text-revix-dark">
                {sc.label}
              </span>
              <StudioBadge variant="kbd">{sc.key}</StudioBadge>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
