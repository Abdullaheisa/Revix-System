"use client";

import { useMemo, useState } from "react";
import {
  useCreateRentalContractMutation,
  useListCustomersQuery,
  useListRentalContractsQuery,
  useListVehiclesQuery,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { Alert } from "@/components/ui/Alert";
import { SignaturePadModal } from "@/components/shared/SignaturePadModal";

interface CreateContractModalProps {
  isOpen: boolean;
  isRtl: boolean;
  initialVehicleId?: string | null;
  initialStartDate?: string | null;
  onClose: () => void;
  onCreated?: (contract: RentalContractDto) => void;
}

export function CreateContractModal(props: CreateContractModalProps) {
  if (!props.isOpen) return null;
  return (
    <CreateContractForm
      key={`${props.initialVehicleId ?? "new"}:${props.initialStartDate ?? ""}`}
      {...props}
    />
  );
}

function CreateContractForm({
  isOpen,
  isRtl,
  initialVehicleId = null,
  initialStartDate = null,
  onClose,
  onCreated,
}: CreateContractModalProps) {
  const { data: vehiclesData } = useListVehiclesQuery({ pageSize: 500 });
  const { data: customersData } = useListCustomersQuery();
  const { data: contractsData } = useListRentalContractsQuery();
  const [createContract, { isLoading: isCreating }] = useCreateRentalContractMutation();

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const defaultStart = initialStartDate && initialStartDate >= today ? initialStartDate : today;
  const defaultEnd = useMemo(() => {
    const [y, m, d] = defaultStart.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, (d || 1) + 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }, [defaultStart]);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicleId || "");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [odometerOverride, setOdometerOverride] = useState<{ vehicleId: string; value: number } | null>(null);
  const [rateOverride, setRateOverride] = useState<{ key: string; value: number } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [insuranceFee, setInsuranceFee] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSignPadOpen, setIsSignPadOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const customers = useMemo(() => customersData?.data ?? [], [customersData?.data]);
  const customerId = selectedCustomerId || customers[0]?.id || "";

  const activeContracts = useMemo(
    () => (contractsData?.data ?? []).filter((c) => c.status === "active"),
    [contractsData?.data],
  );

  // Exclude vehicles that are in maintenance/out_of_service, not in a branch, have no price set, or have overlapping active contracts in [startDate, endDate]
  const availableVehicles = useMemo(() => {
    const all = (vehiclesData?.data ?? []).filter(
      (v) =>
        !v.isPartnerVehicle &&
        Boolean(v.branchId) &&
        v.status !== "maintenance" &&
        v.status !== "out_of_service" &&
        (Number(v.dailyRate1to2 || 0) > 0 ||
          Number(v.dailyRate3to7 || 0) > 0 ||
          Number(v.dailyRate8Plus || 0) > 0),
    );
    if (!startDate || !endDate) return all;
    return all.filter((v) => {
      const hasOverlap = activeContracts.some(
        (c) =>
          c.vehicleId === v.id &&
          c.startDate <= endDate &&
          c.endDate >= startDate,
      );
      return !hasOverlap;
    });
  }, [vehiclesData?.data, activeContracts, startDate, endDate]);

  const vehicleId = useMemo(() => {
    if (selectedVehicleId && availableVehicles.some((v) => v.id === selectedVehicleId)) {
      return selectedVehicleId;
    }
    return availableVehicles[0]?.id || "";
  }, [selectedVehicleId, availableVehicles]);

  const selectedVehicle = useMemo(
    () => availableVehicles.find((v) => v.id === vehicleId) ?? null,
    [availableVehicles, vehicleId],
  );

  const totalDays = useMemo(() => {
    const parseUtc = (iso: string) => {
      const [y, m, d] = iso.split("-").map(Number);
      return y && m && d ? Date.UTC(y, m - 1, d) : NaN;
    };
    const s = parseUtc(startDate);
    const e = parseUtc(endDate);
    if (!Number.isFinite(s) || !Number.isFinite(e)) return 1;
    const diff = Math.round((e - s) / 86400000);
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  const rateKey = `${vehicleId}:${totalDays}`;
  const activeTierLabel =
    totalDays >= 8
      ? isRtl ? "شريحة 8–30 يوم" : "8–30d tier"
      : totalDays >= 3
        ? isRtl ? "شريحة 3–7 أيام" : "3–7d tier"
        : isRtl ? "شريحة 1–2 يوم" : "1–2d tier";
  const tierRate =
    totalDays >= 8
      ? Number(selectedVehicle?.dailyRate8Plus || selectedVehicle?.dailyRate3to7 || selectedVehicle?.dailyRate1to2 || 0)
      : totalDays >= 3
        ? Number(selectedVehicle?.dailyRate3to7 || selectedVehicle?.dailyRate1to2 || 0)
        : Number(selectedVehicle?.dailyRate1to2 || 0);
  const dailyRate = rateOverride?.key === rateKey ? rateOverride.value : tierRate;
  const pickupOdometer =
    odometerOverride?.vehicleId === vehicleId
      ? odometerOverride.value
      : selectedVehicle?.mileageOdometer || 0;

  const setDailyRate = (value: number) => setRateOverride({ key: rateKey, value });
  const setPickupOdometer = (value: number) => setOdometerOverride({ vehicleId, value });

  if (!isOpen) return null;

  const subtotal = dailyRate * totalDays;
  const totalAmount = Math.max(0, subtotal - discount + insuranceFee);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!vehicleId || !customerId) {
      setErrorMsg(
        isRtl
          ? "يرجى اختيار السيارة المتاحة والعميل."
          : "Please select an available vehicle and customer.",
      );
      return;
    }
    if (endDate < startDate) {
      setErrorMsg(
        isRtl
          ? "تاريخ التسليم يجب أن يكون بعد أو نفس تاريخ الاستلام."
          : "End date must be on or after start date.",
      );
      return;
    }
    try {
      const res = await createContract({
        vehicleId,
        customerId,
        startDate,
        endDate,
        pickupOdometer: Number(pickupOdometer) || 0,
        dailyRate: Number(dailyRate) || 0,
        discount: Number(discount) || 0,
        insuranceFee: Number(insuranceFee) || 0,
        depositAmount: Number(depositAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        notes: notes.trim() || null,
        customerSignatureDataUrl: signatureDataUrl,
      }).unwrap();
      onCreated?.(res.data);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: { message?: string } } })?.data?.error?.message ||
        (isRtl ? "تعذر إنشاء عقد التأجير." : "Failed to create rental contract.");
      setErrorMsg(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-revix-border bg-revix-white shadow-xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-revix-border bg-revix-white px-5 py-4">
          <h3 className="text-sm font-bold text-revix-dark">
            {isRtl ? "إنشاء عقد تأجير جديد" : "New Rental Contract"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface"
          >
            <RevixIcon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && <Alert variant="error" message={errorMsg} />}

          {/* Dates first so available plates update immediately for that period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "تاريخ الاستلام *" : "Start Date *"}
              </label>
              <RevixDatePicker
                size="sm"
                isRtl={isRtl}
                required
                minDate={today}
                value={startDate}
                onChange={(next) => {
                  const clamped = next && next < today ? today : next;
                  setStartDate(clamped);
                  if (endDate < clamped) setEndDate(clamped);
                }}
                buttonClassName="h-9 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "تاريخ التسليم *" : "End Date *"}
              </label>
              <RevixDatePicker
                size="sm"
                isRtl={isRtl}
                required
                minDate={startDate >= today ? startDate : today}
                value={endDate}
                onChange={(next) => setEndDate(next)}
                buttonClassName="h-9 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Customer + Vehicle by License Plate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "العميل *" : "Customer *"}
              </label>
              <RevixSelect
                size="sm"
                searchable
                isRtl={isRtl}
                value={customerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                placeholder={isRtl ? "اختر العميل..." : "Select customer..."}
                buttonClassName="h-9 rounded-lg text-xs"
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.customerCode ? `[${c.customerCode}] ` : ""}${c.fullName} (${c.phone})`,
                }))}
              />
            </div>

            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "السيارة (برقم اللوحة) *" : "Vehicle (by Plate) *"}
              </label>
              <RevixSelect
                size="sm"
                searchable
                isRtl={isRtl}
                value={vehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                placeholder={
                  availableVehicles.length === 0
                    ? isRtl
                      ? "لا توجد سيارات متاحة في هذه الفترة"
                      : "No vehicles available for these dates"
                    : isRtl
                      ? "ابحث برقم اللوحة أو كود المركبة..."
                      : "Search by plate or Asset ID..."
                }
                buttonClassName="h-9 rounded-lg text-xs"
                options={availableVehicles.map((v) => {
                  const vTitle = v.variant
                    ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`
                    : "Vehicle";
                  return {
                    value: v.id,
                    label: `${v.licensePlate}${v.assetCode ? ` (${v.assetCode})` : ""} • ${vTitle}${v.branchName ? ` • ${v.branchName}` : ""}`,
                  };
                })}
              />
            </div>
          </div>

          {/* Selected Vehicle Details Strip */}
          {selectedVehicle && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-emerald-900/10 bg-emerald-50/70 p-3 sm:grid-cols-4">
              <div>
                <div className="text-[10.5px] text-slate-500">Asset ID</div>
                <div className="font-mono font-bold text-revix-primary" dir="ltr">
                  {selectedVehicle.assetCode || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] text-slate-500">{isRtl ? "الموديل" : "Model"}</div>
                <div className="truncate font-semibold text-revix-dark">
                  {selectedVehicle.variant
                    ? `${selectedVehicle.variant.make} ${selectedVehicle.variant.model} ${selectedVehicle.variant.modelYear}`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] text-slate-500">{isRtl ? "الفرع" : "Branch"}</div>
                <div className="truncate font-semibold text-revix-dark">
                  {selectedVehicle.branchName || "—"}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] text-slate-500">
                  {isRtl ? `سعر الفئة (${activeTierLabel})` : `Auto Tier (${activeTierLabel})`}
                </div>
                <div className="font-mono font-bold text-revix-primary">
                  {tierRate.toLocaleString()} / {isRtl ? "يوم" : "d"}
                </div>
                <div className="mt-0.5 text-[10px] font-mono text-slate-500" dir="ltr">
                  1-2d: {Number(selectedVehicle.dailyRate1to2 || 0).toLocaleString()} • 3-7d:{" "}
                  {Number(selectedVehicle.dailyRate3to7 || 0).toLocaleString()} • 8-30d:{" "}
                  {Number(selectedVehicle.dailyRate8Plus || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "عداد الخروج (كم)" : "Pickup Odometer"}
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={pickupOdometer === 0 ? "" : pickupOdometer}
                onChange={(e) => setPickupOdometer(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
            <div>
              <label className="flex items-center justify-between gap-1 font-semibold text-revix-dark mb-1">
                <span>{isRtl ? "السعر اليومي" : "Daily Rate"}</span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                  {activeTierLabel}
                </span>
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={dailyRate === 0 ? "" : dailyRate}
                onChange={(e) => setDailyRate(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "الخصم" : "Discount"}
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={discount === 0 ? "" : discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "رسوم التأمين" : "Insurance Fee"}
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={insuranceFee === 0 ? "" : insuranceFee}
                onChange={(e) => setInsuranceFee(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "التأمين المسترد (وديعة)" : "Deposit"}
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={depositAmount === 0 ? "" : depositAmount}
                onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "المدفوع مقدماً" : "Paid Amount"}
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={paidAmount === 0 ? "" : paidAmount}
                onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-emerald-900/10 bg-emerald-50/75 px-4 py-3 text-xs">
            <div className="flex items-center justify-between text-revix-secondary">
              <span>
                {isRtl
                  ? `إيجار المدة (${totalDays} يوم × ${dailyRate.toLocaleString()})`
                  : `Rental (${totalDays} day(s) × ${dailyRate.toLocaleString()})`}
              </span>
              <span className="font-mono font-semibold text-revix-dark">
                {subtotal.toLocaleString()}
              </span>
            </div>
            {insuranceFee > 0 && (
              <div className="flex items-center justify-between text-revix-secondary">
                <span>{isRtl ? "+ رسوم التأمين" : "+ Insurance Fee"}</span>
                <span className="font-mono font-semibold text-revix-dark">
                  +{insuranceFee.toLocaleString()}
                </span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex items-center justify-between text-rose-700">
                <span>{isRtl ? "- الخصم" : "- Discount"}</span>
                <span className="font-mono font-semibold">
                  -{discount.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-emerald-900/10 pt-1.5 text-sm font-bold text-revix-primary">
              <span>{isRtl ? "الإجمالي" : "Total"}</span>
              <span className="font-mono">{totalAmount.toLocaleString()}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex items-center justify-between text-[11px] text-revix-secondary">
                <span>
                  {isRtl
                    ? `المدفوع مقدماً: ${paidAmount.toLocaleString()}`
                    : `Paid: ${paidAmount.toLocaleString()}`}
                </span>
                <span className="font-mono font-semibold text-revix-dark">
                  {isRtl
                    ? `المتبقي: ${balanceDue.toLocaleString()}`
                    : `Remaining: ${balanceDue.toLocaleString()}`}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "ملاحظات العقد" : "Contract Notes"}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isRtl ? "ملاحظات التسليم أو الشروط..." : "Pickup notes or terms..."}
                className="h-9 w-full rounded-lg border border-revix-border px-3"
              />
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-revix-border px-3 py-1.5">
              {signatureDataUrl ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureDataUrl} alt="Signature" className="h-7 object-contain" />
                  <span className="text-[11px] font-semibold text-emerald-700">
                    {isRtl ? "تم التوقيع" : "Signed"}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-revix-secondary">
                  {isRtl ? "توقيع العميل (اختياري الآن)" : "Customer signature"}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsSignPadOpen(true)}
                className="cursor-pointer rounded-md border border-revix-primary/30 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-revix-primary hover:bg-emerald-100"
              >
                {signatureDataUrl
                  ? isRtl ? "تغيير" : "Edit"
                  : isRtl ? "توقيع العميل" : "Sign"}
              </button>
            </div>
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
              disabled={isCreating || availableVehicles.length === 0}
              className="cursor-pointer rounded-lg bg-revix-primary px-5 py-2 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
            >
              {isCreating
                ? isRtl ? "جاري الإنشاء..." : "Creating..."
                : isRtl ? "تأكيد العقد والطباعة" : "Create & Print Contract"}
            </button>
          </div>
        </form>
      </div>

      <SignaturePadModal
        isOpen={isSignPadOpen}
        isRtl={isRtl}
        title={isRtl ? "توقيع العميل" : "Customer Signature"}
        initialSignatureUrl={signatureDataUrl}
        onClose={() => setIsSignPadOpen(false)}
        onSave={(dataUrl) => {
          setSignatureDataUrl(dataUrl);
          setIsSignPadOpen(false);
        }}
      />
    </div>
  );
}
