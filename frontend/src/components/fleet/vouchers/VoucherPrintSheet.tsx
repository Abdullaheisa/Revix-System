"use client";

import type { CompanyDto } from "@/store/api/workspaceApi";
import type {
  ContractVoucherType,
  VoucherPaymentMethod,
} from "@/store/api/fleetApi";
import { resolveAssetUrl } from "@/store/api/baseApi";

export const VOUCHER_TYPE_META: Record<
  ContractVoucherType,
  {
    ar: string;
    en: string;
    partyAr: string;
    partyEn: string;
    badgeCls: string;
  }
> = {
  receipt: {
    ar: "سند قبض",
    en: "RECEIPT VOUCHER",
    partyAr: "وصلنا من",
    partyEn: "Received from",
    badgeCls: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  payment: {
    ar: "سند دفع",
    en: "PAYMENT VOUCHER",
    partyAr: "صرفنا إلى",
    partyEn: "Paid to",
    badgeCls: "border-amber-200 bg-amber-50 text-amber-800",
  },
  refund: {
    ar: "سند مرتجع",
    en: "REFUND VOUCHER",
    partyAr: "رد مبلغ إلى",
    partyEn: "Refunded to",
    badgeCls: "border-rose-200 bg-rose-50 text-rose-800",
  },
};

export const PAYMENT_METHOD_LABELS: Record<
  VoucherPaymentMethod,
  { ar: string; en: string }
> = {
  cash: { ar: "كاش", en: "Cash" },
  knet: { ar: "كي نت", en: "K-Net" },
  link: { ar: "رابط دفع", en: "Payment Link" },
  bank_transfer: { ar: "تحويل بنكي", en: "Bank Transfer" },
  cheque: { ar: "شيك", en: "Cheque" },
};

export interface VoucherSheetData {
  voucherNumber: string;
  voucherType: ContractVoucherType;
  amount: number;
  currencyCode: string;
  paymentMethod: VoucherPaymentMethod;
  paymentDate: string;
  customerName: string;
  contractNumber: string;
  referenceNo?: string | null;
  bankName?: string | null;
  description?: string | null;
  employeeName?: string | null;
  employeeSignatureDataUrl?: string | null;
}

function VoucherLineRow({
  labelEn,
  labelAr,
  value,
  mono = false,
}: {
  labelEn: string;
  labelAr: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dotted border-slate-300 py-1.5 text-[11px]">
      <span className="shrink-0 font-bold text-slate-700" dir="ltr">
        {labelEn}
      </span>
      <span
        className={`flex-1 text-center font-semibold text-slate-900 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value?.trim() || "—"}
      </span>
      <span className="shrink-0 font-bold text-slate-800" dir="rtl">
        {labelAr}
      </span>
    </div>
  );
}

export function VoucherPrintSheet({
  company,
  voucher,
}: {
  company: CompanyDto | null;
  voucher: VoucherSheetData;
}) {
  const accent = company?.brandColor || "#14532D";
  const logoSrc = resolveAssetUrl(company?.logoUrl);
  const meta = VOUCHER_TYPE_META[voucher.voucherType];
  const methodLabel = PAYMENT_METHOD_LABELS[voucher.paymentMethod];
  const amountNum = Number(voucher.amount || 0);
  const [wholePart, fracPart = "00"] = amountNum.toFixed(2).split(".");
  const addressLine = [company?.address, company?.city, company?.postalCode]
    .filter(Boolean)
    .join(" — ");

  return (
    <div
      id="revix-printable-voucher"
      dir="ltr"
      className="mx-auto w-full max-w-[740px] rounded-xl border border-slate-300 bg-white p-5 text-slate-900 shadow-xs"
      style={{ borderColor: accent }}
    >
      {/* Top Company Identity Header */}
      <div className="flex items-center justify-between gap-4 border-b-2 pb-3" style={{ borderColor: accent }}>
        <div className="flex items-center gap-3">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={company?.name || "Company Logo"}
              className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-base font-extrabold text-white"
              style={{ backgroundColor: accent }}
            >
              {(company?.name || "RV").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-start">
            <div className="text-sm font-extrabold uppercase tracking-wide" style={{ color: accent }}>
              {company?.name || "Revix System"}
            </div>
            {company?.businessRegNumber && (
              <div className="font-mono text-[10px] text-slate-500">
                CR: {company.businessRegNumber}
              </div>
            )}
          </div>
        </div>

        <div className="text-end" dir="rtl">
          <div className="text-base font-extrabold" style={{ color: accent }}>
            {company?.legalName || company?.name || "الشركة"}
          </div>
          {company?.taxRegNumber && (
            <div className="font-mono text-[10px] text-slate-500">
              الرقم الضريبي: {company.taxRegNumber}
            </div>
          )}
        </div>
      </div>

      {/* Sub-header: Amount Box | Voucher Type Pill | Voucher No & Date */}
      <div className="mt-3.5 grid grid-cols-12 items-center gap-3">
        {/* Amount Box */}
        <div className="col-span-4">
          <div className="overflow-hidden rounded-lg border-2 text-center" style={{ borderColor: accent }}>
            <div
              className="grid grid-cols-3 border-b px-1 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: accent, borderColor: accent }}
            >
              <span className="col-span-2">{voucher.currencyCode}</span>
              <span>فلس / Cts</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-300 bg-white py-1.5 font-mono text-sm font-extrabold text-slate-900">
              <span className="col-span-2">{Number(wholePart).toLocaleString()}</span>
              <span>{fracPart}</span>
            </div>
          </div>
        </div>

        {/* Center Double-Border Title Pill */}
        <div className="col-span-4 flex justify-center">
          <div
            className="rounded-xl border-2 px-4 py-1.5 text-center shadow-2xs"
            style={{
              borderColor: accent,
              backgroundColor: `color-mix(in srgb, ${accent} 8%, white)`,
            }}
          >
            <div className="text-sm font-extrabold" style={{ color: accent }} dir="rtl">
              {meta.ar}
            </div>
            <div className="text-[10px] font-bold tracking-wider text-slate-700">
              {meta.en}
            </div>
          </div>
        </div>

        {/* Voucher Number & Date */}
        <div className="col-span-4 space-y-1 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-600">No.</span>
            <span className="font-mono text-sm font-extrabold text-rose-600">
              {voucher.voucherNumber}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-dotted border-slate-300 pb-0.5">
            <span className="font-semibold text-slate-600">Date</span>
            <span className="font-mono text-[11px] font-bold text-slate-900">
              {voucher.paymentDate}
            </span>
            <span className="font-semibold text-slate-700" dir="rtl">
              التاريخ
            </span>
          </div>
        </div>
      </div>

      {/* Main Rounded Voucher Body */}
      <div
        className="mt-3.5 rounded-2xl border-2 px-4 py-3 space-y-1.5"
        style={{ borderColor: accent }}
      >
        <VoucherLineRow
          labelEn={meta.partyEn}
          labelAr={meta.partyAr}
          value={voucher.customerName}
        />
        <VoucherLineRow
          labelEn="The Sum of"
          labelAr="مبلغ وقدره"
          value={`${amountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${voucher.currencyCode}`}
          mono
        />
        <VoucherLineRow
          labelEn="Payment Method"
          labelAr="طريقة الدفع"
          value={`${methodLabel.ar} — ${methodLabel.en}`}
        />

        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <VoucherLineRow
            labelEn="Ref / Cheque No."
            labelAr="نقداً / شيك رقم"
            value={voucher.referenceNo}
            mono
          />
          <VoucherLineRow
            labelEn="Bank"
            labelAr="على بنك"
            value={voucher.bankName}
          />
        </div>

        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <VoucherLineRow
            labelEn="Contract No."
            labelAr="رقم العقد"
            value={voucher.contractNumber}
            mono
          />
          <VoucherLineRow
            labelEn="Payment Date"
            labelAr="تاريخ الدفع"
            value={voucher.paymentDate}
            mono
          />
        </div>

        <VoucherLineRow
          labelEn="For"
          labelAr="وذلك عن"
          value={voucher.description}
        />

        {/* Signature Row */}
        <div className="mt-3 grid grid-cols-2 gap-6 pt-3">
          <div className="text-center">
            <div className="mx-auto mb-1 flex h-10 w-40 items-end justify-center border-b border-slate-400 pb-1">
              <span className="text-[10px] text-slate-400">
                {voucher.voucherType === "receipt" ? voucher.customerName : ""}
              </span>
            </div>
            <div className="text-[10px] font-bold text-slate-700">
              Customer / Receiver&apos;s Sign.
            </div>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-1 flex h-10 w-40 items-end justify-center border-b border-slate-400 pb-1">
              {voucher.employeeSignatureDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={voucher.employeeSignatureDataUrl}
                  alt="Employee Signature"
                  className="max-h-9 max-w-[140px] object-contain"
                />
              ) : (
                <span className="text-[10px] font-semibold text-slate-600">
                  {voucher.employeeName || ""}
                </span>
              )}
            </div>
            <div className="text-[10px] font-bold text-slate-700" dir="rtl">
              توقيع المستلم / الموظف {voucher.employeeName ? `(${voucher.employeeName})` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Contact Info */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
        <div dir="ltr" className="font-mono font-semibold text-slate-700">
          {company?.phone ? `Tel: ${company.phone}` : ""}
          {company?.phone && company?.email ? "  |  " : ""}
          {company?.email || ""}
        </div>
        <div dir="rtl">{addressLine || company?.name || ""}</div>
      </div>
    </div>
  );
}
