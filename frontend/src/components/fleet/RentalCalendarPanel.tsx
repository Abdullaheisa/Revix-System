"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { rentalContractNewHref, vehicleHref } from "@/lib/workspace/resourceRoutes";
import {
  useListRentalContractsQuery,
  useListVehiclesQuery,
  type FleetVehicleDto,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import { RentalContractPrintModal } from "./RentalContractPrintModal";

interface RentalCalendarPanelProps {
  isRtl: boolean;
}

const CATEGORY_LABELS_AR: Record<string, string> = {
  sedan: "سيدان",
  suv: "دفع رباعي",
  hatchback: "هاتشباك",
  economy: "اقتصادية",
  compact: "مدمجة",
  luxury: "فاخرة",
  van: "فان / عائلية",
  minivan: "فان / عائلية",
  pickup: "بيك أب",
  coupe: "كوبيه",
  convertible: "كابريوليه",
  crossover: "كروس أوفر",
  sports: "رياضية",
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  "سيدان": "Sedan",
  "دفع رباعي": "SUV",
  "هاتشباك": "Hatchback",
  "اقتصادية": "Economy",
  "فاخرة": "Luxury",
  "فان": "Van",
  "بيك أب": "Pickup",
  "كوبيه": "Coupe",
  "عامة": "General",
  "فئة عامة": "General",
};

function formatCategoryLabel(raw: string | null | undefined, isRtl: boolean): string {
  const trimmed = raw?.trim();
  if (!trimmed) return isRtl ? "فئة عامة" : "General";
  if (!isRtl) return CATEGORY_LABELS_EN[trimmed] ?? trimmed;
  return CATEGORY_LABELS_AR[trimmed.toLowerCase()] ?? trimmed;
}

type ViewMode = "week" | "month";

function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function RentalCalendarPanel({ isRtl }: RentalCalendarPanelProps) {
  const router = useRouter();
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useListVehiclesQuery({
    pageSize: 500,
  });
  const { data: contractsData, isLoading: isLoadingContracts } =
    useListRentalContractsQuery();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [search, setSearch] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const todayHeaderRef = useRef<HTMLDivElement | null>(null);

  const setCreateSeed = (seed: { vehicleId: string | null; startDate: string | null }) => {
    router.push(rentalContractNewHref({ vehicleId: seed.vehicleId, startDate: seed.startDate }));
  };
  const [printingContract, setPrintingContract] =
    useState<RentalContractDto | null>(null);

  const todayIso = useMemo(() => toLocalIsoDate(new Date()), []);

  const dayColumns = useMemo(() => {
    const cols: Array<{
      index: number;
      day: number;
      iso: string;
      weekday: string;
      isToday: boolean;
    }> = [];

    if (viewMode === "week") {
      const start = startOfWeekMonday(anchorDate);
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const iso = toLocalIsoDate(d);
        const weekday = d.toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
          weekday: "long",
        });
        cols.push({
          index: i,
          day: d.getDate(),
          iso,
          weekday,
          isToday: iso === todayIso,
        });
      }
      return cols;
    }

    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < daysInMonth; i++) {
      const d = new Date(year, month, i + 1);
      const iso = toLocalIsoDate(d);
      const weekday = d.toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
        weekday: "short",
      });
      cols.push({
        index: i,
        day: i + 1,
        iso,
        weekday,
        isToday: iso === todayIso,
      });
    }
    return cols;
  }, [viewMode, anchorDate, isRtl, todayIso]);

  const rangeStartIso = dayColumns[0]?.iso ?? todayIso;
  const rangeEndIso = dayColumns[dayColumns.length - 1]?.iso ?? todayIso;
  const totalCols = dayColumns.length;

  const isoToColIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const col of dayColumns) {
      map.set(col.iso, col.index);
    }
    return map;
  }, [dayColumns]);

  const rangeLabel = useMemo(() => {
    if (viewMode === "month") {
      return anchorDate.toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
        month: "long",
        year: "numeric",
      });
    }
    const start = dayColumns[0];
    const end = dayColumns[dayColumns.length - 1];
    if (!start || !end) return "";
    const sDate = new Date(start.iso + "T00:00:00");
    const eDate = new Date(end.iso + "T00:00:00");
    const sLabel = sDate.toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
    });
    const eLabel = eDate.toLocaleDateString(isRtl ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${sLabel} – ${eLabel}`;
  }, [viewMode, anchorDate, dayColumns, isRtl]);

  const vehicles = useMemo(() => {
    const all = (vehiclesData?.data ?? []).filter((v) => !v.isPartnerVehicle);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (v) =>
        (v.assetCode ?? "").toLowerCase().includes(q) ||
        v.licensePlate.toLowerCase().includes(q) ||
        (v.variant?.category ?? "").toLowerCase().includes(q) ||
        (v.variant &&
          `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`
            .toLowerCase()
            .includes(q)),
    );
  }, [vehiclesData?.data, search]);

  const groupedVehicles = useMemo(() => {
    const groups = new Map<string, FleetVehicleDto[]>();
    for (const v of vehicles) {
      const cat = formatCategoryLabel(v.variant?.category, isRtl);
      const list = groups.get(cat) ?? [];
      list.push(v);
      groups.set(cat, list);
    }
    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }, [vehicles, isRtl]);

  const contractsByVehicle = useMemo(() => {
    const map = new Map<string, RentalContractDto[]>();
    for (const c of contractsData?.data ?? []) {
      if (c.status === "cancelled") continue;
      if (c.endDate < rangeStartIso || c.startDate > rangeEndIso) continue;
      const list = map.get(c.vehicleId) ?? [];
      list.push(c);
      map.set(c.vehicleId, list);
    }
    return map;
  }, [contractsData?.data, rangeStartIso, rangeEndIso]);

  function prevPeriod() {
    setAnchorDate((prev) =>
      viewMode === "week"
        ? addDays(prev, -7)
        : new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  }

  function nextPeriod() {
    setAnchorDate((prev) =>
      viewMode === "week"
        ? addDays(prev, 7)
        : new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  }

  function goToday() {
    setAnchorDate(new Date());
    requestAnimationFrame(() => {
      todayHeaderRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }

  useEffect(() => {
    if (viewMode === "month") {
      requestAnimationFrame(() => {
        todayHeaderRef.current?.scrollIntoView({
          behavior: "auto",
          block: "nearest",
          inline: "center",
        });
      });
    }
  }, [viewMode, anchorDate]);

  const isLoading = isLoadingVehicles || isLoadingContracts;

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "تقويم الحجوزات" : "Rental Calendar"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {vehicles.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex items-center rounded-lg border border-revix-border bg-revix-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`cursor-pointer rounded-md px-3 py-1 font-semibold transition-colors ${
                viewMode === "week"
                  ? "bg-revix-primary text-white"
                  : "text-revix-secondary hover:bg-revix-surface"
              }`}
            >
              {isRtl ? "أسبوع" : "Week"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`cursor-pointer rounded-md px-3 py-1 font-semibold transition-colors ${
                viewMode === "month"
                  ? "bg-revix-primary text-white"
                  : "text-revix-secondary hover:bg-revix-surface"
              }`}
            >
              {isRtl ? "شهر" : "Month"}
            </button>
          </div>

          {/* Period Switcher */}
          <div className="inline-flex items-center rounded-lg border border-revix-border bg-revix-white p-0.5 text-xs">
            <button
              type="button"
              onClick={prevPeriod}
              className="cursor-pointer rounded-md px-2 py-1.5 text-revix-secondary hover:bg-revix-surface"
              aria-label={isRtl ? "السابق" : "Previous"}
            >
              <RevixIcon name={isRtl ? "chevron-right" : "chevron-left"} size={14} />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="cursor-pointer px-3 py-1 font-bold text-revix-dark hover:text-revix-primary"
            >
              {rangeLabel}
            </button>
            <button
              type="button"
              onClick={nextPeriod}
              className="cursor-pointer rounded-md px-2 py-1.5 text-revix-secondary hover:bg-revix-surface"
              aria-label={isRtl ? "التالي" : "Next"}
            >
              <RevixIcon name={isRtl ? "chevron-left" : "chevron-right"} size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={goToday}
            className="h-9 cursor-pointer rounded-lg border border-revix-primary/30 bg-emerald-50 px-3 text-xs font-bold text-revix-primary hover:bg-emerald-100 transition-colors"
          >
            {isRtl ? "اليوم" : "Today"}
          </button>

          <div className="relative w-48 sm:w-52">
            <RevixIcon
              name="search"
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isRtl ? "بحث باللوحة، الفئة..." : "Search plate, category..."
              }
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>

          <button
            type="button"
            onClick={() => setCreateSeed({ vehicleId: null, startDate: todayIso })}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "حجز جديد" : "New Booking"}</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-revix-secondary shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-[#124e35]" />
          {isRtl ? "مؤجرة" : "Rented"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-[#0c1420]" />
          {isRtl ? "محجوزة" : "Reserved"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm border border-emerald-900/20 bg-emerald-50" />
          {isRtl ? "متاحة" : "Available"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-sm border border-slate-300"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg,#f1f5f9,#f1f5f9 3px,#cbd5e1 3px,#cbd5e1 6px)",
            }}
          />
          {isRtl ? "صيانة" : "Maintenance"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-sky-600" />
          {isRtl ? "مكتمل" : "Completed"}
        </span>
      </div>

      {/* Calendar Timeline Matrix */}
      {isLoading ? (
        <ResourceFeedback isLoading isRtl={isRtl} />
      ) : vehicles.length === 0 ? (
        <div className="rounded-xl border border-revix-border bg-revix-white">
          <EmptyState
            title={isRtl ? "لا توجد سيارات مطابقة" : "No matching vehicles"}
            description={
              isRtl
                ? "أضف سيارات إلى الأسطول أولاً لمتابعة جدول حجوزاتها هنا."
                : "Add vehicles to your fleet to track their booking schedule here."
            }
          />
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-initial overflow-auto rounded-2xl border border-revix-border bg-revix-white shadow-xs"
        >
          <div className={viewMode === "week" ? "min-w-[820px]" : "min-w-[1260px]"}>
            {/* Header Row */}
            <div className="sticky top-0 z-20 flex border-b border-revix-border bg-[#f7faf8] text-xs font-semibold text-revix-secondary">
              <div className="sticky start-0 z-30 w-48 sm:w-56 shrink-0 border-e border-revix-border bg-[#f7faf8] px-4 py-3 text-start">
                {isRtl ? "السيارة" : "Vehicle"}
              </div>
              <div
                className="grid flex-1"
                style={{
                  gridTemplateColumns: `repeat(${totalCols}, minmax(${viewMode === "week" ? "96px" : "36px"}, 1fr))`,
                }}
              >
                {dayColumns.map((col) => (
                  <div
                    key={col.iso}
                    ref={col.isToday ? todayHeaderRef : undefined}
                    className={`flex items-center justify-center gap-1 border-e border-revix-border/60 py-2.5 ${
                      col.isToday
                        ? "border-b-2 border-b-revix-primary bg-emerald-50/90 font-bold text-revix-primary"
                        : "text-slate-600"
                    }`}
                  >
                    {viewMode === "week" ? (
                      <div
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 ${
                          col.isToday
                            ? "border border-revix-primary/40 bg-white text-revix-primary shadow-2xs"
                            : ""
                        }`}
                      >
                        {col.isToday && (
                          <span className="size-1.5 rounded-full bg-revix-primary" />
                        )}
                        <span>{col.weekday}</span>
                        <span className="font-mono">{col.day}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 leading-tight">
                        <span
                          className={`text-[10px] ${
                            col.isToday ? "font-bold text-revix-primary" : "opacity-75"
                          }`}
                        >
                          {col.weekday}
                        </span>
                        <span
                          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[11px] ${
                            col.isToday
                              ? "border border-revix-primary/50 bg-white font-bold text-revix-primary shadow-2xs"
                              : "text-revix-dark"
                          }`}
                        >
                          {col.day}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Category Groups */}
            <div>
              {groupedVehicles.map((group) => (
                <div key={group.category}>
                  {/* Category Header Strip */}
                  <div className="border-y border-emerald-900/10 bg-[#f2f7f4] px-4 py-1.5 text-[11px] font-bold text-slate-600">
                    {group.category}
                  </div>

                  {/* Vehicle Rows */}
                  <div className="divide-y divide-revix-border/60">
                    {group.items.map((v) => {
                      const vContracts = contractsByVehicle.get(v.id) ?? [];
                      const vTitle = v.variant
                        ? `${v.variant.make} ${v.variant.model}`
                        : isRtl
                          ? "سيارة"
                          : "Vehicle";

                      const isMaintenance =
                        v.status === "maintenance" || v.status === "out_of_service";

                      // Build occupied day mask across visible columns
                      const occupied = new Array<boolean>(totalCols).fill(false);
                      for (const c of vContracts) {
                        const clampedStart =
                          c.startDate < rangeStartIso ? rangeStartIso : c.startDate;
                        const clampedEnd =
                          c.endDate > rangeEndIso ? rangeEndIso : c.endDate;
                        const sIdx = isoToColIndex.get(clampedStart) ?? 0;
                        const eIdx = isoToColIndex.get(clampedEnd) ?? totalCols - 1;
                        for (let i = sIdx; i <= eIdx; i++) {
                          occupied[i] = true;
                        }
                      }

                      // Maintenance block: if vehicle is in maintenance and has no active contract covering today,
                      // show a maintenance block on [today..today+1] (or first 2 open cols if today isn't in view)
                      let maintSpan: { startIdx: number; endIdx: number } | null = null;
                      if (isMaintenance) {
                        const todayIdx = isoToColIndex.get(todayIso);
                        if (todayIdx !== undefined && !occupied[todayIdx]) {
                          const endIdx =
                            todayIdx + 1 < totalCols && !occupied[todayIdx + 1]
                              ? todayIdx + 1
                              : todayIdx;
                          maintSpan = { startIdx: todayIdx, endIdx };
                          for (let i = maintSpan.startIdx; i <= maintSpan.endIdx; i++) {
                            occupied[i] = true;
                          }
                        } else if (todayIdx === undefined) {
                          const firstFree = occupied.findIndex((o) => !o);
                          if (firstFree !== -1) {
                            const endIdx =
                              firstFree + 1 < totalCols && !occupied[firstFree + 1]
                                ? firstFree + 1
                                : firstFree;
                            maintSpan = { startIdx: firstFree, endIdx };
                            for (let i = maintSpan.startIdx; i <= maintSpan.endIdx; i++) {
                              occupied[i] = true;
                            }
                          }
                        }
                      }

                      // Contiguous available stretches (>= 2 days) to display soft "متاحة" pills
                      const freeSpans: Array<{ startIdx: number; endIdx: number }> = [];
                      let runStart: number | null = null;
                      for (let i = 0; i < totalCols; i++) {
                        if (!occupied[i]) {
                          if (runStart === null) runStart = i;
                        } else if (runStart !== null) {
                          if (i - runStart >= 2) {
                            freeSpans.push({ startIdx: runStart, endIdx: i - 1 });
                          }
                          runStart = null;
                        }
                      }
                      if (runStart !== null && totalCols - runStart >= 2) {
                        freeSpans.push({ startIdx: runStart, endIdx: totalCols - 1 });
                      }

                      return (
                        <div
                          key={v.id}
                          className="flex min-h-[62px] transition-colors hover:bg-emerald-50/20"
                        >
                          {/* Sticky Vehicle Info Cell */}
                          <Link
                            href={vehicleHref(v.id)}
                            className="sticky start-0 z-10 flex w-48 sm:w-56 shrink-0 flex-col justify-center border-e border-revix-border bg-revix-white px-4 py-2.5 text-start transition-colors hover:bg-emerald-50/40"
                          >
                            <div className="truncate text-[13px] font-bold text-revix-dark">
                              {vTitle}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 font-mono">
                              <span
                                dir="ltr"
                                className="rounded border border-revix-border bg-revix-surface px-1.5 py-0.5 text-xs font-bold text-revix-dark"
                              >
                                {v.licensePlate}
                              </span>
                              {v.assetCode && v.assetCode !== v.licensePlate && (
                                <span dir="ltr" className="text-[11px] font-semibold text-revix-primary">
                                  {v.assetCode}
                                </span>
                              )}
                            </div>
                          </Link>

                          {/* Timeline Grid & Overlay Pills */}
                          <div
                            className="relative grid flex-1"
                            style={{
                              gridTemplateColumns: `repeat(${totalCols}, minmax(${viewMode === "week" ? "96px" : "36px"}, 1fr))`,
                            }}
                          >
                            {dayColumns.map((col) => {
                              const isPast = col.iso < todayIso;
                              return (
                                <button
                                  key={col.iso}
                                  type="button"
                                  disabled={isPast}
                                  onClick={() => {
                                    if (!isPast) {
                                      setCreateSeed({ vehicleId: v.id, startDate: col.iso });
                                    }
                                  }}
                                  title={
                                    isPast
                                      ? undefined
                                      : isRtl
                                        ? `حجز ${v.licensePlate} في ${col.iso}`
                                        : `Book ${v.licensePlate} on ${col.iso}`
                                  }
                                  className={`border-e border-revix-border/40 transition-colors ${
                                    isPast
                                      ? "cursor-default bg-slate-50/40"
                                      : "cursor-pointer hover:bg-emerald-50/60"
                                  } ${
                                    col.isToday
                                      ? "border-x border-revix-primary/25 bg-emerald-50/80"
                                      : ""
                                  }`}
                                />
                              );
                            })}

                            {/* Soft Available Pills */}
                            {freeSpans.map((span) => {
                              const startPct = (span.startIdx / totalCols) * 100;
                              const widthPct =
                                ((span.endIdx - span.startIdx + 1) / totalCols) * 100;
                              const rawStartIso = dayColumns[span.startIdx]?.iso ?? todayIso;
                              const endIso = dayColumns[span.endIdx]?.iso ?? todayIso;
                              const canBookSpan = endIso >= todayIso;
                              const bookingStartIso =
                                rawStartIso < todayIso ? todayIso : rawStartIso;
                              return (
                                <button
                                  key={`free-${span.startIdx}`}
                                  type="button"
                                  disabled={!canBookSpan}
                                  onClick={() => {
                                    if (canBookSpan) {
                                      setCreateSeed({
                                        vehicleId: v.id,
                                        startDate: bookingStartIso,
                                      });
                                    }
                                  }}
                                  style={{
                                    insetInlineStart: `calc(${startPct}% + 6px)`,
                                    width: `calc(${widthPct}% - 12px)`,
                                  }}
                                  className={`absolute top-2.5 bottom-2.5 z-[5] flex items-center justify-start rounded-xl border border-emerald-900/15 bg-[#eef5f0]/55 px-3 text-[11px] font-semibold text-[#1e5c40] transition-colors ${
                                    canBookSpan
                                      ? "cursor-pointer hover:bg-[#e2efe6]/80"
                                      : "cursor-default opacity-60"
                                  }`}
                                >
                                  <span className="truncate">
                                    {isRtl ? "متاحة" : "Available"}
                                  </span>
                                </button>
                              );
                            })}

                            {/* Maintenance Striped Pill */}
                            {maintSpan && (
                              <div
                                style={{
                                  insetInlineStart: `calc(${(maintSpan.startIdx / totalCols) * 100}% + 6px)`,
                                  width: `calc(${((maintSpan.endIdx - maintSpan.startIdx + 1) / totalCols) * 100}% - 12px)`,
                                  backgroundImage:
                                    "repeating-linear-gradient(135deg,#f3f5f7,#f3f5f7 6px,#e6eaee 6px,#e6eaee 12px)",
                                }}
                                className="pointer-events-none absolute top-2.5 bottom-2.5 z-10 flex items-center justify-start rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
                              >
                                <span className="truncate">
                                  {isRtl ? "صيانة" : "Maintenance"}
                                </span>
                              </div>
                            )}

                            {/* Contract Bars (Rented / Reserved / Completed) */}
                            {vContracts.map((c) => {
                              const clampedStart =
                                c.startDate < rangeStartIso ? rangeStartIso : c.startDate;
                              const clampedEnd =
                                c.endDate > rangeEndIso ? rangeEndIso : c.endDate;
                              const sIdx = isoToColIndex.get(clampedStart) ?? 0;
                              const eIdx =
                                isoToColIndex.get(clampedEnd) ?? totalCols - 1;
                              const spanCols = Math.max(1, eIdx - sIdx + 1);
                              const startPct = (sIdx / totalCols) * 100;
                              const widthPct = (spanCols / totalCols) * 100;

                              const isCompleted = c.status === "completed";
                              const isReserved =
                                c.status === "active" && c.startDate > todayIso;

                              const statusLabel = isCompleted
                                ? isRtl
                                  ? "مكتمل"
                                  : "Completed"
                                : isReserved
                                  ? isRtl
                                    ? "محجوزة"
                                    : "Reserved"
                                  : isRtl
                                    ? "مؤجرة"
                                    : "Rented";

                              const barColor = isCompleted
                                ? "bg-sky-700"
                                : isReserved
                                  ? "bg-[#0c1420]"
                                  : "bg-[#124e35]";

                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrintingContract(c);
                                  }}
                                  style={{
                                    insetInlineStart: `calc(${startPct}% + 6px)`,
                                    width: `calc(${widthPct}% - 12px)`,
                                  }}
                                  title={`${statusLabel} • #${c.contractNumber} • ${c.customerName || ""} (${c.startDate} → ${c.endDate})`}
                                  className={`absolute top-2.5 bottom-2.5 z-10 flex cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-xl px-3 text-[11px] font-bold text-white shadow-xs transition-opacity hover:opacity-90 ${barColor}`}
                                >
                                  <span className="truncate">
                                    {statusLabel} • #{c.contractNumber}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <RentalContractPrintModal
        contract={printingContract}
        isRtl={isRtl}
        onClose={() => setPrintingContract(null)}
        onSigned={(updated) => setPrintingContract(updated)}
      />
    </div>
  );
}
