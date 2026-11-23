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
import { EmptyState } from "@/components/ui/EmptyState";
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
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "عقود التأجير" : "Rental Contracts"}
          </h1>
          <p className="mt-1 text-xs text-revix-secondary">
            {isRtl
              ? "إدارة عقود الإيجار، تسليم واستلام السيارات، وحساب الأيام والشرائح تلقائياً"
              : "Manage active rentals, vehicle check-out/return, and automated tiered billing"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-revix-primary px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
        >
          <RevixIcon name="plus" size={15} />
          <span>{isRtl ? "إنشاء عقد جديد" : "New Contract"}</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-revix-border bg-revix-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-revix-secondary">
            {isRtl ? "عقود سارية حالياً" : "Active Contracts"}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-700">{activeCount}</div>
        </div>
        <div className="rounded-xl border border-revix-border bg-revix-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-revix-secondary">
            {isRtl ? "عقود مكتملة" : "Completed"}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-revix-dark">{completedCount}</div>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-revix-border bg-revix-white p-4 shadow-2xs">
          <div className="text-[11px] font-semibold text-revix-secondary">
            {isRtl ? "إجمالي قيمة العقود" : "Total Contract Value"}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-revix-primary">
            {totalRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
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
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? "border-revix-primary bg-revix-primary text-white"
                  : "border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
              }`}
            >
              {isRtl ? tab.ar : tab.en}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={isRtl ? "بحث برقم العقد أو العميل أو اللوحة..." : "Search contract, customer, plate..."}
          className="h-9 w-full max-w-xs rounded-xl border border-revix-border bg-revix-white px-3 text-xs focus:border-revix-primary focus:outline-hidden"
        />
      </div>

      <SectionCard noPadding>
        {isLoading ? (
          <EmptyState message={isRtl ? "جاري تحميل عقود التأجير..." : "Loading contracts..."} />
        ) : paginated.length === 0 ? (
          <EmptyState message={isRtl ? "لا توجد عقود تأجير مطابقة." : "No matching rental contracts."} />
        ) : (
          <div className="overflow-x-auto">
            <DataTable className="w-full text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold uppercase tracking-wider text-revix-muted">
                  <th className="px-4 py-3 text-start">{isRtl ? "رقم العقد" : "Contract #"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "العميل" : "Customer"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "السيارة" : "Vehicle"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "الفترة" : "Dates"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "الإجمالي" : "Total"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3 text-end">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/70">
                {paginated.map((c) => {
                  const st = STATUS_BADGE[c.status] || STATUS_BADGE.active;
                  return (
                    <tr key={c.id} className="hover:bg-revix-surface/35">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-revix-primary">
                          {c.contractNumber}
                        </div>
                        {c.createdByUserName && (
                          <div className="mt-0.5 text-[10px] text-revix-muted">
                            {isRtl ? "بواسطة:" : "By:"} {c.createdByUserName}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-revix-dark">{c.customerName || "—"}</div>
                        {c.customerPhone && (
                          <div className="font-mono text-[11px] text-revix-secondary">{c.customerPhone}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-revix-dark">{c.vehicleName || "—"}</div>
                        <span className="rounded border border-revix-border bg-revix-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-revix-dark">
                          {c.vehiclePlate}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-revix-secondary">
                        <div>{c.startDate} → {c.endDate}</div>
                        <div className="text-[11px]">{c.totalDays} {isRtl ? "يوم" : "d"}</div>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-revix-dark">
                        {c.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                          {isRtl ? st.ar : st.en}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        {c.status === "active" ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCompletingContract(c)}
                              className="cursor-pointer rounded-md bg-revix-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-revix-primary-hover"
                            >
                              {isRtl ? "استلام وإغلاق" : "Return"}
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelContract(c.id)}
                              className="cursor-pointer rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
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
