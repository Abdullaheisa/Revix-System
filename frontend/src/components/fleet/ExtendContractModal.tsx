"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  useExtendRentalContractMutation,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { StudioModal } from "@/components/shared/workspace";
import { getApiErrorMessage } from "@/lib/api/errors";

interface ExtendContractModalProps {
  contract: RentalContractDto | null;
  isRtl: boolean;
  onClose: () => void;
}

function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(dateStr.slice(0, 10));
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ExtendContractModal({
  contract,
  isRtl,
  onClose,
}: ExtendContractModalProps) {
  if (!contract) return null;
  return (
    <ExtendContractForm
      key={contract.id}
      contract={contract}
      isRtl={isRtl}
      onClose={onClose}
    />
  );
}

function ExtendContractForm({
  contract,
  isRtl,
  onClose,
}: {
  contract: RentalContractDto;
  isRtl: boolean;
  onClose: () => void;
}) {
  const [extendContract, { isLoading }] = useExtendRentalContractMutation();
  const minNewEndDate = useMemo(
    () => addDaysIso(contract.endDate, 1),
    [contract.endDate],
  );
  const [newEndDate, setNewEndDate] = useState(minNewEndDate);
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currency = contract.currencyCode || "EGP";
  const dailyRate = Number(contract.dailyRate || 0);

  const addedDays = useMemo(() => {
    const oldMs = new Date(contract.endDate.slice(0, 10)).getTime();
    const newMs = new Date(newEndDate.slice(0, 10)).getTime();
    if (Number.isNaN(oldMs) || Number.isNaN(newMs) || newMs <= oldMs) return 0;
    return Math.ceil((newMs - oldMs) / (1000 * 60 * 60 * 24));
  }, [contract.endDate, newEndDate]);

  const addedAmount = addedDays * dailyRate;
  const newTotalAmount = Number(contract.totalAmount || 0) + addedAmount;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (addedDays <= 0) {
      setErrorMsg(
        isRtl
          ? "يجب أن يكون تاريخ الانتهاء الجديد بعد تاريخ الانتهاء الحالي."
          : "New end date must be after the current end date.",
      );
      return;
    }

    try {
      await extendContract({
        id: contract.id,
        newEndDate,
        notes: notes.trim() || undefined,
      }).unwrap();
      onClose();
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر تمديد العقد." : "Failed to extend contract."),
      );
    }
  }

  return (
    <StudioModal
      isOpen={Boolean(contract)}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      title={
        isRtl
          ? `تمديد العقد — ${contract.contractNumber}`
          : `Extend Contract — ${contract.contractNumber}`
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {errorMsg && (
          <Alert variant="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
        )}

        <div className="rounded-xl border border-revix-border bg-revix-surface/50 p-3.5">
          <div className="font-bold text-revix-dark">
            {contract.customerName} — {contract.vehicleName}
          </div>
          <div className="mt-1 text-[11px] text-revix-secondary">
            {isRtl ? "تاريخ الانتهاء الحالي:" : "Current End Date:"}{" "}
            <span className="font-mono font-bold text-revix-dark">{contract.endDate}</span>
          </div>
        </div>

        <FormInput
          type="date"
          required
          min={minNewEndDate}
          label={isRtl ? "تاريخ الانتهاء الجديد *" : "New End Date *"}
          value={newEndDate}
          onChange={(e) => setNewEndDate(e.target.value)}
          className="font-mono"
        />

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-emerald-900/15 bg-emerald-50/40 px-3.5 py-3">
          <div>
            <div className="text-[10.5px] text-revix-secondary">
              {isRtl ? "الأيام المضافة" : "Added Days"}
            </div>
            <div className="mt-0.5 font-mono font-bold text-revix-dark">
              +{addedDays} {isRtl ? "يوم" : "d"}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] text-revix-secondary">
              {isRtl ? "قيمة التمديد" : "Extension Cost"}
            </div>
            <div className="mt-0.5 font-mono font-bold text-revix-primary">
              +{addedAmount.toLocaleString()} {currency}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] text-revix-secondary">
              {isRtl ? "الإجمالي الجديد" : "New Total"}
            </div>
            <div className="mt-0.5 font-mono font-extrabold text-revix-dark">
              {newTotalAmount.toLocaleString()} {currency}
            </div>
          </div>
        </div>

        <FormInput
          type="text"
          label={isRtl ? "ملاحظات التمديد (اختياري)" : "Extension Notes (Optional)"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isRtl ? "سبب التمديد أو ملاحظات..." : "Reason for extension..."}
        />

        <div className="flex items-center justify-end gap-2 border-t border-revix-border pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button type="submit" disabled={isLoading || addedDays <= 0}>
            {isLoading
              ? isRtl
                ? "جاري التمديد..."
                : "Extending..."
              : isRtl
                ? "تأكيد التمديد"
                : "Confirm Extension"}
          </Button>
        </div>
      </form>
    </StudioModal>
  );
}
