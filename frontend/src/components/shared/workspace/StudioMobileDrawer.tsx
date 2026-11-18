"use client";

import { RevixIcon } from "@/components/ui/RevixIcons";
import { StudioBadge } from "@/components/shared/workspace/StudioBadge";
import type { WorkspaceSectionConfig } from "@/lib/workspace/navigationCatalog";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";

export interface StudioMobileDrawerProps {
  isRtl: boolean;
  isOpen: boolean;
  companyName: string;
  sections: readonly WorkspaceSectionConfig[];
  activeSection: WorkspaceSectionId;
  activeSubPage: string;
  onClose: () => void;
  onSelectPage: (section: WorkspaceSectionId, subPage: string) => void;
}

export function StudioMobileDrawer({
  isRtl,
  isOpen,
  companyName,
  sections,
  activeSection,
  activeSubPage,
  onClose,
  onSelectPage,
}: StudioMobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-black/40 md:hidden"
      onClick={onClose}
    >
      <div
        className="flex h-full w-[280px] flex-col overflow-y-auto bg-revix-white p-4 shadow-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-revix-border pb-3">
          <span className="text-[14px] font-bold text-revix-dark">
            {companyName}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={isRtl ? "إغلاق" : "Close"}
            className="rounded p-1 text-revix-secondary hover:bg-revix-surface"
          >
            <RevixIcon name="close" size={16} />
          </button>
        </div>
        <div className="space-y-4">
          {sections.map((sec) => (
            <div key={sec.id}>
              <p className="mb-1 text-[11px] font-bold uppercase text-revix-disabled">
                {isRtl ? sec.titleAr : sec.titleEn}
              </p>
              <div className="space-y-0.5">
                {sec.groups
                  .flatMap((g) => g.items)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectPage(sec.id, item.id);
                        onClose();
                      }}
                      className={`flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-start text-[13px] ${
                        activeSection === sec.id && activeSubPage === item.id
                          ? "bg-revix-tint font-semibold text-revix-primary"
                          : "text-revix-dark hover:bg-revix-surface"
                      }`}
                    >
                      <span>{isRtl ? item.titleAr : item.titleEn}</span>
                      <StudioBadge variant="kbd">{item.shortcut}</StudioBadge>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
