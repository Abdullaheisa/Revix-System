"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";
import { buildWorkspaceHref, type WorkspaceSectionConfig, type WorkspaceSubPageItem } from "@/lib/workspace/navigationCatalog";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";

export interface StudioSmartSidebarProps {
  isRtl: boolean;
  isOpen: boolean;
  onClose: () => void;
  sections: readonly WorkspaceSectionConfig[];
  activeSection: WorkspaceSectionId;
  activeSubPage: string;
  onSelectSubPage: (sectionId: WorkspaceSectionId, subPageId: string) => void;
}

interface UnifiedNavEntry {
  sectionId: WorkspaceSectionId;
  sectionIcon: RevixIconName;
  item: WorkspaceSubPageItem;
}

interface UnifiedNavGroup {
  id: string;
  titleAr: string;
  titleEn: string;
  entries: UnifiedNavEntry[];
}

function getSubPageIcon(subPageId: string, fallback: RevixIconName): RevixIconName {
  switch (subPageId) {
    case "summary":
      return "layout-dashboard";
    case "movements":
    case "colors":
    case "models":
    case "variants":
    case "drivers":
    case "price-list":
    case "body-styles":
      return "plus";
    case "vehicles":
    case "add-vehicle":
      return "file-text";
    case "fleet-live":
      return "car-front";
    case "vehicle-photos":
      return "eye";
    case "vendors":
      return "shopping-bag";
    case "insurance-companies":
      return "shield-check";
    case "purchase-orders":
    case "rental-contracts":
      return "file-text";
    case "rental-inclusions":
      return "check-circle-2";
    case "customers":
    case "members":
    case "roles":
      return "users-round";
    case "locations":
      return "map-pin";
    case "company-profile":
      return "building-2";
    case "security":
      return "shield";
    case "local-companies":
    case "network-links":
    case "partner-network":
      return "network";
    default:
      return fallback;
  }
}

function cleanGroupTitle(title: string): string {
  return title.replace(/^[0-9٠-٩]+\s*[\.\-\)]\s*/, "").trim();
}

export function StudioSmartSidebar({
  isRtl,
  isOpen,
  onClose,
  sections,
  activeSection,
  activeSubPage,
  onSelectSubPage,
}: StudioSmartSidebarProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  // Close sheet on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchQuery("");
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Focus search input gently when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 90);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // Build unified, cohesive groups across ALL permitted sections in one place
  const unifiedGroups = useMemo<UnifiedNavGroup[]>(() => {
    const groups: UnifiedNavGroup[] = [];
    const workspaceAndTeamEntries: UnifiedNavEntry[] = [];
    const settingsEntries: UnifiedNavEntry[] = [];

    for (const sec of sections) {
      if (sec.id === "overview" || sec.id === "network" || sec.id === "team") {
        for (const grp of sec.groups) {
          for (const item of grp.items) {
            workspaceAndTeamEntries.push({
              sectionId: sec.id,
              sectionIcon: sec.icon,
              item,
            });
          }
        }
        continue;
      }

      if (sec.id === "settings") {
        for (const grp of sec.groups) {
          for (const item of grp.items) {
            settingsEntries.push({
              sectionId: sec.id,
              sectionIcon: sec.icon,
              item,
            });
          }
        }
        continue;
      }

      for (const grp of sec.groups) {
        groups.push({
          id: `${sec.id}:${grp.groupTitleEn}`,
          titleAr: cleanGroupTitle(grp.groupTitleAr),
          titleEn: cleanGroupTitle(grp.groupTitleEn),
          entries: grp.items.map((item) => ({
            sectionId: sec.id,
            sectionIcon: sec.icon,
            item,
          })),
        });
      }
    }

    if (workspaceAndTeamEntries.length > 0) {
      groups.push({
        id: "unified:workspace-team",
        titleAr: "الإدارة وفريق العمل",
        titleEn: "WORKSPACE & TEAM",
        entries: workspaceAndTeamEntries,
      });
    }

    if (settingsEntries.length > 0) {
      groups.push({
        id: "unified:settings-security",
        titleAr: "إعدادات الشركة والأمان",
        titleEn: "COMPANY & SECURITY",
        entries: settingsEntries,
      });
    }

    return groups;
  }, [sections]);

  const handleNavigate = (sectionId: WorkspaceSectionId, subPageId: string) => {
    onSelectSubPage(sectionId, subPageId);
    setSearchQuery("");
    onClose();
  };

  // Instant search across all unified entries
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const results: UnifiedNavEntry[] = [];
    for (const grp of unifiedGroups) {
      for (const entry of grp.entries) {
        const hay =
          `${entry.item.titleAr} ${entry.item.titleEn} ${grp.titleAr} ${grp.titleEn}`.toLowerCase();
        if (hay.includes(q)) {
          results.push(entry);
        }
      }
    }
    return results;
  }, [searchQuery, unifiedGroups]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle Frosted Dismiss Backdrop below TopBar */}
          <motion.div
            key="revix-spatial-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            onClick={handleClose}
            aria-hidden="true"
            className="fixed inset-x-0 top-[48px] bottom-0 z-30 hidden md:block bg-revix-dark/12 backdrop-blur-[2px]"
          />

          {/* Floating Top-Anchored Unified Sheet */}
          <motion.section
            key="revix-spatial-sheet"
            role="dialog"
            aria-label={isRtl ? "قائمة صفحات النظام" : "Workspace navigation"}
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 420, damping: 34, mass: 0.85 }
            }
            className="fixed top-[58px] start-4 z-40 hidden w-[min(1060px,calc(100vw-32px))] max-h-[calc(100dvh-74px)] md:flex flex-col overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.18)]"
          >
            {/* Header: Search Bar + Close Button on one clean row */}
            <div className="flex shrink-0 items-center gap-3 border-b border-revix-border/80 bg-revix-surface/40 px-5 py-3.5">
              <div className="relative flex-1">
                <RevixIcon
                  name="search"
                  size={15}
                  className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-revix-secondary"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRtl ? "ابحث في كل الصفحات..." : "Search all pages..."}
                  className="w-full rounded-xl border border-revix-border bg-revix-white py-2 ps-9.5 pe-8 text-[13px] text-revix-dark placeholder:text-revix-secondary/75 focus:border-revix-primary focus:outline-none focus:ring-2 focus:ring-revix-primary/15"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={isRtl ? "مسح البحث" : "Clear search"}
                    className="absolute top-1/2 end-2.5 -translate-y-1/2 cursor-pointer rounded p-0.5 text-revix-secondary hover:text-revix-dark"
                  >
                    <RevixIcon name="x" size={13} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label={isRtl ? "إغلاق" : "Close"}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-revix-border bg-revix-white text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark"
              >
                <RevixIcon name="x" size={16} />
              </button>
            </div>

            {/* Unified Multi-Column Grid: All Groups Together */}
            <div className="flex-1 overflow-y-auto p-4.5">
              {searchMatches ? (
                searchMatches.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                    <div className="flex size-11 items-center justify-center rounded-full bg-revix-surface text-revix-secondary">
                      <RevixIcon name="search" size={18} />
                    </div>
                    <p className="text-[13.5px] font-semibold text-revix-dark">
                      {isRtl ? "لا توجد صفحات مطابقة لبحثك" : "No matching pages found"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {searchMatches.map(({ sectionId, sectionIcon, item }) => {
                      const isActive =
                        sectionId === activeSection && item.id === activeSubPage;
                      const iconName = getSubPageIcon(item.id, sectionIcon);
                      return (
                        <button
                          key={`${sectionId}:${item.id}`}
                          type="button"
                          onClick={() => handleNavigate(sectionId, item.id)}
                          className={`group/row flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-all ${
                            isActive
                              ? "border-revix-primary/35 bg-revix-accent-soft"
                              : "border-revix-border/80 bg-revix-white hover:border-revix-primary/25 hover:bg-revix-accent-soft/80"
                          }`}
                        >
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isActive
                                ? "bg-revix-primary text-white"
                                : "bg-emerald-50/80 text-revix-primary/80 group-hover/row:bg-revix-white group-hover/row:text-revix-primary"
                            }`}
                          >
                            <RevixIcon name={iconName} size={15} />
                          </span>
                          <p
                            className={`min-w-0 flex-1 truncate text-[13px] transition-colors ${
                              isActive
                                ? "font-bold text-revix-primary"
                                : "font-semibold text-revix-dark group-hover/row:text-revix-primary"
                            }`}
                          >
                            {isRtl ? item.titleAr : item.titleEn}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="columns-1 gap-3.5 md:columns-2 lg:columns-3">
                  {unifiedGroups.map((group, groupIdx) => {
                    const stepNumber = String(groupIdx + 1).padStart(2, "0");

                    return (
                      <div
                        key={group.id}
                        className="mb-3.5 flex break-inside-avoid flex-col rounded-xl border border-emerald-900/10 bg-emerald-50/35 p-3"
                      >
                        {/* Group Header */}
                        <div className="mb-2 flex items-center gap-2 border-b border-revix-border/60 pb-2">
                          <span className="inline-flex h-5 min-w-[24px] items-center justify-center rounded-md bg-revix-primary/10 px-1.5 font-mono text-[10.5px] font-bold text-revix-primary">
                            {stepNumber}
                          </span>
                          <h3 className="text-[12.5px] font-bold text-revix-dark">
                            {isRtl ? group.titleAr : group.titleEn}
                          </h3>
                        </div>

                        {/* Group Items */}
                        <div className="space-y-1">
                          {group.entries.map(({ sectionId, sectionIcon, item }) => {
                            const isActive =
                              sectionId === activeSection && item.id === activeSubPage;
                            const iconName = getSubPageIcon(item.id, sectionIcon);
                            const isEmeraldBadge =
                              item.id === "add-vehicle" || item.id === "vehicles";
                            const href = `/${isRtl ? "ar" : "en"}${buildWorkspaceHref(sectionId, item.id)}`;

                            return (
                              <div
                                key={`${sectionId}:${item.id}`}
                                className={`group/row flex w-full items-center gap-1 rounded-xl border pe-2 transition-all ${
                                  isActive
                                    ? "border-revix-primary/30 bg-revix-accent-soft shadow-xs"
                                    : "border-transparent bg-transparent hover:border-revix-primary/25 hover:bg-revix-accent-soft/80"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleNavigate(sectionId, item.id)}
                                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-start"
                                >
                                  <span
                                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                      isActive
                                        ? "bg-revix-primary text-white"
                                          : isEmeraldBadge
                                            ? "bg-revix-accent-soft text-revix-primary"
                                            : "bg-emerald-50/80 text-revix-primary/85 group-hover/row:bg-revix-white group-hover/row:text-revix-primary"
                                    }`}
                                  >
                                    <RevixIcon name={iconName} size={15} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`text-[13px] leading-snug transition-colors ${
                                        isActive
                                          ? "font-bold text-revix-primary"
                                          : "font-semibold text-revix-dark group-hover/row:text-revix-primary"
                                      }`}
                                    >
                                      {isRtl ? item.titleAr : item.titleEn}
                                    </p>
                                  </div>
                                </button>

                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title={isRtl ? "فتح في تبويب جديد" : "Open in new tab"}
                                  aria-label={isRtl ? "فتح في تبويب جديد" : "Open in new tab"}
                                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-revix-secondary/75 transition-colors hover:bg-revix-white hover:text-revix-primary"
                                >
                                  <RevixIcon name="arrow-up-right" size={14} />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
