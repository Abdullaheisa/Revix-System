"use client";

import { useState } from "react";
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
import { SectionCard } from "@/components/ui/SectionCard";
import { DetailTileGrid } from "@/components/shared/workspace";
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
    const pm = PAYMENT_METHOD_LABELS[String(m.paymentMethod) as keyof typeof PAYMENT_METHOD_LABELS];
    parts.push(pm ? (isRtl ? pm.ar : pm.en) : String(m.paymentMethod));
  }
  if (m.returnOdometer != null) {
    parts.push(`${isRtl ? "عداد العودة:" : "Return ODO:"} ${Number(m.returnOdometer).toLocaleString()} km`);
  }
  return parts.join(" • ");
}

export function RentalContractDetailPage({
  contractId,
  isRtl,
}: RentalContractDetailPageProps) {
  const router = useRouter();
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetRentalContractDetailsQuery(contractId);

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
        loadingTitle={isRtl ? "جارٍ تحميل تفاصيل العقد..." : "Loading contract details..."}
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
      className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-4 overflow-y-auto pb-10"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            title={isRtl ? "رجوع" : "Back"}
            aria-label={isRtl ? "رجوع" : "Back"}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface"
          >
            <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={15} />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-xl font-extrabold text-revix-dark">
                {contract.contractNumber}
              </h1>
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}
              >
                {isRtl ? st.ar : st.en}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-revix-secondary">
              {contract.startDate} → {contract.endDate} ({contract.actualDays ?? contract.totalDays}{" "}
              {isRtl ? "يوم" : "day(s)"})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPrintingContract(contract)}
          >
            <RevixIcon name="file-text" size={14} />
            <span>{isRtl ? "طباعة / توقيع" : "Print / Sign"}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setVoucherModal({ contract, type: "receipt" })}
          >
            <span>{isRtl ? "سند قبض" : "Receipt"}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setVoucherModal({ contract, type: "payment" })}
          >
            <span>{isRtl ? "سند دفع" : "Payment"}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setVoucherModal({ contract, type: "refund" })}
          >
            <span>{isRtl ? "سند مرتجع" : "Refund"}</span>
          </Button>
          {contract.status === "active" && (
            <Button
              type="button"
              variant="primary"
              onClick={() => setCompletingContract(contract)}
            >
              <span>{isRtl ? "استلام وإغلاق" : "Return & Close"}</span>
            </Button>
          )}
          {contract.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => {
                setCancelError(null);
                setIsCancelOpen(true);
              }}
              className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              {isRtl ? "إلغاء العقد" : "Cancel Contract"}
            </button>
          )}
        </div>
      </div>

      {/* Financial & Activity Statistics */}
      <DetailTileGrid
        columns={4}
        items={[
          {
            label: isRtl ? "الإجمالي" : "Total Amount",
            value: (
              <span className="font-mono font-extrabold">
                {Number(contract.totalAmount || 0).toLocaleString()} {currency}
              </span>
            ),
          },
          {
            label: isRtl ? "المدفوع" : "Paid Amount",
            value: (
              <span className="font-mono font-bold text-emerald-700">
                {Number(contract.paidAmount || 0).toLocaleString()} {currency}
              </span>
            ),
          },
          {
            label: isRtl ? "المتبقي" : "Remaining Balance",
            value: (
              <span className="font-mono font-bold text-amber-700">
                {remaining.toLocaleString()} {currency}
              </span>
            ),
          },
          {
            label: isRtl ? "السندات / الحركات" : "Vouchers / Actions",
            value: (
              <span className="font-mono">
                {vouchers.length} / {auditLogs.length}
              </span>
            ),
          },
        ]}
      />

      {/* Customer & Vehicle Full Details */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={isRtl ? "بيانات العميل الكاملة" : "Customer Details"}
          rightSlot={
            <Link
              href={customerHref(contract.customerId)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-revix-primary hover:underline"
            >
              <span>{isRtl ? "فتح ملف العميل" : "Open Customer"}</span>
              <RevixIcon name="arrow-up-right" size={13} />
            </Link>
          }
        >
          <DetailTileGrid
            columns={2}
            items={[
              {
                label: isRtl ? "اسم العميل" : "Full Name",
                value: (
                  <Link
                    href={customerHref(contract.customerId)}
                    className="font-bold text-revix-primary hover:underline"
                  >
                    {contract.customerName || "—"}
                  </Link>
                ),
              },
              {
                label: isRtl ? "رقم الهاتف" : "Phone",
                value: <span className="font-mono">{contract.customerPhone || "—"}</span>,
              },
              {
                label: isRtl ? "الجنسية" : "Nationality",
                value: contract.customerNationality || "—",
              },
              {
                label: isRtl ? "الهوية / الرقم المدني" : "National ID",
                value: (
                  <span className="font-mono">
                    {contract.customerNationalId || "—"}
                    {contract.customerNationalIdExpiry
                      ? ` (${contract.customerNationalIdExpiry})`
                      : ""}
                  </span>
                ),
              },
              {
                label: isRtl ? "رقم الرخصة" : "Driver License",
                value: (
                  <span className="font-mono">
                    {contract.customerDriverLicenseNo || "—"}
                    {contract.customerLicenseExpiry
                      ? ` (${contract.customerLicenseExpiry})`
                      : ""}
                  </span>
                ),
              },
              {
                label: isRtl ? "عنوان السكن" : "Home Address",
                value: contract.customerAddress || "—",
              },
            ]}
          />
        </SectionCard>

        <SectionCard
          title={isRtl ? "بيانات السيارة الكاملة" : "Vehicle Details"}
          rightSlot={
            <Link
              href={vehicleHref(contract.vehicleId)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-revix-primary hover:underline"
            >
              <span>{isRtl ? "فتح ملف السيارة" : "Open Vehicle"}</span>
              <RevixIcon name="arrow-up-right" size={13} />
            </Link>
          }
        >
          <DetailTileGrid
            columns={2}
            items={[
              {
                label: isRtl ? "السيارة" : "Vehicle",
                value: (
                  <Link
                    href={vehicleHref(contract.vehicleId)}
                    className="font-bold text-revix-primary hover:underline"
                  >
                    {contract.vehicleName || "—"}
                  </Link>
                ),
              },
              {
                label: isRtl ? "رقم اللوحة / الأصل" : "Plate / Asset ID",
                value: (
                  <span className="font-mono">
                    {contract.vehiclePlate || "—"}{" "}
                    {contract.vehicleAssetCode ? `[${contract.vehicleAssetCode}]` : ""}
                  </span>
                ),
              },
              {
                label: isRtl ? "عداد الخروج" : "Pickup Odometer",
                value: (
                  <span className="font-mono">
                    {Number(contract.pickupOdometer || 0).toLocaleString()} km
                  </span>
                ),
              },
              {
                label: isRtl ? "عداد العودة / المسافة" : "Return Odometer / Driven",
                value: (
                  <span className="font-mono">
                    {contract.returnOdometer != null
                      ? `${Number(contract.returnOdometer).toLocaleString()} km (${drivenKm?.toLocaleString()} km)`
                      : "—"}
                  </span>
                ),
              },
              {
                label: isRtl ? "شركة التأمين" : "Insurance",
                value: contract.vehicleInsuranceCompany || "—",
              },
              {
                label: isRtl ? "انتهاء التأمين" : "Insurance Expiry",
                value: (
                  <span className="font-mono">
                    {contract.vehicleInsuranceExpiry || "—"}
                  </span>
                ),
              },
            ]}
          />
        </SectionCard>
      </div>

      {/* Return Handover & Uploaded Contract Scan */}
      {(contract.status === "completed" || contract.returnContractImageUrl) && (
        <SectionCard
          title={isRtl ? "بيانات الاستلام والإغلاق" : "Return & Handover Summary"}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DetailTileGrid
                columns={2}
                items={[
                  {
                    label: isRtl ? "الموظف المستلم" : "Receiving Employee",
                    value: contract.receivedByUserName || contract.createdByUserName || "—",
                  },
                  {
                    label: isRtl ? "تاريخ ووقت الإعادة" : "Returned At",
                    value: (
                      <span className="font-mono">
                        {contract.returnedAt
                          ? formatCompanyDateTime(contract.returnedAt)
                          : "—"}
                      </span>
                    ),
                  },
                  {
                    label: isRtl ? "أيام الإيجار الفعلية" : "Actual Days",
                    value: (
                      <span className="font-mono">
                        {contract.actualDays ?? contract.totalDays} {isRtl ? "يوم" : "d"}
                      </span>
                    ),
                  },
                  {
                    label: isRtl ? "حالة السيارة عند العودة" : "Return Condition",
                    value: contract.returnCondition || "—",
                  },
                ]}
              />
            </div>
            {contract.returnContractImageUrl && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                <div className="mb-1.5 text-[11px] font-bold text-slate-700">
                  {isRtl ? "صورة العقد بعد التسليم" : "Signed Return Contract"}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={contract.returnContractImageUrl}
                  alt="Signed return contract"
                  className="mx-auto max-h-36 rounded-lg object-contain"
                />
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Vouchers & Employee Activity Audit Log */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={
            isRtl
              ? `السندات المالية (${vouchers.length})`
              : `Financial Vouchers (${vouchers.length})`
          }
        >
          {vouchers.length === 0 ? (
            <div className="py-8 text-center text-xs text-revix-secondary">
              {isRtl ? "لا توجد سندات مسجلة لهذا العقد بعد." : "No vouchers recorded yet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {vouchers.map((v) => {
                const vMeta = VOUCHER_TYPE_META[v.voucherType];
                const pm = PAYMENT_METHOD_LABELS[v.paymentMethod];
                return (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-600">
                          {v.voucherNumber}
                        </span>
                        <span
                          className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${vMeta.badgeCls}`}
                        >
                          {isRtl ? vMeta.ar : vMeta.en}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {v.amount.toLocaleString()} {v.currencyCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isRtl ? pm.ar : pm.en} • {v.paymentDate}
                        {v.createdByUserName ? ` • ${v.createdByUserName}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={
            isRtl
              ? `سجل إجراءات الموظفين (${auditLogs.length})`
              : `Employee Activity Log (${auditLogs.length})`
          }
        >
          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-revix-secondary">
              {isRtl ? "لا توجد حركات مسجلة." : "No recorded actions yet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => {
                const meta = getActionMeta(log.action, isRtl);
                const details = formatAuditMetadata(log, isRtl);
                return (
                  <div key={log.id} className="flex items-start gap-3 py-2.5 text-xs">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${meta.cls}`} />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{meta.label}</span>
                        <span className="font-mono text-[10.5px] text-slate-500">
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
        </SectionCard>
      </div>

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
            className="w-full max-w-md overflow-hidden rounded-2xl border border-revix-border bg-white shadow-2xl"
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
