"use client";

import { useState, type ReactNode } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useCancelRentalContractMutation,
  useGetRentalContractDetailsQuery,
  type ContractAuditLogDto,
  type ContractVoucherType,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import {
  customerHref,
  rentalContractHref,
  vehicleHref,
} from "@/lib/workspace/resourceRoutes";
import { navigateBackOrFallback } from "@/lib/workspace/useSmartBack";
import { formatCompanyDateTime } from "@/lib/date/companyDate";
import { CompleteContractModal } from "./CompleteContractModal";
import { RentalContractPrintModal } from "./RentalContractPrintModal";
import { ContractVoucherModal } from "./vouchers/ContractVoucherModal";
import {
  PAYMENT_METHOD_LABELS,
  VOUCHER_TYPE_META,
} from "./vouchers/VoucherPrintSheet";

interface RentalContractDetailPageProps {
  contractId: string;
  isRtl: boolean;
}

const STATUS_BADGE: Record<
  string,
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

function getActionMeta(action: string, isRtl: boolean) {
  switch (action) {
    case "fleet.rental_contract_created":
      return {
        label: isRtl ? "إنشاء عقد الإيجار" : "Contract Created",
        cls: "bg-emerald-500",
      };
    case "fleet.rental_contract_signed":
      return {
        label: isRtl ? "توقيع العقد" : "Contract Signed",
        cls: "bg-indigo-500",
      };
    case "fleet.rental_contract_completed":
      return {
        label: isRtl ? "استلام السيارة وإغلاق العقد" : "Vehicle Returned & Contract Closed",
        cls: "bg-blue-600",
      };
    case "fleet.rental_contract_cancelled":
      return {
        label: isRtl ? "إلغاء العقد" : "Contract Cancelled",
        cls: "bg-rose-600",
      };
    case "fleet.contract_voucher_receipt":
      return {
        label: isRtl ? "إصدار سند قبض" : "Receipt Voucher Issued",
        cls: "bg-emerald-600",
      };
    case "fleet.contract_voucher_payment":
      return {
        label: isRtl ? "إصدار سند دفع" : "Payment Voucher Issued",
        cls: "bg-amber-500",
      };
    case "fleet.contract_voucher_refund":
      return {
        label: isRtl ? "إصدار سند مرتجع" : "Refund Voucher Issued",
        cls: "bg-rose-500",
      };
    default:
      return {
        label: action,
        cls: "bg-slate-400",
      };
  }
}

function formatAuditMetadata(log: ContractAuditLogDto, isRtl: boolean): string {
  const m = log.metadata ?? {};
  const parts: string[] = [];
  if (m.voucherNumber) parts.push(`${m.voucherNumber}`);
  if (m.amount != null) {
    parts.push(`${isRtl ? "المبلغ:" : "Amount:"} ${Number(m.amount).toLocaleString()}`);
  }
  if (m.paymentMethod) {
    const pm =
      PAYMENT_METHOD_LABELS[
        String(m.paymentMethod) as keyof typeof PAYMENT_METHOD_LABELS
      ];
    parts.push(pm ? (isRtl ? pm.ar : pm.en) : String(m.paymentMethod));
  }
  if (m.returnOdometer != null) {
    parts.push(
      `${isRtl ? "عداد العودة:" : "Return ODO:"} ${Number(m.returnOdometer).toLocaleString()} km`,
    );
  }
  return parts.join(" • ");
}

function InfoRow({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-xs">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span
        dir={ltr ? "ltr" : undefined}
        className="text-end font-semibold text-slate-900"
      >
        {value}
      </span>
    </div>
  );
}

export function RentalContractDetailPage({
  contractId,
  isRtl,
}: RentalContractDetailPageProps) {
  const router = useRouter();
  const { data, isLoading, isFetching, error, refetch } =
    useGetRentalContractDetailsQuery(contractId);

  const [cancelContract, { isLoading: isCancelling }] =
    useCancelRentalContractMutation();

  const [printingContract, setPrintingContract] =
    useState<RentalContractDto | null>(null);
  const [completingContract, setCompletingContract] =
    useState<RentalContractDto | null>(null);
  const [voucherModal, setVoucherModal] = useState<{
    contract: RentalContractDto;
    type: ContractVoucherType;
  } | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "vouchers" | "activity">(
    "overview",
  );

  const handleBack = () =>
    navigateBackOrFallback(router, rentalContractHref());

  if (isLoading || !data?.data || error) {
    return (
      <ResourceFeedback
        isRtl={isRtl}
        isLoading={isLoading || isFetching}
        error={error}
        onRetry={() => {
          void refetch();
        }}
        onBack={handleBack}
        loadingTitle={
          isRtl ? "جارٍ تحميل تفاصيل العقد..." : "Loading contract details..."
        }
        backLabel={isRtl ? "العودة لعقود التأجير" : "Back to Contracts"}
      />
    );
  }

  const { contract, vouchers, auditLogs } = data.data;
  const st = STATUS_BADGE[contract.status] || STATUS_BADGE.active;
  const currency = contract.currencyCode || "EGP";
  const remaining = Math.max(
    0,
    Number(contract.totalAmount || 0) - Number(contract.paidAmount || 0),
  );
  const drivenKm =
    contract.returnOdometer != null
      ? Math.max(0, contract.returnOdometer - Number(contract.pickupOdometer || 0))
      : null;

  return (
    <div
      className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-5 overflow-y-auto pb-10"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Clean Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            title={isRtl ? "رجوع" : "Back"}
            aria-label={isRtl ? "رجوع" : "Back"}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={15} />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-xl font-extrabold tracking-tight text-slate-900">
                {contract.contractNumber}
              </h1>
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}
              >
                {isRtl ? st.ar : st.en}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-slate-500" dir="ltr">
              {contract.startDate} → {contract.endDate} (
              {contract.actualDays ?? contract.totalDays} {isRtl ? "يوم" : "d"})
            </p>
          </div>
        </div>

        {/* Compact Action Bar: Print + Return (if active) + More Menu */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPrintingContract(contract)}
            className="h-9 rounded-xl px-3.5 text-xs"
          >
            <RevixIcon name="file-text" size={14} />
            <span>{isRtl ? "طباعة / توقيع" : "Print / Sign"}</span>
          </Button>

          {contract.status === "active" && (
            <Button
              type="button"
              variant="primary"
              onClick={() => setCompletingContract(contract)}
              className="h-9 rounded-xl px-4 text-xs"
            >
              <span>{isRtl ? "استلام وإغلاق" : "Return & Close"}</span>
            </Button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsMenuOpen((v) => !v)}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <span>{isRtl ? "السندات والمزيد" : "Vouchers & More"}</span>
              <RevixIcon name="chevron-down" size={14} />
            </button>

            {actionsMenuOpen && (
              <div
                onMouseLeave={() => setActionsMenuOpen(false)}
                className={`absolute top-full z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 text-xs shadow-xl ${
                  isRtl ? "left-0" : "right-0"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    setVoucherModal({ contract, type: "receipt" });
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-medium text-emerald-800 hover:bg-emerald-50/70"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{isRtl ? "سند قبض" : "Receipt Voucher"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    setVoucherModal({ contract, type: "payment" });
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-medium text-amber-800 hover:bg-amber-50/70"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>{isRtl ? "سند دفع" : "Payment Voucher"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    setVoucherModal({ contract, type: "refund" });
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-medium text-rose-700 hover:bg-rose-50/70"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>{isRtl ? "سند مرتجع" : "Refund Voucher"}</span>
                </button>

                {contract.status !== "cancelled" && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        setCancelError(null);
                        setIsCancelOpen(true);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-start font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <RevixIcon name="x" size={14} />
                      <span>{isRtl ? "إلغاء العقد" : "Cancel Contract"}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page Tabs */}
      <nav
        className="flex gap-1 border-b border-slate-200 shrink-0 overflow-x-auto"
        aria-label={isRtl ? "تبويبات تفاصيل العقد" : "Contract detail tabs"}
      >
        {[
          {
            id: "overview" as const,
            label: isRtl ? "نظرة عامة والتفاصيل" : "Overview & Details",
          },
          {
            id: "vouchers" as const,
            label: isRtl ? "السندات المالية" : "Financial Vouchers",
            count: vouchers.length,
          },
          {
            id: "activity" as const,
            label: isRtl ? "سجل إجراءات الموظفين" : "Employee Activity Log",
            count: auditLogs.length,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-xs transition-colors ${
                isActive
                  ? "border-revix-primary font-bold text-revix-primary"
                  : "border-transparent font-medium text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              {"count" in tab && tab.count !== undefined && (
                <span
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ${
                    isActive
                      ? "bg-emerald-50 text-revix-primary"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Clean Financial KPI Strip */}
          <div className="grid grid-cols-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse">
            <div className="p-4">
              <div className="text-[11px] font-medium text-slate-500">
                {isRtl ? "إجمالي العقد" : "Total Amount"}
              </div>
              <div className="mt-1 font-mono text-lg font-extrabold text-slate-900" dir="ltr">
                {Number(contract.totalAmount || 0).toLocaleString()} {currency}
              </div>
            </div>
            <div className="p-4">
              <div className="text-[11px] font-medium text-slate-500">
                {isRtl ? "المدفوع" : "Paid Amount"}
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-emerald-700" dir="ltr">
                {Number(contract.paidAmount || 0).toLocaleString()} {currency}
              </div>
            </div>
            <div className="p-4">
              <div className="text-[11px] font-medium text-slate-500">
                {isRtl ? "المتبقي" : "Remaining"}
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-amber-600" dir="ltr">
                {remaining.toLocaleString()} {currency}
              </div>
            </div>
            <div className="p-4">
              <div className="text-[11px] font-medium text-slate-500">
                {isRtl ? "إيجار اليوم / الديبوزت" : "Daily Rate / Deposit"}
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-800" dir="ltr">
                {Number(contract.dailyRate || 0).toLocaleString()} /{" "}
                {Number(contract.depositAmount || 0).toLocaleString()} {currency}
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Clean Specification Cards */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Customer Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">
                  {isRtl ? "بيانات العميل" : "Customer Details"}
                </h2>
                <Link
                  href={customerHref(contract.customerId)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-revix-primary hover:underline"
                >
                  <span>{isRtl ? "فتح ملف العميل" : "Open Customer"}</span>
                  <RevixIcon name="arrow-up-right" size={13} />
                </Link>
              </div>
              <div className="divide-y divide-slate-100 px-5 py-1">
                <InfoRow
                  label={isRtl ? "الاسم الكامل" : "Full Name"}
                  value={
                    <Link
                      href={customerHref(contract.customerId)}
                      className="text-revix-primary hover:underline"
                    >
                      {contract.customerName || "—"}
                    </Link>
                  }
                />
                <InfoRow
                  label={isRtl ? "رقم الهاتف" : "Phone"}
                  value={contract.customerPhone || "—"}
                  ltr
                />
                <InfoRow
                  label={isRtl ? "الجنسية" : "Nationality"}
                  value={contract.customerNationality || "—"}
                />
                <InfoRow
                  label={isRtl ? "الهوية / الرقم المدني" : "National ID"}
                  value={
                    contract.customerNationalId
                      ? `${contract.customerNationalId}${
                          contract.customerNationalIdExpiry
                            ? ` (${contract.customerNationalIdExpiry})`
                            : ""
                        }`
                      : "—"
                  }
                  ltr
                />
                <InfoRow
                  label={isRtl ? "رقم الرخصة" : "Driver License"}
                  value={
                    contract.customerDriverLicenseNo
                      ? `${contract.customerDriverLicenseNo}${
                          contract.customerLicenseExpiry
                            ? ` (${contract.customerLicenseExpiry})`
                            : ""
                        }`
                      : "—"
                  }
                  ltr
                />
                <InfoRow
                  label={isRtl ? "عنوان السكن" : "Address"}
                  value={contract.customerAddress || "—"}
                />
              </div>
            </div>

            {/* Vehicle Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">
                  {isRtl ? "بيانات السيارة" : "Vehicle Details"}
                </h2>
                <Link
                  href={vehicleHref(contract.vehicleId)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-revix-primary hover:underline"
                >
                  <span>{isRtl ? "فتح ملف السيارة" : "Open Vehicle"}</span>
                  <RevixIcon name="arrow-up-right" size={13} />
                </Link>
              </div>
              <div className="divide-y divide-slate-100 px-5 py-1">
                <InfoRow
                  label={isRtl ? "السيارة" : "Vehicle"}
                  value={
                    <Link
                      href={vehicleHref(contract.vehicleId)}
                      className="text-revix-primary hover:underline"
                    >
                      {contract.vehicleName || "—"}
                    </Link>
                  }
                />
                <InfoRow
                  label={isRtl ? "رقم اللوحة / الأصل" : "Plate / Asset ID"}
                  value={`${contract.vehiclePlate || "—"}${
                    contract.vehicleAssetCode ? ` (${contract.vehicleAssetCode})` : ""
                  }`}
                />
                <InfoRow
                  label={isRtl ? "عداد الخروج" : "Pickup Odometer"}
                  value={`${Number(contract.pickupOdometer || 0).toLocaleString()} km`}
                  ltr
                />
                <InfoRow
                  label={isRtl ? "عداد العودة / المسافة" : "Return Odometer"}
                  value={
                    contract.returnOdometer != null
                      ? `${Number(contract.returnOdometer).toLocaleString()} km (${drivenKm?.toLocaleString()} km)`
                      : "—"
                  }
                  ltr
                />
                <InfoRow
                  label={isRtl ? "شركة التأمين" : "Insurance"}
                  value={contract.vehicleInsuranceCompany || "—"}
                />
                <InfoRow
                  label={isRtl ? "انتهاء التأمين" : "Insurance Expiry"}
                  value={contract.vehicleInsuranceExpiry || "—"}
                  ltr
                />
              </div>
            </div>
          </div>

          {/* Return & Handover Card (when closed) */}
          {(contract.status === "completed" || contract.returnContractImageUrl) && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">
                  {isRtl ? "بيانات الاستلام والإغلاق" : "Return & Handover Summary"}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-3">
                <div className="divide-y divide-slate-100 lg:col-span-2">
                  <InfoRow
                    label={isRtl ? "الموظف المستلم" : "Receiving Employee"}
                    value={contract.receivedByUserName || contract.createdByUserName || "—"}
                  />
                  <InfoRow
                    label={isRtl ? "تاريخ ووقت الإعادة" : "Returned At"}
                    value={
                      contract.returnedAt
                        ? formatCompanyDateTime(contract.returnedAt)
                        : "—"
                    }
                    ltr
                  />
                  <InfoRow
                    label={isRtl ? "أيام الإيجار الفعلية" : "Actual Days"}
                    value={`${contract.actualDays ?? contract.totalDays} ${isRtl ? "يوم" : "d"}`}
                  />
                  <InfoRow
                    label={isRtl ? "حالة السيارة عند العودة" : "Return Condition"}
                    value={contract.returnCondition || "—"}
                  />
                </div>
                {contract.returnContractImageUrl && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <div className="mb-2 text-[11px] font-bold text-slate-700">
                      {isRtl ? "صورة العقد بعد التسليم" : "Signed Return Contract"}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={contract.returnContractImageUrl}
                      alt="Signed return contract"
                      className="mx-auto max-h-40 rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "vouchers" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
            <h2 className="text-sm font-bold text-slate-900">
              {isRtl
                ? `السندات المالية (${vouchers.length})`
                : `Financial Vouchers (${vouchers.length})`}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setVoucherModal({ contract, type: "receipt" })}
                className="h-8 text-xs"
              >
                {isRtl ? "+ سند قبض" : "+ Receipt"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setVoucherModal({ contract, type: "payment" })}
                className="h-8 text-xs"
              >
                {isRtl ? "+ سند دفع" : "+ Payment"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setVoucherModal({ contract, type: "refund" })}
                className="h-8 text-xs"
              >
                {isRtl ? "+ سند مرتجع" : "+ Refund"}
              </Button>
            </div>
          </div>

          {vouchers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {isRtl ? "لا توجد سندات مسجلة لهذا العقد بعد." : "No vouchers recorded yet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 px-5">
              {vouchers.map((v) => {
                const vMeta = VOUCHER_TYPE_META[v.voucherType];
                const pm = PAYMENT_METHOD_LABELS[v.paymentMethod];
                return (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-rose-600">
                          {v.voucherNumber}
                        </span>
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold ${vMeta.badgeCls}`}
                        >
                          {isRtl ? vMeta.ar : vMeta.en}
                        </span>
                        <span className="font-mono text-sm font-extrabold text-slate-900" dir="ltr">
                          {v.amount.toLocaleString()} {v.currencyCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {isRtl ? pm.ar : pm.en} • {v.paymentDate}
                        {v.referenceNo ? ` • ${isRtl ? "مرجع:" : "Ref:"} ${v.referenceNo}` : ""}
                        {v.bankName ? ` • ${v.bankName}` : ""}
                        {v.createdByUserName
                          ? ` • ${isRtl ? "بواسطة:" : "By:"} ${v.createdByUserName}`
                          : ""}
                      </div>
                      {v.description && (
                        <div className="text-[11px] text-slate-500">{v.description}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "activity" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
            <h2 className="text-sm font-bold text-slate-900">
              {isRtl
                ? `سجل إجراءات الموظفين (${auditLogs.length})`
                : `Employee Activity Log (${auditLogs.length})`}
            </h2>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {isRtl ? "لا توجد حركات مسجلة." : "No recorded actions yet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 px-5">
              {auditLogs.map((log) => {
                const meta = getActionMeta(log.action, isRtl);
                const details = formatAuditMetadata(log, isRtl);
                return (
                  <div key={log.id} className="flex items-start gap-3 py-3.5 text-xs">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${meta.cls}`} />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{meta.label}</span>
                        <span className="font-mono text-[11px] text-slate-500" dir="ltr">
                          {formatCompanyDateTime(log.createdAt)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {isRtl ? "الموظف:" : "Employee:"}{" "}
                        <span className="font-semibold text-slate-800">
                          {log.actorName || log.actorEmail || "—"}
                        </span>
                        {details ? ` • ${details}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RentalContractPrintModal
        contract={printingContract}
        isRtl={isRtl}
        onClose={() => setPrintingContract(null)}
        onSigned={(updated) => setPrintingContract(updated)}
      />

      <CompleteContractModal
        contract={completingContract}
        isRtl={isRtl}
        onClose={() => setCompletingContract(null)}
      />

      <ContractVoucherModal
        contract={voucherModal?.contract ?? null}
        initialVoucherType={voucherModal?.type ?? "receipt"}
        isRtl={isRtl}
        onClose={() => setVoucherModal(null)}
      />

      {isCancelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => !isCancelling && setIsCancelOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-5 py-3.5">
              <h3 className="text-sm font-bold text-rose-800">
                {isRtl
                  ? `تأكيد إلغاء العقد ${contract.contractNumber}`
                  : `Confirm Cancellation (${contract.contractNumber})`}
              </h3>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setIsCancelOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-rose-500 hover:bg-rose-100"
              >
                <RevixIcon name="x" size={15} />
              </button>
            </div>
            <div className="space-y-3 p-5 text-xs">
              {cancelError && <Alert variant="error" message={cancelError} />}
              <p className="text-slate-700">
                {isRtl
                  ? "هل أنت متأكد من إلغاء هذا العقد؟ سيتم تسجيل اسمك في سجل العقد."
                  : "Are you sure you want to cancel this contract? Your name will be logged."}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isCancelling}
                  onClick={() => setIsCancelOpen(false)}
                >
                  {isRtl ? "تراجع" : "Keep"}
                </Button>
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={async () => {
                    setCancelError(null);
                    try {
                      await cancelContract(contract.id).unwrap();
                      setIsCancelOpen(false);
                    } catch {
                      setCancelError(
                        isRtl ? "تعذر إلغاء العقد." : "Failed to cancel contract.",
                      );
                    }
                  }}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
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
