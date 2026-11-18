"use client";

import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { StudioBadge } from "@/components/shared/workspace/StudioBadge";
import type { AuthUserDto } from "@/store/api/authApi";
import type { BranchDto, CompanyDto } from "@/store/api/workspaceApi";

export interface StudioTopBarProps {
  isRtl: boolean;
  company: CompanyDto;
  user: AuthUserDto;
  branches: BranchDto[];
  activeBranch: BranchDto | null;
  isLoggingOut: boolean;
  onToggleMobileMenu: () => void;
  onGoHome: () => void;
  onGoCompanySettings: () => void;
  onSelectBranch: (branchId: string) => void;
  onOpenCommandPalette: () => void;
  onGoSecurity: () => void;
  onLogout: () => void;
}

export function StudioTopBar({
  isRtl,
  company,
  user,
  branches,
  activeBranch,
  isLoggingOut,
  onToggleMobileMenu,
  onGoHome,
  onGoCompanySettings,
  onSelectBranch,
  onOpenCommandPalette,
  onGoSecurity,
  onLogout,
}: StudioTopBarProps) {
  const userInitial = (user.fullName || user.email || "R")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="z-40 flex h-[48px] shrink-0 items-center justify-between gap-3 border-b border-revix-border bg-revix-white px-3">
      {/* Start: Brand / Company / Branch Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label={isRtl ? "فتح القائمة" : "Toggle menu"}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-revix-secondary hover:bg-revix-surface md:hidden"
        >
          <RevixIcon name="menu" size={18} />
        </button>

        <button
          type="button"
          onClick={onGoHome}
          aria-label="Revix System"
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[6px] bg-revix-primary text-revix-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: company.brandColor || "#14532D" }}
        >
          <RevixIcon name="car-front" size={15} />
        </button>

        <span className="select-none text-[14px] text-revix-border">/</span>

        <button
          type="button"
          onClick={onGoCompanySettings}
          className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] font-semibold text-revix-dark transition-colors hover:bg-revix-surface"
        >
          <RevixIcon
            name="building-2"
            size={14}
            className="shrink-0 text-revix-secondary"
          />
          <span className="max-w-[150px] truncate">{company.name}</span>
          <StudioBadge
            variant="neutral"
            className="hidden uppercase tracking-wide sm:inline-flex"
          >
            {company.operatingMode === "network_main"
              ? isRtl
                ? "شبكة شركات"
                : "NETWORK"
              : isRtl
                ? "مستقلة"
                : "INDEPENDENT"}
          </StudioBadge>
        </button>

        <span className="hidden select-none text-[14px] text-revix-border sm:inline">
          /
        </span>

        {activeBranch ? (
          <div className="hidden items-center gap-1.5 sm:flex">
            <RevixIcon
              name="map-pin"
              size={14}
              className="shrink-0 text-revix-primary"
            />
            <select
              aria-label={isRtl ? "اختيار الفرع النشط" : "Select active branch"}
              value={activeBranch.id}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="h-[30px] max-w-[210px] cursor-pointer rounded-[6px] border border-transparent bg-transparent pe-1 text-[13px] font-medium text-revix-dark transition-colors hover:border-revix-border hover:bg-revix-surface focus:border-revix-primary focus:outline-none"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code}) · {branch.currencyCode}
                </option>
              ))}
            </select>
            <StudioBadge variant="amber" dir="ltr" className="font-mono">
              {activeBranch.currencyCode}
            </StudioBadge>
          </div>
        ) : null}
      </div>

      {/* End: Search (Ctrl+K), Language Switcher, Profile & Logout */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex h-[32px] cursor-pointer items-center gap-2 rounded-full border border-revix-border bg-revix-surface/75 px-3 text-[12.5px] text-revix-secondary transition-colors hover:border-revix-primary/40 hover:bg-revix-white hover:text-revix-dark"
        >
          <RevixIcon name="search" size={13} />
          <span className="hidden sm:inline">
            {isRtl ? "بحث أو اختصار..." : "Search..."}
          </span>
          <StudioBadge variant="kbd">Ctrl K</StudioBadge>
        </button>

        <LanguageSwitcher />

        <button
          type="button"
          onClick={onGoSecurity}
          title={user.email}
          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border border-revix-primary/25 bg-revix-tint text-[12px] font-bold text-revix-primary transition-colors hover:bg-revix-primary hover:text-revix-white"
        >
          {userInitial}
        </button>

        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          title={isRtl ? "تسجيل الخروج" : "Log out"}
          aria-label={isRtl ? "تسجيل الخروج" : "Log out"}
          className="inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[6px] border border-revix-border bg-revix-white text-revix-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <RevixIcon name="log-out" size={14} />
        </button>
      </div>
    </header>
  );
}
