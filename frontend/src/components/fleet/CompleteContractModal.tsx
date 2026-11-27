"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  useCompleteRentalContractMutation,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { StudioModal, MASTER_LABEL_CLASS } from "@/components/shared/workspace";
import { getApiErrorMessage } from "@/lib/api/errors";

interface CompleteContractModalProps {
  contract: RentalContractDto | null;
  isRtl: boolean;
  onClose: () => void;
}

function diffDaysInclusive(startYmd: string, endYmd: string): number {
  const s = new Date(startYmd.slice(0, 10));
  const e = new Date(endYmd.slice(0, 10));
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
}

export function CompleteContractModal(props: CompleteContractModalProps) {
  if (!props.contract) return null;
  return (
    <CompleteContractForm
      key={props.contract.id}
      {...props}
      contract={props.contract}
    />
  );
}

function CompleteContractForm({
  contract,
  isRtl,
  onClose,
}: Omit<CompleteContractModalProps, "contract"> & {
  contract: RentalContractDto;
}) {
  const { data: ctx } = useGetWorkspaceContextQuery();
  const currentUser = ctx?.data?.user ?? null;
  const currency = contract.currencyCode || ctx?.data?.company?.baseCurrency || "EGP";

  const [completeContract, { isLoading }] = useCompleteRentalContractMutation();

  const now = useMemo(() => new Date(), []);
  const [returnDate, setReturnDate] = useState(() =>
    now.toISOString().slice(0, 10),
  );
  const [returnTime, setReturnTime] = useState(() =>
    now.toTimeString().slice(0, 5),
  );
  const [returnOdometer, setReturnOdometer] = useState(contract.pickupOdometer);
  const [extraCharges, setExtraCharges] = useState(contract.extraCharges || 0);
  const [returnCondition, setReturnCondition] = useState(
    contract.returnCondition || "good",
  );
  const [notes, setNotes] = useState(contract.notes || "");
  const [returnScanUrl, setReturnScanUrl] = useState<string | null>(
    contract.returnContractImageUrl ?? null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const actualDays = useMemo(
    () => diffDaysInclusive(contract.startDate, returnDate),
    [contract.startDate, returnDate],
  );
  const lateDays = useMemo(() => {
    if (returnDate <= contract.endDate) return 0;
    return diffDaysInclusive(contract.endDate, returnDate);
  }, [contract.endDate, returnDate]);

  const periodAmount = Number(contract.dailyRate || 0) * actualDays;
  const discount = Number(contract.discount || 0);
  const finalTotal = Math.max(
    0,
    periodAmount - discount + Number(contract.insuranceFee || 0) + (Number(extraCharges) || 0),
  );
  const alreadyPaid = Number(contract.paidAmount || 0);
  const remainingDue = Math.max(0, finalTotal - alreadyPaid);

  const [paidNow, setPaidNow] = useState<number>(() => remainingDue);
  const [paidNowTouched, setPaidNowTouched] = useState(false);

  const effectivePaidNow = paidNowTouched ? paidNow : remainingDue;
  const finalPaidTotal = alreadyPaid + Math.max(0, Number(effectivePaidNow) || 0);
  const balanceAfter = finalTotal - finalPaidTotal;
  const drivenKm = Math.max(0, (Number(returnOdometer) || 0) - contract.pickupOdometer);

  function handleScanUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(
        isRtl
          ? "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت."
          : "Image size must not exceed 5 MB.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setReturnScanUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (Number(returnOdometer) < contract.pickupOdometer) {
      setErrorMsg(
        isRtl
          ? "عداد العودة لا يمكن أن يكون أقل من عداد الخروج."
          : "Return odometer cannot be less than pickup odometer.",
      );
      return;
    }

    try {
      await completeContract({
        id: contract.id,
        returnOdometer: Number(returnOdometer) || contract.pickupOdometer,
        returnedAt: `${returnDate}T${returnTime}:00`,
        actualDays,
        extraCharges: Number(extraCharges) || 0,
        paidAmount: finalPaidTotal,
        returnCondition,
        notes: notes.trim() || null,
        returnContractImageUrl: returnScanUrl,
      }).unwrap();
      onClose();
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر استلام السيارة وإغلاق العقد." : "Failed to complete return."),
      );
    }
  }

  return (
    <StudioModal
      isOpen={Boolean(contract)}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      title={
        isRtl
          ? `استلام السيارة وإغلاق العقد — ${contract.contractNumber}`
          : `Vehicle Return & Close Contract — ${contract.contractNumber}`
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {errorMsg && (
          <Alert
            variant="error"
            message={errorMsg}
            onClose={() => setErrorMsg(null)}
          />
        )}

        {/* Vehicle & Customer Summary Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-revix-border bg-revix-surface/50 p-3.5">
          <div>
            <div className="font-bold text-revix-dark">
              {contract.customerName} — {contract.vehicleName} (
              <span className="font-mono">{contract.vehiclePlate}</span>)
            </div>
            <div className="mt-0.5 text-[11px] text-revix-secondary">
              {isRtl ? "تاريخ الخروج:" : "Pickup:"}{" "}
              <span className="font-mono font-semibold">{contract.startDate}</span> •{" "}
              {isRtl ? "عداد الخروج:" : "Odometer:"}{" "}
              <span className="font-mono font-semibold">
                {contract.pickupOdometer.toLocaleString()} km
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
            {isRtl ? "الموظف المستلم:" : "Receiving Employee:"}{" "}
            <span className="font-bold">{currentUser?.fullName || "—"}</span>
          </div>
        </div>

        {/* Return Date, Time, Odometer */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormInput
            type="date"
            required
            min={contract.startDate}
            label={isRtl ? "تاريخ العودة *" : "Return Date *"}
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="font-mono"
          />
          <FormInput
            type="time"
            required
            label={isRtl ? "وقت العودة *" : "Return Time *"}
            value={returnTime}
            onChange={(e) => setReturnTime(e.target.value)}
            className="font-mono"
          />
          <div>
            <FormInput
              type="number"
              required
              min={contract.pickupOdometer}
              label={isRtl ? "العداد عند العودة (كم) *" : "Return Odometer (km) *"}
              value={returnOdometer}
              onChange={(e) => setReturnOdometer(Number(e.target.value))}
              className="font-mono font-bold"
            />
            <div className="mt-1 text-[10.5px] text-revix-secondary font-mono">
              {isRtl ? "المسافة المقطوعة:" : "Driven:"} {drivenKm.toLocaleString()} km
            </div>
          </div>
        </div>

        {lateDays > 0 && (
          <Alert
            variant="warning"
            message={
              isRtl
                ? `تنبيه: تأخر العميل ${lateDays} يوم عن موعد الإعادة المتوقع (${contract.endDate}). تم احتساب المدة الفعلية (${actualDays} يوم).`
                : `Notice: Customer returned ${lateDays} day(s) after expected end (${contract.endDate}). Actual duration: ${actualDays} day(s).`
            }
          />
        )}

        {/* Customer Account Settlement */}
        <div className="rounded-xl border border-emerald-900/15 bg-emerald-50/30 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-900/10 pb-2">
            <span className="text-xs font-bold text-revix-dark">
              {isRtl ? "حساب العميل عند التسليم" : "Customer Final Settlement"}
            </span>
            <span className="rounded-md bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-revix-primary border border-emerald-200">
              {actualDays} {isRtl ? "يوم إيجار فعلي" : "actual day(s)"} ×{" "}
              {Number(contract.dailyRate || 0).toLocaleString()} {currency}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-[11px]">
            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <div className="text-revix-secondary">{isRtl ? "مبلغ مدة الإيجار" : "Period Amount"}</div>
              <div className="mt-0.5 font-mono text-xs font-bold text-slate-900">
                {periodAmount.toLocaleString()} {currency}
              </div>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <div className="text-revix-secondary">{isRtl ? "الإجمالي المستحق" : "Final Total"}</div>
              <div className="mt-0.5 font-mono text-xs font-bold text-slate-900">
                {finalTotal.toLocaleString()} {currency}
              </div>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-slate-200">
              <div className="text-revix-secondary">{isRtl ? "المدفوع وقت الاستلام" : "Paid at Pickup"}</div>
              <div className="mt-0.5 font-mono text-xs font-bold text-emerald-700">
                {alreadyPaid.toLocaleString()} {currency}
              </div>
            </div>
            <div className="rounded-lg bg-white p-2.5 border border-amber-200 bg-amber-50/40">
              <div className="text-amber-800">{isRtl ? "المتبقي للسداد" : "Remaining Due"}</div>
              <div className="mt-0.5 font-mono text-xs font-extrabold text-amber-900">
                {remainingDue.toLocaleString()} {currency}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormInput
              type="number"
              min={0}
              label={isRtl ? `رسوم إضافية / غرامات (${currency})` : `Extra Charges (${currency})`}
              value={extraCharges || ""}
              onChange={(e) => setExtraCharges(Number(e.target.value) || 0)}
              className="font-mono bg-white"
            />
            <div>
              <FormInput
                type="number"
                min={0}
                label={isRtl ? `المبلغ المدفوع الآن عند التسليم (${currency})` : `Amount Paid Now (${currency})`}
                value={effectivePaidNow || ""}
                onChange={(e) => {
                  setPaidNowTouched(true);
                  setPaidNow(Number(e.target.value) || 0);
                }}
                className="font-mono font-bold bg-white"
              />
              {balanceAfter !== 0 && (
                <div className="mt-1 font-mono text-[10.5px] font-semibold text-amber-700">
                  {balanceAfter > 0
                    ? `${isRtl ? "متبقي غير مسدد:" : "Unpaid balance:"} ${balanceAfter.toLocaleString()} ${currency}`
                    : `${isRtl ? "فائض / مرتجع للعميل:" : "Refund due to customer:"} ${Math.abs(balanceAfter).toLocaleString()} ${currency}`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Condition, Notes & Return Contract Image Upload */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={MASTER_LABEL_CLASS}>
              {isRtl ? "حالة السيارة عند التسليم *" : "Return Condition *"}
            </label>
            <RevixSelect
              size="sm"
              isRtl={isRtl}
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value)}
              buttonClassName="h-10 rounded-lg text-xs"
              options={[
                { value: "good", label: isRtl ? "سليمة — بحالة ممتازة" : "Good — Clean & Intact" },
                { value: "minor_damage", label: isRtl ? "خدوش / ملاحظات بسيطة" : "Minor Scratches / Issues" },
                { value: "needs_maintenance", label: isRtl ? "بها ضرر / تحتاج صيانة" : "Damaged / Needs Maintenance" },
              ]}
            />
          </div>

          <FormInput
            label={isRtl ? "ملاحظات الاستلام" : "Return Notes"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isRtl ? "حالة السيارة عند العودة..." : "Vehicle condition on return..."}
          />
        </div>

        {/* Upload Signed Return Contract Scan */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800">
                {isRtl ? "رفع صورة العقد الموقّع بعد التسليم" : "Upload Signed Contract After Return"}
              </div>
              <div className="text-[11px] text-slate-500">
                {isRtl
                  ? "صورة واضحة للعقد الورقي بعد توقيع العميل عند إعادة السيارة (حد أقصى 5MB)."
                  : "Photo/scan of the signed paper contract on vehicle return (max 5 MB)."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {returnScanUrl && (
                <button
                  type="button"
                  onClick={() => setReturnScanUrl(null)}
                  className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                >
                  {isRtl ? "حذف الصورة" : "Remove"}
                </button>
              )}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-white px-3 py-1.5 text-xs font-semibold text-revix-dark hover:bg-revix-surface">
                <RevixIcon name="file-text" size={13} />
                <span>{returnScanUrl ? (isRtl ? "تغيير الصورة" : "Change Image") : isRtl ? "اختر صورة" : "Upload Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScanUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {returnScanUrl && (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={returnScanUrl}
                alt="Return contract scan"
                className="mx-auto max-h-40 object-contain"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-revix-border pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isRtl ? "تأكيد الاستلام وإغلاق العقد" : "Confirm Return & Close"}
          </Button>
        </div>
      </form>
    </StudioModal>
  );
}
