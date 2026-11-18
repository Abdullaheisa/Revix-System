"use client";

import { useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { StudioBadge } from "@/components/shared/workspace/StudioBadge";
import type { WorkspaceSectionConfig } from "@/lib/workspace/navigationCatalog";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";

export interface StudioIconRailProps {
  isRtl: boolean;
  sections: readonly WorkspaceSectionConfig[];
  activeSection: WorkspaceSectionId;
  isPinned: boolean;
  onSelectSection: (sectionId: WorkspaceSectionId) => void;
  onTogglePin: () => void;
}

export function StudioIconRail({
  isRtl,
  sections,
  activeSection,
  isPinned,
  onSelectSection,
  onTogglePin,
}: StudioIconRailProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded = isHovered || isPinned;

  return (
    <div
      className={`relative hidden shrink-0 transition-[width] duration-200 md:block ${
        isPinned ? "w-[236px]" : "w-[52px]"
      }`}
    >
      <aside
        aria-label={isRtl ? "الأقسام الرئيسية" : "Primary sections"}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`absolute inset-y-0 start-0 z-30 flex flex-col justify-between border-e border-revix-border bg-revix-white transition-[width,box-shadow] duration-200 ease-out ${
          isExpanded
            ? "w-[236px] shadow-[6px_0_24px_-12px_rgba(17,24,39,0.18)] rtl:shadow-[-6px_0_24px_-12px_rgba(17,24,39,0.18)]"
            : "w-[52px]"
        }`}
      >
        <nav className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-1.5 py-2.5">
          {sections.map((section, idx) => {
            const isSelected = section.id === activeSection;
            const showDividerBefore = idx === 1 || idx === 5 || idx === 7;

            return (
              <div key={section.id}>
                {showDividerBefore ? (
                  <div className="my-2 border-t border-revix-border/80" />
                ) : null}
                <button
                  type="button"
                  onClick={() => onSelectSection(section.id)}
                  title={isRtl ? section.titleAr : section.titleEn}
                  className={`group flex h-[36px] w-full cursor-pointer items-center rounded-[6px] px-2 transition-colors ${
                    isSelected
                      ? "bg-[#EFEFEF] font-semibold text-revix-dark"
                      : "font-medium text-revix-secondary hover:bg-revix-surface hover:text-revix-dark"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                      isSelected
                        ? "text-revix-primary"
                        : "text-revix-secondary group-hover:text-revix-dark"
                    }`}
                  >
                    <RevixIcon name={section.icon} size={17} />
                  </span>

                  <span
                    className={`ms-2.5 flex min-w-0 flex-1 items-center justify-between gap-2 whitespace-nowrap text-[13px] transition-opacity duration-150 ${
                      isExpanded
                        ? "opacity-100"
                        : "pointer-events-none opacity-0"
                    }`}
                  >
                    <span className="truncate">
                      {isRtl ? section.titleAr : section.titleEn}
                    </span>
                    <StudioBadge variant="kbd" className="text-[9.5px]">
                      {section.altShortcut}
                    </StudioBadge>
                  </span>
                </button>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-revix-border/80 p-1.5">
          <button
            type="button"
            onClick={onTogglePin}
            title={
              isPinned
                ? isRtl
                  ? "إلغاء تثبيت القائمة (تفتح بالمرور)"
                  : "Unpin sidebar (expand on hover)"
                : isRtl
                  ? "تثبيت القائمة مفتوحة"
                  : "Pin sidebar open"
            }
            className="flex h-[34px] w-full cursor-pointer items-center rounded-[6px] px-2 text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              <RevixIcon name="panel-left" size={16} />
            </span>
            <span
              className={`ms-2.5 truncate whitespace-nowrap text-[12px] font-medium transition-opacity duration-150 ${
                isExpanded ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {isPinned
                ? isRtl
                  ? "إلغاء التثبيت (فتح بالـ Hover)"
                  : "Collapse to hover rail"
                : isRtl
                  ? "تثبيت الشريط مفتوحًا"
                  : "Keep sidebar open"}
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
