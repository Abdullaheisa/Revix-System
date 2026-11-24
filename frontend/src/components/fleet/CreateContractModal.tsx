"use client";

import { useMemo, useState } from "react";
import {
  useCreateRentalContractMutation,
  useListCustomersQuery,
  useListVehiclesQuery,
} from "@/store/api/fleetApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { Alert } from "@/components/ui/Alert";

interface CreateContractModalProps {
  isOpen: boolean;
  isRtl: boolean;
  initialVehicleId?: string | null;
  onClose: () => void;
}

export function CreateContractModal(props: CreateContractModalProps) {
 if (!props.isOpen) return null;
 return <CreateContractForm key={props.initialVehicleId ?? "new"} {...props} />;
}

function CreateContractForm({
  isOpen,
  isRtl,
  initialVehicleId = null,
  onClose,
}: CreateContractModalProps) {
  const { data: vehiclesData } = useListVehiclesQuery({ status: "available" });
  const { data: customersData } = useListCustomersQuery();
  const [createContract, { isLoading: isCreating }] = useCreateRentalContractMutation();

  const availableVehicles = useMemo(
    () => (vehiclesData?.data ?? []).filter((v) => !v.isPartnerVehicle && v.status === "available"),
    [vehiclesData?.data],
  );
  const customers = useMemo(() => customersData?.data ?? [], [customersData?.data]);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [selectedVehicleId, setVehicleId] = useState(initialVehicleId || "");
  const vehicleId = selectedVehicleId || availableVehicles[0]?.id || "";
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedCustomerId, setCustomerId] = useState("");
  const customerId = selectedCustomerId || customers[0]?.id || "";
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(tomorrow);
  const [odometerOverride, setOdometerOverride] = useState<{ vehicleId: string; value: number } | null>(null);
  const [rateOverride, setRateOverride] = useState<{ key: string; value: number } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [insuranceFee, setInsuranceFee] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);



  const selectedVehicle = useMemo(
    () => availableVehicles.find((v) => v.id === vehicleId) ?? null,
    [availableVehicles, vehicleId],
  );

  const variantGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        variantId: string;
        label: string;
        sippCode: string;
        dailyRate: number;
        vehicles: typeof availableVehicles;
      }
    >();
    for (const v of availableVehicles) {
      const key = v.variantId || "unassigned";
      const label = v.variant
        ? `${v.variant.make} ${v.variant.model}${v.variant.trim ? ` ${v.variant.trim}` : ""} ${v.variant.modelYear}`
        : isRtl
          ? "فئة غير محددة"
          : "Unassigned Variant";
      const existing = map.get(key);
      if (existing) {
        existing.vehicles.push(v);
      } else {
        map.set(key, {
          variantId: key,
          label,
          sippCode: v.variant?.sippCode || "—",
          dailyRate: Number(v.dailyRate1to2 || 0),
          vehicles: [v],
        });
      }
    }
    return Array.from(map.values());
  }, [availableVehicles, isRtl]);

  const activeVariantId =
    selectedVariantId ||
    selectedVehicle?.variantId ||
    variantGroups[0]?.variantId ||
    "";

  const activeVariantGroup = useMemo(
    () => variantGroups.find((g) => g.variantId === activeVariantId) ?? null,
    [variantGroups, activeVariantId],
  );

  const vehiclesInVariant = activeVariantGroup?.vehicles ?? availableVehicles;

  const handleVariantChange = (nextVariantId: string) => {
    setSelectedVariantId(nextVariantId);
    const nextGroup = variantGroups.find((g) => g.variantId === nextVariantId);
    if (nextGroup && nextGroup.vehicles[0]) {
      setVehicleId(nextGroup.vehicles[0].id);
    }
  };

  const totalDays = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000);
    return Number.isFinite(diff) && diff > 0 ? diff : 1;
  }, [startDate, endDate]);



  const rateKey = vehicleId + ":" + totalDays;
  const tierRate = totalDays >= 8
    ? Number(selectedVehicle?.dailyRate8Plus || selectedVehicle?.dailyRate3to7 || selectedVehicle?.dailyRate1to2 || 0)
    : totalDays >= 3 ? Number(selectedVehicle?.dailyRate3to7 || selectedVehicle?.dailyRate1to2 || 0)
    : Number(selectedVehicle?.dailyRate1to2 || 0);
  const dailyRate = rateOverride?.key === rateKey ? rateOverride.value : tierRate;
  const pickupOdometer = odometerOverride?.vehicleId === vehicleId ? odometerOverride.value : selectedVehicle?.mileageOdometer || 0;
  const setDailyRate = (value: number) => setRateOverride({ key: rateKey, value });
  const setPickupOdometer = (value: number) => setOdometerOverride({ vehicleId, value });
  if (!isOpen) return null;

  const subtotal = dailyRate * totalDays;
  const totalAmount = Math.max(0, subtotal - discount + insuranceFee);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!vehicleId || !customerId) {
      setErrorMsg(isRtl ? "يرجى اختيار السيارة والعميل." : "Please select both vehicle and customer.");
      return;
    }
    try {
      await createContract({
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
      }).unwrap();
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
        className="w-full max-w-2xl rounded-2xl border border-revix-border bg-revix-white shadow-xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between border-b border-revix-border px-5 py-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "الفئة / الموديل (Variant) *" : "Model Variant *"}
              </label>
              <RevixSelect
                size="sm"
                isRtl={isRtl}
                value={activeVariantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                placeholder={isRtl ? "اختر الفئة..." : "Select variant..."}
                buttonClassName="h-9 rounded-lg text-xs"
                options={variantGroups.map((g) => ({
                  value: g.variantId,
                  label: `${g.label} (${g.sippCode}) • ${isRtl ? "متاح:" : "Avail:"} ${g.vehicles.length}`,
                }))}
              />
            </div>

            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "العميل *" : "Customer *"}
              </label>
              <RevixSelect
                size="sm"
                isRtl={isRtl}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder={isRtl ? "اختر العميل..." : "Select customer..."}
                buttonClassName="h-9 rounded-lg text-xs"
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.fullName} (${c.phone})`,
                }))}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-revix-dark mb-1">
              {isRtl
                ? "السيارة المخصصة من الفئة (يتم الاختيار تلقائياً أو يدوياً) *"
                : "Assigned Unit from Variant (Auto-selected or manual) *"}
            </label>
            <RevixSelect
              size="sm"
              isRtl={isRtl}
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder={isRtl ? "اختر السيارة..." : "Select unit..."}
              buttonClassName="h-9 rounded-lg text-xs"
              options={vehiclesInVariant.map((v) => ({
                value: v.id,
                label: `${v.assetCode ? `[${v.assetCode}] ` : ""}${activeVariantGroup?.label || (v.variant ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}` : "Vehicle")} • ${isRtl ? "لوحة:" : "Plate:"} ${v.licensePlate}${v.color ? ` (${v.color})` : ""}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "تاريخ الاستلام *" : "Start Date *"}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-revix-border px-2.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "تاريخ التسليم *" : "End Date *"}
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-revix-border px-2.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "عداد الخروج (كم)" : "Pickup Odometer"}
              </label>
              <input
                type="number"
                value={pickupOdometer}
                onChange={(e) => setPickupOdometer(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "السعر اليومي" : "Daily Rate"}
              </label>
              <input
                type="number"
                min={0}
                value={dailyRate}
                onChange={(e) => setDailyRate(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "الخصم" : "Discount"}
              </label>
              <input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
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
                value={insuranceFee}
                onChange={(e) => setInsuranceFee(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "التأمين المسترد (وديعة)" : "Deposit"}
              </label>
              <input
                type="number"
                min={0}
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
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
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-revix-border bg-revix-surface/60 px-4 py-3">
            <span className="text-revix-secondary">
              {isRtl ? `المدة: ${totalDays} يوم × ${dailyRate.toLocaleString()}` : `${totalDays} day(s) × ${dailyRate.toLocaleString()}`}
            </span>
            <span className="font-mono text-sm font-bold text-revix-primary">
              {isRtl ? `الإجمالي: ${totalAmount.toLocaleString()}` : `Total: ${totalAmount.toLocaleString()}`}
            </span>
          </div>

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
              disabled={isCreating}
              className="cursor-pointer rounded-lg bg-revix-primary px-5 py-2 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
            >
              {isCreating ? (isRtl ? "جاري الإنشاء..." : "Creating...") : isRtl ? "تأكيد العقد" : "Create Contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
