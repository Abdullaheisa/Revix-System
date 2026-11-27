"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { DetailTileGrid } from "@/components/shared/workspace";
import { rentalContractHref, vehicleHref } from "@/lib/workspace/resourceRoutes";
import {
  useListRentalContractsQuery,
  type CustomerDto,
  type RentalContractDto,
  type RentalContractStatus,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { RentalContractPrintModal } from "./RentalContractPrintModal";
import { CreateContractModal } from "./CreateContractModal";
import { CustomerFormModal } from "./CustomerFormModal";

interface CustomerDetailPageProps {
  customer: CustomerDto;
  isRtl: boolean;
  onBack: () => void;
}

const STATUS_BADGE: Record<
  RentalContractStatus,
  { ar: string; en: string; cls: string }
> = {
  active: {
    ar: "ساري",
    en: "Active",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  completed: {
    ar: "مغلق",
    en: "Closed",
    cls: "border-blue-200 bg-blue-50 text-blue-700",
  },
  draft: {
    ar: "مسودة",
    en: "Draft",
    cls: "border-slate-200 bg-slate-50 text-slate-700",
  },
  cancelled: {
    ar: "ملغي",
    en: "Cancelled",
    cls: "border-red-200 bg-red-50 text-red-700",
  },
};

function renderConditionBadge(condition: string | null | undefined, isRtl: boolean) {
  if (!condition) {
    return <span className="text-revix-muted">—</span>;
  }
  switch (condition) {
    case "good":
      return (
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
          {isRtl ? "سليمة — ممتازة" : "Good Condition"}
        </span>
      );
    case "minor_damage":
      return (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
          {isRtl ? "خدوش بسيطة" : "Minor Scratches"}
        </span>
      );
    case "needs_maintenance":
      return (
        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10.5px] font-semibold text-rose-700">
          {isRtl ? "بها ضرر / صيانة" : "Damaged / Maint."}
        </span>
      );
    default:
      return <span className="text-xs font-medium text-revix-dark">{condition}</span>;
  }
}

export function CustomerDetailPage({
  customer,
  isRtl,
  onBack,
}: CustomerDetailPageProps) {
  const { data: contractsData, isLoading } = useListRentalContractsQuery();
  const { data: ctx } = useGetWorkspaceContextQuery();
  const currency = ctx?.data?.company?.baseCurrency || "EGP";

  const [activeTab, setActiveTab] = useState<"overview" | "contracts">("overview");
  const [printingContract, setPrintingContract] =
    useState<RentalContractDto | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const customerContracts = useMemo(
    () =>
      (contractsData?.data ?? []).filter((c) => c.customerId === customer.id),
    [contractsData?.data, customer.id],
  );

  const stats = useMemo(() => {
    const active = customerContracts.filter((c) => c.status === "active").length;
    const completed = customerContracts.filter(
      (c) => c.status === "completed",
    ).length;
    const totalSpent = customerContracts
      .filter((c) => c.status !== "cancelled")
      .reduce((acc, c) => acc + Number(c.totalAmount || 0), 0);
    return {
      total: customerContracts.length,
      active,
      completed,
      totalSpent,
    };
  }, [customerContracts]);

  return (
    <div
      className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-4 overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            title={isRtl ? "العودة للعملاء" : "Back to customers"}
            aria-label={isRtl ? "العودة للعملاء" : "Back to customers"}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface"
          >
            <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
          </button>

          <h1 className="truncate text-lg font-bold text-revix-dark sm:text-xl">
            {customer.fullName}
          </h1>

          {customer.customerCode && (
            <span
              dir="ltr"
              className="shrink-0 rounded-md bg-revix-accent-soft px-2.5 py-0.5 font-mono text-xs font-bold text-revix-primary"
            >
              {customer.customerCode}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-white px-3.5 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
          >
            <span>{isRtl ? "تعديل البيانات" : "Edit Details"}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "حجز سيارة للعميل" : "New Contract"}</span>
          </button>
        </div>
      </div>

      {/* Underline Tabs */}
      <nav
        aria-label={isRtl ? "أقسام العميل" : "Customer sections"}
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-revix-border"
      >
        {[
          { id: "overview" as const, label: isRtl ? "نظرة عامة" : "Overview" },
          {
            id: "contracts" as const,
            label: isRtl ? "العقود والتحركات" : "Contracts & Movements",
            count: customerContracts.length,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "border-revix-primary font-semibold text-revix-primary"
                  : "border-transparent text-revix-secondary hover:text-revix-dark"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="rounded bg-revix-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {activeTab === "overview" && (
          <DetailTileGrid
            columns={4}
            items={[
              ...(customer.customerCode
                ? [
                    {
                      label: "Customer ID",
                      value: customer.customerCode,
                      valueClassName: "font-mono font-bold text-revix-primary",
                    },
                  ]
                : []),
              { label: isRtl ? "الاسم الكامل" : "Full Name", value: customer.fullName },
              { label: isRtl ? "الهاتف" : "Phone", value: customer.phone },
              {
                label: isRtl ? "هاتف إضافي" : "Secondary Phone",
                value: customer.secondaryPhone || "—",
              },
              { label: isRtl ? "البريد الإلكتروني" : "Email", value: customer.email || "—" },
              {
                label: isRtl ? "الهوية / الجواز" : "National ID",
                value: customer.nationalId || "—",
              },
              {
                label: isRtl ? "رخصة القيادة" : "Driver License #",
                value: customer.driverLicenseNo || "—",
              },
              {
                label: isRtl ? "انتهاء الرخصة" : "License Expiry",
                value: customer.licenseExpiry || "—",
              },
              {
                label: isRtl ? "الجنسية" : "Nationality",
                value: customer.nationality || "—",
              },
              { label: isRtl ? "العنوان" : "Address", value: customer.address || "—" },
              {
                label: isRtl ? "عنوان العمل" : "Work Address",
                value: customer.workAddress || "—",
              },
              { label: isRtl ? "ملاحظات" : "Notes", value: customer.notes || "—" },
              {
                label: isRtl ? "إجمالي العقود" : "Total Contracts",
                value: String(stats.total),
              },
              {
                label: isRtl ? "عقود سارية" : "Active Contracts",
                value: String(stats.active),
                valueClassName: "text-emerald-700",
              },
              {
                label: isRtl ? "عقود مكتملة" : "Completed",
                value: String(stats.completed),
              },
              {
                label: isRtl ? "إجمالي التعاملات" : "Total Spent",
                value: `${stats.totalSpent.toLocaleString()} ${currency}`,
                valueClassName: "text-revix-primary",
              },
            ]}
          />
        )}

        {activeTab === "contracts" && (
          <section className="overflow-hidden rounded-xl border border-revix-border bg-revix-white">
          <div className="flex items-center justify-between border-b border-revix-border bg-revix-surface/75 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-revix-dark">
                {isRtl
                  ? "العقود وتحركات استلام وتسليم السيارات"
                  : "Contracts & Vehicle Handover History"}
              </h2>
              <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
                {customerContracts.length}
              </span>
            </div>
          </div>

          <DataTable className="text-xs">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                <th className="whitespace-nowrap px-3.5 py-2.5 text-start">
                  {isRtl ? "رقم العقد" : "Contract #"}
                </th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-start">
                  {isRtl ? "رقم اللوحة" : "Plate No."}
                </th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-start">
                  {isRtl ? "نوع السيارة" : "Vehicle Type"}
                </th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-start">
                  {isRtl ? "بداية العقد" : "Start Date"}
                </th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-start">
                  {isRtl ? "نهاية العقد المتوقعة" : "Expected End"}
                </th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-center">
                  {isRtl ? "عدد الأيام" : "Days"}
                </th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-start">
                  {isRtl ? "الإجمالي" : "Total"}
                </th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-center">
                  {isRtl ? "الحالة" : "Status"}
                </th>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-end">
                  {isRtl ? "إجراء" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-revix-secondary">
                    {isRtl ? "جاري التحميل..." : "Loading..."}
                  </td>
                </tr>
              ) : customerContracts.length === 0 ? (
                <TableEmptyRow
                  colSpan={9}
                  title={isRtl ? "لا توجد عقود مسجلة لهذا العميل" : "No contracts for this customer"}
                  description={
                    isRtl
                      ? "عند إنشاء عقد تأجير لهذا العميل ستظهر هنا كافة التواريخ وحالة استلام وتسليم السيارات."
                      : "Rental contracts, dates, and vehicle handover conditions will appear here."
                  }
                />
              ) : (
                customerContracts.map((c) => {
                  const st = STATUS_BADGE[c.status] || STATUS_BADGE.active;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-revix-surface/40">
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <Link
                          href={rentalContractHref(c.id)}
                          className="font-mono font-bold text-revix-primary hover:underline"
                          dir="ltr"
                        >
                          {c.contractNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <Link
                          href={vehicleHref(c.vehicleId)}
                          className="inline-block rounded border border-revix-border bg-revix-surface px-2 py-0.5 font-mono text-[11px] font-bold text-revix-dark transition-colors hover:border-revix-primary/40 hover:text-revix-primary"
                        >
                          {c.vehiclePlate || "—"}
                        </Link>
                      </td>
                      <td className="px-3.5 py-3">
                        <Link
                          href={vehicleHref(c.vehicleId)}
                          className="font-semibold text-revix-dark hover:text-revix-primary hover:underline"
                        >
                          {c.vehicleName || "—"}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 font-mono text-revix-secondary">
                        {c.startDate}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 font-mono text-revix-secondary">
                        {c.endDate}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 text-center font-mono font-semibold text-revix-dark">
                        {c.totalDays} {isRtl ? "يوم" : "d"}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 font-mono font-bold text-revix-dark" dir="ltr">
                        {Number(c.totalAmount).toLocaleString()} {c.currencyCode || currency}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}
                        >
                          {isRtl ? st.ar : st.en}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={rentalContractHref(c.id)}
                            className="inline-flex h-8 items-center rounded-md border border-revix-border bg-white px-2.5 text-[11px] font-semibold text-revix-primary hover:bg-revix-surface"
                          >
                            {isRtl ? "التفاصيل" : "Details"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPrintingContract(c)}
                            className="h-8 cursor-pointer rounded-md border border-revix-border bg-white px-2.5 text-[11px] font-semibold text-revix-dark hover:bg-revix-surface"
                          >
                            {isRtl ? "طباعة / توقيع" : "Print / Sign"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </DataTable>
        </section>
        )}
      </div>

      <CreateContractModal
        isOpen={isCreateOpen}
        isRtl={isRtl}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(created) => setPrintingContract(created)}
      />

      <RentalContractPrintModal
        contract={printingContract}
        isRtl={isRtl}
        onClose={() => setPrintingContract(null)}
        onSigned={(updated) => setPrintingContract(updated)}
      />

      <CustomerFormModal
        isOpen={isEditOpen}
        isRtl={isRtl}
        editingCustomer={customer}
        onClose={() => setIsEditOpen(false)}
      />
    </div>
  );
}
