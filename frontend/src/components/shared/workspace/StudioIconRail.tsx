"use client";

import { useEffect, useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { StudioTooltip } from "@/components/shared/workspace/StudioTooltip";
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
  const [isExpandedStable, setIsExpandedStable] = useState(isPinned);

  useEffect(() => {
    if (isExpanded) {
      const timer = window.setTimeout(() => setIsExpandedStable(true), 210);
      return () => window.clearTimeout(timer);
    } else {
      setIsExpandedStable(false);
    }
  }, [isExpanded]);

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
          {sections.map((section) => {
            const isSelected = section.id === activeSection;
            const showDividerBefore =
              section.id === "team" || section.id === "settings";

            return (
              <div key={section.id}>
                {showDividerBefore ? (
                  <div className="my-2 border-t border-revix-border/80" />
                ) : null}
                <StudioTooltip
                  isRtl={isRtl}
                  side="end"
                  label={isRtl ? section.titleAr : section.titleEn}
                  shortcut={section.altShortcut}
                  disabled={!isExpandedStable}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSection(section.id)}
                    className={`group flex h-[38px] w-full cursor-pointer items-center rounded-[8px] px-2.5 transition-all duration-150 border-s-[3px] ${
                      isSelected
                        ? "border-[#14532D] bg-[#DCF2E4] font-bold text-[#14532D] shadow-xs"
                        : "border-transparent font-medium text-revix-secondary hover:border-[#10B981] hover:bg-[#EBF7EE] hover:text-[#14532D]"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
                        isSelected
                          ? "text-[#14532D]"
                          : "text-[#6B7280] group-hover:text-[#14532D]"
                      }`}
                    >
                      <RevixIcon name={section.icon} size={18} />
                    </span>

                    <span
                      className={`ms-2 flex min-w-0 flex-1 items-center justify-between whitespace-nowrap text-[13px] transition-opacity duration-150 ${
                        isExpanded
                          ? "opacity-100"
                          : "pointer-events-none opacity-0"
                      }`}
                    >
                      <span className="truncate">
                        {isRtl ? section.titleAr : section.titleEn}
                      </span>
                    </span>
                  </button>
                </StudioTooltip>
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
            className="group flex h-[36px] w-full cursor-pointer items-center rounded-[8px] px-2.5 text-revix-secondary transition-all duration-150 border-s-[3px] border-transparent hover:border-[#10B981]/60 hover:bg-[#EBF7EE] hover:text-[#14532D]"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[#6B7280] transition-colors group-hover:text-[#14532D]">
              <RevixIcon name="panel-left" size={17} />
            </span>
            <span
              className={`ms-2 truncate whitespace-nowrap text-[12px] font-medium transition-opacity duration-150 ${
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
