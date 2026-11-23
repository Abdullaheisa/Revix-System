"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";
import { StudioTooltip } from "@/components/shared/workspace/StudioTooltip";
import type {
  WorkspaceSectionConfig,
  WorkspaceSubPageItem,
} from "@/lib/workspace/navigationCatalog";
import type { WorkspaceSectionId } from "@/store/slices/workspaceSlice";

export interface StudioSmartSidebarProps {
  isRtl: boolean;
  sections: readonly WorkspaceSectionConfig[];
  activeSection: WorkspaceSectionId;
  activeSubPage: string;
  isCollapsed?: boolean;
  onSelectSection: (sectionId: WorkspaceSectionId) => void;
  onSelectSubPage: (sectionId: WorkspaceSectionId, subPageId: string) => void;
  onToggleCollapse?: () => void;
}

function getShortModuleLabel(section: WorkspaceSectionConfig, isRtl: boolean): string {
  if (!isRtl) {
    switch (section.id) {
      case "overview":
        return "Home";
      case "sales":
        return "Sales";
      case "fleet":
        return "Fleet";
      case "operations":
        return "Ops";
      case "finance":
        return "Finance";
      case "network":
        return "Network";
      case "team":
        return "Team";
      case "settings":
        return "Settings";
      default:
        return section.titleEn.split(" ")[0] ?? section.titleEn;
    }
  }
  switch (section.id) {
    case "overview":
      return "الرئيسية";
    case "sales":
      return "المبيعات";
    case "fleet":
      return "الأسطول";
    case "operations":
      return "التشغيل";
    case "finance":
      return "المالية";
    case "network":
      return "الشبكة";
    case "team":
      return "الفريق";
    case "settings":
      return "الإعدادات";
    default:
      return section.titleAr.split(" ")[0] ?? section.titleAr;
  }
}

function getSubPageIcon(subPageId: string, fallback: RevixIconName): RevixIconName {
  switch (subPageId) {
    case "summary":
      return "layout-dashboard";
    case "variants":
      return "layers";
    case "vehicles":
    case "fleet-live":
      return "car-front";
    case "add-vehicle":
      return "plus";
    case "vehicle-photos":
      return "eye";
    case "vendors":
      return "shopping-bag";
    case "insurance-companies":
      return "shield-check";
    case "purchase-orders":
    case "rental-contracts":
      return "file-text";
    case "price-list":
      return "wallet";
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
    case "network-links":
    case "partner-network":
      return "network";
    default:
      return fallback;
  }
}

function cleanGroupTitle(title: string): string {
  // Remove leading Arabic/Latin numbering like "١. " or "1. " because we render a dedicated step badge
  return title.replace(/^[0-9٠-٩]+\s*[\.\-\)]\s*/, "").trim();
}

export function StudioSmartSidebar({
  isRtl,
  sections,
  activeSection,
  activeSubPage,
  onSelectSection,
  onSelectSubPage,
}: StudioSmartSidebarProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [openSheetSection, setOpenSheetSection] = useState<WorkspaceSectionId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Close sheet on Escape
  useEffect(() => {
    if (!openSheetSection) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenSheetSection(null);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSheetSection]);

  // Focus search input gently when sheet opens
  useEffect(() => {
    if (!openSheetSection) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 90);
    return () => window.clearTimeout(timer);
  }, [openSheetSection]);

  const sheetSection = useMemo(
    () => sections.find((s) => s.id === openSheetSection) ?? null,
    [sections, openSheetSection],
  );

  const handleRailModuleClick = (sec: WorkspaceSectionConfig) => {
    const totalItems = sec.groups.reduce((sum, g) => sum + g.items.length, 0);
    // Single-page modules navigate immediately without opening a sheet
    if (totalItems <= 1) {
      setOpenSheetSection(null);
      setSearchQuery("");
      onSelectSection(sec.id);
      return;
    }
    // Toggle sheet if clicking the currently open module, otherwise switch sheet to it
    setSearchQuery("");
    setOpenSheetSection((prev) => (prev === sec.id ? null : sec.id));
  };

  const handleNavigate = (sectionId: WorkspaceSectionId, subPageId: string) => {
    onSelectSubPage(sectionId, subPageId);
    setOpenSheetSection(null);
    setSearchQuery("");
  };

  // Global cross-module search when user types in sheet search bar
  const globalSearchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const results: Array<{
      section: WorkspaceSectionConfig;
      groupTitle: string;
      item: WorkspaceSubPageItem;
    }> = [];
    for (const sec of sections) {
      for (const grp of sec.groups) {
        for (const item of grp.items) {
          const hay =
            `${item.titleAr} ${item.titleEn} ${item.descAr} ${item.descEn} ${sec.titleAr} ${sec.titleEn} ${grp.groupTitleAr} ${grp.groupTitleEn}`.toLowerCase();
          if (hay.includes(q)) {
            results.push({
              section: sec,
              groupTitle: cleanGroupTitle(isRtl ? grp.groupTitleAr : grp.groupTitleEn),
              item,
            });
          }
        }
      }
    }
    return results;
  }, [searchQuery, sections, isRtl]);

  const sheetSlideOffset = isRtl ? 20 : -20;

  // Dynamic column layout based on number of groups in the open section
  const groupCount = sheetSection?.groups.length ?? 1;
  const gridColsClass =
    groupCount === 1
      ? "grid-cols-1"
      : groupCount === 2
        ? "grid-cols-1 md:grid-cols-2"
        : groupCount === 3
          ? "grid-cols-1 md:grid-cols-3"
          : "grid-cols-1 md:grid-cols-2";

  const sheetWidthClass =
    groupCount === 1
      ? "w-[min(460px,calc(100vw-96px))]"
      : groupCount === 3
        ? "w-[min(940px,calc(100vw-96px))]"
        : "w-[min(800px,calc(100vw-96px))]";

  return (
    <>
      {/* ================================================================== */}
      {/* 1. ULTRA-SLIM ZERO-SCROLL LAUNCH RAIL (76px)                       */}
      {/* ================================================================== */}
      <aside
        aria-label={isRtl ? "شريط الوحدات" : "Workspace modules"}
        className="relative z-40 hidden md:flex w-[76px] shrink-0 flex-col items-center justify-between border-e border-revix-border bg-revix-white py-3 select-none"
      >
        {/* Top: Module Navigation Tiles */}
        <nav className="flex w-full flex-col items-center gap-1.5 px-1.5" aria-label={isRtl ? "الأقسام الرئيسية" : "Main sections"}>
          {sections.map((sec) => {
            const isCurrentRoute = sec.id === activeSection;
            const isSheetOpenForSec = openSheetSection === sec.id;
            const isHighlighted = isSheetOpenForSec || (openSheetSection === null && isCurrentRoute);
            const totalItems = sec.groups.reduce((sum, g) => sum + g.items.length, 0);

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleRailModuleClick(sec)}
                aria-expanded={totalItems > 1 ? isSheetOpenForSec : undefined}
                aria-current={isCurrentRoute ? "page" : undefined}
                className={`group relative flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors ${
                  isHighlighted
                    ? "text-revix-primary"
                    : "text-revix-secondary hover:bg-revix-surface/70 hover:text-revix-dark"
                }`}
              >
                {/* Active / Open Edge Accent Pill */}
                {isHighlighted && (
                  <motion.span
                    layoutId="revix-rail-active-bar"
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
                    className={`absolute inset-y-2 w-[3px] rounded-full bg-revix-primary ${
                      isRtl ? "end-0" : "start-0"
                    }`}
                  />
                )}

                <span
                  className={`relative flex size-9 items-center justify-center rounded-xl transition-all ${
                    isSheetOpenForSec
                      ? "bg-revix-primary text-white shadow-sm ring-2 ring-revix-primary/20"
                      : isCurrentRoute
                        ? "bg-revix-accent-soft text-revix-primary"
                        : "bg-transparent text-revix-secondary group-hover:bg-revix-surface group-hover:text-revix-dark"
                  }`}
                >
                  <RevixIcon name={sec.icon} size={18} />
                  {/* Subtle dot on multi-page modules to signal expandable shelf */}
                  {totalItems > 1 && !isSheetOpenForSec && (
                    <span
                      className={`absolute -bottom-0.5 size-1.5 rounded-full border border-revix-white ${
                        isCurrentRoute ? "bg-revix-primary" : "bg-revix-border group-hover:bg-revix-secondary"
                      }`}
                    />
                  )}
                </span>

                <span className="max-w-full truncate text-[10.5px] font-semibold leading-tight">
                  {getShortModuleLabel(sec, isRtl)}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: System Map Trigger */}
        <div className="flex w-full flex-col items-center gap-2 px-1.5">
          {/* Quick Open Current Module Shelf Button */}
          <StudioTooltip
            isRtl={isRtl}
            side="end"
            label={isRtl ? "خريطة الصفحات" : "All pages"}
          >
            <button
              type="button"
              onClick={() => {
                if (openSheetSection) {
                  setOpenSheetSection(null);
                  setSearchQuery("");
                } else {
                  const firstMulti =
                    sections.find((s) => s.id === activeSection && s.groups.reduce((a, g) => a + g.items.length, 0) > 1) ??
                    sections.find((s) => s.groups.reduce((a, g) => a + g.items.length, 0) > 1) ??
                    sections[0];
                  if (firstMulti) setOpenSheetSection(firstMulti.id);
                }
              }}
              aria-label={isRtl ? "خريطة الصفحات" : "All pages"}
              className={`flex size-9 cursor-pointer items-center justify-center rounded-xl border transition-colors ${
                openSheetSection
                  ? "border-revix-primary bg-revix-primary text-white"
                  : "border-revix-border bg-revix-surface/60 text-revix-secondary hover:bg-revix-surface hover:text-revix-dark"
              }`}
            >
              <RevixIcon name={openSheetSection ? "x" : "layers"} size={16} />
            </button>
          </StudioTooltip>
        </div>
      </aside>

      {/* ================================================================== */}
      {/* 2. EDGE-ANCHORED SPATIAL RIBBON SHEET (Original Revix Signature)   */}
      {/* ================================================================== */}
      <AnimatePresence>
        {openSheetSection && sheetSection && (
          <>
            {/* Subtle Frosted Dismiss Backdrop (starts after rail) */}
            <motion.div
              key="revix-spatial-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              onClick={() => {
                setOpenSheetSection(null);
                setSearchQuery("");
              }}
              aria-hidden="true"
              className="fixed inset-y-0 end-0 start-[76px] z-30 hidden md:block bg-revix-dark/12 backdrop-blur-[2px]"
            />

            {/* Floating Edge-Anchored Architectural Sheet */}
            <motion.section
              key="revix-spatial-sheet"
              role="dialog"
              aria-label={isRtl ? sheetSection.titleAr : sheetSection.titleEn}
              initial={{ opacity: 0, x: sheetSlideOffset, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: sheetSlideOffset, scale: 0.985 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 420, damping: 34, mass: 0.85 }
              }
              className={`fixed top-[68px] start-[86px] z-40 hidden max-h-[calc(100dvh-84px)] md:flex flex-col overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.18)] ${sheetWidthClass}`}
            >
              {/* Sheet Top Header: Clean 2-tier (Title + Close on Row 1, Full-width Search on Row 2) */}
              <div className="shrink-0 space-y-3 border-b border-revix-border/80 bg-revix-surface/40 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-revix-primary text-white shadow-xs">
                      <RevixIcon name={sheetSection.icon} size={18} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] font-bold text-revix-dark">
                        {isRtl ? sheetSection.titleAr : sheetSection.titleEn}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOpenSheetSection(null);
                      setSearchQuery("");
                    }}
                    aria-label={isRtl ? "إغلاق" : "Close"}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-revix-white text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark"
                  >
                    <RevixIcon name="x" size={15} />
                  </button>
                </div>

                {/* Full-width Instant Cross-System Search */}
                <div className="relative w-full">
                  <RevixIcon
                    name="search"
                    size={14}
                    className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-revix-secondary"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isRtl ? "ابحث في كل الصفحات..." : "Search all pages..."}
                    className="w-full rounded-xl border border-revix-border bg-revix-white py-2 ps-9 pe-8 text-[13px] text-revix-dark placeholder:text-revix-secondary/75 focus:border-revix-primary focus:outline-none focus:ring-2 focus:ring-revix-primary/15"
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
              </div>

              {/* Sheet Main Content: Zero-Scroll Multi-Column Architectural Grid */}
              <div className="flex-1 overflow-y-auto p-5">
                {globalSearchMatches ? (
                  globalSearchMatches.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                      <div className="flex size-11 items-center justify-center rounded-full bg-revix-surface text-revix-secondary">
                        <RevixIcon name="search" size={18} />
                      </div>
                      <p className="text-[13.5px] font-semibold text-revix-dark">
                        {isRtl ? "لا توجد صفحات مطابقة لبحثك" : "No matching pages found"}
                      </p>
                      <p className="text-[12px] text-revix-secondary">
                        {isRtl ? "جرّب كلمة أخرى مثل: سيارات، موردين، تأمين، أسعار" : "Try another keyword"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                      {globalSearchMatches.map(({ section, item }) => {
                        const isActive = section.id === activeSection && item.id === activeSubPage;
                        const iconName = getSubPageIcon(item.id, section.icon);
                        return (
                          <button
                            key={`${section.id}:${item.id}`}
                            type="button"
                            onClick={() => handleNavigate(section.id, item.id)}
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
                                  : "bg-revix-surface text-revix-secondary group-hover/row:bg-revix-white group-hover/row:text-revix-primary"
                              }`}
                            >
                              <RevixIcon name={iconName} size={15} />
                            </span>
                            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-revix-dark group-hover/row:text-revix-primary">
                              {isRtl ? item.titleAr : item.titleEn}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className={`grid gap-3 ${gridColsClass}`}>
                    {sheetSection.groups.map((group, groupIdx) => {
                      const stepNumber = String(groupIdx + 1).padStart(2, "0");
                      const label = cleanGroupTitle(
                        isRtl ? group.groupTitleAr : group.groupTitleEn,
                      );

                      return (
                        <div
                          key={group.groupTitleEn}
                          className="flex flex-col rounded-xl border border-revix-border/75 bg-revix-surface/30 p-3"
                        >
                          {/* Architectural Group Header with Numbered Workflow Badge */}
                          <div className="mb-2 flex items-center gap-2 border-b border-revix-border/60 pb-2">
                            <span className="inline-flex h-5 min-w-[24px] items-center justify-center rounded-md bg-revix-primary/10 px-1.5 font-mono text-[10.5px] font-bold text-revix-primary">
                              {stepNumber}
                            </span>
                            <h3 className="text-[12.5px] font-bold text-revix-dark">
                              {label}
                            </h3>
                          </div>

                          {/* Spacious Page Rows */}
                          <div className="space-y-1">
                            {group.items.map((item) => {
                              const isActive =
                                sheetSection.id === activeSection && item.id === activeSubPage;
                              const iconName = getSubPageIcon(item.id, sheetSection.icon);

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleNavigate(sheetSection.id, item.id)}
                                  className={`group/row flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-start transition-all ${
                                    isActive
                                      ? "border-revix-primary/30 bg-revix-accent-soft shadow-xs"
                                      : "border-transparent bg-transparent hover:border-revix-primary/25 hover:bg-revix-accent-soft/80"
                                  }`}
                                >
                                  <span
                                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                      isActive
                                        ? "bg-revix-primary text-white"
                                        : "bg-revix-white text-revix-secondary shadow-[0_1px_2px_rgba(0,0,0,0.04)] group-hover/row:bg-revix-white group-hover/row:text-revix-primary"
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
    </>
  );
}
