"use client";

import { useMemo, useState } from "react";
import {
  useDeleteCustomerMutation,
  useListCustomersQuery,
  type CustomerDto,
} from "@/store/api/fleetApi";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { CustomerFormModal } from "./CustomerFormModal";

interface CustomersPanelProps {
  isRtl: boolean;
}

export function CustomersPanel({ isRtl }: CustomersPanelProps) {
  const { data: customersData, isLoading } = useListCustomersQuery();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);

  const customers = useMemo(() => customersData?.data ?? [], [customersData?.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.nationalId && c.nationalId.toLowerCase().includes(q)) ||
        (c.driverLicenseNo && c.driverLicenseNo.toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "العملاء" : "Customers"}
          </h1>
          <p className="mt-1 text-xs text-revix-secondary">
            {isRtl
              ? "دليل العملاء وبيانات الهوية ورخص القيادة لربطها بعقود التأجير"
              : "Renter directory, national IDs, and driver license compliance"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCustomer(null);
            setIsModalOpen(true);
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-revix-primary px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
        >
          <RevixIcon name="plus" size={15} />
          <span>{isRtl ? "إضافة عميل" : "Add Customer"}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={isRtl ? "بحث بالاسم أو الهاتف أو الرقم القومي..." : "Search name, phone, ID, license..."}
            className="h-9 w-full rounded-xl border border-revix-border bg-revix-white px-3.5 text-xs focus:border-revix-primary focus:outline-hidden"
          />
        </div>
        <div className="text-xs text-revix-secondary font-mono">
          {isRtl ? `الإجمالي: ${filtered.length}` : `Total: ${filtered.length}`}
        </div>
      </div>

      <SectionCard noPadding>
        {isLoading ? (
          <EmptyState message={isRtl ? "جاري تحميل بيانات العملاء..." : "Loading customers..."} />
        ) : paginated.length === 0 ? (
          <EmptyState message={isRtl ? "لا يوجد عملاء مسجلون حتى الآن." : "No customers registered yet."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold uppercase tracking-wider text-revix-muted">
                  <th className="px-4 py-3 text-start">{isRtl ? "العميل" : "Customer"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "الهاتف" : "Phone"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "الهوية / الجواز" : "National ID"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "رخصة القيادة" : "Driver License"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "انتهاء الرخصة" : "License Expiry"}</th>
                  <th className="px-4 py-3 text-end">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/70">
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-revix-surface/35">
                    <td className="px-4 py-3">
                      <div className="font-bold text-revix-dark">{c.fullName}</div>
                      {c.email && <div className="text-[11px] text-revix-secondary">{c.email}</div>}
                    </td>
                    <td className="px-3 py-3 font-mono text-revix-dark">{c.phone}</td>
                    <td className="px-3 py-3 font-mono text-revix-secondary">{c.nationalId || "—"}</td>
                    <td className="px-3 py-3 font-mono text-revix-secondary">{c.driverLicenseNo || "—"}</td>
                    <td className="px-3 py-3 font-mono text-revix-secondary">{c.licenseExpiry || "—"}</td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCustomer(c);
                            setIsModalOpen(true);
                          }}
                          className="cursor-pointer rounded-md border border-revix-border px-2.5 py-1 text-[11px] font-semibold text-revix-dark hover:bg-revix-surface"
                        >
                          {isRtl ? "تعديل" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomer(c.id)}
                          className="cursor-pointer rounded-md p-1.5 text-red-500 hover:bg-red-50"
                          title={isRtl ? "حذف" : "Delete"}
                        >
                          <RevixIcon name="trash-2" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      <CustomerFormModal
        isOpen={isModalOpen}
        isRtl={isRtl}
        editingCustomer={editingCustomer}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
