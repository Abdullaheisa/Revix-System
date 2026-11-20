"use client";

import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { StudioBadge } from "@/components/shared/workspace/StudioBadge";
import { CompanyBrandLogo } from "@/components/shared/workspace/CompanyBrandLogo";
import type { WorkspaceSectionConfig } from "@/lib/workspace/navigationCatalog";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";
import type { AuthUserDto } from "@/store/api/authApi";
import type { BranchDto, CompanyDto } from "@/store/api/workspaceApi";

export interface StudioMobileDrawerProps {
  isRtl: boolean;
  isOpen: boolean;
  company: CompanyDto;
  user: AuthUserDto;
  branches: BranchDto[];
  activeBranch: BranchDto | null;
  sections: readonly WorkspaceSectionConfig[];
  activeSection: WorkspaceSectionId;
  activeSubPage: string;
  isLoggingOut?: boolean;
  onClose: () => void;
  onSelectPage: (section: WorkspaceSectionId, subPage: string) => void;
  onSelectBranch: (branchId: string) => void;
  onGoCompanySettings: () => void;
  onGoSecurity: () => void;
  onLogout: () => void;
}

export function StudioMobileDrawer({
  isRtl,
  isOpen,
  company,
  user,
  branches,
  activeBranch,
  sections,
  activeSection,
  activeSubPage,
  isLoggingOut = false,
  onClose,
  onSelectPage,
  onSelectBranch,
  onGoCompanySettings,
  onGoSecurity,
  onLogout,
}: StudioMobileDrawerProps) {
  const [expandedSection, setExpandedSection] =
    useState<WorkspaceSectionId>(activeSection);

  // Sync expanded section with active section whenever activeSection changes
  useEffect(() => {
    setExpandedSection(activeSection);
  }, [activeSection]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const userInitial = (user.fullName || user.email || "R")
    .trim()
    .charAt(0)
    .toUpperCase();

  function toggleSection(secId: WorkspaceSectionId) {
    setExpandedSection((prev) => (prev === secId ? ("" as WorkspaceSectionId) : secId));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-xs transition-opacity duration-200 md:hidden"
      onClick={onClose}
    >
      <div
        className="flex h-full w-[88vw] max-w-[320px] flex-col bg-revix-white shadow-dialog transition-transform duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top: Company Header & Close Button */}
        <div className="flex items-center justify-between border-b border-revix-border px-4 py-3.5">
          <button
            type="button"
            onClick={() => {
              onGoCompanySettings();
              onClose();
            }}
            className="flex min-w-0 flex-col items-start gap-1 text-start cursor-pointer"
          >
            <CompanyBrandLogo
              company={company}
              heightClassName="h-[28px]"
              maxWidthClassName="max-w-[170px]"
              isRtl={isRtl}
            />
            <StudioBadge
              variant="neutral"
              className="text-[9.5px] px-1.5 py-0 uppercase"
            >
              {company.operatingMode === "network_main"
                ? isRtl
                  ? "شبكة شركات"
                  : "NETWORK"
                : company.operatingMode === "local_partner"
                ? isRtl
                  ? "شريك محلي"
                  : "LOCAL PARTNER"
                : isRtl
                  ? "مستقلة"
                  : "INDEPENDENT"}
            </StudioBadge>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label={isRtl ? "إغلاق" : "Close"}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[6px] text-revix-secondary hover:bg-revix-surface hover:text-revix-dark"
          >
            <RevixIcon name="close" size={17} />
          </button>
        </div>

        {/* Scrollable Main Body */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
          {/* Active Branch Switcher (Mobile) */}
          {activeBranch && branches.length > 0 ? (
            <div className="rounded-[8px] border border-revix-border/80 bg-revix-surface/50 p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-revix-secondary">
                <span className="flex items-center gap-1.5">
                  <RevixIcon
                    name="map-pin"
                    size={12}
                    className="text-revix-primary"
                  />
                  {isRtl ? "الفرع الحالي النشط" : "Active Location"}
                </span>
              </div>
              <RevixSelect
                size="sm"
                isRtl={isRtl}
                value={activeBranch.id}
                onChange={(e) => onSelectBranch(e.target.value)}
                options={branches.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.code})`,
                  description: `${b.city} · ${b.currencyCode}`,
                }))}
              />
            </div>
          ) : null}

          {/* Clean Accordion-Based Navigation Modules */}
          <div>
            <p className="mb-1.5 px-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-revix-disabled">
              {isRtl ? "أقسام المنظومة" : "Workspace Modules"}
            </p>
            <div className="space-y-1">
              {sections.map((sec) => {
                const isSelectedSection = activeSection === sec.id;
                const isExpanded = expandedSection === sec.id;
                const allItems = sec.groups.flatMap((g) => g.items);

                return (
                  <div
                    key={sec.id}
                    className="overflow-hidden rounded-[7px] border border-transparent transition-colors"
                  >
                    {/* Section Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-[7px] px-2.5 py-2 text-start text-[13.5px] font-medium transition-colors ${
                        isSelectedSection
                          ? "bg-revix-surface/80 font-semibold text-revix-dark"
                          : "text-revix-dark hover:bg-revix-surface/50"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                            isSelectedSection
                              ? "text-revix-primary"
                              : "text-revix-secondary"
                          }`}
                        >
                          <RevixIcon name={sec.icon} size={16} />
                        </span>
                        <span className="truncate">
                          {isRtl ? sec.titleAr : sec.titleEn}
                        </span>
                      </span>

                      <span
                        className={`text-revix-secondary transition-transform duration-200 ${
                          isExpanded ? "rotate-180 text-revix-primary" : ""
                        }`}
                      >
                        <RevixIcon name="chevron-down" size={13} />
                      </span>
                    </button>

                    {/* Sub-items (expanded accordion) */}
                    {isExpanded ? (
                      <div className="mt-0.5 space-y-0.5 ps-7 pe-1 pb-1">
                        {allItems.map((item) => {
                          const isSubActive =
                            isSelectedSection && activeSubPage === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                onSelectPage(sec.id, item.id);
                                onClose();
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-1.5 text-start text-[12.5px] transition-colors ${
                                isSubActive
                                  ? "bg-revix-tint font-semibold text-revix-primary"
                                  : "text-revix-secondary hover:bg-revix-surface hover:text-revix-dark"
                              }`}
                            >
                              <span className="truncate">
                                {isRtl ? item.titleAr : item.titleEn}
                              </span>
                              {item.badgeEn ? (
                                <StudioBadge
                                  variant="amber"
                                  className="text-[9px] px-1 py-0"
                                >
                                  {isRtl ? item.badgeAr : item.badgeEn}
                                </StudioBadge>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Drawer Footer: Profile & Actions */}
        <div className="border-t border-revix-border bg-revix-surface/30 p-3 space-y-2.5">
          {/* User profile row */}
          <div className="flex items-center justify-between gap-2 rounded-[7px] border border-revix-border/70 bg-revix-white p-2">
            <button
              type="button"
              onClick={() => {
                onGoSecurity();
                onClose();
              }}
              className="flex min-w-0 items-center gap-2 text-start cursor-pointer"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-revix-primary/25 bg-revix-tint text-[11.5px] font-bold text-revix-primary">
                {userInitial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-revix-dark">
                  {user.fullName || "User"}
                </p>
                <p className="truncate text-[11px] text-revix-secondary">
                  {user.email}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                onGoSecurity();
                onClose();
              }}
              aria-label={isRtl ? "إعدادات الأمان" : "Security settings"}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-revix-secondary hover:bg-revix-surface hover:text-revix-dark"
            >
              <RevixIcon name="settings" size={14} />
            </button>
          </div>

          {/* Language Switcher row */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-medium text-revix-secondary">
              {isRtl ? "اللغة:" : "Language:"}
            </span>
            <LanguageSwitcher />
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-red-200 bg-red-50/75 py-2 text-[12.5px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            <RevixIcon name="log-out" size={14} />
            <span>
              {isLoggingOut
                ? isRtl
                  ? "جاري الخروج..."
                  : "Logging out..."
                : isRtl
                  ? "تسجيل الخروج"
                  : "Log out"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
