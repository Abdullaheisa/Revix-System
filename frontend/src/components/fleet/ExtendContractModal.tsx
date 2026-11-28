"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  useExtendRentalContractMutation,
  useListVehiclesQuery,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
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

export function ExtendContractForm({
  contract,
  isRtl,
  onClose,
  inline = false,
}: {
  contract: RentalContractDto;
  isRtl: boolean;
  onClose?: () => void;
  inline?: boolean;
}) {
  const [extendContract, { isLoading }] = useExtendRentalContractMutation();
  const { data: vehiclesData } = useListVehiclesQuery({ pageSize: 500 });
  const vehicle = useMemo(
    () => (vehiclesData?.data ?? []).find((v) => v.id === contract.vehicleId) ?? null,
    [vehiclesData?.data, contract.vehicleId],
  );
  const minNewEndDate = useMemo(
    () => addDaysIso(contract.endDate, 1),
    [contract.endDate],
  );
  const [newEndDate, setNewEndDate] = useState(minNewEndDate);
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currency = contract.currencyCode || "EGP";

  const addedDays = useMemo(() => {
    const oldMs = new Date(contract.endDate.slice(0, 10)).getTime();
    const newMs = new Date(newEndDate.slice(0, 10)).getTime();
    if (Number.isNaN(oldMs) || Number.isNaN(newMs) || newMs <= oldMs) return 0;
    return Math.ceil((newMs - oldMs) / (1000 * 60 * 60 * 24));
  }, [contract.endDate, newEndDate]);

  const newTotalDays = useMemo(() => {
    const startMs = new Date(contract.startDate.slice(0, 10)).getTime();
    const newMs = new Date(newEndDate.slice(0, 10)).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(newMs) || newMs <= startMs) {
      return Number(contract.totalDays || 1) + addedDays;
    }
    return Math.max(1, Math.ceil((newMs - startMs) / (1000 * 60 * 60 * 24)));
  }, [contract.startDate, contract.totalDays, newEndDate, addedDays]);

  const dailyRate = useMemo(() => {
    const fallback = Number(contract.dailyRate || 0);
    if (!vehicle) return fallback;
    if (newTotalDays >= 8) {
      return Number(vehicle.dailyRate8Plus || vehicle.dailyRate3to7 || vehicle.dailyRate1to2 || fallback);
    }
    if (newTotalDays >= 3) {
      return Number(vehicle.dailyRate3to7 || vehicle.dailyRate1to2 || fallback);
    }
    return Number(vehicle.dailyRate1to2 || fallback);
  }, [vehicle, newTotalDays, contract.dailyRate]);

  const activeTierLabel = useMemo(() => {
    if (newTotalDays >= 8) return isRtl ? "شريحة +8 أيام" : "8+ days tier";
    if (newTotalDays >= 3) return isRtl ? "شريحة 3-7 أيام" : "3-7 days tier";
    return isRtl ? "شريحة 1-2 يوم" : "1-2 days tier";
  }, [newTotalDays, isRtl]);

  const newSubtotal = newTotalDays * dailyRate;
  const newTotalAmount = Math.max(
    0,
    newSubtotal -
      Number(contract.discount || 0) +
      Number(contract.insuranceFee || 0) +
      Number(contract.extraCharges || 0),
  );
  const addedAmount = newTotalAmount - Number(contract.totalAmount || 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
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
      if (inline) {
        setSuccessMsg(isRtl ? "تم تمديد العقد بنجاح." : "Contract extended successfully.");
        setNotes("");
      }
      onClose?.();
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر تمديد العقد." : "Failed to extend contract."),
      );
    }
  }

  const formContent = (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 text-xs"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {errorMsg && (
        <Alert variant="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}
      {successMsg && (
        <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg(null)} />
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

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
          {isRtl ? "تاريخ الانتهاء الجديد *" : "New End Date *"}
        </label>
        <RevixDatePicker
          size="sm"
          isRtl={isRtl}
          required
          minDate={minNewEndDate}
          value={newEndDate}
          onChange={(next) => setNewEndDate(next)}
          buttonClassName="h-10 rounded-lg text-xs font-mono"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-emerald-900/15 bg-emerald-50/40 px-3.5 py-3">
        <div>
          <div className="text-[10.5px] text-revix-secondary">
            {isRtl ? "الأيام المضافة" : "Added Days"}
          </div>
          <div className="mt-0.5 font-mono font-bold text-revix-dark">
            +{addedDays} {isRtl ? "يوم" : addedDays === 1 ? "day" : "days"}
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
        {!inline && onClose && (
          <Button type="button" variant="secondary" onClick={onClose}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
        )}
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
  );

  if (inline) {
    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {errorMsg && (
          <Alert variant="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
        )}
        {successMsg && (
          <Alert variant="success" message={successMsg} onClose={() => setSuccessMsg(null)} />
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          {/* Inputs Column */}
          <div className="space-y-4 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-revix-border bg-revix-surface/50 px-4 py-3">
              <div>
                <div className="text-xs font-bold text-revix-dark">
                  {contract.customerName} — {contract.vehicleName}
                </div>
                <div className="mt-0.5 text-[11px] text-revix-secondary">
                  {isRtl ? "تاريخ الانتهاء الحالي:" : "Current End Date:"}{" "}
                  <span className="font-mono font-bold text-revix-dark">{contract.endDate}</span>
                </div>
              </div>
              <div className="rounded-lg bg-white px-3 py-1.5 border border-revix-border text-end">
                <div className="text-[10px] text-revix-secondary">
                  {activeTierLabel}
                </div>
                <div className="font-mono text-xs font-bold text-revix-primary">
                  {dailyRate.toLocaleString()} {currency} / {isRtl ? "يوم" : "day"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
                  {isRtl ? "تاريخ الانتهاء الجديد *" : "New End Date *"}
                </label>
                <RevixDatePicker
                  size="sm"
                  isRtl={isRtl}
                  required
                  minDate={minNewEndDate}
                  value={newEndDate}
                  onChange={(next) => setNewEndDate(next)}
                  buttonClassName="h-10 rounded-lg text-xs font-mono"
                />
              </div>
              <FormInput
                type="text"
                label={isRtl ? "ملاحظات التمديد (اختياري)" : "Extension Notes (Optional)"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isRtl ? "سبب التمديد أو ملاحظات..." : "Reason for extension..."}
              />
            </div>
          </div>

          {/* Summary & Action Column */}
          <div className="rounded-xl border border-emerald-900/15 bg-emerald-50/45 p-4 space-y-4 lg:col-span-5">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[10.5px] text-revix-secondary">
                  {isRtl ? "الأيام المضافة" : "Added Days"}
                </div>
                <div className="mt-0.5 font-mono text-sm font-bold text-revix-dark">
                  +{addedDays} {isRtl ? "يوم" : addedDays === 1 ? "day" : "days"}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] text-revix-secondary">
                  {isRtl ? "قيمة التمديد" : "Extension Cost"}
                </div>
                <div className="mt-0.5 font-mono text-sm font-bold text-revix-primary">
                  +{addedAmount >= 0 ? addedAmount.toLocaleString() : addedAmount.toLocaleString()} {currency}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] text-revix-secondary">
                  {isRtl ? "الإجمالي الجديد" : "New Total"}
                </div>
                <div className="mt-0.5 font-mono text-sm font-extrabold text-revix-dark">
                  {newTotalAmount.toLocaleString()} {currency}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || addedDays <= 0}
              className="w-full justify-center"
            >
              {isLoading
                ? isRtl
                  ? "جاري التمديد..."
                  : "Extending..."
                : isRtl
                  ? "تأكيد التمديد"
                  : "Confirm Extension"}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <StudioModal
      isOpen={Boolean(contract)}
      onClose={onClose ?? (() => {})}
      maxWidthClass="max-w-lg"
      title={
        isRtl
          ? `تمديد العقد — ${contract.contractNumber}`
          : `Extend Contract — ${contract.contractNumber}`
      }
    >
      {formContent}
    </StudioModal>
  );
}
