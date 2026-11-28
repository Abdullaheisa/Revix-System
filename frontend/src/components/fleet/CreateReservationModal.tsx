"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  useCreateReservationMutation,
  useListCustomersQuery,
  useListVariantsQuery,
  useListVehiclesQuery,
  type ReservationSource,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { StudioModal } from "@/components/shared/workspace";
import { getApiErrorMessage } from "@/lib/api/errors";

interface CreateReservationModalProps {
  isOpen: boolean;
  isRtl: boolean;
  onClose: () => void;
}

export function CreateReservationModal({
  isOpen,
  isRtl,
  onClose,
}: CreateReservationModalProps) {
  const { data: wsCtx } = useGetWorkspaceContextQuery();
  const branches = useMemo(() => wsCtx?.data?.branches ?? [], [wsCtx?.data?.branches]);
  const { data: customersResp } = useListCustomersQuery();
  const { data: variantsResp } = useListVariantsQuery();
  const { data: vehiclesResp } = useListVehiclesQuery();
  const [createReservation, { isLoading }] = useCreateReservationMutation();

  const customers = useMemo(() => customersResp?.data ?? [], [customersResp?.data]);
  const variants = useMemo(() => variantsResp?.data ?? [], [variantsResp?.data]);
  const vehicles = useMemo(() => vehiclesResp?.data ?? [], [vehiclesResp?.data]);

  const todayYmd = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowYmd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [allowSimilar, setAllowSimilar] = useState(true);
  const [source, setSource] = useState<ReservationSource>("phone");
  const [externalBookingRef, setExternalBookingRef] = useState("");
  const [pickupDate, setPickupDate] = useState(todayYmd);
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnDate, setReturnDate] = useState(tomorrowYmd);
  const [returnTime, setReturnTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveBranchId = branchId || branches[0]?.id || "";
  const activeBranch = branches.find((b) => b.id === effectiveBranchId) ?? branches[0];
  const currency = activeBranch?.currencyCode || wsCtx?.data?.company?.baseCurrency || "EGP";

  const availableUnitsForVariant = useMemo(() => {
    if (!variantId) return 0;
    return vehicles.filter(
      (v) =>
        v.variantId === variantId &&
        (!effectiveBranchId || v.branchId === effectiveBranchId) &&
        v.status === "available",
    ).length;
  }, [vehicles, variantId, effectiveBranchId]);

  const totalDays = useMemo(() => {
    const s = new Date(pickupDate).getTime();
    const e = new Date(returnDate).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 1;
    return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
  }, [pickupDate, returnDate]);

  // Derive daily rate automatically from the selected Variant's Price List tiers
  const variantPricing = useMemo(() => {
    if (!variantId) {
      return { r1: 0, r3: 0, r8: 0, appliedRate: 0 };
    }
    const matchingVehicles = vehicles.filter((v) => v.variantId === variantId);
    const branchPriced = matchingVehicles.find(
      (v) =>
        v.branchId === effectiveBranchId &&
        (Number(v.dailyRate1to2 || 0) > 0 ||
          Number(v.dailyRate3to7 || 0) > 0 ||
          Number(v.dailyRate8Plus || 0) > 0),
    );
    const anyPriced =
      branchPriced ||
      matchingVehicles.find(
        (v) =>
          Number(v.dailyRate1to2 || 0) > 0 ||
          Number(v.dailyRate3to7 || 0) > 0 ||
          Number(v.dailyRate8Plus || 0) > 0,
      );

    const r1 = Number(anyPriced?.dailyRate1to2 || 0);
    const r3 = Number(anyPriced?.dailyRate3to7 || r1 || 0);
    const r8 = Number(anyPriced?.dailyRate8Plus || r3 || r1 || 0);
    const appliedRate = totalDays >= 8 ? r8 : totalDays >= 3 ? r3 : r1;

    return { r1, r3, r8, appliedRate };
  }, [vehicles, variantId, effectiveBranchId, totalDays]);

  const estimatedTotal = variantPricing.appliedRate * totalDays;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!effectiveBranchId || !customerId || !variantId) {
      setErrorMsg(
        isRtl
          ? "يرجى اختيار الفرع والعميل وفئة السيارة."
          : "Please select branch, customer, and vehicle variant.",
      );
      return;
    }

    try {
      await createReservation({
        branchId: effectiveBranchId,
        customerId,
        variantId,
        allowSimilar,
        source,
        externalBookingRef: externalBookingRef.trim() || null,
        status: "confirmed",
        pickupDate,
        pickupTime: pickupTime || null,
        returnDate,
        returnTime: returnTime || null,
        dailyRate: variantPricing.appliedRate,
        notes: notes.trim() || null,
      }).unwrap();
      onClose();
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر إنشاء الحجز." : "Failed to create reservation."),
      );
    }
  }

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      title={isRtl ? "إنشاء حجز جديد (بالفئة)" : "New Variant Reservation"}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {errorMsg && (
          <Alert variant="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
        )}

        {/* Section 1: Customer, Branch & Source */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block font-semibold text-revix-dark">
              {isRtl ? "العميل *" : "Customer *"}
            </label>
            <RevixSelect
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder={isRtl ? "اختر العميل" : "Select customer"}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.fullName} (${c.phone})`,
              }))}
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-revix-dark">
              {isRtl ? "فرع الاستلام *" : "Pickup Branch *"}
            </label>
            <RevixSelect
              value={effectiveBranchId}
              onChange={(e) => setBranchId(e.target.value)}
              placeholder={isRtl ? "اختر الفرع" : "Select branch"}
              options={branches.map((b) => ({
                value: b.id,
                label: b.name,
              }))}
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-revix-dark">
              {isRtl ? "مصدر الحجز" : "Booking Source"}
            </label>
            <RevixSelect
              value={source}
              onChange={(e) => setSource(e.target.value as ReservationSource)}
              options={[
                { value: "phone", label: isRtl ? "اتصال هاتفي" : "Phone Call" },
                { value: "walk_in", label: isRtl ? "حجز بالفرع" : "Walk-in" },
                { value: "website", label: isRtl ? "الموقع الإلكتروني" : "Website" },
                { value: "ota_partner", label: isRtl ? "موقع حجوزات (OTA)" : "OTA Partner" },
              ]}
            />
          </div>
        </div>

        {/* Section 2: Variant & Or Similar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="font-semibold text-revix-dark">
                {isRtl ? "الفئة المطلوبة (Variant) *" : "Vehicle Variant *"}
              </label>
              {variantId && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                    availableUnitsForVariant > 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isRtl
                    ? `المتاح بالفرع: ${availableUnitsForVariant}`
                    : `Available in branch: ${availableUnitsForVariant}`}
                </span>
              )}
            </div>
            <RevixSelect
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              placeholder={isRtl ? "اختر الفئة" : "Select variant"}
              options={variants.map((v) => ({
                value: v.id,
                label: `${v.make} ${v.model} ${v.modelYear}${v.trim ? ` ${v.trim}` : ""}`,
              }))}
            />
          </div>

          <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-revix-border bg-revix-surface/40 px-3">
            <input
              type="checkbox"
              checked={allowSimilar}
              onChange={(e) => setAllowSimilar(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-revix-primary"
            />
            <div className="min-w-0">
              <span className="block truncate font-semibold text-revix-dark">
                {isRtl ? "السماح بسيارة مماثلة (Or Similar)" : "Allow Or Similar vehicle"}
              </span>
            </div>
          </label>
        </div>

        {/* Section 3: Dates & Times */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FormInput
            type="date"
            required
            label={isRtl ? "تاريخ الاستلام *" : "Pickup Date *"}
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className="font-mono"
          />
          <FormInput
            type="time"
            label={isRtl ? "وقت الاستلام" : "Pickup Time"}
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="font-mono"
          />
          <FormInput
            type="date"
            required
            min={pickupDate}
            label={isRtl ? "تاريخ العودة *" : "Return Date *"}
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="font-mono"
          />
          <FormInput
            type="time"
            label={isRtl ? "وقت العودة" : "Return Time"}
            value={returnTime}
            onChange={(e) => setReturnTime(e.target.value)}
            className="font-mono"
          />
        </div>

        {/* Section 4: Auto Variant Pricing Summary */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-emerald-900/15 bg-emerald-50/40 px-4 py-3 sm:grid-cols-4">
          <div>
            <div className="text-[11px] text-revix-secondary">
              {isRtl ? "شرائح الفئة (1–2 / 3–7 / 8+)" : "Variant Tiers (1–2 / 3–7 / 8+)"}
            </div>
            <div className="mt-0.5 font-mono text-xs font-semibold text-revix-dark">
              {variantId
                ? `${variantPricing.r1.toLocaleString()} / ${variantPricing.r3.toLocaleString()} / ${variantPricing.r8.toLocaleString()}`
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-revix-secondary">
              {isRtl ? "السعر اليومي للفئة" : "Variant Daily Rate"}
            </div>
            <div className="mt-0.5 font-mono text-xs font-bold text-revix-primary">
              {variantPricing.appliedRate.toLocaleString()} {currency}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-revix-secondary">
              {isRtl ? "المدة" : "Duration"}
            </div>
            <div className="mt-0.5 font-mono text-xs font-semibold text-revix-dark">
              {totalDays} {isRtl ? "يوم" : "day(s)"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-revix-secondary">
              {isRtl ? "الإجمالي التقديري" : "Estimated Total"}
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-revix-dark">
              {estimatedTotal.toLocaleString()} {currency}
            </div>
          </div>
        </div>

        {/* Section 5: Notes & Optional External Ref */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className={source === "website" || source === "ota_partner" ? "sm:col-span-2" : "sm:col-span-3"}>
            <FormInput
              type="text"
              label={isRtl ? "ملاحظات" : "Notes"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRtl ? "أي ملاحظات إضافية من العميل..." : "Any customer notes..."}
            />
          </div>
          {(source === "website" || source === "ota_partner") && (
            <FormInput
              type="text"
              label={isRtl ? "مرجع الحجز الخارجي" : "External Booking Ref"}
              value={externalBookingRef}
              onChange={(e) => setExternalBookingRef(e.target.value)}
              placeholder="EXT-12345"
              className="font-mono"
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-revix-border pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? isRtl
                ? "جاري الحفظ..."
                : "Saving..."
              : isRtl
                ? "تأكيد الحجز"
                : "Confirm Reservation"}
          </Button>
        </div>
      </form>
    </StudioModal>
  );
}
