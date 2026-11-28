"use client";

import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { customerHref, parseFleetResourceRoute } from "@/lib/workspace/resourceRoutes";
import { navigateBackOrFallback } from "@/lib/workspace/useSmartBack";
import {
  useDeleteCustomerMutation,
  useListCustomersQuery,
  type CustomerDto,
} from "@/store/api/fleetApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";
import { smartMatch } from "@/lib/search/smartSearch";
import { CustomerFormModal } from "./CustomerFormModal";
import { CustomerDetailPage } from "./CustomerDetailPage";

interface CustomersPanelProps {
  isRtl: boolean;
}

export function CustomersPanel({ isRtl }: CustomersPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const resourceRoute = parseFleetResourceRoute(pathname);
  const detailCustomerId =
    resourceRoute?.resource === "customers" ? resourceRoute.id : null;
  const isCreateMode =
    resourceRoute?.resource === "customers" && resourceRoute.action === "create";

  const { data: customersData, isLoading } = useListCustomersQuery();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const customers = useMemo(() => customersData?.data ?? [], [customersData?.data]);

  const detailCustomer = useMemo(
    () =>
      detailCustomerId
        ? customers.find((c) => c.id === detailCustomerId) ?? null
        : null,
    [customers, detailCustomerId],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    return customers.filter((c) =>
      smartMatch(search, {
        id: [c.customerCode],
        name: [c.fullName],
        phone: [c.phone, c.secondaryPhone],
        extra: [c.nationalId, c.driverLicenseNo],
      }),
    );
  }, [customers, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  if (detailCustomerId && detailCustomer) {
    return (
      <CustomerDetailPage
        customer={detailCustomer}
        isRtl={isRtl}
        onBack={() => navigateBackOrFallback(router, customerHref())}
      />
    );
  }

  if (isCreateMode) {
    return (
      <CustomerFormModal
        variant="page"
        isOpen
        isRtl={isRtl}
        editingCustomer={null}
        onClose={() => router.push(customerHref())}
      />
    );
  }

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
          <SmartSearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            isRtl={isRtl}
            placeholder={isRtl ? "بحث ذكي: كود، اسم، هاتف..." : "Smart search: ID, name, phone..."}
            className="w-60"
          />

          <button
            type="button"
            onClick={() => router.push(customerHref("new"))}
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
              <th scope="col" className="sticky top-0 z-10 w-[1%] select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">Customer ID</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "العميل" : "Customer"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الهاتف" : "Phone"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الهوية / الجواز" : "National ID"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "رخصة القيادة" : "Driver License"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "انتهاء الرخصة" : "License Expiry"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-revix-border/60">
            {isLoading ? (
              <tr><td colSpan={6} className="h-48 text-center text-xs text-revix-secondary">{isRtl ? "جاري التحميل..." : "Loading..."}</td></tr>
            ) : paginated.length === 0 ? (
              <TableEmptyRow
                colSpan={6}
                title={isRtl ? "لا يوجد عملاء مسجلون" : "No customers registered"}
                description={
                  isRtl
                    ? "أضف بيانات العملاء لربطها بعقود الإيجار والفواتير."
                    : "Register customer profiles to link them with rental contracts."
                }
              />
            ) : (
            paginated.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(customerHref(c.id))}
                className="cursor-pointer transition-colors hover:bg-revix-surface/60"
              >
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span dir="ltr" className="rounded bg-revix-accent-soft px-2 py-0.5 font-mono text-[11px] font-bold text-revix-primary">
                    {c.customerCode || "—"}
                  </span>
                </td>
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

    </div>
  );
}
