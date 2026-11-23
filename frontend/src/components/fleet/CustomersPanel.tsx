"use client";

import { DataTable } from "@/components/ui/DataTable";
import { useMemo, useState } from "react";
import {
  useDeleteCustomerMutation,
  useListCustomersQuery,
  type CustomerDto,
} from "@/store/api/fleetApi";
import { SectionCard } from "@/components/ui/SectionCard";
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
        (c.secondaryPhone && c.secondaryPhone.toLowerCase().includes(q)) ||
        (c.nationalId && c.nationalId.toLowerCase().includes(q)) ||
        (c.driverLicenseNo && c.driverLicenseNo.toLowerCase().includes(q)),
    );
  }, [customers, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "العملاء" : "Customers"}
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
              placeholder={isRtl ? "بحث بالاسم، الهاتف، الهوية..." : "Search name, phone, ID..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إضافة عميل" : "Add Customer"}</span>
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
        <DataTable fitAvailableHeight className="text-xs">
          <thead>
            <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "العميل" : "Customer"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الهاتف" : "Phone"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الهوية / الجواز" : "National ID"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "رخصة القيادة" : "Driver License"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "انتهاء الرخصة" : "License Expiry"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold">{isRtl ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-revix-border/60">
            {isLoading ? (
              <tr><td colSpan={6} className="h-48 text-center text-xs text-revix-secondary">{isRtl ? "جاري التحميل..." : "Loading..."}</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={6} className="h-48 text-center text-sm text-revix-secondary">{isRtl ? "لا يوجد عملاء مسجلون" : "No customers registered"}</td></tr>
            ) : (
            paginated.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-revix-surface/60">
                <td className="py-2.5 px-3">
                  <div className="font-bold text-revix-dark">{c.fullName}</div>
                  {c.email && <div className="text-[11px] text-revix-secondary">{c.email}</div>}
                </td>
                <td className="py-2.5 px-3 font-mono text-revix-dark whitespace-nowrap">
                  <div>{c.phone}</div>
                  {c.secondaryPhone && (
                    <div className="text-[11px] text-revix-secondary">{c.secondaryPhone}</div>
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono text-revix-secondary whitespace-nowrap">{c.nationalId || "—"}</td>
                <td className="py-2.5 px-3 font-mono text-revix-secondary whitespace-nowrap">{c.driverLicenseNo || "—"}</td>
                <td className="py-2.5 px-3 font-mono text-revix-secondary whitespace-nowrap">{c.licenseExpiry || "—"}</td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  <div className="inline-flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomer(c);
                        setIsModalOpen(true);
                      }}
                      className="h-8 cursor-pointer rounded-md border border-revix-border bg-white px-2.5 text-[11px] font-semibold text-revix-dark hover:bg-revix-surface"
                    >
                      {isRtl ? "تعديل" : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCustomer(c.id)}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50"
                      title={isRtl ? "حذف" : "Delete"}
                    >
                      <RevixIcon name="trash-2" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
            )}
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
          itemLabel={isRtl ? "عميل" : "customers"}
        />
      </div>

      <CustomerFormModal
        isOpen={isModalOpen}
        isRtl={isRtl}
        editingCustomer={editingCustomer}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
