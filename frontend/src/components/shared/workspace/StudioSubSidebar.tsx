"use client";

import { StudioBadge } from "@/components/shared/workspace/StudioBadge";
import type { WorkspaceSectionConfig } from "@/lib/workspace/navigationCatalog";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";

export interface StudioSubSidebarProps {
  isRtl: boolean;
  section: WorkspaceSectionConfig;
  activeSubPage: string;
  onSelectSubPage: (section: WorkspaceSectionId, subPage: string) => void;
}

export function StudioSubSidebar({
  isRtl,
  section,
  activeSubPage,
  onSelectSubPage,
}: StudioSubSidebarProps) {
  return (
    <aside
      aria-label={isRtl ? "صفحات القسم" : "Section navigation"}
      className="hidden w-[236px] shrink-0 flex-col border-e border-revix-border bg-[#FAFAFA] md:flex"
    >
      <div className="flex h-[48px] shrink-0 items-center border-b border-revix-border/80 px-4">
        <h2 className="truncate text-[14px] font-semibold text-revix-dark">
          {isRtl ? section.titleAr : section.titleEn}
        </h2>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {section.groups.map((group) => (
          <div key={group.groupTitleEn}>
            <p className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-revix-disabled">
              {isRtl ? group.groupTitleAr : group.groupTitleEn}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isSubActive = item.id === activeSubPage;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectSubPage(section.id, item.id)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-[6px] px-2.5 py-1.5 text-start text-[13px] transition-colors ${
                        isSubActive
                          ? "bg-[#EBEBEB] font-semibold text-revix-dark"
                          : "font-medium text-revix-secondary hover:bg-revix-border/45 hover:text-revix-dark"
                      }`}
                    >
                      <span className="truncate">
                        {isRtl ? item.titleAr : item.titleEn}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {item.badgeEn ? (
                          <StudioBadge variant="amber" className="text-[9.5px] px-1.5 py-0">
                            {isRtl ? item.badgeAr : item.badgeEn}
                          </StudioBadge>
                        ) : null}
                        <StudioBadge variant="kbd" className="text-[9.5px] px-1 py-0 text-revix-disabled">
                          {item.shortcut}
                        </StudioBadge>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
