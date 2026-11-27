"use client";

import { useMemo, useState } from "react";
import {
  useSignRentalContractMutation,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { useUpdateMySignatureMutation } from "@/store/api/authApi";
import { useGetWorkspaceContextQuery, type CompanyDto } from "@/store/api/workspaceApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { SignaturePadModal } from "@/components/shared/SignaturePadModal";
import { Alert } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  DEFAULT_CONTRACT_TERMS_AR,
  DEFAULT_CONTRACT_TERMS_EN,
} from "@/lib/constants/contractTerms";

interface RentalContractPrintModalProps {
  contract: RentalContractDto | null;
  isRtl: boolean;
  onClose: () => void;
  onSigned?: (updated: RentalContractDto) => void;
}

function splitClauses(raw: string | null | undefined, fallback: string): string[] {
  const source = raw?.trim() ? raw : fallback;
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatTime(isoDateOrTimestamp: string | undefined): string {
  if (!isoDateOrTimestamp) return "—";
  const d = new Date(isoDateOrTimestamp);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function CompanyPrintHeader({ company }: { company: CompanyDto | null }) {
  const nameArOrEn = company?.legalName || company?.name || "Revix Car Rental";
  const nameEn = company?.name || "Revix Car Rental";
  const accent = company?.brandColor || "#14532D";

  return (
    <div className="flex items-center justify-between gap-4 border-b-2 pb-2.5" style={{ borderColor: accent }}>
      <div className="flex items-center gap-3">
        {company?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt={nameEn}
            className="h-14 w-auto max-w-[140px] object-contain"
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-black text-white"
            style={{ backgroundColor: accent }}
          >
            {nameEn.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="text-end leading-tight">
        <div className="text-base font-extrabold text-slate-900">{nameArOrEn}</div>
        {nameEn && nameEn !== nameArOrEn && (
          <div className="text-xs font-bold text-slate-700">{nameEn}</div>
        )}
        <div className="mt-1 flex flex-wrap items-center justify-end gap-x-3 gap-y-0.5 text-[10px] text-slate-600" dir="ltr">
          {company?.phone && <span>Tel: {company.phone}</span>}
          {company?.email && <span>{company.email}</span>}
        </div>
      </div>
    </div>
  );
}

function CompanyPrintFooter({ company }: { company: CompanyDto | null }) {
  const accent = company?.brandColor || "#14532D";
  const addressLine = [company?.address, company?.city, company?.postalCode]
    .filter(Boolean)
    .join(" — ");

  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[10px] text-slate-600"
      style={{ borderColor: accent }}
    >
      <div dir="ltr" className="font-mono font-semibold text-slate-800">
        {company?.phone ? `Tel: ${company.phone}` : ""}
        {company?.phone && company?.email ? "  |  " : ""}
        {company?.email || ""}
      </div>
      <div className="text-end">{addressLine || company?.name || ""}</div>
    </div>
  );
}

function SignatureBox({
  labelAr,
  labelEn,
  signatureDataUrl,
  subLabel,
  onClick,
}: {
  labelAr: string;
  labelEn: string;
  signatureDataUrl?: string | null;
  subLabel?: string | null;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`brand-box flex flex-col justify-between rounded-lg border bg-white p-2 min-h-[78px] ${
        onClick ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-700 border-b border-slate-200 pb-1">
        <span>{labelEn}</span>
        <span>{labelAr}</span>
      </div>
      <div className="flex flex-1 items-center justify-center py-1">
        {signatureDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signatureDataUrl} alt={labelEn} className="max-h-11 max-w-full object-contain" />
        ) : (
          <span className="text-[10px] text-slate-400">
            {onClick ? "اضغط للتوقيع / Click to sign" : ""}
          </span>
        )}
      </div>
      {subLabel && (
        <div className="text-center text-[9px] font-medium text-slate-500 truncate">{subLabel}</div>
      )}
    </div>
  );
}

function BilingualRow({
  labelEn,
  labelAr,
  value,
  mono = false,
}: {
  labelEn: string;
  labelAr: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-12 items-center border-b border-dotted border-slate-300 py-1 text-[10.5px]">
      <div className="col-span-4 text-start font-medium text-slate-600">{labelEn} :</div>
      <div
        className={`col-span-4 text-center font-semibold text-slate-900 truncate ${
          mono ? "font-mono" : ""
        }`}
        dir="ltr"
      >
        {value !== undefined && value !== null && String(value).trim() !== "" ? value : "—"}
      </div>
      <div className="col-span-4 text-end font-semibold text-slate-700">: {labelAr}</div>
    </div>
  );
}

export function RentalContractPrintModal({
  contract,
  isRtl,
  onClose,
  onSigned,
}: RentalContractPrintModalProps) {
  const { data: ctx } = useGetWorkspaceContextQuery();
  const [signContract, { isLoading: isSigning }] = useSignRentalContractMutation();
  const [updateMySignature, { isLoading: isSavingEmpSig }] = useUpdateMySignatureMutation();
  const [signTarget, setSignTarget] = useState<"employee" | "customer" | null>(null);
  const [savedEmployeeSig, setSavedEmployeeSig] = useState<string | null>(null);
  const [savedCustomerSig, setSavedCustomerSig] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const company = ctx?.data?.company ?? null;
  const currentUser = ctx?.data?.user ?? null;

  const termsAr = useMemo(
    () => splitClauses(company?.contractTermsAr, DEFAULT_CONTRACT_TERMS_AR),
    [company?.contractTermsAr],
  );
  const termsEn = useMemo(
    () => splitClauses(company?.contractTermsEn, DEFAULT_CONTRACT_TERMS_EN),
    [company?.contractTermsEn],
  );

  if (!contract) return null;

  const currency = contract.currencyCode || company?.baseCurrency || "EGP";
  const accent = company?.brandColor || "#14532D";
  const contractTime = formatTime(contract.createdAt);

  // Employee signature comes strictly from the contract creator (or current user if they are the creator)
  const canCurrentUserSignAsEmployee =
    !contract.createdByUserId || contract.createdByUserId === currentUser?.id;
  const lessorSignatureUrl =
    savedEmployeeSig ||
    contract.createdByUserSignatureDataUrl ||
    (canCurrentUserSignAsEmployee ? currentUser?.signatureDataUrl : null) ||
    null;

  const lesseeSignatureUrl = savedCustomerSig || contract.customerSignatureDataUrl || null;
  const canPromptCustomerSign = !lesseeSignatureUrl && contract.status === "active";
  const canPromptEmployeeSign = !lessorSignatureUrl && canCurrentUserSignAsEmployee;

  const dailyKmLabel =
    contract.vehicleDailyKmLimit && contract.vehicleDailyKmLimit > 0
      ? String(contract.vehicleDailyKmLimit)
      : "Unlimited";
  const extraKmLabel =
    contract.vehicleExtraKmRate && contract.vehicleExtraKmRate > 0
      ? `${contract.vehicleExtraKmRate} ${currency}`
      : "—";

  async function handleSaveSignature(dataUrl: string) {
    if (!contract) return;
    setSignError(null);
    try {
      if (signTarget === "employee") {
        await updateMySignature({ signatureDataUrl: dataUrl }).unwrap();
        setSavedEmployeeSig(dataUrl);
        setSignTarget(null);
        return;
      }
      const res = await signContract({
        id: contract.id,
        signatureDataUrl: dataUrl,
      }).unwrap();
      setSavedCustomerSig(dataUrl);
      setSignTarget(null);
      onSigned?.(res.data);
    } catch (err) {
      setSignError(
        getApiErrorMessage(err) || (isRtl ? "تعذر حفظ التوقيع." : "Failed to save signature."),
      );
    }
  }

  function handlePrintContract() {
    if (canPromptEmployeeSign) {
      setSignError(
        isRtl
          ? "يجب إضافة توقيع الموظف المسئول أولاً قبل الطباعة."
          : "Employee signature is required before printing.",
      );
      setSignTarget("employee");
      return;
    }
    const container = document.getElementById("revix-printable-contract");
    if (!container) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    const stylesHtml = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${contract?.contractNumber ?? "Contract"}</title>
  ${stylesHtml}
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .revix-print-root {
      --brand: ${accent};
      --brand-soft: color-mix(in srgb, ${accent} 10%, white);
      --brand-border: color-mix(in srgb, ${accent} 35%, white);
      padding: 0 !important;
    }
    .revix-print-page {
      break-after: page;
      page-break-after: always;
      border: none !important;
      box-shadow: none !important;
      margin: 0 auto !important;
      padding: 0 !important;
      max-width: 100% !important;
    }
    .revix-print-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .no-print { display: none !important; }
  </style>
</head>
<body>
  <div class="revix-print-root">${container.innerHTML}</div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    }, 350);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
      dir="ltr"
    >
      <style>{`
        .revix-print-root {
          --brand: ${accent};
          --brand-soft: color-mix(in srgb, ${accent} 10%, white);
          --brand-border: color-mix(in srgb, ${accent} 35%, white);
        }
        .brand-box { border-color: var(--brand-border) !important; }
        .brand-head { background-color: var(--brand-soft) !important; border-color: var(--brand-border) !important; }
        .brand-text { color: var(--brand) !important; }
        .brand-bg { background-color: var(--brand) !important; }
      `}</style>

      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-revix-border bg-slate-100 shadow-2xl print:max-h-none print:rounded-none print:border-0 print:bg-white print:shadow-none">
        {/* Toolbar */}
        <div
          className="no-print flex shrink-0 items-center justify-between border-b border-revix-border bg-white px-5 py-3"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-revix-primary px-2.5 py-1 font-mono text-xs font-bold text-white">
              {contract.contractNumber}
            </span>
            <h3 className="text-sm font-bold text-revix-dark">
              {isRtl ? "معاينة وطباعة عقد الإيجار (٣ صفحات)" : "Rental Contract Preview & Print (3 Pages)"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {canPromptEmployeeSign && (
              <button
                type="button"
                onClick={() => setSignTarget("employee")}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-50 px-3 text-xs font-bold text-rose-800 hover:bg-rose-100"
              >
                <RevixIcon name="check" size={13} />
                <span>{isRtl ? "توقيع الموظف (مطلوب)" : "Employee Sign (Required)"}</span>
              </button>
            )}
            {canPromptCustomerSign && (
              <button
                type="button"
                onClick={() => setSignTarget("customer")}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                <RevixIcon name="check" size={13} />
                <span>{isRtl ? "توقيع العميل (يحفظ للعميل)" : "Customer Sign (Save to Profile)"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintContract}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white hover:bg-revix-primary-hover"
            >
              <RevixIcon name="file-text" size={13} />
              <span>{isRtl ? "طباعة العقد" : "Print Contract"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-revix-secondary hover:bg-slate-100"
              aria-label={isRtl ? "إغلاق" : "Close"}
            >
              <RevixIcon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Printable 3-Page Sheets */}
        <div id="revix-printable-contract" className="revix-print-root min-h-0 flex-1 overflow-y-auto p-5 space-y-6">
          {signError && (
            <div className="no-print" dir={isRtl ? "rtl" : "ltr"}>
              <Alert variant="error" message={signError} />
            </div>
          )}

          {/* ================= PAGE 1: CAR RENTAL CONTRACT ================= */}
          <div className="revix-print-page mx-auto w-full max-w-[820px] rounded-xl border border-slate-300 bg-white p-6 shadow-sm space-y-3 text-slate-900">
            <CompanyPrintHeader company={company} />

            {/* Top Strip: Title + 5 Date/Rate Boxes */}
            <div className="grid grid-cols-12 gap-2 items-stretch">
              <div className="brand-head brand-box col-span-4 flex flex-col items-center justify-center rounded-lg border-2 px-2 py-1.5 text-center">
                <div className="text-xs font-extrabold text-slate-900">عقد تأجير سيارة</div>
                <div className="text-[11px] font-bold text-slate-700">Car Rental Contract</div>
                <div className="brand-text mt-0.5 font-mono text-[11px] font-bold">
                  {contract.contractNumber}
                </div>
              </div>
              <div className="col-span-8 grid grid-cols-5 gap-1.5">
                {[
                  { ar: "تاريخ الإنتهاء", en: "End Date", val: contract.endDate },
                  {
                    ar: "إيجار اليوم",
                    en: "Day Rent",
                    val: `${Number(contract.dailyRate || 0).toLocaleString()} ${currency}`,
                  },
                  { ar: "عدد الأيام", en: "Days", val: contract.totalDays },
                  { ar: "وقت العقد", en: "Contract Time", val: contractTime },
                  { ar: "تاريخ العقد", en: "Contract Date", val: contract.startDate },
                ].map((box) => (
                  <div
                    key={box.en}
                    className="brand-box flex flex-col justify-between rounded-lg border bg-white p-1.5 text-center"
                  >
                    <div className="text-[9.5px] font-bold text-slate-700 leading-tight">{box.ar}</div>
                    <div className="text-[9px] text-slate-500 leading-tight">{box.en}</div>
                    <div className="mt-1 font-mono text-[10.5px] font-bold text-slate-900">{box.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main 2 Columns */}
            <div className="grid grid-cols-12 gap-3">
              {/* Left Column: Renewals, Second Driver, Sponsor, Handing over */}
              <div className="col-span-5 space-y-2.5">
                <div className="brand-box rounded-lg border overflow-hidden">
                  <div className="brand-head flex items-center justify-between px-2.5 py-1 text-[10.5px] font-bold text-slate-800 border-b">
                    <span>Contract Renewals</span>
                    <span>تجديد العقد</span>
                  </div>
                  <div className="brand-box grid grid-cols-2 divide-x text-[10px] font-semibold text-slate-700 border-b">
                    <div className="px-2 py-1 text-center">إلى تاريخ / To Date</div>
                    <div className="px-2 py-1 text-center">من تاريخ / From Date</div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-200 h-20">
                    <div />
                    <div />
                  </div>
                </div>

                <div className="brand-box rounded-lg border overflow-hidden">
                  <div className="brand-head flex items-center justify-between px-2.5 py-1 text-[10.5px] font-bold text-slate-800 border-b">
                    <span>Second Driver Details</span>
                    <span>بيانات السائق الثاني</span>
                  </div>
                  <div className="px-2.5 py-1.5 space-y-1">
                    <BilingualRow labelEn="License No." labelAr="رقم الرخصة" value="" />
                    <BilingualRow labelEn="Driver Name" labelAr="اسم السائق" value="" />
                  </div>
                </div>

                <div className="brand-box rounded-lg border overflow-hidden">
                  <div className="brand-head flex items-center justify-between px-2.5 py-1 text-[10.5px] font-bold text-slate-800 border-b">
                    <span>Sponsor Details</span>
                    <span>بيانات الكفيل</span>
                  </div>
                  <div className="px-2.5 py-1.5 space-y-1">
                    <BilingualRow labelEn="Civil ID" labelAr="الرقم المدني" value="" />
                    <BilingualRow labelEn="Name" labelAr="الاسم" value="" />
                    <BilingualRow labelEn="Phone" labelAr="تلفون" value="" />
                  </div>
                </div>

                <div className="brand-box rounded-lg border overflow-hidden">
                  <div className="brand-head flex items-center justify-between px-2.5 py-1 text-[10.5px] font-bold text-slate-800 border-b">
                    <span>Handing over the car lessor</span>
                    <span>إعادة السيارة للمؤجر</span>
                  </div>
                  <div className="px-2.5 py-1.5 space-y-1 text-[10px]">
                    <BilingualRow
                      labelEn="Odometer"
                      labelAr="العداد"
                      value={contract.returnOdometer != null ? `${contract.returnOdometer} km` : ""}
                      mono
                    />
                    <BilingualRow labelEn="Date / Time" labelAr="التاريخ / الوقت" value="" />
                    <BilingualRow
                      labelEn="Employee"
                      labelAr="الموظف"
                      value={contract.createdByUserName || ""}
                    />
                    <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span>Lessee&apos;s Signature</span>
                      <span>توقيع المستأجر</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Lessee Details, Car Details, Declaration */}
              <div className="col-span-7 space-y-2.5">
                <div className="brand-box rounded-lg border overflow-hidden">
                  <div className="brand-head flex items-center justify-between px-2.5 py-1 text-[10.5px] font-bold text-slate-800 border-b">
                    <span>Lessee Details</span>
                    <span>بيانات المستأجر</span>
                  </div>
                  <div className="px-3 py-1.5 space-y-0.5">
                    <BilingualRow labelEn="Lessee Name" labelAr="اسم المستأجر" value={contract.customerName} />
                    <BilingualRow labelEn="Nationality" labelAr="الجنسية" value={contract.customerNationality} />
                    <BilingualRow labelEn="License No." labelAr="رقم الرخصة" value={contract.customerDriverLicenseNo} mono />
                    <BilingualRow labelEn="Expire Date" labelAr="تاريخ الإنتهاء" value={contract.customerLicenseExpiry} mono />
                    <BilingualRow labelEn="Civil ID No." labelAr="الرقم المدني" value={contract.customerNationalId} mono />
                    <BilingualRow labelEn="Expire Date" labelAr="تاريخ الإنتهاء" value={contract.customerNationalIdExpiry} mono />
                    <BilingualRow labelEn="Home Adrs" labelAr="عنوان السكن" value={contract.customerAddress} />
                    <BilingualRow labelEn="Phone #" labelAr="تلفون السكن" value={contract.customerPhone} mono />
                    <BilingualRow labelEn="Work Adrs" labelAr="عنوان العمل" value={contract.customerWorkAddress} />
                    <BilingualRow labelEn="Phone #" labelAr="تلفون العمل" value={contract.customerSecondaryPhone} mono />
                  </div>
                </div>

                <div className="brand-box rounded-lg border overflow-hidden">
                  <div className="brand-head flex items-center justify-between px-2.5 py-1 text-[10.5px] font-bold text-slate-800 border-b">
                    <span>Car Details</span>
                    <span>بيانات السيارة</span>
                  </div>
                  <div className="px-3 py-1.5 space-y-0.5">
                    <BilingualRow labelEn="Plate Number" labelAr="رقم اللوحة" value={contract.vehiclePlate} mono />
                    <BilingualRow labelEn="Car Brand" labelAr="الماركة" value={contract.vehicleMake} />
                    <BilingualRow
                      labelEn="Car Model"
                      labelAr="الموديل"
                      value={
                        contract.vehicleModel
                          ? `${contract.vehicleModel}${contract.vehicleModelYear ? ` ${contract.vehicleModelYear}` : ""}`
                          : contract.vehicleName
                      }
                    />
                    <BilingualRow labelEn="Car Type" labelAr="الشكل" value={contract.vehicleCategory} />
                    <BilingualRow labelEn="Car Color" labelAr="اللون" value={contract.vehicleColor} />
                    <BilingualRow labelEn="Insured with" labelAr="مؤمنة لدى" value={contract.vehicleInsuranceCompany} />
                    <BilingualRow labelEn="Insurance Expire" labelAr="نهاية التأمين" value={contract.vehicleInsuranceExpiry} mono />
                    <BilingualRow
                      labelEn="Car Milage"
                      labelAr="عداد السيارة"
                      value={`${Number(contract.pickupOdometer || 0).toLocaleString()} km`}
                      mono
                    />
                  </div>
                </div>

                <div className="brand-head brand-box rounded-lg border p-2.5 space-y-1 text-[9.5px] leading-relaxed">
                  <div className="text-end font-semibold text-slate-800" dir="rtl">
                    أقر أنا الموقع أدناه / (المستأجر) بأنني استأجرت السيارة المبين بياناتها أعلاه وقمت بمعاينتها معاينة وافية نافية للجهالة وهي بحالة سليمة من السادة /{" "}
                    <span className="font-bold">{company?.legalName || company?.name || "الشركة المؤجرة"}</span>{" "}
                    (المؤجر) وأتعهد بالمحافظة عليها وإعادتها إلى المؤجر بحالتها سليمة حال انتهاء الفترة الزمنية المتفق عليها بالعقد وألتزم بالشروط المتفق عليها.
                  </div>
                  <div className="text-start text-slate-700">
                    I, the undersigned (The lessee), acknowledge renting the vehicle described above from{" "}
                    <span className="font-bold">{company?.name || "Lessor"}</span> in good condition and pledge to return it upon expiry of the agreed period and abide by all terms.
                  </div>
                  <div className="flex items-center justify-between border-t border-amber-700/20 pt-1 text-[9.5px] font-semibold text-slate-700">
                    <span>
                      Daily KM: <span className="font-mono font-bold">{dailyKmLabel}</span> | Extra KM:{" "}
                      <span className="font-mono font-bold">{extraKmLabel}</span>
                    </span>
                    <span dir="rtl">
                      الإجمالي: <span className="font-mono font-bold">{Number(contract.totalAmount || 0).toLocaleString()} {currency}</span> | الديبوزت:{" "}
                      <span className="font-mono font-bold">{Number(contract.depositAmount || 0).toLocaleString()} {currency}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Signatures */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <SignatureBox
                labelEn="Lessor's Signature"
                labelAr="توقيع المؤجر"
                signatureDataUrl={lessorSignatureUrl}
                subLabel={contract.createdByUserName}
                onClick={canPromptEmployeeSign ? () => setSignTarget("employee") : undefined}
              />
              <SignatureBox labelEn="Sponsor's Signature" labelAr="توقيع الكفيل" />
              <SignatureBox
                labelEn="Lessee's Signature"
                labelAr="توقيع المستأجر"
                signatureDataUrl={lesseeSignatureUrl}
                subLabel={contract.customerName}
                onClick={canPromptCustomerSign ? () => setSignTarget("customer") : undefined}
              />
            </div>

            <CompanyPrintFooter company={company} />
          </div>

          {/* ================= PAGE 2: TERMS & CONDITIONS ================= */}
          <div className="revix-print-page mx-auto w-full max-w-[820px] rounded-xl border border-slate-300 bg-white p-6 shadow-sm space-y-3 text-slate-900">
            <CompanyPrintHeader company={company} />

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5 grid grid-cols-3 gap-1.5">
                {[
                  { ar: "رقم العقد", en: "Contract No.", val: contract.contractNumber },
                  { ar: "تاريخ الإنتهاء", en: "End Date", val: contract.endDate },
                  { ar: "تاريخ العقد", en: "Contract Date", val: contract.startDate },
                ].map((box) => (
                  <div
                    key={box.en}
                    className="brand-box rounded-lg border p-1.5 text-center"
                  >
                    <div className="text-[9px] font-bold text-slate-700">{box.ar}</div>
                    <div className="text-[8.5px] text-slate-500">{box.en}</div>
                    <div className="mt-0.5 font-mono text-[10px] font-bold text-slate-900">{box.val}</div>
                  </div>
                ))}
              </div>
              <div className="col-span-7 text-end text-[10.5px] leading-relaxed font-semibold text-slate-800" dir="rtl">
                <div>أقر أنا الموقع أدناه / (المستأجر)</div>
                <div>
                  بأنني استأجرت السيارة التي تحمل اللوحة رقم:{" "}
                  <span className="font-mono font-bold underline" dir="ltr">
                    {contract.vehiclePlate || "—"}
                  </span>{" "}
                  وبعد إطلاعي على مضمون ما جاء بشروط العقد تم التوقيع عليه وللمؤجر اتخاذ كافة الإجراءات القانونية ضدي في حال مخالفتي لأي من الشروط المتفق عليها والمذكورة أدناه:
                </div>
              </div>
            </div>

            {/* Bilingual Terms Grid */}
            <div className="brand-box grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div className="brand-box space-y-1.5 border-r pr-2.5 text-[9.2px] leading-snug text-slate-800">
                {termsEn.map((clause, idx) => (
                  <div key={idx} className="flex gap-1.5">
                    <span className="brand-text font-mono font-bold shrink-0">{idx + 1}.</span>
                    <span>{clause}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 pl-1 text-[9.5px] leading-snug text-slate-800 text-right" dir="rtl">
                {termsAr.map((clause, idx) => (
                  <div key={idx} className="flex gap-1.5">
                    <span className="brand-text font-mono font-bold shrink-0">{idx + 1} -</span>
                    <span>{clause}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              <SignatureBox
                labelEn="Lessor's Signature"
                labelAr="توقيع المؤجر"
                signatureDataUrl={lessorSignatureUrl}
                subLabel={contract.createdByUserName}
                onClick={canPromptEmployeeSign ? () => setSignTarget("employee") : undefined}
              />
              <SignatureBox labelEn="Sponsor's Signature" labelAr="توقيع الكفيل" />
              <SignatureBox
                labelEn="Lessee's Signature"
                labelAr="توقيع المستأجر"
                signatureDataUrl={lesseeSignatureUrl}
                subLabel={contract.customerName}
                onClick={canPromptCustomerSign ? () => setSignTarget("customer") : undefined}
              />
            </div>

            <CompanyPrintFooter company={company} />
          </div>

          {/* ================= PAGE 3: VEHICLE HANDOVER & INSPECTION ================= */}
          <div className="revix-print-page mx-auto w-full max-w-[820px] rounded-xl border border-slate-300 bg-white p-6 shadow-sm space-y-3 text-slate-900">
            <CompanyPrintHeader company={company} />

            <div className="text-center text-base font-extrabold text-slate-800">
              نموذج إستلام وتسليم السيارة
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="brand-box rounded-lg border px-3 py-1.5 font-mono text-xs font-bold">
                No.: {contract.contractNumber}
              </div>
              <div className="brand-box rounded-lg border px-3 py-1.5 font-mono text-xs font-bold">
                Date / التاريخ : {contract.startDate}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="brand-box rounded-lg border overflow-hidden">
                <div className="brand-head px-3 py-1 text-center text-xs font-bold text-slate-800 border-b">
                  بيانات السيارة
                </div>
                <div className="px-3 py-1.5 space-y-0.5">
                  <BilingualRow labelEn="Car Make" labelAr="نوع المركبة" value={contract.vehicleMake} />
                  <BilingualRow labelEn="Model YR." labelAr="موديل المركبة" value={contract.vehicleModelYear ?? contract.vehicleModel} />
                  <BilingualRow labelEn="Plate No." labelAr="رقم اللوحة" value={contract.vehiclePlate} mono />
                  <BilingualRow labelEn="Colour" labelAr="لون المركبة" value={contract.vehicleColor} />
                </div>
              </div>

              <div className="brand-box rounded-lg border overflow-hidden">
                <div className="brand-head px-3 py-1 text-center text-xs font-bold text-slate-800 border-b">
                  بيانات العميل
                </div>
                <div className="px-3 py-1.5 space-y-0.5">
                  <BilingualRow labelEn="Name" labelAr="الاسم" value={contract.customerName} />
                  <BilingualRow labelEn="R. A. No." labelAr="رقم العقد" value={contract.contractNumber} mono />
                  <BilingualRow labelEn="Date / Out" labelAr="تاريخ الخروج" value={contract.startDate} mono />
                  <BilingualRow labelEn="Time / Out" labelAr="وقت الخروج" value={contractTime} mono />
                </div>
              </div>
            </div>

            {/* Check List & Car Diagram */}
            <div className="brand-box rounded-lg border overflow-hidden">
              <div
                className="flex items-center justify-center gap-6 px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                <span>Check List</span>
                <span>قائمة التحقق</span>
              </div>
              <div className="grid grid-cols-12 gap-3 p-3 items-center">
                <div className="col-span-4 space-y-3 text-xs">
                  {/* Fuel Gauge SVG */}
                  <div className="flex flex-col items-center">
                    <svg viewBox="0 0 120 75" className="w-28 h-16">
                      <path d="M 20 55 A 40 40 0 0 1 100 55" fill="none" stroke={accent} strokeWidth="3" />
                      <line x1="20" y1="55" x2="27" y2="55" stroke={accent} strokeWidth="2" />
                      <line x1="60" y1="15" x2="60" y2="23" stroke={accent} strokeWidth="2" />
                      <line x1="100" y1="55" x2="93" y2="55" stroke={accent} strokeWidth="2" />
                      <text x="12" y="70" fontSize="11" fontWeight="bold" fill="#1e293b">E</text>
                      <text x="97" y="70" fontSize="11" fontWeight="bold" fill="#1e293b">F</text>
                      <rect x="52" y="42" width="16" height="22" rx="2" fill="none" stroke={accent} strokeWidth="2" />
                    </svg>
                    <div className="text-[11px] font-bold text-slate-700">دفتر السيارة / Fuel</div>
                  </div>
                  <div className="space-y-1.5 border-t border-slate-200 pt-2 text-[10.5px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600">K.M Out</span>
                      <span className="font-mono font-bold text-slate-900">
                        {Number(contract.pickupOdometer || 0).toLocaleString()} كم
                      </span>
                      <span className="font-semibold text-slate-700">وقت التسليم</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600">K.M In.</span>
                      <span className="font-mono font-bold text-slate-900">
                        {contract.returnOdometer != null
                          ? `${Number(contract.returnOdometer).toLocaleString()} كم`
                          : "—"}
                      </span>
                      <span className="font-semibold text-slate-700">وقت الاستلام</span>
                    </div>
                  </div>
                </div>

                {/* Car Inspection Diagram SVG */}
                <div className="col-span-8 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50/40 p-2">
                  <svg viewBox="0 0 360 175" className="w-full max-w-[340px] h-40 stroke-slate-600 fill-none">
                    {/* Top View Center */}
                    <rect x="110" y="55" width="140" height="65" rx="16" strokeWidth="1.6" />
                    <rect x="142" y="64" width="76" height="47" rx="8" strokeWidth="1.2" />
                    <line x1="142" y1="64" x2="128" y2="57" strokeWidth="1" />
                    <line x1="142" y1="111" x2="128" y2="118" strokeWidth="1" />
                    <line x1="218" y1="64" x2="235" y2="57" strokeWidth="1" />
                    <line x1="218" y1="111" x2="235" y2="118" strokeWidth="1" />
                    {/* Left Side Profile (Top) */}
                    <path d="M 105 40 L 255 40 L 245 20 L 200 12 L 145 12 L 120 24 Z" strokeWidth="1.4" />
                    <circle cx="140" cy="40" r="10" strokeWidth="1.4" fill="#ffffff" />
                    <circle cx="225" cy="40" r="10" strokeWidth="1.4" fill="#ffffff" />
                    {/* Right Side Profile (Bottom) */}
                    <path d="M 105 135 L 255 135 L 245 155 L 200 163 L 145 163 L 120 151 Z" strokeWidth="1.4" />
                    <circle cx="140" cy="135" r="10" strokeWidth="1.4" fill="#ffffff" />
                    <circle cx="225" cy="135" r="10" strokeWidth="1.4" fill="#ffffff" />
                    {/* Front & Rear */}
                    <rect x="55" y="65" width="38" height="45" rx="8" strokeWidth="1.4" />
                    <rect x="267" y="65" width="38" height="45" rx="8" strokeWidth="1.4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Vehicle Data Notes */}
            <div className="brand-box rounded-lg border overflow-hidden">
              <div
                className="flex items-center justify-center gap-6 px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                <span>Vehicle Data</span>
                <span>بيانات السيارة</span>
              </div>
              <div className="p-3 space-y-1 text-[10px] leading-relaxed text-slate-800 text-right" dir="rtl">
                <div>1 - يتحمل الطرف الثاني (المستأجر) تكلفة الصيانة الناشئة عن سوء الاستخدام والإهمال المتعمد وتكلفة قطع الغيار، وأي تخلف عن موعد الصيانة المقررة.</div>
                <div>2 - عدد الكيلومترات المسموح بها يومياً ({dailyKmLabel}) كم.</div>
                <div>3 - مبلغ التأمين المسترد (الديبوزت): {Number(contract.depositAmount || 0).toLocaleString()} {currency}.</div>
                <div>4 - يلتزم المستأجر بسداد مبلغ ({extraKmLabel}) عن كل كيلومتر زيادة عن المسموح به من استهلاكه اليومي.</div>
              </div>
            </div>

            {/* Notes + Signatures */}
            <div className="space-y-2 pt-1">
              <div className="rounded-lg border border-slate-300 px-3 py-2 text-[10.5px]" dir="rtl">
                <span className="font-bold text-slate-700">الملاحظات : </span>
                <span className="text-slate-900">{contract.notes || "—"}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <SignatureBox
                  labelEn="Employee (Delivery)"
                  labelAr="توقيع الموظف المسئول"
                  signatureDataUrl={lessorSignatureUrl}
                  subLabel={contract.createdByUserName}
                  onClick={canPromptEmployeeSign ? () => setSignTarget("employee") : undefined}
                />
                <SignatureBox
                  labelEn="Customer (Delivery)"
                  labelAr="توقيع العميل عند الاستلام"
                  signatureDataUrl={lesseeSignatureUrl}
                  subLabel={contract.customerName}
                  onClick={canPromptCustomerSign ? () => setSignTarget("customer") : undefined}
                />
                <SignatureBox labelEn="Employee (Return)" labelAr="توقيع الموظف عند التسليم" />
                <SignatureBox labelEn="Customer (Return)" labelAr="توقيع العميل عند التسليم" />
              </div>
            </div>

            <CompanyPrintFooter company={company} />
          </div>
        </div>
      </div>

      <SignaturePadModal
        isOpen={Boolean(signTarget)}
        isRtl={isRtl}
        title={
          signTarget === "employee"
            ? isRtl
              ? "توقيع الموظف المسئول (يُحفظ لحسابك)"
              : "Employee Signature (Saved to Your Account)"
            : isRtl
              ? "توقيع العميل (يُحفظ لملف العميل)"
              : "Customer Signature (Saved to Profile)"
        }
        description={
          signTarget === "employee"
            ? isRtl
              ? "سيتم حفظ هذا التوقيع على حسابك الشخصي فقط ليظهر تلقائياً كتوقيع المؤجر/الموظف المسئول في العقود."
              : "This signature will be saved to your personal employee account and printed automatically as Lessor's Signature."
            : isRtl
              ? "سيتم حفظ هذا التوقيع في ملف العميل لاستخدامه تلقائياً في العقود القادمة دون طلبه مرة أخرى."
              : "This signature will be saved to the customer's profile and reused automatically in future contracts."
        }
        isSaving={isSigning || isSavingEmpSig}
        onClose={() => setSignTarget(null)}
        onSave={handleSaveSignature}
      />
    </div>
  );
}
