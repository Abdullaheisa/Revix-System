"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import {
  DetailTileGrid,
  StudioModal,
  MASTER_LABEL_CLASS,
} from "@/components/shared/workspace";
import {
  useCreateContractVoucherMutation,
  useListContractVouchersQuery,
  type ContractVoucherDto,
  type ContractVoucherType,
  type RentalContractDto,
  type VoucherPaymentMethod,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { getApiErrorMessage } from "@/lib/api/errors";
import { printHtmlElementInIframe } from "@/lib/print/printHtmlContainer";
import {
  PAYMENT_METHOD_LABELS,
  VOUCHER_TYPE_META,
  VoucherPrintSheet,
  type VoucherSheetData,
} from "./VoucherPrintSheet";

interface ContractVoucherModalProps {
  contract: RentalContractDto | null;
  initialVoucherType: ContractVoucherType;
  isRtl: boolean;
  onClose: () => void;
}

function getDefaultAmount(
  contract: RentalContractDto,
  type: ContractVoucherType,
): number {
  if (type === "refund") {
    return Number(contract.depositAmount || contract.totalAmount || 0);
  }
  if (type === "receipt") {
    const remaining = Math.max(
      0,
      Number(contract.totalAmount || 0) - Number(contract.paidAmount || 0),
    );
    return remaining > 0 ? remaining : Number(contract.totalAmount || 0);
  }
  return Number(contract.totalAmount || 0);
}

function getDefaultDescription(
  contract: RentalContractDto,
  type: ContractVoucherType,
  isRtl: boolean,
): string {
  const car = [contract.vehicleName, contract.vehiclePlate].filter(Boolean).join(" — ");
  if (type === "refund") {
    return isRtl
      ? `رد مبلغ التأمين / مرتجع لعقد الإيجار ${contract.contractNumber} (${car})`
      : `Security deposit / refund for contract ${contract.contractNumber} (${car})`;
  }
  if (type === "payment") {
    return isRtl
      ? `سند صرف / دفع متعلق بعقد الإيجار ${contract.contractNumber} (${car})`
      : `Payment related to rental contract ${contract.contractNumber} (${car})`;
  }
  return isRtl
    ? `دفعة إيجار سيارة ${car} — عقد رقم ${contract.contractNumber}`
    : `Car rental payment ${car} — Contract ${contract.contractNumber}`;
}

export function ContractVoucherModal({
  contract,
  initialVoucherType,
  isRtl,
  onClose,
}: ContractVoucherModalProps) {
  const { data: ctx } = useGetWorkspaceContextQuery();
  const company = ctx?.data?.company ?? null;
  const currentUser = ctx?.data?.user ?? null;

  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<VoucherPaymentMethod>("cash");
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [referenceNo, setReferenceNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSavedVoucher, setActiveSavedVoucher] =
    useState<ContractVoucherDto | null>(null);

  const { data: vouchersRes, isLoading: isLoadingHistory } =
    useListContractVouchersQuery(contract?.id ?? "", { skip: !contract });
  const [createVoucher, { isLoading: isSaving }] =
    useCreateContractVoucherMutation();

  useEffect(() => {
    if (!contract) return;
    setAmount(getDefaultAmount(contract, initialVoucherType));
    setPaymentMethod("cash");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReferenceNo("");
    setBankName("");
    setErrorMsg(null);
    setActiveSavedVoucher(null);
  }, [contract, initialVoucherType]);

  if (!contract) return null;

  const voucherType = initialVoucherType;
  const currency = contract.currencyCode || company?.baseCurrency || "EGP";
  const vouchers = vouchersRes?.data ?? [];
  const meta = VOUCHER_TYPE_META[voucherType];
  const dynamicDescription = getDefaultDescription(contract, voucherType, isRtl);

  const previewSheet: VoucherSheetData = activeSavedVoucher
    ? {
        voucherNumber: activeSavedVoucher.voucherNumber,
        voucherType: activeSavedVoucher.voucherType,
        amount: activeSavedVoucher.amount,
        currencyCode: activeSavedVoucher.currencyCode,
        paymentMethod: activeSavedVoucher.paymentMethod,
        paymentDate: activeSavedVoucher.paymentDate,
        customerName:
          activeSavedVoucher.customerName || contract.customerName || "—",
        contractNumber:
          activeSavedVoucher.contractNumber || contract.contractNumber,
        referenceNo: activeSavedVoucher.referenceNo,
        bankName: activeSavedVoucher.bankName,
        description: activeSavedVoucher.description,
        employeeName:
          activeSavedVoucher.createdByUserName || currentUser?.fullName,
        employeeSignatureDataUrl:
          activeSavedVoucher.createdByUserSignatureDataUrl ||
          currentUser?.signatureDataUrl,
      }
    : {
        voucherNumber:
          voucherType === "receipt"
            ? "RV-NEW"
            : voucherType === "payment"
              ? "PV-NEW"
              : "RF-NEW",
        voucherType,
        amount,
        currencyCode: currency,
        paymentMethod,
        paymentDate,
        customerName: contract.customerName || "—",
        contractNumber: contract.contractNumber,
        referenceNo,
        bankName,
        description: dynamicDescription,
        employeeName: currentUser?.fullName || contract.createdByUserName,
        employeeSignatureDataUrl: currentUser?.signatureDataUrl || null,
      };

  function printCurrentVoucher(sheetData: VoucherSheetData) {
    const typeLabel = VOUCHER_TYPE_META[sheetData.voucherType].ar;
    const safeCustomer = (sheetData.customerName || "")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .trim();
    const pdfTitle = [typeLabel, sheetData.voucherNumber, safeCustomer]
      .filter(Boolean)
      .join(" - ");

    setTimeout(() => {
      printHtmlElementInIframe({
        elementId: "revix-printable-voucher",
        title: pdfTitle,
        pageCss: "html, body { padding: 12mm; }",
      });
    }, 80);
  }

  async function handleSaveAndPrint() {
    if (!contract || activeSavedVoucher) return;
    setErrorMsg(null);

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg(
        isRtl
          ? "يجب إدخال مبلغ أكبر من صفر."
          : "Please enter an amount greater than zero.",
      );
      return;
    }

    try {
      const res = await createVoucher({
        contractId: contract.id,
        voucherType,
        amount: Number(amount),
        paymentMethod,
        paymentDate,
        referenceNo: referenceNo.trim() || null,
        bankName: bankName.trim() || null,
        description: dynamicDescription,
      }).unwrap();

      setActiveSavedVoucher(res.data);
      printCurrentVoucher({
        voucherNumber: res.data.voucherNumber,
        voucherType: res.data.voucherType,
        amount: res.data.amount,
        currencyCode: res.data.currencyCode,
        paymentMethod: res.data.paymentMethod,
        paymentDate: res.data.paymentDate,
        customerName: res.data.customerName || contract.customerName || "—",
        contractNumber: res.data.contractNumber || contract.contractNumber,
        referenceNo: res.data.referenceNo,
        bankName: res.data.bankName,
        description: res.data.description,
        employeeName: res.data.createdByUserName || currentUser?.fullName,
        employeeSignatureDataUrl:
          res.data.createdByUserSignatureDataUrl ||
          currentUser?.signatureDataUrl,
      });
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر حفظ السند." : "Failed to save voucher."),
      );
    }
  }

  return (
    <StudioModal
      isOpen={Boolean(contract)}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      title={
        isRtl
          ? `${meta.ar} — عقد ${contract.contractNumber}`
          : `${meta.en} — ${contract.contractNumber}`
      }
    >
      <div className="space-y-5" dir={isRtl ? "rtl" : "ltr"}>
        {errorMsg && (
          <Alert
            variant="error"
            message={errorMsg}
            onClose={() => setErrorMsg(null)}
          />
        )}

        {/* Read-Only Dynamic Contract Data */}
        <div className="rounded-xl border border-revix-border bg-revix-surface/50 p-4 space-y-3">
          <DetailTileGrid
            columns={4}
            items={[
              {
                label: isRtl ? "نوع السند" : "Voucher Type",
                value: (
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.badgeCls}`}
                  >
                    {isRtl ? meta.ar : meta.en}
                  </span>
                ),
              },
              {
                label: isRtl ? "رقم العقد" : "Contract #",
                value: <span className="font-mono">{contract.contractNumber}</span>,
              },
              {
                label: isRtl ? "اسم العميل" : "Customer Name",
                value: contract.customerName || "—",
              },
              {
                label: isRtl ? "إجمالي العقد" : "Contract Total",
                value: (
                  <span className="font-mono">
                    {Number(contract.totalAmount || 0).toLocaleString()} {currency}
                  </span>
                ),
              },
            ]}
          />
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-500">
              {isRtl ? "وذلك عن: " : "For: "}
            </span>
            <span className="font-semibold text-slate-900">{dynamicDescription}</span>
          </div>
        </div>

        {/* Manual Payment Entry Fields (No auto-submit on Enter) */}
        <div className="rounded-xl border border-revix-border bg-white p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            <FormInput
              type="number"
              min={0.01}
              step="0.01"
              disabled={Boolean(activeSavedVoucher)}
              label={isRtl ? `المبلغ (${currency}) *` : `Amount (${currency}) *`}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="font-mono font-bold"
            />

            <div>
              <label className={MASTER_LABEL_CLASS}>
                {isRtl ? "طريقة الدفع *" : "Payment Method *"}
              </label>
              <RevixSelect
                size="sm"
                isRtl={isRtl}
                disabled={Boolean(activeSavedVoucher)}
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as VoucherPaymentMethod)
                }
                buttonClassName="h-10 rounded-lg text-xs"
                options={[
                  { value: "cash", label: isRtl ? "كاش" : "Cash" },
                  { value: "knet", label: isRtl ? "كي نت (K-Net)" : "K-Net" },
                  { value: "link", label: isRtl ? "رابط دفع" : "Payment Link" },
                  { value: "bank_transfer", label: isRtl ? "تحويل بنكي" : "Bank Transfer" },
                  { value: "cheque", label: isRtl ? "شيك" : "Cheque" },
                ]}
              />
            </div>

            <FormInput
              type="date"
              disabled={Boolean(activeSavedVoucher)}
              label={isRtl ? "تاريخ الدفع *" : "Payment Date *"}
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="font-mono"
            />

            <FormInput
              disabled={Boolean(activeSavedVoucher)}
              label={isRtl ? "رقم الشيك / المرجع" : "Cheque / Ref No."}
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder={isRtl ? "اختياري..." : "Optional..."}
              className="font-mono"
            />

            <FormInput
              disabled={Boolean(activeSavedVoucher)}
              label={isRtl ? "البنك" : "Bank"}
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder={isRtl ? "اسم البنك..." : "Bank name..."}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {isRtl ? "إغلاق" : "Close"}
            </Button>

            {activeSavedVoucher ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setActiveSavedVoucher(null);
                    setReferenceNo("");
                    setBankName("");
                  }}
                >
                  {isRtl ? "إنشاء سند جديد" : "New Voucher"}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => printCurrentVoucher(previewSheet)}
                >
                  <RevixIcon name="file-text" size={14} />
                  <span>{isRtl ? "طباعة السند" : "Print Voucher"}</span>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="primary"
                isLoading={isSaving}
                onClick={handleSaveAndPrint}
              >
                <RevixIcon name="file-text" size={14} />
                <span>
                  {isRtl ? "حفظ وطباعة السند" : "Save & Print Voucher"}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Live Voucher Preview */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-revix-secondary">
            {isRtl ? "معاينة السند قبل الطباعة" : "Voucher Print Preview"}
          </div>
          <VoucherPrintSheet company={company} voucher={previewSheet} />
        </div>

        {/* Previously Issued Vouchers */}
        {!isLoadingHistory && vouchers.length > 0 && (
          <div className="rounded-xl border border-revix-border bg-white p-3.5 space-y-2">
            <div className="text-xs font-bold text-revix-dark">
              {isRtl
                ? `السندات المسجلة لهذا العقد (${vouchers.length})`
                : `Issued Vouchers for Contract (${vouchers.length})`}
            </div>
            <div className="divide-y divide-slate-100">
              {vouchers.map((v) => {
                const vMeta = VOUCHER_TYPE_META[v.voucherType];
                const pm = PAYMENT_METHOD_LABELS[v.paymentMethod];
                return (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-rose-600">
                        {v.voucherNumber}
                      </span>
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${vMeta.badgeCls}`}
                      >
                        {isRtl ? vMeta.ar : vMeta.en}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {v.amount.toLocaleString()} {v.currencyCode}
                      </span>
                      <span className="text-slate-500">
                        • {isRtl ? pm.ar : pm.en} • {v.paymentDate}
                      </span>
                      {v.createdByUserName && (
                        <span className="text-[11px] text-slate-400">
                          ({v.createdByUserName})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSavedVoucher(v);
                        printCurrentVoucher({
                          voucherNumber: v.voucherNumber,
                          voucherType: v.voucherType,
                          amount: v.amount,
                          currencyCode: v.currencyCode,
                          paymentMethod: v.paymentMethod,
                          paymentDate: v.paymentDate,
                          customerName:
                            v.customerName || contract.customerName || "—",
                          contractNumber:
                            v.contractNumber || contract.contractNumber,
                          referenceNo: v.referenceNo,
                          bankName: v.bankName,
                          description: v.description,
                          employeeName: v.createdByUserName,
                          employeeSignatureDataUrl:
                            v.createdByUserSignatureDataUrl,
                        });
                      }}
                      className="cursor-pointer rounded-md border border-revix-border bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-revix-dark hover:bg-revix-surface"
                    >
                      {isRtl ? "عرض وطباعة" : "View & Print"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </StudioModal>
  );
}
