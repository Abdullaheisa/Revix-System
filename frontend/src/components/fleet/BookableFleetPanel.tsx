"use client";

import { useMemo, useState } from "react";
import {
  useListVehiclesQuery,
  useToggleVehicleBookableMutation,
} from "@/store/api/fleetApi";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { CreateContractModal } from "./CreateContractModal";

interface BookableFleetPanelProps {
  isRtl: boolean;
}

export function BookableFleetPanel({ isRtl }: BookableFleetPanelProps) {
  const { data: vehiclesData, isLoading } = useListVehiclesQuery({});
  const [toggleBookable] = useToggleVehicleBookableMutation();

  const [viewMode, setViewMode] = useState<"bookable" | "ready_to_publish">("bookable");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [bookingVehicleId, setBookingVehicleId] = useState<string | null>(null);

  const allVehicles = useMemo(
    () => (vehiclesData?.data ?? []).filter((v) => !v.isPartnerVehicle),
    [vehiclesData?.data],
  );

  const bookableVehicles = useMemo(
    () => allVehicles.filter((v) => Boolean(v.isBookable)),
    [allVehicles],
  );
  const unpublishedVehicles = useMemo(
    () => allVehicles.filter((v) => !v.isBookable),
    [allVehicles],
  );

  const activeList = viewMode === "bookable" ? bookableVehicles : unpublishedVehicles;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter(
      (v) =>
        v.licensePlate.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        (v.variant &&
          `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`.toLowerCase().includes(q)),
    );
  }, [activeList, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const availableBookable = bookableVehicles.filter((v) => v.status === "available").length;
  const onRentBookable = bookableVehicles.filter((v) => v.status === "on_rent").length;

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "الأسطول الجاهز للحجز (Fleet)" : "Fleet (Bookable Vehicles)"}
          </h1>
          <p className="mt-1 text-xs text-revix-secondary">
            {isRtl
              ? "السيارات المنشورة في السوق والجاهزة لإنشاء عقود التأجير مباشرة"
              : "Live commercial fleet published for customer bookings and rental contracts"}
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-revix-border bg-revix-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-revix-secondary">
            {isRtl ? "سيارات الأسطول النشط" : "Live Fleet Count"}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-revix-dark">{bookableVehicles.length}</div>
        </div>
        <div className="rounded-xl border border-revix-border bg-revix-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-revix-secondary">
            {isRtl ? "متاحة للحجز الآن" : "Available Now"}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">{availableBookable}</div>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-revix-border bg-revix-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-revix-secondary">
            {isRtl ? "مؤجرة حالياً" : "Currently On Rent"}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-revix-primary">{onRentBookable}</div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setViewMode("bookable");
              setPage(1);
            }}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === "bookable"
                ? "border-revix-primary bg-revix-primary text-white"
                : "border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
            }`}
          >
            {isRtl ? `الأسطول المنشور (${bookableVehicles.length})` : `Live Fleet (${bookableVehicles.length})`}
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("ready_to_publish");
              setPage(1);
            }}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === "ready_to_publish"
                ? "border-revix-primary bg-revix-primary text-white"
                : "border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
            }`}
          >
            {isRtl ? `أصول غير منشورة (${unpublishedVehicles.length})` : `Unpublished Assets (${unpublishedVehicles.length})`}
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={isRtl ? "بحث باللوحة أو الموديل..." : "Search plate or model..."}
          className="h-9 w-full max-w-xs rounded-xl border border-revix-border bg-revix-white px-3 text-xs focus:border-revix-primary focus:outline-hidden"
        />
      </div>

      <SectionCard noPadding>
        {isLoading ? (
          <EmptyState message={isRtl ? "جاري تحميل الأسطول..." : "Loading fleet..."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold uppercase tracking-wider text-revix-muted">
                  <th className="px-4 py-3 text-start">{isRtl ? "اللوحة" : "Plate"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "السيارة" : "Vehicle"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "العداد" : "Odometer"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "السعر اليومي" : "Daily Rate"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3 text-end">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/70">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-revix-secondary">
                      {viewMode === "bookable"
                        ? isRtl
                          ? "لا توجد سيارات منشورة في الأسطول بعد. انتقل إلى تبويب الأصول غير المنشورة لنشر السيارات."
                          : "No vehicles published yet. Switch to Unpublished Assets to publish vehicles."
                        : isRtl
                          ? "لا توجد أصول غير منشورة."
                          : "No unpublished assets."}
                    </td>
                  </tr>
                ) : (
                paginated.map((v) => (
                  <tr key={v.id} className="hover:bg-revix-surface/35">
                    <td className="px-4 py-3">
                      <span className="rounded-md border border-revix-border bg-revix-surface px-2 py-0.5 font-mono font-bold text-revix-dark">
                        {v.licensePlate}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-revix-dark">
                        {v.variant ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}` : "Vehicle"}
                      </div>
                      <div className="text-[11px] text-revix-secondary">{v.color} • {v.variant?.sippCode || "—"}</div>
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
))
)}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <RevixPagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        lang={isRtl ? "ar" : "en"}
      />

      <CreateContractModal
        isOpen={Boolean(bookingVehicleId)}
        isRtl={isRtl}
        initialVehicleId={bookingVehicleId}
        onClose={() => setBookingVehicleId(null)}
      />
    </div>
  );
}
