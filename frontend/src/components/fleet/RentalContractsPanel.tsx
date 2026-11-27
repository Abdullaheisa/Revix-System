"use client";

import { DataTable } from "@/components/ui/DataTable";
import { useMemo, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  customerHref,
  parseFleetResourceRoute,
  rentalContractNewHref,
  vehicleHref,
} from "@/lib/workspace/resourceRoutes";
import {
  useCancelRentalContractMutation,
  useListRentalContractsQuery,
  type RentalContractDto,
  type RentalContractStatus,
} from "@/store/api/fleetApi";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState, TableEmptyRow } from "@/components/ui/EmptyState";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CreateRentalContractPage } from "./CreateRentalContractPage";
import { CompleteContractModal } from "./CompleteContractModal";
import { RentalContractPrintModal } from "./RentalContractPrintModal";

interface RentalContractsPanelProps {
  isRtl: boolean;
}

const STATUS_BADGE: Record<RentalContractStatus, { ar: string; en: string; cls: string }> = {
  active: { ar: "ساري", en: "Active", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  completed: { ar: "مغلق", en: "Closed", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  draft: { ar: "مسودة", en: "Draft", cls: "border-slate-200 bg-slate-50 text-slate-700" },
  cancelled: { ar: "ملغي", en: "Cancelled", cls: "border-red-200 bg-red-50 text-red-700" },
};

export function RentalContractsPanel({ isRtl }: RentalContractsPanelProps) {
  const pathname = usePathname();
  const resourceRoute = parseFleetResourceRoute(pathname);
  const { data: contractsData, isLoading } = useListRentalContractsQuery();
  const [cancelContract, { isLoading: isCancelling }] = useCancelRentalContractMutation();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [completingContract, setCompletingContract] = useState<RentalContractDto | null>(null);
  const [printingContract, setPrintingContract] = useState<RentalContractDto | null>(null);
  const [cancellingContract, setCancellingContract] = useState<RentalContractDto | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const contracts = useMemo(() => contractsData?.data ?? [], [contractsData?.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.contractNumber.toLowerCase().includes(q) ||
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.vehicleAssetCode && c.vehicleAssetCode.toLowerCase().includes(q)) ||
        (c.vehiclePlate && c.vehiclePlate.toLowerCase().includes(q)) ||
        (c.vehicleName && c.vehicleName.toLowerCase().includes(q))
      );
    });
  }, [contracts, statusFilter, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const activeCount = contracts.filter((c) => c.status === "active").length;
  const completedCount = contracts.filter((c) => c.status === "completed").length;
  const totalRevenue = contracts
    .filter((c) => c.status !== "cancelled")
    .reduce((acc, c) => acc + (c.totalAmount || 0), 0);

  if (resourceRoute?.resource === "rental-contracts" && resourceRoute.action === "create") {
    return <CreateRentalContractPage isRtl={isRtl} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "عقود التأجير" : "Rental Contracts"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {filtered.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              placeholder={isRtl ? "بحث بالعقد، العميل، رقم الأصل، اللوحة..." : "Search contract, customer, Asset ID, plate..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>

          <Link
            href={rentalContractNewHref()}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إنشاء عقد جديد" : "New Contract"}</span>
          </Link>
        </div>
      </div>

      {/* Status Underline Tabs */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-revix-border">
        {[
          { id: "all", ar: "الكل", en: "All" },
          { id: "active", ar: "ساري", en: "Active" },
          { id: "completed", ar: "مغلق", en: "Closed" },
          { id: "cancelled", ar: "ملغي", en: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setStatusFilter(tab.id);
              setPage(1);
            }}
            className={`cursor-pointer shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs transition-colors ${
              statusFilter === tab.id
                ? "border-revix-primary font-semibold text-revix-primary"
                : "border-transparent text-revix-secondary hover:text-revix-dark"
            }`}
          >
            {isRtl ? tab.ar : tab.en}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
        <DataTable fitAvailableHeight className="text-xs">
          <thead>
            <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "رقم العقد" : "Contract #"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "اسم العميل" : "Customer"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "رقم اللوحة" : "Plate No."}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "نوع السيارة" : "Vehicle Type"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "بداية العقد" : "Start Date"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "نهاية العقد المتوقعة" : "Expected End"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold">{isRtl ? "عدد الأيام" : "Days"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الإجمالي" : "Total"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold">{isRtl ? "الحالة" : "Status"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold">{isRtl ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-revix-border/60">
            {isLoading ? (
              <tr><td colSpan={10} className="h-48 text-center text-xs text-revix-secondary">{isRtl ? "جاري التحميل..." : "Loading..."}</td></tr>
            ) : paginated.length === 0 ? (
              <TableEmptyRow
                colSpan={10}
                title={isRtl ? "لا توجد عقود تأجير مطابقة" : "No matching rental contracts"}
              />
            ) : paginated.map((c) => {
              const st = STATUS_BADGE[c.status] || STATUS_BADGE.active;
              return (
                <tr key={c.id} className="transition-colors hover:bg-revix-surface/60">
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-mono font-bold text-revix-primary">{c.contractNumber}</div>
                    {c.createdByUserName && (
                      <div className="mt-0.5 text-[10px] text-revix-muted">
                        {isRtl ? "بواسطة:" : "By:"} {c.createdByUserName}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {c.customerId ? (
                      <Link
                        href={customerHref(c.customerId)}
                        className="font-bold text-revix-dark transition-colors hover:text-revix-primary hover:underline"
                      >
                        {c.customerName || "—"}
                      </Link>
                    ) : (
                      <div className="font-bold text-revix-dark">{c.customerName || "—"}</div>
                    )}
                    {c.customerPhone && (
                      <div className="font-mono text-[11px] text-revix-secondary">{c.customerPhone}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {c.vehicleId ? (
                      <Link
                        href={vehicleHref(c.vehicleId)}
                        className="inline-block rounded border border-revix-border bg-revix-surface px-2 py-0.5 font-mono text-[11px] font-bold text-revix-dark transition-colors hover:border-revix-primary/40 hover:text-revix-primary"
                      >
                        {c.vehiclePlate || "—"}
                      </Link>
                    ) : (
                      <span className="inline-block rounded border border-revix-border bg-revix-surface px-2 py-0.5 font-mono text-[11px] font-bold text-revix-dark">
                        {c.vehiclePlate || "—"}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {c.vehicleId ? (
                      <Link
                        href={vehicleHref(c.vehicleId)}
                        className="font-semibold text-revix-dark transition-colors hover:text-revix-primary hover:underline"
                      >
                        {c.vehicleName || "—"}
                      </Link>
                    ) : (
                      <div className="font-semibold text-revix-dark">{c.vehicleName || "—"}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-revix-secondary whitespace-nowrap">
                    {c.startDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-revix-secondary whitespace-nowrap">
                    {c.endDate}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-semibold text-revix-dark whitespace-nowrap">
                    {c.totalDays} {isRtl ? "يوم" : "d"}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-revix-dark whitespace-nowrap" dir="ltr">
                    {c.totalAmount.toLocaleString()} {c.currencyCode || ""}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                      {isRtl ? st.ar : st.en}
                    </span>
                    {c.status === "cancelled" && c.cancelledByUserName && (
                      <div className="mt-0.5 text-[10px] text-rose-600">
                        {isRtl ? "ألغاه:" : "By:"} {c.cancelledByUserName}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPrintingContract(c)}
                        className="h-8 cursor-pointer rounded-md border border-revix-border bg-white px-2.5 text-[11px] font-semibold text-revix-dark hover:bg-revix-surface"
                      >
                        {isRtl ? "طباعة / توقيع" : "Print / Sign"}
                      </button>
                      {c.status === "active" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setCompletingContract(c)}
                            className="h-8 cursor-pointer rounded-md bg-revix-primary px-2.5 text-[11px] font-semibold text-white hover:bg-revix-primary-hover"
                          >
                            {isRtl ? "استلام وإغلاق" : "Return"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCancelError(null);
                              setCancellingContract(c);
                            }}
                            className="h-8 cursor-pointer rounded-md border border-red-200 bg-white px-2.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          >
                            {isRtl ? "إلغاء" : "Cancel"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </div>

      <div className="shrink-0 overflow-hidden rounded-lg border border-revix-border bg-revix-white empty:hidden">
        <RevixPagination compact
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          lang={isRtl ? "ar" : "en"}
          itemLabel={isRtl ? "عقد" : "contracts"}
        />
      </div>

      <CompleteContractModal
        contract={completingContract}
        isRtl={isRtl}
        onClose={() => setCompletingContract(null)}
      />

      <RentalContractPrintModal
        contract={printingContract}
        isRtl={isRtl}
        onClose={() => setPrintingContract(null)}
        onSigned={(updated) => setPrintingContract(updated)}
      />

      {cancellingContract && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => !isCancelling && setCancellingContract(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-revix-border bg-white shadow-2xl"
            dir={isRtl ? "rtl" : "ltr"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-5 py-3.5">
              <div className="flex items-center gap-2 text-rose-800">
                <RevixIcon name="info" size={16} />
                <h3 className="text-sm font-bold">
                  {isRtl
                    ? `تأكيد إلغاء العقد ${cancellingContract.contractNumber}`
                    : `Confirm Cancellation (${cancellingContract.contractNumber})`}
                </h3>
              </div>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancellingContract(null)}
                className="cursor-pointer rounded-lg p-1 text-rose-500 hover:bg-rose-100"
              >
                <RevixIcon name="x" size={15} />
              </button>
            </div>

            <div className="space-y-3.5 p-5 text-xs">
              {cancelError && <Alert variant="error" message={cancelError} />}

              <p className="leading-relaxed text-slate-700">
                {isRtl
                  ? "هل أنت متأكد من إلغاء هذا العقد؟ سيتم تحرير السيارة وإعادتها للحالة المتاحة، كما سيتم تسجيل اسمك كالموظف الذي قام بالإلغاء."
                  : "Are you sure you want to cancel this contract? The vehicle will be released back to available status, and your name will be recorded as the cancelling employee."}
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                <div className="font-bold text-slate-900">
                  {cancellingContract.customerName || "—"}
                </div>
                <div className="text-slate-600">
                  {cancellingContract.vehicleName} —{" "}
                  <span className="font-mono font-semibold">{cancellingContract.vehiclePlate}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  {cancellingContract.startDate} → {cancellingContract.endDate}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isCancelling}
                  onClick={() => setCancellingContract(null)}
                >
                  {isRtl ? "تراجع" : "Keep Contract"}
                </Button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={async () => {
                    setCancelError(null);
                    try {
                      await cancelContract(cancellingContract.id).unwrap();
                      setCancellingContract(null);
                    } catch {
                      setCancelError(
                        isRtl ? "تعذر إلغاء العقد." : "Failed to cancel contract.",
                      );
                    }
                  }}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-rose-600 px-4 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                >
                  {isCancelling
                    ? isRtl
                      ? "جاري الإلغاء..."
                      : "Cancelling..."
                    : isRtl
                      ? "تأكيد الإلغاء"
                      : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
