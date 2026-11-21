"use client";

import { useState } from "react";
import {
  useCompleteRentalContractMutation,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { Alert } from "@/components/ui/Alert";

interface CompleteContractModalProps {
  contract: RentalContractDto | null;
  isRtl: boolean;
  onClose: () => void;
}

export function CompleteContractModal(props: CompleteContractModalProps) {
  if (!props.contract) return null;
  return <CompleteContractForm key={props.contract.id} {...props} contract={props.contract} />;
}

function CompleteContractForm({
  contract,
  isRtl,
  onClose,
}: Omit<CompleteContractModalProps, "contract"> & { contract: RentalContractDto }) {
  const [completeContract, { isLoading }] = useCompleteRentalContractMutation();
  const [returnOdometer, setReturnOdometer] = useState(contract.pickupOdometer);
  const [extraCharges, setExtraCharges] = useState(contract.extraCharges || 0);
  const [paidAmount, setPaidAmount] = useState(contract.totalAmount);
  const [notes, setNotes] = useState(contract.notes || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);



  if (!contract) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contract) return;
    setErrorMsg(null);
    try {
      await completeContract({
        id: contract.id,
        returnOdometer: Number(returnOdometer) || contract.pickupOdometer,
        extraCharges: Number(extraCharges) || 0,
        paidAmount: Number(paidAmount) || 0,
        notes: notes.trim() || null,
      }).unwrap();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: { message?: string } } })?.data?.error?.message ||
        (isRtl ? "تعذر إغلاق العقد." : "Failed to complete contract.");
      setErrorMsg(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md rounded-2xl border border-revix-border bg-revix-white shadow-xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between border-b border-revix-border px-5 py-4">
          <h3 className="text-sm font-bold text-revix-dark">
            {isRtl ? `استلام السيارة وإغلاق العقد ${contract.contractNumber}` : `Complete Contract ${contract.contractNumber}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface"
          >
            <RevixIcon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {errorMsg && <Alert variant="error" message={errorMsg} />}

          <div className="rounded-xl border border-revix-border bg-revix-surface/50 p-3 space-y-1">
            <div className="font-bold text-revix-dark">{contract.vehicleName} ({contract.vehiclePlate})</div>
            <div className="text-revix-secondary">
              {contract.customerName} • {isRtl ? `عداد الخروج: ${contract.pickupOdometer.toLocaleString()} كم` : `Pickup: ${contract.pickupOdometer.toLocaleString()} km`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "عداد العودة (كم) *" : "Return Odometer *"}
              </label>
              <input
                type="number"
                required
                min={contract.pickupOdometer}
                value={returnOdometer}
                onChange={(e) => setReturnOdometer(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "رسوم إضافية (تأخير/أضرار)" : "Extra Charges"}
              </label>
              <input
                type="number"
                min={0}
                value={extraCharges}
                onChange={(e) => setExtraCharges(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-revix-dark mb-1">
              {isRtl ? "إجمالي المبلغ المحصّل" : "Final Paid Amount"}
            </label>
            <input
              type="number"
              min={0}
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-revix-dark mb-1">
              {isRtl ? "ملاحظات الاستلام" : "Return Notes"}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRtl ? "حالة السيارة عند العودة..." : "Vehicle condition on return..."}
              className="h-9 w-full rounded-lg border border-revix-border px-3"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-revix-border pt-3.5">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-revix-border px-4 py-2 font-semibold text-revix-secondary hover:bg-revix-surface"
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer rounded-lg bg-revix-primary px-5 py-2 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
            >
              {isLoading ? (isRtl ? "جاري الإغلاق..." : "Completing...") : isRtl ? "تأكيد الاستلام" : "Complete Return"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
