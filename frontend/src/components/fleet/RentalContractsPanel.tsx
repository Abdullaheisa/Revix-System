"use client";

import { DataTable } from "@/components/ui/DataTable";
import { useMemo, useState } from "react";
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
import { CreateContractModal } from "./CreateContractModal";
import { CompleteContractModal } from "./CompleteContractModal";

interface RentalContractsPanelProps {
  isRtl: boolean;
}

const STATUS_BADGE: Record<RentalContractStatus, { ar: string; en: string; cls: string }> = {
  active: { ar: "ساري", en: "Active", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  completed: { ar: "مكتمل", en: "Completed", cls: "border-blue-200 bg-blue-50 text-blue-700" },
  draft: { ar: "مسودة", en: "Draft", cls: "border-slate-200 bg-slate-50 text-slate-700" },
  cancelled: { ar: "ملغي", en: "Cancelled", cls: "border-red-200 bg-red-50 text-red-700" },
};

export function RentalContractsPanel({ isRtl }: RentalContractsPanelProps) {
  const { data: contractsData, isLoading } = useListRentalContractsQuery();
  const [cancelContract] = useCancelRentalContractMutation();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [completingContract, setCompletingContract] = useState<RentalContractDto | null>(null);

  const contracts = useMemo(() => contractsData?.data ?? [], [contractsData?.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.contractNumber.toLowerCase().includes(q) ||
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
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
              placeholder={isRtl ? "بحث بالعقد، العميل، اللوحة..." : "Search contract, customer, plate..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إنشاء عقد جديد" : "New Contract"}</span>
          </button>
        </div>
      </div>

      {/* Status Underline Tabs */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-revix-border">
        {[
          { id: "all", ar: "الكل", en: "All" },
          { id: "active", ar: "ساري", en: "Active" },
          { id: "completed", ar: "مكتمل", en: "Completed" },
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
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "العميل" : "Customer"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "السيارة" : "Vehicle"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الفترة" : "Dates"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الإجمالي" : "Total"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold">{isRtl ? "الحالة" : "Status"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold">{isRtl ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-revix-border/60">
            {isLoading ? (
              <tr><td colSpan={7} className="h-48 text-center text-xs text-revix-secondary">{isRtl ? "جاري التحميل..." : "Loading..."}</td></tr>
            ) : paginated.length === 0 ? (
              <TableEmptyRow
                colSpan={7}
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
                    <div className="font-bold text-revix-dark">{c.customerName || "—"}</div>
                    {c.customerPhone && (
                      <div className="font-mono text-[11px] text-revix-secondary">{c.customerPhone}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-revix-dark">{c.vehicleName || "—"}</div>
                    <span className="rounded border border-revix-border bg-revix-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-revix-dark">
                      {c.vehiclePlate}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-revix-secondary whitespace-nowrap">
                    <div>{c.startDate} → {c.endDate}</div>
                    <div className="text-[11px]">{c.totalDays} {isRtl ? "يوم" : "d"}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-revix-dark whitespace-nowrap">
                    {c.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                      {isRtl ? st.ar : st.en}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {c.status === "active" ? (
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCompletingContract(c)}
                          className="h-8 cursor-pointer rounded-md bg-revix-primary px-2.5 text-[11px] font-semibold text-white hover:bg-revix-primary-hover"
                        >
                          {isRtl ? "استلام وإغلاق" : "Return"}
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelContract(c.id)}
                          className="h-8 cursor-pointer rounded-md border border-red-200 bg-white px-2.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                        >
                          {isRtl ? "إلغاء" : "Cancel"}
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] text-revix-muted">
                        {c.returnOdometer != null ? `${c.returnOdometer.toLocaleString()} km` : "—"}
                      </span>
                    )}
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

      <CreateContractModal
        isOpen={isCreateOpen}
        isRtl={isRtl}
        onClose={() => setIsCreateOpen(false)}
      />

      <CompleteContractModal
        contract={completingContract}
        isRtl={isRtl}
        onClose={() => setCompletingContract(null)}
      />
    </div>
  );
}
