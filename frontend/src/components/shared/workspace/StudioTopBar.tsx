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
            className="flex h-[34px] w-[210px] lg:w-[250px] cursor-pointer items-center justify-between gap-2 rounded-full border border-revix-border bg-revix-surface/75 px-3.5 text-[13px] text-revix-secondary transition-colors hover:border-revix-primary/40 hover:bg-revix-white hover:text-revix-dark"
          >
            <span className="flex items-center gap-2">
              <RevixIcon name="search" size={14} />
              <span>{isRtl ? "بحث سريع..." : "Quick search..."}</span>
            </span>
            <kbd className="hidden sm:inline-flex rounded border border-revix-border/80 bg-revix-white px-1.5 py-0.5 font-mono text-[10px] text-revix-secondary">
              Ctrl K
            </kbd>
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
