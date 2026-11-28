"use client";

import { useMemo, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  useListReservationsQuery,
  useUpdateReservationStatusMutation,
  type ReservationDto,
  type ReservationSource,
  type ReservationStatus,
} from "@/store/api/fleetApi";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";
import { smartMatch } from "@/lib/search/smartSearch";
import {
  parseFleetResourceRoute,
  rentalContractHref,
  rentalContractNewHref,
  reservationNewHref,
} from "@/lib/workspace/resourceRoutes";
import { CreateReservationPage } from "./CreateReservationPage";

interface ReservationsPanelProps {
  isRtl: boolean;
}

const STATUS_BADGE: Record<
  ReservationStatus,
  { ar: string; en: string; cls: string }
> = {
  pending: {
    ar: "معلق",
    en: "Pending",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  confirmed: {
    ar: "مؤكد",
    en: "Confirmed",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  converted: {
    ar: "تم التحويل لعقد",
    en: "Converted",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  cancelled: {
    ar: "ملغي",
    en: "Cancelled",
    cls: "border-red-200 bg-red-50 text-red-700",
  },
  no_show: {
    ar: "لم يحضر",
    en: "No-Show",
    cls: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

const SOURCE_LABEL: Record<ReservationSource, { ar: string; en: string }> = {
  phone: { ar: "هاتف", en: "Phone" },
  walk_in: { ar: "فرع", en: "Walk-in" },
  website: { ar: "موقع", en: "Website" },
  ota_partner: { ar: "OTA", en: "OTA" },
};

export function ReservationsPanel({ isRtl }: ReservationsPanelProps) {
  const pathname = usePathname();
  const resourceRoute = parseFleetResourceRoute(pathname);
  const { data, isLoading } = useListReservationsQuery();
  const [updateStatus, { isLoading: isUpdating }] =
    useUpdateReservationStatusMutation();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const reservations = useMemo(() => data?.data ?? [], [data?.data]);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return smartMatch(search, {
        id: [r.reservationNumber, r.externalBookingRef],
        name: [r.customerName, r.variantTitle],
        phone: [r.customerPhone],
      });
    });
  }, [reservations, statusFilter, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  if (resourceRoute?.resource === "reservations" && resourceRoute.action === "create") {
    return <CreateReservationPage isRtl={isRtl} />;
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="flex h-full min-h-0 flex-col gap-3"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-revix-dark">
            {isRtl ? "الحجوزات (حسب الفئة)" : "Reservations (By Variant)"}
          </h1>
          <p className="text-xs text-revix-secondary">
            {isRtl
              ? "حجز فئة سيارة (أو ما يماثلها) عبر الهاتف أو المواقع وتحويلها لعقد يوم الاستلام."
              : "Reserve vehicle variants (or similar) from phone or web channels and convert to contracts on pickup."}
          </p>
        </div>

        <Link href={reservationNewHref()}>
          <Button type="button">
            <RevixIcon name="plus" size={14} className="me-1.5" />
            {isRtl ? "حجز جديد" : "New Reservation"}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "confirmed", "pending", "converted", "no_show", "cancelled"] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? "border-revix-primary bg-revix-primary text-white"
                    : "border-revix-border bg-white text-revix-secondary hover:bg-revix-surface"
                }`}
              >
                {st === "all"
                  ? isRtl
                    ? "الكل"
                    : "All"
                  : isRtl
                    ? STATUS_BADGE[st].ar
                    : STATUS_BADGE[st].en}
              </button>
            ),
          )}
        </div>

        <SmartSearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          isRtl={isRtl}
          placeholder={
            isRtl ? "بحث ذكي: رقم الحجز، عميل، هاتف، فئة..." : "Smart search: ref, customer, phone, variant..."
          }
          className="w-full sm:w-64"
        />
      </div>

      {/* Table */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-revix-border bg-white">
        <DataTable fitAvailableHeight className="w-full text-start text-xs">
          <thead>
            <tr className="border-b border-revix-border bg-revix-surface/70 text-[11px] font-semibold text-revix-secondary">
              <th className="px-3.5 py-2.5 text-start">{isRtl ? "رقم الحجز" : "Reservation #"}</th>
              <th className="px-3 py-2.5 text-start">{isRtl ? "العميل" : "Customer"}</th>
              <th className="px-3 py-2.5 text-start">{isRtl ? "الفئة المطلوبة" : "Variant"}</th>
              <th className="px-3 py-2.5 text-start">{isRtl ? "الفرع" : "Branch"}</th>
              <th className="px-3 py-2.5 text-start">{isRtl ? "الفترة" : "Dates"}</th>
              <th className="px-3 py-2.5 text-start">{isRtl ? "المصدر" : "Source"}</th>
              <th className="px-3 py-2.5 text-start">{isRtl ? "الحالة" : "Status"}</th>
              <th className="px-3.5 py-2.5 text-end">{isRtl ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-revix-border/60">
            {isLoading ? (
              <TableEmptyRow
                colSpan={8}
                title={isRtl ? "جاري التحميل..." : "Loading reservations..."}
                description=""
              />
            ) : paginated.length === 0 ? (
              <TableEmptyRow
                colSpan={8}
                title={isRtl ? "لا توجد حجوزات" : "No reservations found"}
                description={
                  isRtl
                    ? "أنشئ أول حجز بالفئة لتخصيص السيارة وتحويله لعقد عند حضور العميل."
                    : "Create your first variant reservation to assign a plate and convert on pickup."
                }
              />
            ) : (
              paginated.map((r) => {
                const badge = STATUS_BADGE[r.status] || STATUS_BADGE.confirmed;
                const src = SOURCE_LABEL[r.source] || SOURCE_LABEL.phone;
                return (
                  <tr key={r.id} className="hover:bg-revix-surface/35">
                    <td className="px-3.5 py-2.5 font-mono font-bold text-revix-dark whitespace-nowrap">
                      {r.reservationNumber}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-revix-dark">{r.customerName}</div>
                      <div className="font-mono text-[11px] text-revix-muted">{r.customerPhone}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-revix-dark">{r.variantTitle}</div>
                      {r.allowSimilar && (
                        <span className="inline-block text-[10px] text-amber-700">
                          {isRtl ? "أو ما يماثلها" : "or similar"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-revix-secondary">{r.branchName || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-revix-secondary whitespace-nowrap">
                      {r.pickupDate} → {r.returnDate}
                      <div className="text-[10px] text-revix-muted">
                        {r.totalDays} {isRtl ? "أيام" : "days"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-md border border-revix-border bg-revix-surface px-2 py-0.5 text-[10.5px] font-medium text-revix-dark">
                          {isRtl ? src.ar : src.en}
                        </span>
                        {r.partnerName && (
                          <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10.5px] font-semibold text-sky-800">
                            {r.partnerName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                      >
                        {isRtl ? badge.ar : badge.en}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-end whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {(r.status === "confirmed" || r.status === "pending") && (
                          <>
                            <Link
                              href={rentalContractNewHref({ reservationId: r.id })}
                              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md bg-revix-primary px-2.5 text-[11px] font-semibold text-white hover:bg-revix-primary-hover"
                            >
                              {isRtl ? "تحويل لعقد" : "Convert"}
                            </Link>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateStatus({ id: r.id, status: "no_show" })}
                              className="inline-flex h-8 cursor-pointer items-center rounded-md border border-revix-border px-2 text-[11px] text-revix-secondary hover:bg-revix-surface"
                            >
                              {isRtl ? "لم يحضر" : "No-show"}
                            </button>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => updateStatus({ id: r.id, status: "cancelled" })}
                              className="inline-flex h-8 cursor-pointer items-center rounded-md border border-red-200 px-2 text-[11px] text-red-600 hover:bg-red-50"
                            >
                              {isRtl ? "إلغاء" : "Cancel"}
                            </button>
                          </>
                        )}
                        {r.status === "converted" && r.convertedContractId && (
                          <Link
                            href={rentalContractHref(r.convertedContractId)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-revix-primary/30 bg-emerald-50/40 px-2.5 text-[11px] font-semibold text-revix-primary hover:bg-emerald-50"
                          >
                            {r.convertedContractNumber || (isRtl ? "فتح العقد" : "Open Contract")}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>

        <RevixPagination
          compact
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          lang={isRtl ? "ar" : "en"}
          itemLabel={isRtl ? "حجز" : "reservations"}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
