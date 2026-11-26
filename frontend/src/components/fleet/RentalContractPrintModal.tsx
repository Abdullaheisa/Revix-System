"use client";

import { useState } from "react";
import {
  useSignRentalContractMutation,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { SignaturePadModal } from "@/components/shared/SignaturePadModal";
import { Alert } from "@/components/ui/Alert";
import { getApiErrorMessage } from "@/lib/api/errors";

interface RentalContractPrintModalProps {
  contract: RentalContractDto | null;
  isRtl: boolean;
  onClose: () => void;
  onSigned?: (updated: RentalContractDto) => void;
}

export function RentalContractPrintModal({
  contract,
  isRtl,
  onClose,
  onSigned,
}: RentalContractPrintModalProps) {
  const { data: ctx } = useGetWorkspaceContextQuery();
  const [signContract, { isLoading: isSigning }] = useSignRentalContractMutation();
  const [isSignPadOpen, setIsSignPadOpen] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  if (!contract) return null;

  const company = ctx?.data?.company ?? null;
  const currency = company?.baseCurrency || "EGP";
  const balance = Math.max(0, Number(contract.totalAmount || 0) - Number(contract.paidAmount || 0));

  async function handleSaveSignature(dataUrl: string) {
    if (!contract) return;
    setSignError(null);
    try {
      const res = await signContract({
        id: contract.id,
        signatureDataUrl: dataUrl,
      }).unwrap();
      setIsSignPadOpen(false);
      onSigned?.(res.data);
    } catch (err) {
      setSignError(getApiErrorMessage(err) || (isRtl ? "تعذر حفظ التوقيع." : "Failed to save signature."));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] print:static print:bg-white print:p-0"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #revix-printable-contract, #revix-printable-contract * { visibility: visible !important; }
          #revix-printable-contract {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: none !important;
            border: none !important;
            box-shadow: none !important;
            padding: 20px !important;
            background: #ffffff !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xl print:max-h-none print:rounded-none print:border-0 print:shadow-none">
        {/* Toolbar */}
        <div className="no-print flex shrink-0 items-center justify-between border-b border-revix-border bg-emerald-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-revix-primary px-2.5 py-1 font-mono text-xs font-bold text-white">
              {contract.contractNumber}
            </span>
            <h3 className="text-sm font-bold text-revix-dark">
              {isRtl ? "عقد تأجير سيارة" : "Vehicle Rental Agreement"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {contract.status === "active" && (
              <button
                type="button"
                onClick={() => setIsSignPadOpen(true)}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-revix-primary/30 bg-white px-3 text-xs font-semibold text-revix-primary hover:bg-emerald-50"
              >
                <RevixIcon name="check" size={13} />
                <span>
                  {contract.customerSignatureDataUrl
                    ? isRtl ? "تحديث توقيع العميل" : "Update Signature"
                    : isRtl ? "توقيع العميل" : "Customer Sign"}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white hover:bg-revix-primary-hover"
            >
              <RevixIcon name="file-text" size={13} />
              <span>{isRtl ? "طباعة العقد" : "Print Contract"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-revix-secondary hover:bg-white"
              aria-label={isRtl ? "إغلاق" : "Close"}
            >
              <RevixIcon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div id="revix-printable-contract" className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {signError && <div className="no-print"><Alert variant="error" message={signError} /></div>}

          {/* Header */}
          <div className="flex items-start justify-between border-b border-revix-border pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-revix-dark">
                {company?.name || "Revix Car Rental"}
              </h2>
              <p className="mt-0.5 text-revix-secondary">
                {isRtl ? "اتفاقية وعقد تأجير مركبة" : "Official Vehicle Rental Contract"}
              </p>
              {contract.branchName && (
                <p className="mt-1 text-[11px] font-semibold text-revix-primary">
                  {isRtl ? "الفرع:" : "Branch:"} {contract.branchName}
                </p>
              )}
            </div>
            <div className="text-end">
              <div className="font-mono text-base font-extrabold text-revix-primary" dir="ltr">
                {contract.contractNumber}
              </div>
              <div className="mt-1 text-[11px] text-revix-secondary">
                {isRtl ? "تاريخ الإصدار:" : "Issued:"}{" "}
                <span className="font-mono" dir="ltr">
                  {String(contract.createdAt).slice(0, 10)}
                </span>
              </div>
            </div>
          </div>

          {/* Parties & Vehicle Tiles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-900/10 bg-emerald-50/60 p-3.5 space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-revix-primary">
                {isRtl ? "بيانات المستأجر (العميل)" : "Renter / Customer"}
              </div>
              <div className="text-sm font-bold text-revix-dark">{contract.customerName || "—"}</div>
              <div className="font-mono text-revix-secondary" dir="ltr">
                {contract.customerPhone || "—"}
              </div>
            </div>

            <div className="rounded-lg border border-emerald-900/10 bg-emerald-50/60 p-3.5 space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wide text-revix-primary">
                {isRtl ? "بيانات المركبة" : "Vehicle Details"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {contract.vehicleAssetCode && (
                  <span className="rounded bg-revix-primary px-1.5 py-0.5 font-mono text-[11px] font-bold text-white" dir="ltr">
                    {contract.vehicleAssetCode}
                  </span>
                )}
                <span className="text-sm font-bold text-revix-dark">{contract.vehicleName || "—"}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-revix-secondary">
                <span>
                  {isRtl ? "اللوحة:" : "Plate:"}{" "}
                  <strong className="font-mono text-revix-dark">{contract.vehiclePlate || "—"}</strong>
                </span>
                <span>
                  {isRtl ? "عداد الخروج:" : "Pickup Odo:"}{" "}
                  <strong className="font-mono text-revix-dark">
                    {contract.pickupOdometer.toLocaleString()} {isRtl ? "كم" : "km"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Period & Financials */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-lg bg-emerald-50/60 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">{isRtl ? "تاريخ الاستلام" : "Start Date"}</div>
              <div className="mt-1 font-mono text-sm font-bold text-revix-dark" dir="ltr">{contract.startDate}</div>
            </div>
            <div className="rounded-lg bg-emerald-50/60 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">{isRtl ? "تاريخ التسليم" : "End Date"}</div>
              <div className="mt-1 font-mono text-sm font-bold text-revix-dark" dir="ltr">{contract.endDate}</div>
            </div>
            <div className="rounded-lg bg-emerald-50/60 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">{isRtl ? "عدد الأيام" : "Duration"}</div>
              <div className="mt-1 font-mono text-sm font-bold text-revix-dark">
                {contract.totalDays} {isRtl ? "يوم" : "days"}
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50/60 px-3 py-2.5">
              <div className="text-[11px] text-slate-500">{isRtl ? "السعر اليومي" : "Daily Rate"}</div>
              <div className="mt-1 font-mono text-sm font-bold text-revix-dark" dir="ltr">
                {Number(contract.dailyRate).toLocaleString()} {currency}
              </div>
            </div>
          </div>

          {/* Totals Table */}
          <div className="overflow-hidden rounded-lg border border-revix-border">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-revix-border/70">
                <tr>
                  <td className="px-4 py-2 text-revix-secondary">{isRtl ? "المجموع الفرعي" : "Subtotal"}</td>
                  <td className="px-4 py-2 text-end font-mono font-semibold" dir="ltr">
                    {Number(contract.subtotal).toLocaleString()} {currency}
                  </td>
                </tr>
                {Number(contract.discount) > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-revix-secondary">{isRtl ? "الخصم" : "Discount"}</td>
                    <td className="px-4 py-2 text-end font-mono font-semibold text-rose-600" dir="ltr">
                      -{Number(contract.discount).toLocaleString()} {currency}
                    </td>
                  </tr>
                )}
                {Number(contract.insuranceFee) > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-revix-secondary">{isRtl ? "رسوم التأمين" : "Insurance Fee"}</td>
                    <td className="px-4 py-2 text-end font-mono font-semibold" dir="ltr">
                      {Number(contract.insuranceFee).toLocaleString()} {currency}
                    </td>
                  </tr>
                )}
                {Number(contract.extraCharges) > 0 && (
                  <tr>
                    <td className="px-4 py-2 text-revix-secondary">{isRtl ? "رسوم إضافية" : "Extra Charges"}</td>
                    <td className="px-4 py-2 text-end font-mono font-semibold" dir="ltr">
                      {Number(contract.extraCharges).toLocaleString()} {currency}
                    </td>
                  </tr>
                )}
                <tr className="bg-emerald-50/80 font-bold">
                  <td className="px-4 py-2.5 text-revix-dark">{isRtl ? "الإجمالي المستحق" : "Total Amount"}</td>
                  <td className="px-4 py-2.5 text-end font-mono text-sm text-revix-primary" dir="ltr">
                    {Number(contract.totalAmount).toLocaleString()} {currency}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-revix-secondary">{isRtl ? "المدفوع" : "Paid Amount"}</td>
                  <td className="px-4 py-2 text-end font-mono font-semibold text-emerald-700" dir="ltr">
                    {Number(contract.paidAmount).toLocaleString()} {currency}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-revix-secondary">{isRtl ? "المتبقي" : "Balance Due"}</td>
                  <td className="px-4 py-2 text-end font-mono font-semibold" dir="ltr">
                    {balance.toLocaleString()} {currency}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-revix-secondary">{isRtl ? "التأمين المسترد (الوديعة)" : "Security Deposit"}</td>
                  <td className="px-4 py-2 text-end font-mono font-semibold" dir="ltr">
                    {Number(contract.depositAmount).toLocaleString()} {currency}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {contract.notes && (
            <div className="rounded-lg border border-revix-border bg-revix-surface/50 px-4 py-3">
              <div className="text-[11px] font-semibold text-revix-secondary mb-1">
                {isRtl ? "ملاحظات وشروط إضافية" : "Notes & Terms"}
              </div>
              <p className="text-revix-dark whitespace-pre-wrap">{contract.notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="rounded-lg border border-dashed border-revix-border p-4 text-center">
              <div className="text-[11px] font-semibold text-revix-secondary mb-2">
                {isRtl ? "توقيع العميل (المستأجر)" : "Customer Signature"}
              </div>
              {contract.customerSignatureDataUrl ? (
                <div className="flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={contract.customerSignatureDataUrl}
                    alt="Customer signature"
                    className="h-16 max-w-full object-contain"
                  />
                  {contract.signedAt && (
                    <span className="mt-1 font-mono text-[10px] text-revix-muted" dir="ltr">
                      {String(contract.signedAt).slice(0, 16).replace("T", " ")}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex h-16 items-center justify-center text-[11px] text-revix-muted">
                  {isRtl ? "بانتظار توقيع العميل" : "Pending customer signature"}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-dashed border-revix-border p-4 text-center">
              <div className="text-[11px] font-semibold text-revix-secondary mb-2">
                {isRtl ? "ختم وتوقيع الشركة" : "Company Representative"}
              </div>
              <div className="flex h-16 items-end justify-center pb-1 text-[11px] font-semibold text-revix-dark">
                {contract.createdByUserName || company?.name || "Revix"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SignaturePadModal
        isOpen={isSignPadOpen}
        isRtl={isRtl}
        title={isRtl ? "توقيع العميل على العقد" : "Customer Contract Signature"}
        description={isRtl ? "يرجى التوقيع بالأسفل لاعتماد استلام السيارة والشروط." : "Please sign below to confirm vehicle handover and terms."}
        initialSignatureUrl={contract.customerSignatureDataUrl}
        isSaving={isSigning}
        onClose={() => setIsSignPadOpen(false)}
        onSave={handleSaveSignature}
      />
    </div>
  );
}
