"use client";

import { StudioBadge } from "@/components/shared/workspace";
import type { WorkspaceSubPageItem } from "@/lib/workspace/navigationCatalog";
import type { BranchDto, CompanyDto } from "@/store/api/workspaceApi";

export interface UpcomingModuleBlueprintProps {
  isRtl: boolean;
  company: CompanyDto;
  activeBranch: BranchDto | null;
  subPage: WorkspaceSubPageItem | undefined;
}

export function UpcomingModuleBlueprint({
  isRtl,
  company,
  activeBranch,
  subPage,
}: UpcomingModuleBlueprintProps) {
  return (
    <div className="max-w-[760px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold text-revix-dark">
              {subPage ? (isRtl ? subPage.titleAr : subPage.titleEn) : ""}
            </h1>
            {subPage?.badgeEn ? (
              <StudioBadge variant="amber">
                {isRtl ? subPage.badgeAr : subPage.badgeEn}
              </StudioBadge>
            ) : null}
          </div>
          <p className="mt-1 text-[13.5px] text-revix-secondary">
            {subPage ? (isRtl ? subPage.descAr : subPage.descEn) : ""}
          </p>
        </div>
      </div>

      <div className="rounded-[8px] border border-revix-border bg-revix-surface/55 p-5">
        <p className="text-[13.5px] font-semibold text-revix-dark">
          {isRtl
            ? "هذا القسم مهيأ ضمن الخطة المرحلية المعتمدة"
            : "Scheduled in the confirmed phased roadmap"}
        </p>
        <p className="mt-1.5 text-[13px] leading-[1.6] text-revix-secondary">
          {isRtl
            ? `نطاق العمل النشط حاليًا: شركة "${company.name}" — الفرع: "${activeBranch?.name ?? "—"}" بعملة (${activeBranch?.currencyCode ?? company.baseCurrency}). سيتم ربط جداول وعمليات هذا القسم في مرحلته المحددة مع الحفاظ على نفس التصميم والاختصارات.`
            : `Active tenant scope: "${company.name}" — Branch: "${activeBranch?.name ?? "—"}" (${activeBranch?.currencyCode ?? company.baseCurrency}). This module's backend tables and workflows will be connected in its dedicated phase using this exact workspace layout.`}
        </p>
      </div>
    </div>
  );
}
