"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { rentalContractNewHref, vehicleHref } from "@/lib/workspace/resourceRoutes";
import {
  useListRentalContractsQuery,
  useListReservationsQuery,
  useListVehiclesQuery,
  type FleetVehicleDto,
  type RentalContractDto,
  type ReservationDto,
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
type CalendarStatusFilter =
  | "all"
  | "rented"
  | "reserved"
  | "available"
  | "maintenance";

function toLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function startOfWeekSatOrMon(date: Date, isRtl: boolean): Date {
  const day = date.getDay(); // 0=Sun..6=Sat
  const startDay = isRtl ? 6 : 1;
  const diff = -((day - startDay + 7) % 7);
  return addDays(date, diff);
}

function formatVariantFullTitle(v: FleetVehicleDto, isRtl: boolean): string {
  if (!v.variant) return isRtl ? "سيارة بدون فئة" : "Unassigned Variant";
  return `${v.variant.make} ${v.variant.model}${v.variant.trim ? ` ${v.variant.trim}` : ""} ${v.variant.modelYear}`;
}

export function RentalCalendarPanel({ isRtl }: RentalCalendarPanelProps) {
  const router = useRouter();
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useListVehiclesQuery({
    pageSize: 500,
  });
  const { data: contractsData, isLoading: isLoadingContracts } =
    useListRentalContractsQuery();
  const { data: reservationsData, isLoading: isLoadingReservations } =
    useListReservationsQuery();

  const todayIso = useMemo(() => toLocalIsoDate(new Date()), []);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>("all");
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [printingContract, setPrintingContract] = useState<RentalContractDto | null>(null);
  const todayHeaderRef = useRef<HTMLDivElement | null>(null);

  const openContractCreate = (seed: { vehicleId?: string | null; startDate?: string | null }) => {
    router.push(
      rentalContractNewHref({
        vehicleId: seed.vehicleId ?? null,
        startDate: seed.startDate ?? todayIso,
      }),
    );
  };

  const openNewReservation = (startDate?: string) => {
    const q = startDate ? `?pickupDate=${encodeURIComponent(startDate)}` : "";
    router.push(`/workspace/fleet/reservations/new${q}`);
  };

  const dayColumns = useMemo(() => {
    const cols: Array<{
      index: number;
      day: number;
      iso: string;
      weekday: string;
      isToday: boolean;
    }> = [];

    if (viewMode === "week") {
      const start = startOfWeekSatOrMon(anchorDate, isRtl);
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const iso = toLocalIsoDate(d);
        cols.push({
          index: i,
          day: d.getDate(),
          iso,
          weekday: d.toLocaleDateString(isRtl ? "ar-EG" : "en-US", { weekday: "short" }),
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
      cols.push({
        index: i,
        day: i + 1,
        iso,
        weekday: d.toLocaleDateString(isRtl ? "ar-EG" : "en-US", { weekday: "short" }),
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
    for (const col of dayColumns) map.set(col.iso, col.index);
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
    return `${sDate.toLocaleDateString(isRtl ? "ar-EG" : "en-US", { day: "numeric", month: "short" })} – ${eDate.toLocaleDateString(isRtl ? "ar-EG" : "en-US", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [viewMode, anchorDate, dayColumns, isRtl]);

  const branchOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vehiclesData?.data ?? []) {
      if (v.isPartnerVehicle || !v.branchId || !v.branchName) continue;
      map.set(v.branchId, v.branchName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [vehiclesData?.data]);

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

  const { reservationsByVehicle, unassignedReservationsByVariant } = useMemo(() => {
    const byVehicle = new Map<string, ReservationDto[]>();
    const byVariant = new Map<string, ReservationDto[]>();

    for (const r of reservationsData?.data ?? []) {
      if (r.status !== "pending" && r.status !== "confirmed") continue;
      if (r.returnDate < rangeStartIso || r.pickupDate > rangeEndIso) continue;
      if (branchFilter !== "all" && r.branchId !== branchFilter) continue;

      if (r.assignedVehicleId) {
        const list = byVehicle.get(r.assignedVehicleId) ?? [];
        list.push(r);
        byVehicle.set(r.assignedVehicleId, list);
      } else {
        const list = byVariant.get(r.variantId) ?? [];
        list.push(r);
        byVariant.set(r.variantId, list);
      }
    }
    return {
      reservationsByVehicle: byVehicle,
      unassignedReservationsByVariant: byVariant,
    };
  }, [reservationsData?.data, rangeStartIso, rangeEndIso, branchFilter]);

  const allBranchVehicles = useMemo(
    () =>
      (vehiclesData?.data ?? []).filter(
        (v) => !v.isPartnerVehicle && (branchFilter === "all" || v.branchId === branchFilter),
      ),
    [vehiclesData?.data, branchFilter],
  );

  const statusCounts = useMemo(() => {
    let rented = 0;
    let assignedReservation = 0;
    let maintenance = 0;
    let available = 0;
    for (const v of allBranchVehicles) {
      const vc = contractsByVehicle.get(v.id) ?? [];
      const vr = reservationsByVehicle.get(v.id) ?? [];
      const isMaint = v.status === "maintenance" || v.status === "out_of_service";
      const hasRented = vc.some((c) => c.status === "active");
      const hasAssignedRsv = vr.length > 0;
      if (isMaint) maintenance++;
      else if (hasRented) rented++;
      else if (hasAssignedRsv) assignedReservation++;
      else available++;
    }
    let unassignedCount = 0;
    for (const list of unassignedReservationsByVariant.values()) {
      unassignedCount += list.length;
    }
    return {
      total: allBranchVehicles.length,
      rented,
      reserved: assignedReservation + unassignedCount,
      available,
      maintenance,
    };
  }, [
    allBranchVehicles,
    contractsByVehicle,
    reservationsByVehicle,
    unassignedReservationsByVariant,
  ]);

  // Group vehicles by Variant (Model + Trim + Year)
  const variantGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const groupsMap = new Map<
      string,
      {
        variantKey: string;
        variantId: string;
        title: string;
        category: string;
        vehicles: FleetVehicleDto[];
        unassignedReservations: ReservationDto[];
      }
    >();

    for (const v of allBranchVehicles) {
      const variantKey = v.variantId || `vehicle-${v.id}`;
      const title = formatVariantFullTitle(v, isRtl);
      const category = formatCategoryLabel(v.variant?.category, isRtl);
      const existing = groupsMap.get(variantKey);
      if (existing) {
        existing.vehicles.push(v);
      } else {
        groupsMap.set(variantKey, {
          variantKey,
          variantId: v.variantId || "",
          title,
          category,
          vehicles: [v],
          unassignedReservations: v.variantId
            ? (unassignedReservationsByVariant.get(v.variantId) ?? [])
            : [],
        });
      }
    }

    const groups = Array.from(groupsMap.values()).filter((g) => {
      if (q) {
        const matchesGroup =
          g.title.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.vehicles.some(
            (v) =>
              (v.assetCode ?? "").toLowerCase().includes(q) ||
              v.licensePlate.toLowerCase().includes(q) ||
              (v.branchName ?? "").toLowerCase().includes(q),
          ) ||
          g.unassignedReservations.some(
            (r) =>
              r.reservationNumber.toLowerCase().includes(q) ||
              (r.customerName ?? "").toLowerCase().includes(q),
          );
        if (!matchesGroup) return false;
      }

      if (statusFilter === "all") return true;

      const hasMaint = g.vehicles.some(
        (v) => v.status === "maintenance" || v.status === "out_of_service",
      );
      const hasRented = g.vehicles.some((v) =>
        (contractsByVehicle.get(v.id) ?? []).some((c) => c.status === "active"),
      );
      const hasReserved =
        g.unassignedReservations.length > 0 ||
        g.vehicles.some((v) => (reservationsByVehicle.get(v.id) ?? []).length > 0);
      const hasAvailable = g.vehicles.some((v) => {
        const isMaint = v.status === "maintenance" || v.status === "out_of_service";
        const vc = contractsByVehicle.get(v.id) ?? [];
        const vr = reservationsByVehicle.get(v.id) ?? [];
        const isBusy =
          vc.some((c) => c.status === "active" && c.startDate <= todayIso && c.endDate >= todayIso) ||
          vr.some((r) => r.pickupDate <= todayIso && r.returnDate >= todayIso);
        return !isMaint && !isBusy;
      });

      if (statusFilter === "rented") return hasRented;
      if (statusFilter === "reserved") return hasReserved;
      if (statusFilter === "maintenance") return hasMaint;
      if (statusFilter === "available") return hasAvailable;
      return true;
    });

    // Sort variants: those with active rentals or reservations first, then by vehicle count
    return groups.sort((a, b) => {
      const score = (g: (typeof groups)[number]) => {
        let s = g.unassignedReservations.length * 10;
        for (const v of g.vehicles) {
          const vc = contractsByVehicle.get(v.id) ?? [];
          const vr = reservationsByVehicle.get(v.id) ?? [];
          if (vc.some((c) => c.status === "active")) s += 5;
          if (vr.length > 0) s += 5;
          if (v.status === "maintenance" || v.status === "out_of_service") s += 2;
        }
        return s;
      };
      const diff = score(b) - score(a);
      return diff !== 0 ? diff : b.vehicles.length - a.vehicles.length;
    });
  }, [
    allBranchVehicles,
    unassignedReservationsByVariant,
    contractsByVehicle,
    reservationsByVehicle,
    search,
    statusFilter,
    isRtl,
    todayIso,
  ]);

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

  const isLoading = isLoadingVehicles || isLoadingContracts || isLoadingReservations;

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "تقويم الحجوزات" : "Rental Calendar"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2.5 py-0.5 font-mono text-xs font-bold text-revix-primary border border-revix-border">
            {statusCounts.total}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week / Month Toggle */}
          <div className="inline-flex items-center rounded-lg border border-revix-border bg-white p-0.5 text-xs">
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
          <div className="inline-flex items-center rounded-lg border border-revix-border bg-white p-0.5 text-xs">
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

          {branchOptions.length > 1 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 rounded-lg border border-revix-border bg-white px-2.5 text-xs font-medium text-revix-dark focus:border-revix-primary focus:outline-hidden"
            >
              <option value="all">{isRtl ? "كل الفروع" : "All Branches"}</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-44 sm:w-52">
            <RevixIcon
              name="search"
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? "بحث موديل، لوحة، عميل..." : "Search model, plate..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>

          <button
            type="button"
            onClick={() => openNewReservation(todayIso)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "حجز جديد" : "New Reservation"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Status Filter & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            {
              key: "all" as const,
              label: isRtl ? "الكل" : "All",
              count: statusCounts.total,
              dot: "bg-slate-400",
            },
            {
              key: "rented" as const,
              label: isRtl ? "مؤجرة" : "Rented",
              count: statusCounts.rented,
              dot: "bg-[#124e35]",
            },
            {
              key: "reserved" as const,
              label: isRtl ? "محجوزة" : "Reserved",
              count: statusCounts.reserved,
              dot: "bg-[#0c1420]",
            },
            {
              key: "available" as const,
              label: isRtl ? "متاحة" : "Available",
              count: statusCounts.available,
              dot: "bg-emerald-500",
            },
            {
              key: "maintenance" as const,
              label: isRtl ? "صيانة" : "Maintenance",
              count: statusCounts.maintenance,
              dot: "bg-slate-300",
            },
          ].map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-revix-primary bg-emerald-50 text-revix-primary shadow-2xs"
                    : "border-revix-border bg-white text-revix-secondary hover:bg-revix-surface"
                }`}
              >
                <span className={`size-2 rounded-full ${tab.dot}`} />
                <span>{tab.label}</span>
                <span className="rounded bg-white/90 px-1.5 py-0.5 font-mono text-[11px] font-bold text-revix-dark border border-revix-border/60">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-revix-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-3.5 rounded-sm bg-sky-700" />
            {isRtl ? "مكتمل" : "Completed"}
          </span>
          <button
            type="button"
            onClick={() => {
              const anyExpanded = variantGroups.some((g) => expandedVariants[g.variantKey]);
              if (anyExpanded) {
                setExpandedVariants({});
              } else {
                const next: Record<string, boolean> = {};
                for (const g of variantGroups) next[g.variantKey] = true;
                setExpandedVariants(next);
              }
            }}
            className="cursor-pointer rounded-md border border-revix-border bg-white px-2.5 py-1 text-[11px] font-semibold text-revix-dark hover:bg-revix-surface"
          >
            {variantGroups.some((g) => expandedVariants[g.variantKey])
              ? isRtl
                ? "طي الكل"
                : "Collapse All"
              : isRtl
                ? "توسيع الكل"
                : "Expand All"}
          </button>
        </div>
      </div>

      {/* Variant-Grouped Availability Matrix */}
      {isLoading ? (
        <ResourceFeedback isLoading isRtl={isRtl} />
      ) : variantGroups.length === 0 ? (
        <div className="rounded-xl border border-revix-border bg-white">
          <EmptyState
            title={isRtl ? "لا توجد نتائج مطابقة" : "No matching results"}
            description={
              isRtl
                ? "جرّب تغيير الفلتر أو البحث لعرض الموديلات والسيارات."
                : "Try adjusting filters or search."
            }
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-revix-border bg-white shadow-2xs">
          <div className={viewMode === "week" ? "min-w-[880px]" : "min-w-[1320px]"}>
            {/* Sticky Day Header */}
            <div className="sticky top-0 z-20 flex border-b border-revix-border bg-[#f7faf8] text-xs font-semibold text-revix-secondary">
              <div className="sticky start-0 z-30 flex w-64 sm:w-72 shrink-0 items-center justify-between border-e border-revix-border bg-[#f7faf8] px-4 py-3 text-start">
                <span>{isRtl ? "الموديل / الفئة" : "Model / Variant"}</span>
                <span className="text-[10.5px] font-normal text-revix-muted">
                  {isRtl ? `${variantGroups.length} موديل` : `${variantGroups.length} models`}
                </span>
              </div>
              <div
                className="grid flex-1"
                style={{
                  gridTemplateColumns: `repeat(${totalCols}, minmax(${viewMode === "week" ? "96px" : "42px"}, 1fr))`,
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
                        {col.isToday && <span className="size-1.5 rounded-full bg-revix-primary" />}
                        <span>{col.weekday}</span>
                        <span className="font-mono">{col.day}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center leading-tight">
                        <span className="text-[10px] opacity-75">{col.weekday}</span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            col.isToday ? "text-revix-primary" : ""
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

            {/* Variant Rows */}
            <div className="divide-y divide-revix-border/80">
              {variantGroups.map((group) => {
                const isExpanded =
                  Boolean(expandedVariants[group.variantKey]) || search.trim().length > 0;
                const totalUnits = group.vehicles.length;

                return (
                  <div key={group.variantKey}>
                    {/* Variant Summary Row */}
                    <div
                      className={`flex min-h-[56px] transition-colors ${
                        isExpanded ? "bg-[#f3f7f4]" : "bg-white hover:bg-[#f9fcfa]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedVariants((prev) => ({
                            ...prev,
                            [group.variantKey]: !prev[group.variantKey],
                          }))
                        }
                        className={`sticky start-0 z-10 flex w-64 sm:w-72 shrink-0 cursor-pointer items-start justify-between gap-2 border-e border-revix-border px-4 py-3 text-start transition-colors ${
                          isExpanded
                            ? "bg-[#f3f7f4] hover:bg-emerald-50/50"
                            : "bg-white hover:bg-emerald-50/35"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <RevixIcon
                              name={
                                isExpanded
                                  ? "chevron-down"
                                  : isRtl
                                    ? "chevron-left"
                                    : "chevron-right"
                              }
                              size={14}
                              className="shrink-0 text-revix-primary"
                            />
                            <span className="text-[13px] font-bold leading-snug text-revix-dark">
                              {group.title}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 ps-5 text-[10.5px]">
                            <span className="rounded bg-revix-surface px-1.5 py-0.5 font-medium text-revix-secondary">
                              {group.category}
                            </span>
                            <span className="font-mono font-semibold text-revix-dark">
                              {totalUnits} {isRtl ? "سيارة" : "units"}
                            </span>
                            {group.unassignedReservations.length > 0 && (
                              <span className="rounded bg-[#0c1420] px-1.5 py-0.5 font-semibold text-white">
                                {group.unassignedReservations.length}{" "}
                                {isRtl ? "محجوز" : "reserved"}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Daily Variant Availability + Continuous Duration Bars */}
                      <div className="flex flex-1 flex-col">
                        <div
                          className="grid flex-1"
                          style={{
                            gridTemplateColumns: `repeat(${totalCols}, minmax(${viewMode === "week" ? "96px" : "42px"}, 1fr))`,
                          }}
                        >
                          {dayColumns.map((col) => {
                            let rented = 0;
                            let reserved = 0;
                            let maint = 0;

                            for (const v of group.vehicles) {
                              const isMaint =
                                v.status === "maintenance" || v.status === "out_of_service";
                              const vc = contractsByVehicle.get(v.id) ?? [];
                              const vr = reservationsByVehicle.get(v.id) ?? [];
                              const activeC = vc.find(
                                (c) =>
                                  c.status === "active" &&
                                  c.startDate <= col.iso &&
                                  c.endDate >= col.iso,
                              );
                              const activeR = vr.find(
                                (r) => r.pickupDate <= col.iso && r.returnDate >= col.iso,
                              );
                              if (activeC) {
                                rented++;
                              } else if (activeR) {
                                reserved++;
                              } else if (isMaint) {
                                maint++;
                              }
                            }
                            for (const r of group.unassignedReservations) {
                              if (r.pickupDate <= col.iso && r.returnDate >= col.iso) {
                                reserved++;
                              }
                            }

                            const avail = Math.max(
                              0,
                              totalUnits - rented - reserved - maint,
                            );

                            return (
                              <button
                                key={col.iso}
                                type="button"
                                onClick={() =>
                                  setExpandedVariants((prev) => ({
                                    ...prev,
                                    [group.variantKey]: !prev[group.variantKey],
                                  }))
                                }
                                className={`flex cursor-pointer items-center justify-center border-e border-revix-border/50 px-1 py-2 transition-colors hover:bg-emerald-50/40 ${
                                  col.isToday ? "border-x border-revix-primary/20 bg-emerald-50/40" : ""
                                }`}
                              >
                                {viewMode === "week" ? (
                                  <span
                                    className={`font-mono text-[11px] font-bold ${
                                      avail > 0 ? "text-emerald-700" : "text-rose-600"
                                    }`}
                                  >
                                    {avail}/{totalUnits} {isRtl ? "متاح" : "free"}
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded font-mono text-[10.5px] font-bold ${
                                      avail === 0
                                        ? "bg-rose-50 text-rose-700"
                                        : rented + reserved > 0
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "text-emerald-700"
                                    }`}
                                  >
                                    {avail}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Continuous Duration Bars (shown when collapsed so expanded rows don't duplicate them) */}
                        {!isExpanded && (() => {
                          const groupContracts =
                            statusFilter === "reserved" || statusFilter === "maintenance"
                              ? []
                              : group.vehicles.flatMap((v) =>
                                  (contractsByVehicle.get(v.id) ?? []).filter(
                                    (c) => c.status === "active",
                                  ),
                                );
                          const groupReservations =
                            statusFilter === "rented" || statusFilter === "maintenance"
                              ? []
                              : [
                                  ...group.unassignedReservations,
                                  ...group.vehicles.flatMap(
                                    (v) => reservationsByVehicle.get(v.id) ?? [],
                                  ),
                                ];

                          if (groupContracts.length === 0 && groupReservations.length === 0) {
                            return null;
                          }

                          return (
                            <div className="space-y-1 border-t border-revix-border/40 bg-slate-50/40 py-1.5">
                              {groupContracts.map((c) => {
                                const clampedStart =
                                  c.startDate < rangeStartIso ? rangeStartIso : c.startDate;
                                const clampedEnd =
                                  c.endDate > rangeEndIso ? rangeEndIso : c.endDate;
                                const sIdx = isoToColIndex.get(clampedStart) ?? 0;
                                const eIdx = isoToColIndex.get(clampedEnd) ?? totalCols - 1;
                                const spanCols = Math.max(1, eIdx - sIdx + 1);
                                return (
                                  <div key={`bar-c-${c.id}`} className="relative h-6 w-full">
                                    <button
                                      type="button"
                                      onClick={() => setPrintingContract(c)}
                                      style={{
                                        insetInlineStart: `calc(${(sIdx / totalCols) * 100}% + 4px)`,
                                        width: `calc(${(spanCols / totalCols) * 100}% - 8px)`,
                                      }}
                                      title={`${isRtl ? "مؤجرة" : "Rented"} • #${c.contractNumber} • ${c.customerName || ""} (${c.startDate} → ${c.endDate})`}
                                      className="absolute inset-y-0 flex cursor-pointer items-center justify-center overflow-hidden rounded-md bg-[#124e35] px-2.5 text-[10.5px] font-bold text-white shadow-2xs hover:opacity-90"
                                    >
                                      <span className="truncate">
                                        {isRtl ? "مؤجرة" : "Rented"} • #{c.contractNumber}
                                        {c.customerName ? ` · ${c.customerName}` : ""}
                                      </span>
                                    </button>
                                  </div>
                                );
                              })}
                              {groupReservations.map((r) => {
                                const clampedStart =
                                  r.pickupDate < rangeStartIso ? rangeStartIso : r.pickupDate;
                                const clampedEnd =
                                  r.returnDate > rangeEndIso ? rangeEndIso : r.returnDate;
                                const sIdx = isoToColIndex.get(clampedStart) ?? 0;
                                const eIdx = isoToColIndex.get(clampedEnd) ?? totalCols - 1;
                                const spanCols = Math.max(1, eIdx - sIdx + 1);
                                return (
                                  <div key={`bar-r-${r.id}`} className="relative h-6 w-full">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        router.push(
                                          `/workspace/fleet/rental-contracts/new?reservationId=${r.id}`,
                                        )
                                      }
                                      style={{
                                        insetInlineStart: `calc(${(sIdx / totalCols) * 100}% + 4px)`,
                                        width: `calc(${(spanCols / totalCols) * 100}% - 8px)`,
                                      }}
                                      title={`${isRtl ? "محجوزة" : "Reserved"} • #${r.reservationNumber} • ${r.customerName || ""} (${r.pickupDate} → ${r.returnDate})`}
                                      className="absolute inset-y-0 flex cursor-pointer items-center justify-center overflow-hidden rounded-md bg-[#0c1420] px-2.5 text-[10.5px] font-bold text-white shadow-2xs hover:bg-slate-800"
                                    >
                                      <span className="truncate">
                                        {isRtl ? "محجوزة" : "Reserved"} • #{r.reservationNumber}
                                        {r.customerName ? ` · ${r.customerName}` : ""}
                                      </span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Expanded Detail Rows (Unassigned Reservations + Individual Vehicles) */}
                    {isExpanded && (
                      <div className="divide-y divide-revix-border/50 border-t border-revix-border/70 border-s-4 border-s-revix-primary bg-[#f8faf9]">
                        {/* Unassigned Variant Reservations (Phone/Web before contract) */}
                        {group.unassignedReservations.map((r) => {
                          const clampedStart =
                            r.pickupDate < rangeStartIso ? rangeStartIso : r.pickupDate;
                          const clampedEnd =
                            r.returnDate > rangeEndIso ? rangeEndIso : r.returnDate;
                          const sIdx = isoToColIndex.get(clampedStart) ?? 0;
                          const eIdx = isoToColIndex.get(clampedEnd) ?? totalCols - 1;
                          const spanCols = Math.max(1, eIdx - sIdx + 1);

                          return (
                            <div
                              key={`rsv-${r.id}`}
                              className="flex min-h-[48px] bg-slate-50/70 hover:bg-slate-100/70"
                            >
                              <Link
                                href={`/workspace/fleet/rental-contracts/new?reservationId=${r.id}`}
                                className="sticky start-0 z-10 flex w-64 sm:w-72 shrink-0 flex-col justify-center border-e border-revix-border bg-slate-100/80 ps-8 pe-4 py-1.5 text-start"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="rounded bg-[#0c1420] px-1.5 py-0.5 text-[9.5px] font-bold text-white">
                                    {isRtl ? "محجوزة" : "Reserved"}
                                  </span>
                                  <span className="font-mono text-[11px] font-bold text-revix-dark">
                                    #{r.reservationNumber}
                                  </span>
                                </div>
                                <div className="mt-0.5 truncate text-[11px] text-revix-secondary">
                                  {r.customerName || "—"} {r.branchName ? `· ${r.branchName}` : ""}
                                </div>
                              </Link>

                              <div
                                className="relative grid flex-1"
                                style={{
                                  gridTemplateColumns: `repeat(${totalCols}, minmax(${viewMode === "week" ? "96px" : "42px"}, 1fr))`,
                                }}
                              >
                                {dayColumns.map((col) => (
                                  <div
                                    key={col.iso}
                                    className="border-e border-revix-border/40"
                                  />
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(
                                      `/workspace/fleet/rental-contracts/new?reservationId=${r.id}`,
                                    )
                                  }
                                  style={{
                                    insetInlineStart: `calc(${(sIdx / totalCols) * 100}% + 6px)`,
                                    width: `calc(${(spanCols / totalCols) * 100}% - 12px)`,
                                  }}
                                  title={`${isRtl ? "حجز — اضغط للتحويل لعقد" : "Reservation — click to convert"} • #${r.reservationNumber}`}
                                  className="absolute top-1.5 bottom-1.5 z-10 flex cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#0c1420] px-3 text-[11px] font-bold text-white shadow-xs hover:bg-slate-800"
                                >
                                  <span className="truncate">
                                    {isRtl ? "محجوزة" : "Reserved"} • #{r.reservationNumber}
                                    {r.customerName ? ` · ${r.customerName}` : ""}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Individual Vehicles */}
                        {group.vehicles.map((v) => {
                          const vContracts = contractsByVehicle.get(v.id) ?? [];
                          const vReservations = reservationsByVehicle.get(v.id) ?? [];
                          const isMaintenance =
                            v.status === "maintenance" || v.status === "out_of_service";

                          return (
                            <div
                              key={v.id}
                              className="flex min-h-[46px] transition-colors hover:bg-emerald-50/20"
                            >
                              <Link
                                href={vehicleHref(v.id)}
                                className="sticky start-0 z-10 flex w-64 sm:w-72 shrink-0 items-center justify-between gap-2 border-e border-revix-border bg-[#fafcfb] ps-9 pe-4 py-1.5 text-start hover:bg-emerald-50/40"
                              >
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span
                                    dir="ltr"
                                    className="rounded border border-revix-border bg-white px-1.5 py-0.5 text-[11px] font-bold text-revix-dark"
                                  >
                                    {v.licensePlate}
                                  </span>
                                  {v.assetCode && v.assetCode !== v.licensePlate && (
                                    <span
                                      dir="ltr"
                                      className="text-[11px] font-semibold text-revix-primary"
                                    >
                                      {v.assetCode}
                                    </span>
                                  )}
                                </div>
                                {v.branchName && (
                                  <span className="max-w-[100px] truncate text-[10.5px] text-revix-secondary">
                                    {v.branchName}
                                  </span>
                                )}
                              </Link>

                              <div
                                className="relative grid flex-1"
                                style={{
                                  gridTemplateColumns: `repeat(${totalCols}, minmax(${viewMode === "week" ? "96px" : "42px"}, 1fr))`,
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
                                        if (col.iso === todayIso) {
                                          openContractCreate({
                                            vehicleId: v.id,
                                            startDate: todayIso,
                                          });
                                        } else if (col.iso > todayIso) {
                                          openNewReservation(col.iso);
                                        }
                                      }}
                                      className={`group flex items-center justify-center border-e border-revix-border/40 transition-colors ${
                                        isPast
                                          ? "cursor-default bg-slate-50/40"
                                          : "cursor-pointer hover:bg-emerald-50/70"
                                      } ${
                                        col.isToday
                                          ? "border-x border-revix-primary/20 bg-emerald-50/35"
                                          : ""
                                      }`}
                                    >
                                      {!isPast && (
                                        <span className="text-xs font-bold text-revix-primary opacity-0 transition-opacity group-hover:opacity-100">
                                          +
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}

                                {isMaintenance && (
                                  <div
                                    style={{
                                      insetInlineStart: "6px",
                                      width: "calc(100% - 12px)",
                                      backgroundImage:
                                        "repeating-linear-gradient(135deg,#f3f5f7,#f3f5f7 6px,#e6eaee 6px,#e6eaee 12px)",
                                    }}
                                    className="pointer-events-none absolute top-1.5 bottom-1.5 z-[5] flex items-center rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
                                  >
                                    {isRtl ? "صيانة" : "Maintenance"}
                                  </div>
                                )}

                                {vReservations.map((r) => {
                                  const clampedStart =
                                    r.pickupDate < rangeStartIso ? rangeStartIso : r.pickupDate;
                                  const clampedEnd =
                                    r.returnDate > rangeEndIso ? rangeEndIso : r.returnDate;
                                  const sIdx = isoToColIndex.get(clampedStart) ?? 0;
                                  const eIdx = isoToColIndex.get(clampedEnd) ?? totalCols - 1;
                                  const spanCols = Math.max(1, eIdx - sIdx + 1);
                                  return (
                                    <button
                                      key={`rsv-${r.id}`}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(
                                          `/workspace/fleet/rental-contracts/new?reservationId=${r.id}`,
                                        );
                                      }}
                                      style={{
                                        insetInlineStart: `calc(${(sIdx / totalCols) * 100}% + 6px)`,
                                        width: `calc(${(spanCols / totalCols) * 100}% - 12px)`,
                                      }}
                                      className="absolute top-1.5 bottom-1.5 z-10 flex cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#0c1420] px-3 text-[11px] font-bold text-white shadow-xs hover:bg-slate-800"
                                    >
                                      <span className="truncate">
                                        {isRtl ? "محجوزة" : "Reserved"} • #{r.reservationNumber}
                                      </span>
                                    </button>
                                  );
                                })}

                                {vContracts.map((c) => {
                                  const clampedStart =
                                    c.startDate < rangeStartIso ? rangeStartIso : c.startDate;
                                  const clampedEnd =
                                    c.endDate > rangeEndIso ? rangeEndIso : c.endDate;
                                  const sIdx = isoToColIndex.get(clampedStart) ?? 0;
                                  const eIdx = isoToColIndex.get(clampedEnd) ?? totalCols - 1;
                                  const spanCols = Math.max(1, eIdx - sIdx + 1);
                                  const isCompleted = c.status === "completed";
                                  const barColor = isCompleted ? "bg-sky-700" : "bg-[#124e35]";
                                  const label = isCompleted
                                    ? isRtl
                                      ? "مكتمل"
                                      : "Completed"
                                    : isRtl
                                      ? "مؤجرة"
                                      : "Rented";
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPrintingContract(c);
                                      }}
                                      style={{
                                        insetInlineStart: `calc(${(sIdx / totalCols) * 100}% + 6px)`,
                                        width: `calc(${(spanCols / totalCols) * 100}% - 12px)`,
                                      }}
                                      title={`${label} • #${c.contractNumber} • ${c.customerName || ""}`}
                                      className={`absolute top-1.5 bottom-1.5 z-10 flex cursor-pointer items-center justify-center overflow-hidden rounded-lg px-3 text-[11px] font-bold text-white shadow-xs hover:opacity-90 ${barColor}`}
                                    >
                                      <span className="truncate">
                                        {label} • #{c.contractNumber}
                                      </span>
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
                );
              })}
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
