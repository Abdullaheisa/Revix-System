"use client";

import type { CompanyDto, WorkspaceMembershipDto } from "@/store/api/workspaceApi";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";
import { canAccessWorkspacePage } from "@/lib/workspace/navigationCatalog";
import {
  findDepartmentById,
  type DepartmentId,
} from "@/lib/workspace/departmentsCatalog";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface DepartmentHubPanelProps {
  isRtl: boolean;
  departmentId: DepartmentId;
  company: CompanyDto;
  membership: WorkspaceMembershipDto | null;
  onNavigate: (section: WorkspaceSectionId, subPage: string) => void;
  onBack: () => void;
}

export function DepartmentHubPanel({
  isRtl,
  departmentId,
  company,
  membership,
  onNavigate,
  onBack,
}: DepartmentHubPanelProps) {
  const department = findDepartmentById(departmentId);
  if (!department) return null;

  const accessibleModules = department.modules.filter((mod) =>
    canAccessWorkspacePage(
      mod.section,
      mod.subPage,
      company?.operatingMode,
      membership,
    ),
  );

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 py-3"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Department Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-revix-border bg-white px-5 py-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-white text-revix-dark transition-colors hover:border-[#14532D]/40 hover:bg-emerald-50/40 hover:text-[#14532D]"
            aria-label={isRtl ? "العودة إلى الإدارات" : "Back to Departments"}
            title={isRtl ? "العودة إلى الإدارات" : "Back to Departments"}
          >
            <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={16} />
          </button>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#14532D]">
            <RevixIcon name={department.icon} size={20} />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-revix-dark sm:text-xl">
                {isRtl ? department.titleAr : department.titleEn}
              </h1>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-[#14532D]">
                {isRtl ? "الإدارات" : "Department"}
              </span>
            </div>
            <p className="text-xs text-revix-muted sm:text-sm">
              {isRtl ? department.descAr : department.descEn}
            </p>
          </div>
        </div>
      </div>

      {/* Department Modules Grid */}
      {accessibleModules.length === 0 ? (
        <div className="rounded-xl border border-revix-border bg-white px-6 py-10 text-center text-sm text-revix-muted">
          {isRtl
            ? "لا توجد صفحات متاحة ضمن صلاحياتك في هذه الإدارة."
            : "No modules available for your role in this department."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accessibleModules.map((mod) => (
            <button
              key={`${mod.section}:${mod.subPage}`}
              type="button"
              onClick={() => onNavigate(mod.section, mod.subPage)}
              className="group flex cursor-pointer flex-col justify-between gap-3 rounded-xl border border-revix-border bg-white p-4 text-start transition-colors hover:border-[#14532D]/40 hover:bg-emerald-50/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#14532D] transition-colors group-hover:bg-[#14532D] group-hover:text-white">
                  <RevixIcon name={mod.icon} size={18} />
                </div>
                <div className="flex items-center gap-2">
                  {mod.isUpcoming && (
                    <span className="rounded-full border border-revix-border bg-revix-surface px-2 py-0.5 text-[10px] font-medium text-revix-muted">
                      {isRtl ? "قريباً" : "Planned"}
                    </span>
                  )}
                  <RevixIcon
                    name={isRtl ? "arrow-left" : "arrow-right"}
                    size={15}
                    className="text-revix-muted transition-colors group-hover:text-[#14532D]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-revix-dark group-hover:text-[#14532D]">
                  {isRtl ? mod.titleAr : mod.titleEn}
                </h2>
                <p className="line-clamp-2 text-xs leading-relaxed text-revix-muted">
                  {isRtl ? mod.descAr : mod.descEn}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
