"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  WORKSPACE_NAVIGATION_SECTIONS,
  type WorkspaceSubPageItem,
} from "@/lib/workspace/navigationCatalog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  navigateToWorkspacePage,
  setCommandPaletteOpen,
  type WorkspaceSectionId,
} from "@/store/slices/workspaceSlice";

interface FlatCommandEntry {
  sectionId: WorkspaceSectionId;
  sectionTitleEn: string;
  sectionTitleAr: string;
  icon: (typeof WORKSPACE_NAVIGATION_SECTIONS)[number]["icon"];
  item: WorkspaceSubPageItem;
}

export interface CommandPaletteModalProps {
  isRtl: boolean;
}

export function CommandPaletteModal({ isRtl }: CommandPaletteModalProps) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.workspace.isCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const allEntries = useMemo<FlatCommandEntry[]>(() => {
    const entries: FlatCommandEntry[] = [];
    for (const section of WORKSPACE_NAVIGATION_SECTIONS) {
      for (const group of section.groups) {
        for (const item of group.items) {
          entries.push({
            sectionId: section.id,
            sectionTitleEn: section.titleEn,
            sectionTitleAr: section.titleAr,
            icon: section.icon,
            item,
          });
        }
      }
    }
    return entries;
  }, []);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter(
      (entry) =>
        entry.item.titleEn.toLowerCase().includes(q) ||
        entry.item.titleAr.toLowerCase().includes(q) ||
        entry.sectionTitleEn.toLowerCase().includes(q) ||
        entry.sectionTitleAr.toLowerCase().includes(q) ||
        entry.item.shortcut.toLowerCase().includes(q),
    );
  }, [allEntries, query]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const safeIndex =
    filteredEntries.length === 0
      ? 0
      : Math.min(highlightedIndex, filteredEntries.length - 1);

  function closeModal() {
    setQuery("");
    setHighlightedIndex(0);
    dispatch(setCommandPaletteOpen(false));
  }

  function selectEntry(entry: FlatCommandEntry) {
    setQuery("");
    setHighlightedIndex(0);
    dispatch(
      navigateToWorkspacePage({
        section: entry.sectionId,
        subPage: entry.item.id,
      }),
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isRtl ? "البحث السريع والاختصارات" : "Quick navigation"}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 pt-[12vh] backdrop-blur-[1px]"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-[580px] overflow-hidden rounded-[12px] border border-revix-border bg-revix-white shadow-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Row */}
        <div className="flex items-center gap-2.5 border-b border-revix-border px-4 py-3">
          <RevixIcon
            name="search"
            size={17}
            className="shrink-0 text-revix-secondary"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeModal();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  filteredEntries.length === 0
                    ? 0
                    : (prev + 1) % filteredEntries.length,
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  filteredEntries.length === 0
                    ? 0
                    : (prev - 1 + filteredEntries.length) %
                      filteredEntries.length,
                );
              } else if (e.key === "Enter" && filteredEntries[safeIndex]) {
                e.preventDefault();
                selectEntry(filteredEntries[safeIndex]);
              }
            }}
            placeholder={
              isRtl
                ? "ابحث عن أي صفحة أو اكتب اختصارها..."
                : "Search pages, settings, or shortcuts..."
            }
            className="w-full bg-transparent text-[14px] text-revix-dark placeholder:text-revix-disabled focus:outline-none"
          />
          <kbd className="rounded border border-revix-border bg-revix-surface px-1.5 py-0.5 text-[11px] font-medium text-revix-secondary">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {filteredEntries.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13.5px] text-revix-secondary">
              {isRtl
                ? "لا توجد صفحات مطابقة لبحثك."
                : "No matching pages found."}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredEntries.map((entry, idx) => {
                const isActive = idx === safeIndex;
                return (
                  <li key={`${entry.sectionId}-${entry.item.id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => selectEntry(entry)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 text-start transition-colors ${
                        isActive
                          ? "bg-revix-tint text-revix-primary"
                          : "text-revix-dark hover:bg-revix-surface"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border ${
                            isActive
                              ? "border-revix-primary/25 bg-revix-white text-revix-primary"
                              : "border-revix-border bg-revix-surface text-revix-secondary"
                          }`}
                        >
                          <RevixIcon name={entry.icon} size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold">
                            {isRtl ? entry.item.titleAr : entry.item.titleEn}
                          </p>
                          <p className="truncate text-[11.5px] text-revix-secondary">
                            {isRtl
                              ? entry.sectionTitleAr
                              : entry.sectionTitleEn}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {entry.item.badgeEn ? (
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            {isRtl ? entry.item.badgeAr : entry.item.badgeEn}
                          </span>
                        ) : null}
                        <kbd
                          dir="ltr"
                          className="rounded border border-revix-border bg-revix-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary"
                        >
                          {entry.item.shortcut}
                        </kbd>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer Tip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-revix-border bg-revix-surface px-4 py-2 text-[11.5px] text-revix-secondary">
          <span>
            {isRtl
              ? "اختصار مباشر: اضغط G ثم حرف الصفحة، أو Alt+1..8 للأقسام الرئيسية"
              : "Quick jump: Press G then page letter, or Alt+1..8 for main modules"}
          </span>
          <span dir="ltr" className="font-mono text-[11px]">
            Ctrl + K
          </span>
        </div>
      </div>
    </div>
  );
}
