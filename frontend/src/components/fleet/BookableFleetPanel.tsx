"use client";

import { DataTable } from "@/components/ui/DataTable";
import { useMemo, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  navigateToWorkspacePage,
  setPendingVariantSetupContext,
  clearPendingFleetReceiveContext,
} from "@/store/slices/workspaceSlice";
import {
  useListVehiclesQuery,
  useToggleVehicleBookableMutation,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { CreateContractModal } from "./CreateContractModal";

interface BookableFleetPanelProps {
  isRtl: boolean;
}

interface VariantSummaryRow {
  variantId: string;
  title: string;
  sippCode: string;
  dailyRate1to2: number;
  dailyRate3to7: number;
  dailyRate8Plus: number;
  total: number;
  available: number;
  reserved: number;
  onRent: number;
  maintenance: number;
  ownTotal: number;
  bookableCount: number;
  firstAvailableVehicleId: string | null;
}

export function BookableFleetPanel({ isRtl }: BookableFleetPanelProps) {
  const dispatch = useAppDispatch();
  const { data: wsCtx } = useGetWorkspaceContextQuery();
  const company = wsCtx?.data?.company ?? null;
  const isNetworkMain = company?.operatingMode === "network_main";
  const { data: vehiclesData, isLoading } = useListVehiclesQuery({
    includeNetwork: isNetworkMain,
  });
  const [toggleBookable] = useToggleVehicleBookableMutation();

  const [viewMode, setViewMode] = useState<"by_variant" | "bookable" | "ready_to_publish">("by_variant");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "own" | "partners">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [bookingVehicleId, setBookingVehicleId] = useState<string | null>(null);

  const allVehicles = useMemo(() => {
    const raw = vehiclesData?.data ?? [];
    if (!isNetworkMain) return raw.filter((v) => !v.isPartnerVehicle);
    if (ownerFilter === "own") return raw.filter((v) => !v.isPartnerVehicle);
    if (ownerFilter === "partners") return raw.filter((v) => Boolean(v.isPartnerVehicle));
    return raw;
  }, [vehiclesData?.data, isNetworkMain, ownerFilter]);

  const bookableVehicles = useMemo(
    () => allVehicles.filter((v) => Boolean(v.isBookable)),
    [allVehicles],
  );
  const unpublishedVehicles = useMemo(
    () => allVehicles.filter((v) => !v.isBookable),
    [allVehicles],
  );

  // Group ALL fleet vehicles by Model Variant (Nissan Sunny SE 2026, etc.)
  const variantSummaries = useMemo<VariantSummaryRow[]>(() => {
    const map = new Map<string, VariantSummaryRow>();

    for (const v of allVehicles) {
      const vid = v.variantId;
      const vr = v.variant;
      const title = vr
        ? `${vr.make} ${vr.model} ${vr.trim} ${vr.modelYear}`.replace(/\s+/g, " ").trim()
        : "Fleet Variant";
      let row = map.get(vid);
      if (!row) {
        row = {
          variantId: vid,
          title,
          sippCode: vr?.sippCode || "—",
          dailyRate1to2: Number(v.dailyRate1to2 ?? 0),
          dailyRate3to7: Number(v.dailyRate3to7 ?? 0),
          dailyRate8Plus: Number(v.dailyRate8Plus ?? 0),
          total: 0,
          available: 0,
          reserved: 0,
          onRent: 0,
          maintenance: 0,
          ownTotal: 0,
          bookableCount: 0,
          firstAvailableVehicleId: null,
        };
        map.set(vid, row);
      }

      row.total += 1;
      if (!v.isPartnerVehicle) row.ownTotal += 1;
      if (v.isBookable) row.bookableCount += 1;
      if (v.status === "available") {
        row.available += 1;
        if (!row.firstAvailableVehicleId && v.isBookable) row.firstAvailableVehicleId = v.id;
      } else if (v.status === "reserved") {
        row.reserved += 1;
      } else if (v.status === "on_rent") {
        row.onRent += 1;
      } else if (v.status === "maintenance") {
        row.maintenance += 1;
      }

      if (row.dailyRate1to2 === 0 && Number(v.dailyRate1to2 ?? 0) > 0) {
        row.dailyRate1to2 = Number(v.dailyRate1to2 ?? 0);
        row.dailyRate3to7 = Number(v.dailyRate3to7 ?? 0);
        row.dailyRate8Plus = Number(v.dailyRate8Plus ?? 0);
      }
    }

    const q = search.trim().toLowerCase();
    return Array.from(map.values())
      .filter((r) => !q || r.title.toLowerCase().includes(q) || r.sippCode.toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allVehicles, search]);

  const activeUnitList = viewMode === "bookable" ? bookableVehicles : unpublishedVehicles;

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeUnitList;
    return activeUnitList.filter(
      (v) =>
        v.licensePlate.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        (v.variant &&
          `${v.variant.make} ${v.variant.model} ${v.variant.trim} ${v.variant.modelYear}`.toLowerCase().includes(q)),
    );
  }, [activeUnitList, search]);

  const paginatedUnits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, page]);

  const totalCount = allVehicles.length;
  const availableCount = allVehicles.filter((v) => v.status === "available").length;
  const reservedCount = allVehicles.filter((v) => v.status === "reserved").length;
  const onRentCount = allVehicles.filter((v) => v.status === "on_rent").length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Clean Header & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "الأسطول الجاهز للحجز" : "Fleet Overview"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {totalCount}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isNetworkMain && (
            <div className="flex items-center gap-1 rounded-lg border border-revix-border bg-revix-surface/50 p-0.5 text-[11px]">
              {[
                { id: "all" as const, ar: "الكل", en: "All" },
                { id: "own" as const, ar: "الشركة الأم", en: "Main Co." },
                { id: "partners" as const, ar: "الشركات المحلية", en: "Local Partners" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setOwnerFilter(opt.id);
                    setPage(1);
                  }}
                  className={`cursor-pointer rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    ownerFilter === opt.id
                      ? "bg-white text-revix-primary shadow-2xs"
                      : "text-revix-secondary hover:text-revix-dark"
                  }`}
                >
                  {isRtl ? opt.ar : opt.en}
                </button>
              ))}
            </div>
          )}
          <div className="relative w-56">
            <RevixIcon
              name="search"
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={isRtl ? "بحث بالفريانت أو اللوحة..." : "Search variant or plate..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>
        </div>
      </div>

      {/* Clean Underline Tabs */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-revix-border">
        <button
          type="button"
          onClick={() => {
            setViewMode("by_variant");
            setPage(1);
          }}
          className={`cursor-pointer shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs transition-colors ${
            viewMode === "by_variant"
              ? "border-revix-primary font-semibold text-revix-primary"
              : "border-transparent text-revix-secondary hover:text-revix-dark"
          }`}
        >
          {isRtl ? `ملخص الفئات (${variantSummaries.length})` : `By Variant (${variantSummaries.length})`}
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode("bookable");
            setPage(1);
          }}
          className={`cursor-pointer shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs transition-colors ${
            viewMode === "bookable"
              ? "border-revix-primary font-semibold text-revix-primary"
              : "border-transparent text-revix-secondary hover:text-revix-dark"
          }`}
        >
          {isRtl ? `الأسطول المنشور (${bookableVehicles.length})` : `Live Units (${bookableVehicles.length})`}
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode("ready_to_publish");
            setPage(1);
          }}
          className={`cursor-pointer shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs transition-colors ${
            viewMode === "ready_to_publish"
              ? "border-revix-primary font-semibold text-revix-primary"
              : "border-transparent text-revix-secondary hover:text-revix-dark"
          }`}
        >
          {isRtl ? `أصول غير منشورة (${unpublishedVehicles.length})` : `Unpublished (${unpublishedVehicles.length})`}
        </button>
      </nav>

      {viewMode === "by_variant" ? (
        <SectionCard noPadding>
          {isLoading ? (
            <EmptyState message={isRtl ? "جاري تحميل ملخص الأسطول..." : "Loading fleet summary..."} />
          ) : variantSummaries.length === 0 ? (
            <EmptyState message={isRtl ? "لا توجد فئات سيارات مسجلة بعد." : "No vehicle variants found."} />
          ) : (
            <div className="overflow-x-auto">
              <DataTable className="w-full text-xs">
                <thead>
                  <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold uppercase tracking-wider text-revix-muted">
                    <th className="px-4 py-3 text-start">{isRtl ? "الفريانت / النوع" : "Model Variant"}</th>
                    <th className="px-3 py-3 text-start">{isRtl ? "السعر اليومي" : "Daily Rate"}</th>
                    <th className="px-3 py-3 text-center">{isRtl ? "الإجمالي" : "Total"}</th>
                    <th className="px-3 py-3 text-center">{isRtl ? "متاح" : "Available"}</th>
                    <th className="px-3 py-3 text-center">{isRtl ? "محجوز" : "Reserved"}</th>
                    <th className="px-3 py-3 text-center">{isRtl ? "بره / مؤجر" : "On Rent"}</th>
                    <th className="px-3 py-3 text-center">{isRtl ? "صيانة" : "Maint."}</th>
                    <th className="px-4 py-3 text-end">{isRtl ? "إجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-revix-border/70">
                  {variantSummaries.map((row) => (
                    <tr key={row.variantId} className="hover:bg-revix-surface/35">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-revix-dark">{row.title}</span>
                          <span className="rounded bg-revix-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-revix-primary">
                            {row.sippCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-revix-primary">
                        {row.dailyRate1to2 > 0 ? (
                          <span dir="ltr" className="inline-block">
                            {row.dailyRate1to2.toLocaleString()} EGP
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-revix-dark">
                        {row.total}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex min-w-7 justify-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono font-bold text-emerald-700">
                          {row.available}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex min-w-7 justify-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono font-bold text-amber-700">
                          {row.reserved}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex min-w-7 justify-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono font-bold text-blue-700">
                          {row.onRent}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-revix-secondary">
                        {row.maintenance}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {row.ownTotal > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                dispatch(clearPendingFleetReceiveContext());
                                dispatch(
                                  setPendingVariantSetupContext({
                                    variantId: row.variantId,
                                    variantTitle: row.title,
                                    totalUnits: row.ownTotal,
                                  }),
                                );
                                dispatch(
                                  navigateToWorkspacePage({
                                    section: "fleet",
                                    subPage: "add-vehicle",
                                  }),
                                );
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-revix-border bg-white px-2.5 py-1 text-[11px] font-semibold text-revix-dark hover:bg-revix-surface"
                            >
                              <span>{isRtl ? "تجهيز للحجز" : "Prepare for Booking"}</span>
                            </button>
                          )}
                          {row.firstAvailableVehicleId ? (
                            <button
                              type="button"
                              onClick={() => setBookingVehicleId(row.firstAvailableVehicleId)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-revix-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-revix-primary-hover"
                            >
                              <RevixIcon name="plus" size={12} />
                              <span>{isRtl ? "حجز / عقد" : "Book Variant"}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-revix-muted">
                              {row.bookableCount === 0
                                ? isRtl
                                  ? "غير منشور"
                                  : "Unpublished"
                                : isRtl
                                  ? "غير متاح"
                                  : "None avail"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}
        </SectionCard>
      ) : (
        <>
          <SectionCard noPadding>
            {isLoading ? (
              <EmptyState message={isRtl ? "جاري تحميل الأسطول..." : "Loading fleet..."} />
            ) : paginatedUnits.length === 0 ? (
              <EmptyState
                message={
                  viewMode === "bookable"
                    ? isRtl
                      ? "لا توجد سيارات منشورة في الأسطول بعد. انتقل لتبويب (أصول غير منشورة) لتحويل السيارات للأسطول."
                      : "No vehicles published to Fleet yet. Switch to Unpublished to publish vehicles."
                    : isRtl
                      ? "كل السيارات منشورة في الأسطول بالفعل."
                      : "All vehicle assets are already published to Fleet."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <DataTable className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold uppercase tracking-wider text-revix-muted">
                      <th className="px-4 py-3 text-start">{isRtl ? "الفريانت" : "Variant"}</th>
                      <th className="px-3 py-3 text-start">{isRtl ? "المالك / الموقع" : "Owner / Location"}</th>
                      <th className="px-3 py-3 text-start">{isRtl ? "اللوحة" : "Plate"}</th>
                      <th className="px-3 py-3 text-start">{isRtl ? "العداد" : "Odometer"}</th>
                      <th className="px-3 py-3 text-start">{isRtl ? "السعر اليومي" : "Daily Rate"}</th>
                      <th className="px-3 py-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                      <th className="px-4 py-3 text-end">{isRtl ? "إجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-revix-border/70">
                    {paginatedUnits.map((v) => (
                      <tr key={v.id} className="hover:bg-revix-surface/35">
                        <td className="px-4 py-3">
                          <div className="font-bold text-revix-dark">
                            {v.variant
                              ? `${v.variant.make} ${v.variant.model} ${v.variant.trim} ${v.variant.modelYear}`
                              : "Vehicle"}
                          </div>
                          <div className="text-[11px] text-revix-secondary">{v.color}</div>
                        </td>
                        <td className="px-3 py-3">
                          {v.isPartnerVehicle ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                {isRtl ? "شركة محلية:" : "Local:"} {v.companyName || "—"}
                              </span>
                              <div className="text-[11px] text-revix-muted">
                                {v.branchName || v.companyCountryCode || "—"}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center rounded bg-revix-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-revix-primary">
                                {isRtl ? "الشركة الأم" : "Main Company"}
                              </span>
                              <div className="text-[11px] text-revix-dark font-semibold">
                                {v.branchName || (isRtl ? "مخزون الشركة" : "Company Stock")}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-md border border-revix-border bg-revix-surface px-2 py-0.5 font-mono font-bold text-revix-dark">
                            {v.licensePlate}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-revix-dark">
                          {v.mileageOdometer.toLocaleString()} {isRtl ? "كم" : "km"}
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-revix-primary">
                          {(v.dailyRate1to2 ?? 0) > 0 ? `${v.dailyRate1to2?.toLocaleString()} / d` : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                              v.status === "available"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : v.status === "on_rent"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {v.status === "available"
                              ? isRtl ? "متاحة" : "Available"
                              : v.status === "on_rent"
                                ? isRtl ? "مؤجرة" : "On Rent"
                                : v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-end">
                          <div className="inline-flex items-center gap-1.5">
                            {viewMode === "bookable" ? (
                              <>
                                {v.status === "available" && (
                                  <button
                                    type="button"
                                    onClick={() => setBookingVehicleId(v.id)}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-revix-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-revix-primary-hover"
                                  >
                                    <RevixIcon name="plus" size={12} />
                                    <span>{isRtl ? "حجز / عقد" : "Book"}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleBookable({ id: v.id, isBookable: false })}
                                  className="cursor-pointer rounded-md border border-revix-border px-2 py-1 text-[11px] font-semibold text-revix-secondary hover:bg-revix-surface"
                                >
                                  {isRtl ? "إخفاء" : "Unpublish"}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleBookable({ id: v.id, isBookable: true })}
                                className="cursor-pointer rounded-md bg-revix-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-revix-primary-hover"
                              >
                                {isRtl ? "تحويل للأسطول (حجز)" : "Publish to Fleet"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            )}
          </SectionCard>

          <RevixPagination
            currentPage={page}
            totalItems={filteredUnits.length}
            pageSize={pageSize}
            onPageChange={setPage}
            lang={isRtl ? "ar" : "en"}
          />
        </>
      )}

      <CreateContractModal
        isOpen={Boolean(bookingVehicleId)}
        isRtl={isRtl}
        initialVehicleId={bookingVehicleId}
        onClose={() => setBookingVehicleId(null)}
      />
    </div>
  );
}
