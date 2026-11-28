"use client";

import type { AuthUserDto } from "@/store/api/authApi";
import type {
  BranchDto,
  CompanyDto,
  WorkspaceMembershipDto,
} from "@/store/api/workspaceApi";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";
import { canAccessWorkspacePage } from "@/lib/workspace/navigationCatalog";
import { WORKSPACE_DEPARTMENTS } from "@/lib/workspace/departmentsCatalog";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface WorkspaceWelcomePanelProps {
  isRtl: boolean;
  company: CompanyDto;
  activeBranch: BranchDto | null;
  user: AuthUserDto;
  membership: WorkspaceMembershipDto | null;
  onNavigate: (section: WorkspaceSectionId, subPage: string) => void;
}

export function WorkspaceWelcomePanel({
  isRtl,
  company,
  activeBranch,
  user,
  membership,
  onNavigate,
}: WorkspaceWelcomePanelProps) {
  const visibleDepartments = WORKSPACE_DEPARTMENTS.filter((dept) =>
    dept.modules.some((mod) =>
      canAccessWorkspacePage(mod.section, mod.subPage, company?.operatingMode, membership),
    ),
  );

  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 py-3"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Compact Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-revix-border bg-[#0d281c] px-5 py-5 text-white shadow-sm sm:px-7 sm:py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/welcome-hero-car.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-35"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#091f15]/90 via-[#0d281c]/65 to-[#0d281c]/55" />

        <div className="relative z-10 max-w-xl space-y-1">
          <p className="text-[11px] font-medium tracking-wide text-emerald-200/90">
            {company.name}
            {activeBranch ? ` · ${activeBranch.name}` : ""}
          </p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {isRtl
              ? `مرحباً بك في Revix، ${user.fullName}`
              : `Welcome to Revix, ${user.fullName}`}
          </h1>
          <p className="text-xs text-white/80">
            {isRtl
              ? "اختر الإدارة للانتقال إلى الأدوات والصفحات المخصصة لها."
              : "Choose a department below to open its dedicated workspace."}
          </p>
        </div>
      </section>

      {/* Departments Heading */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-revix-dark sm:text-lg">
          {isRtl ? "الإدارات" : "Departments"}
        </h2>
        <span className="rounded-full border border-revix-border bg-white px-2.5 py-0.5 text-xs font-medium text-revix-muted">
          {visibleDepartments.length}
        </span>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleDepartments.map((dept) => (
          <button
            key={dept.id}
            type="button"
            onClick={() => onNavigate("overview", dept.id)}
            className="group flex cursor-pointer items-center justify-between rounded-xl border border-revix-border bg-white px-4 py-4 text-start transition-colors hover:border-[#14532D]/40 hover:bg-emerald-50/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#14532D] transition-colors group-hover:bg-[#14532D] group-hover:text-white">
                <RevixIcon name={dept.icon} size={18} />
              </div>
              <div className="space-y-0.5">
                <span className="block text-sm font-semibold text-revix-dark group-hover:text-[#14532D]">
                  {isRtl ? dept.titleAr : dept.titleEn}
                </span>
                <span className="block text-xs text-revix-muted">
                  {isRtl ? dept.subtitleAr : dept.subtitleEn}
                </span>
              </div>
            </div>
            <RevixIcon
              name={isRtl ? "arrow-left" : "arrow-right"}
              size={15}
              className="shrink-0 text-revix-muted transition-colors group-hover:text-[#14532D]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
