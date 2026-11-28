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
import { SmartBackButton } from "@/components/ui/SmartBackButton";
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
import { ExtendContractModal } from "./ExtendContractModal";
import { RentalContractPrintModal } from "./RentalContractPrintModal";
import { ContractVoucherModal } from "./vouchers/ContractVoucherModal";
import { ActivityTimeline } from "./ActivityTimeline";
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
    ar: "مفتوح",
    en: "Open",
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
  const [extendingContract, setExtendingContract] =
    useState<RentalContractDto | null>(null);
  const [voucherModal, setVoucherModal] = useState<{
    contract: RentalContractDto;
    type: ContractVoucherType;
  } | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "contract" | "customer" | "vehicle" | "financials" | "activity"
  >("contract");

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
      className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-3.5 overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Clean Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <SmartBackButton
            isRtl={isRtl}
            onClick={handleBack}
            title={isRtl ? "رجوع" : "Back"}
            size={15}
          />

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
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span className="font-mono" dir="ltr">
                {contract.startDate} → {contract.endDate}
              </span>
              <span>•</span>
              <span>
                {contract.actualDays ?? contract.totalDays} {isRtl ? "أيام" : "day(s)"}
              </span>
              {contract.createdByUserName && (
                <>
                  <span>•</span>
                  <span>
                    {isRtl ? "منشئ العقد:" : "Created by:"}{" "}
                    <strong className="font-semibold text-slate-700">
                      {contract.createdByUserName}
                    </strong>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Compact Action Bar: Print + Return (if active) + More Menu */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPrintingContract(contract)}
            className="!min-h-0 h-9 rounded-xl px-3.5 py-0 text-xs"
          >
            <RevixIcon name="file-text" size={14} />
            <span>{isRtl ? "طباعة / توقيع" : "Print / Sign"}</span>
          </Button>

          {contract.status === "active" && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setExtendingContract(contract)}
                className="!min-h-0 h-9 rounded-xl px-3.5 py-0 text-xs"
              >
                <RevixIcon name="calendar" size={14} />
                <span>{isRtl ? "تمديد" : "Extend"}</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setCompletingContract(contract)}
                className="!min-h-0 h-9 rounded-xl px-4 py-0 text-xs"
              >
                <span>{isRtl ? "استلام وإغلاق" : "Return & Close"}</span>
              </Button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsMenuOpen((v) => !v)}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
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
            id: "contract" as const,
            label: isRtl ? "بيانات العقد" : "Contract Details",
          },
          {
            id: "customer" as const,
            label: isRtl ? "بيانات العميل" : "Customer Details",
          },
          {
            id: "vehicle" as const,
            label: isRtl ? "بيانات السيارة" : "Vehicle Details",
          },
          {
            id: "financials" as const,
            label: isRtl ? "المالية" : "Financials",
            count: vouchers.length,
          },
          {
            id: "activity" as const,
            label: isRtl ? "سجل الموظفين" : "Staff & Activity",
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

      {activeTab === "contract" && (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
          <SectionCard title={isRtl ? "بيانات العقد والموظف المسؤول" : "Contract & Staff Summary"}>
            <DetailTileGrid
              columns={3}
              items={[
                {
                  label: isRtl ? "رقم العقد" : "Contract #",
                  value: <span className="font-mono font-bold">{contract.contractNumber}</span>,
                },
                {
                  label: isRtl ? "الحالة" : "Status",
                  value: isRtl ? st.ar : st.en,
                },
                {
                  label: isRtl ? "الفرع" : "Branch",
                  value: contract.branchName || "—",
                },
                {
                  label: isRtl ? "تاريخ البداية" : "Start Date",
                  value: <span className="font-mono">{contract.startDate}</span>,
                },
                {
                  label: isRtl ? "تاريخ النهاية" : "End Date",
                  value: <span className="font-mono">{contract.endDate}</span>,
                },
                {
                  label: isRtl ? "المدة" : "Duration",
                  value: (
                    <span className="font-mono">
                      {contract.actualDays ?? contract.totalDays} {isRtl ? "أيام" : "day(s)"}
                    </span>
                  ),
                },
                {
                  label: isRtl ? "الموظف منشئ العقد" : "Created by Employee",
                  value: contract.createdByUserName || "—",
                },
                {
                  label: isRtl ? "الموظف المستلم" : "Received by",
                  value: contract.receivedByUserName || "—",
                },
                {
                  label: isRtl ? "توقيع العميل" : "Customer Signature",
                  value: contract.signedAt
                    ? formatCompanyDateTime(contract.signedAt)
                    : isRtl
                      ? "غير موقع"
                      : "Unsigned",
                },
              ]}
            />
            {contract.notes && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-700">
                <span className="font-bold text-slate-900">
                  {isRtl ? "ملاحظات العقد: " : "Notes: "}
                </span>
                {contract.notes}
              </div>
            )}
          </SectionCard>

          {(contract.secondDriverName || contract.sponsorName) && (
            <SectionCard title={isRtl ? "السائق الإضافي والضامن" : "Second Driver & Sponsor"}>
              <DetailTileGrid
                columns={3}
                items={[
                  {
                    label: isRtl ? "السائق الثاني" : "Second Driver",
                    value: contract.secondDriverName || "—",
                  },
                  {
                    label: isRtl ? "رخصة السائق الثاني" : "Second Driver License",
                    value: contract.secondDriverLicenseNo || "—",
                  },
                  {
                    label: isRtl ? "اسم الضامن" : "Sponsor Name",
                    value: contract.sponsorName || "—",
                  },
                  {
                    label: isRtl ? "هوية الضامن" : "Sponsor National ID",
                    value: contract.sponsorNationalId || "—",
                  },
                  {
                    label: isRtl ? "هاتف الضامن" : "Sponsor Phone",
                    value: contract.sponsorPhone || "—",
                  },
                ]}
              />
            </SectionCard>
          )}

          {(contract.status === "completed" || contract.returnContractImageUrl) && (
            <SectionCard title={isRtl ? "بيانات الاستلام والإغلاق" : "Return & Handover Summary"}>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <DetailTileGrid
                    columns={2}
                    items={[
                      {
                        label: isRtl ? "الموظف المستلم" : "Receiving Employee",
                        value:
                          contract.receivedByUserName || contract.createdByUserName || "—",
                      },
                      {
                        label: isRtl ? "تاريخ ووقت الإعادة" : "Returned At",
                        value: (
                          <span className="font-mono" dir="ltr">
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
            </SectionCard>
          )}
        </div>
      )}

      {activeTab === "customer" && (
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          <SectionCard
            title={isRtl ? "بيانات العميل" : "Customer Details"}
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
              columns={3}
              items={[
                {
                  label: isRtl ? "الاسم الكامل" : "Full Name",
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
                  value: (
                    <span className="font-mono" dir="ltr">
                      {contract.customerPhone || "—"}
                    </span>
                  ),
                },
                {
                  label: isRtl ? "هاتف إضافي" : "Secondary Phone",
                  value: (
                    <span className="font-mono" dir="ltr">
                      {contract.customerSecondaryPhone || "—"}
                    </span>
                  ),
                },
                {
                  label: isRtl ? "الجنسية" : "Nationality",
                  value: contract.customerNationality || "—",
                },
                {
                  label: isRtl ? "الهوية / الرقم المدني" : "National ID",
                  value: (
                    <span className="font-mono" dir="ltr">
                      {contract.customerNationalId
                        ? `${contract.customerNationalId}${
                            contract.customerNationalIdExpiry
                              ? ` (${contract.customerNationalIdExpiry})`
                              : ""
                          }`
                        : "—"}
                    </span>
                  ),
                },
                {
                  label: isRtl ? "رقم الرخصة" : "Driver License",
                  value: (
                    <span className="font-mono" dir="ltr">
                      {contract.customerDriverLicenseNo
                        ? `${contract.customerDriverLicenseNo}${
                            contract.customerLicenseExpiry
                              ? ` (${contract.customerLicenseExpiry})`
                              : ""
                          }`
                        : "—"}
                    </span>
                  ),
                },
                {
                  label: isRtl ? "عنوان السكن" : "Address",
                  value: contract.customerAddress || "—",
                },
                {
                  label: isRtl ? "عنوان العمل" : "Work Address",
                  value: contract.customerWorkAddress || "—",
                },
              ]}
            />
          </SectionCard>
        </div>
      )}

      {activeTab === "vehicle" && (
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          <SectionCard
            title={isRtl ? "بيانات السيارة" : "Vehicle Details"}
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
              columns={3}
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
                      {contract.vehiclePlate || "—"}
                      {contract.vehicleAssetCode ? ` (${contract.vehicleAssetCode})` : ""}
                    </span>
                  ),
                },
                {
                  label: isRtl ? "اللون / الفئة" : "Color / Category",
                  value: [contract.vehicleColor, contract.vehicleCategory].filter(Boolean).join(" • ") || "—",
                },
                {
                  label: isRtl ? "عداد الخروج" : "Pickup Odometer",
                  value: (
                    <span className="font-mono" dir="ltr">
                      {Number(contract.pickupOdometer || 0).toLocaleString()} km
                    </span>
                  ),
                },
                {
                  label: isRtl ? "عداد العودة / المسافة" : "Return Odometer",
                  value: (
                    <span className="font-mono" dir="ltr">
                      {contract.returnOdometer != null
                        ? `${Number(contract.returnOdometer).toLocaleString()} km (${drivenKm?.toLocaleString()} km)`
                        : "—"}
                    </span>
                  ),
                },
                {
                  label: isRtl ? "حد الكيلومتر اليومي" : "Daily KM Limit",
                  value:
                    contract.vehicleDailyKmLimit != null
                      ? `${Number(contract.vehicleDailyKmLimit).toLocaleString()} km`
                      : isRtl
                        ? "مفتوح"
                        : "Unlimited",
                },
                {
                  label: isRtl ? "شركة التأمين" : "Insurance",
                  value: contract.vehicleInsuranceCompany || "—",
                },
                {
                  label: isRtl ? "انتهاء التأمين" : "Insurance Expiry",
                  value: (
                    <span className="font-mono" dir="ltr">
                      {contract.vehicleInsuranceExpiry || "—"}
                    </span>
                  ),
                },
              ]}
            />
          </SectionCard>
        </div>
      )}

      {activeTab === "financials" && (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
          <DetailTileGrid
            columns={4}
            items={[
              {
                label: isRtl ? "إجمالي العقد" : "Total Amount",
                value: (
                  <span className="font-mono font-extrabold" dir="ltr">
                    {Number(contract.totalAmount || 0).toLocaleString()} {currency}
                  </span>
                ),
              },
              {
                label: isRtl ? "المدفوع" : "Paid Amount",
                value: (
                  <span className="font-mono font-bold text-emerald-700" dir="ltr">
                    {Number(contract.paidAmount || 0).toLocaleString()} {currency}
                  </span>
                ),
              },
              {
                label: isRtl ? "المتبقي" : "Remaining",
                value: (
                  <span className="font-mono font-bold text-amber-600" dir="ltr">
                    {remaining.toLocaleString()} {currency}
                  </span>
                ),
              },
              {
                label: isRtl ? "إيجار اليوم / الديبوزت" : "Daily Rate / Deposit",
                value: (
                  <span className="font-mono font-bold" dir="ltr">
                    {Number(contract.dailyRate || 0).toLocaleString()} /{" "}
                    {Number(contract.depositAmount || 0).toLocaleString()} {currency}
                  </span>
                ),
              },
              {
                label: isRtl ? "المجموع الفرعي" : "Subtotal",
                value: `${Number(contract.subtotal || 0).toLocaleString()} ${currency}`,
              },
              {
                label: isRtl ? "الخصم" : "Discount",
                value: `${Number(contract.discount || 0).toLocaleString()} ${currency}`,
              },
              {
                label: isRtl ? "رسوم التأمين" : "Insurance Fee",
                value: `${Number(contract.insuranceFee || 0).toLocaleString()} ${currency}`,
              },
              {
                label: isRtl ? "رسوم إضافية" : "Extra Charges",
                value: `${Number(contract.extraCharges || 0).toLocaleString()} ${currency}`,
              },
            ]}
          />

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
              <div className="py-10 text-center text-xs text-slate-500">
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
        </div>
      )}

      {activeTab === "activity" && (
        <ActivityTimeline
          entityType="rental_contract"
          entityId={contract.id}
          isRtl={isRtl}
          title={isRtl ? "سجل إجراءات العقد" : "Contract Activity Timeline"}
          participantsLabel={isRtl ? "مسؤولو العقد" : "Contract Participants"}
          participants={[
            { label: isRtl ? "أنشأ العقد" : "Created by", value: contract.createdByUserName },
            { label: isRtl ? "استلم السيارة" : "Received by", value: contract.receivedByUserName },
            { label: isRtl ? "ألغى العقد" : "Cancelled by", value: contract.cancelledByUserName },
          ]}
        />
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

      <ExtendContractModal
        contract={extendingContract}
        isRtl={isRtl}
        onClose={() => setExtendingContract(null)}
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
