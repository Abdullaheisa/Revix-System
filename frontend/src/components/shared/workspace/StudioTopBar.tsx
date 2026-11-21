"use client";

import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";

import { StudioTooltip } from "@/components/shared/workspace/StudioTooltip";
import { CompanyBrandLogo } from "@/components/shared/workspace/CompanyBrandLogo";
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
  onGoSecurity?: () => void;
  onLogout: () => void;
}

export function StudioTopBar({ isRtl, company, branches, activeBranch, isLoggingOut, onToggleMobileMenu, onGoHome, onSelectBranch, onOpenCommandPalette, onLogout }: StudioTopBarProps) {
  return (
    <header className="z-40 flex h-[48px] shrink-0 items-center justify-between border-b border-revix-border bg-revix-white px-3 sm:px-4">
      {/* =================================================== */}
      {/* MOBILE HEADER (< md)                                */}
      {/* =================================================== */}
      <div className="flex w-full items-center justify-between gap-2 md:hidden">
        {/* Left: Menu trigger & Company Brand */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label={isRtl ? "فتح القائمة" : "Toggle menu"}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[7px] border border-revix-border bg-revix-white text-revix-dark active:bg-revix-surface"
          >
            <RevixIcon name="menu" size={17} />
          </button>

          <button
            type="button"
            onClick={onGoHome}
            aria-label={company.name}
            className="flex min-w-0 cursor-pointer items-center text-start transition-opacity hover:opacity-90"
          >
            <CompanyBrandLogo
              company={company}
              heightClassName="h-[28px]"
              maxWidthClassName="max-w-[140px] sm:max-w-[170px]"
              isRtl={isRtl}
            />
          </button>
        </div>

        {/* Right: Quick Search Button */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label={isRtl ? "بحث سريع" : "Quick search"}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-revix-border bg-revix-surface/75 text-revix-secondary hover:text-revix-dark hover:bg-revix-white"
          >
            <RevixIcon name="search" size={14} />
          </button>
        </div>
      </div>

      {/* =================================================== */}
      {/* DESKTOP HEADER (>= md)                              */}
      {/* =================================================== */}
      <div className="hidden min-w-0 items-center gap-2.5 md:flex">
        <button
          type="button"
          onClick={onGoHome}
          aria-label={company.name || "Revix System"}
          className="flex min-w-0 cursor-pointer items-center transition-opacity hover:opacity-90"
        >
          <CompanyBrandLogo
            company={company}
            heightClassName="h-[28px]"
            maxWidthClassName="max-w-[180px] lg:max-w-[220px]"
            isRtl={isRtl}
          />
        </button>

        <span className="select-none text-[14px] text-revix-border">/</span>

        {activeBranch ? (
          <div className="flex items-center gap-1.5">
            <RevixIcon
              name="map-pin"
              size={14}
              className="shrink-0 text-revix-primary"
            />
            <div className="w-[180px]">
              <RevixSelect
                size="sm"
                searchable={branches.length > 5}
                isRtl={isRtl}
                aria-label={isRtl ? "اختيار الفرع النشط" : "Select active branch"}
                value={activeBranch.id}
                onChange={(e) => onSelectBranch(e.target.value)}
                options={branches.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.code})`,
                  description: `${b.city} · ${b.currencyCode}`,
                }))}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop End Controls */}
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        <StudioTooltip
          isRtl={isRtl}
          side="bottom"
          label={isRtl ? "بحث سريع" : "Quick search"}
          shortcut="Ctrl K"
        >
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex h-[32px] cursor-pointer items-center gap-2 rounded-full border border-revix-border bg-revix-surface/75 px-3 text-[12.5px] text-revix-secondary transition-colors hover:border-revix-primary/40 hover:bg-revix-white hover:text-revix-dark"
          >
            <RevixIcon name="search" size={13} />
            <span>{isRtl ? "بحث..." : "Search..."}</span>
          </button>
        </StudioTooltip>

        <LanguageSwitcher />

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
