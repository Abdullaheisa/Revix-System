"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  useConvertReservationToContractMutation,
  useGetReservationAvailableVehiclesQuery,
  type FleetVehicleDto,
  type ReservationDto,
} from "@/store/api/fleetApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { StudioModal } from "@/components/shared/workspace";
import { getApiErrorMessage } from "@/lib/api/errors";
import { rentalContractHref } from "@/lib/workspace/resourceRoutes";

interface ConvertReservationModalProps {
  reservation: ReservationDto | null;
  isRtl: boolean;
  onClose: () => void;
}

export function ConvertReservationModal({
  reservation,
  isRtl,
  onClose,
}: ConvertReservationModalProps) {
  if (!reservation) return null;
  return (
    <ConvertReservationForm
      key={reservation.id}
      reservation={reservation}
      isRtl={isRtl}
      onClose={onClose}
    />
  );
}

function ConvertReservationForm({
  reservation,
  isRtl,
  onClose,
}: {
  reservation: ReservationDto;
  isRtl: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { data, isLoading } = useGetReservationAvailableVehiclesQuery(reservation.id);
  const [convertReservation, { isLoading: isConverting }] =
    useConvertReservationToContractMutation();

  const exactMatches = data?.data?.exactMatches ?? [];
  const similarMatches = data?.data?.similarMatches ?? [];

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [pickupOdometer, setPickupOdometer] = useState("");
  const [dailyRate, setDailyRate] = useState(String(reservation.dailyRate || 0));
  const [notes, setNotes] = useState(reservation.notes || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allCandidates = [...exactMatches, ...similarMatches];
  const effectiveVehicleId =
    selectedVehicleId || exactMatches[0]?.id || similarMatches[0]?.id || "";
  const selectedVehicle = allCandidates.find((v) => v.id === effectiveVehicleId);

  function handleSelectVehicle(v: FleetVehicleDto) {
    setSelectedVehicleId(v.id);
    setPickupOdometer(String(v.mileageOdometer ?? 0));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!effectiveVehicleId) {
      setErrorMsg(
        isRtl ? "يرجى اختيار سيارة متاحة أولاً." : "Please select an available vehicle first.",
      );
      return;
    }

    try {
      const res = await convertReservation({
        id: reservation.id,
        vehicleId: effectiveVehicleId,
        pickupOdometer:
          pickupOdometer !== ""
            ? Number(pickupOdometer)
            : selectedVehicle?.mileageOdometer ?? 0,
        dailyRate: dailyRate !== "" ? Number(dailyRate) : reservation.dailyRate,
        notes: notes.trim() || null,
      }).unwrap();
      onClose();
      if (res?.data?.contract?.id) {
        router.push(rentalContractHref(res.data.contract.id));
      }
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر تحويل الحجز إلى عقد." : "Failed to convert reservation to contract."),
      );
    }
  }

  const renderVehicleOption = (v: FleetVehicleDto, isSimilar: boolean) => {
    const isSelected = effectiveVehicleId === v.id;
    return (
      <button
        key={v.id}
        type="button"
        onClick={() => handleSelectVehicle(v)}
        className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3.5 py-2.5 text-start transition-colors ${
          isSelected
            ? "border-revix-primary bg-emerald-50/50"
            : "border-revix-border bg-white hover:bg-revix-surface/50"
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-revix-dark">
              {v.licensePlate || v.assetCode}
            </span>
            <span className="text-xs text-revix-secondary">
              {v.variant
                ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`
                : v.assetCode}
            </span>
            {isSimilar && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                {isRtl ? "مماثلة (Or Similar)" : "Or Similar"}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-revix-muted">
            {v.color || "—"} • {Number(v.mileageOdometer || 0).toLocaleString()} km
          </div>
        </div>
        <span
          className={`h-4 w-4 rounded-full border-2 ${
            isSelected ? "border-revix-primary bg-revix-primary" : "border-revix-border"
          }`}
        />
      </button>
    );
  };

  return (
    <StudioModal
      isOpen={Boolean(reservation)}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      title={
        isRtl
          ? `تحويل الحجز إلى عقد — ${reservation.reservationNumber}`
          : `Convert Reservation to Contract — ${reservation.reservationNumber}`
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
            {reservation.customerName} ({reservation.customerPhone})
          </div>
          <div className="mt-1 text-[11px] text-revix-secondary">
            {isRtl ? "الفئة المحجوزة:" : "Reserved Variant:"}{" "}
            <span className="font-semibold text-revix-dark">{reservation.variantTitle}</span> •{" "}
            <span className="font-mono">
              {reservation.pickupDate} → {reservation.returnDate}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-6 text-center text-revix-secondary">
            {isRtl ? "جاري فحص السيارات المتاحة بالفرع..." : "Checking available vehicles in branch..."}
          </div>
        ) : allCandidates.length === 0 ? (
          <Alert
            variant="warning"
            message={
              isRtl
                ? "لا توجد سيارات متاحة حالياً في هذا الفرع لهذه الفئة أو ما يماثلها."
                : "No available vehicles found in this branch for this variant or similar."
            }
          />
        ) : (
          <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
            {exactMatches.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-700">
                  {isRtl
                    ? `سيارات مطابقة تماماً للفئة (${exactMatches.length})`
                    : `Exact Variant Matches (${exactMatches.length})`}
                </div>
                <div className="space-y-1.5">
                  {exactMatches.map((v) => renderVehicleOption(v, false))}
                </div>
              </div>
            )}

            {similarMatches.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-amber-700">
                  {isRtl
                    ? `سيارات بديلة / مماثلة (${similarMatches.length})`
                    : `Similar / Alternative Vehicles (${similarMatches.length})`}
                </div>
                <div className="space-y-1.5">
                  {similarMatches.map((v) => renderVehicleOption(v, true))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormInput
            type="number"
            min={0}
            required
            label={isRtl ? "عداد الخروج (كم) *" : "Pickup Odometer (km) *"}
            value={
              pickupOdometer !== ""
                ? pickupOdometer
                : String(selectedVehicle?.mileageOdometer ?? 0)
            }
            onChange={(e) => setPickupOdometer(e.target.value)}
            className="font-mono"
          />
          <FormInput
            type="number"
            min={0}
            required
            label={isRtl ? "السعر اليومي *" : "Daily Rate *"}
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            className="font-mono"
          />
        </div>

        <div>
          <label className="mb-1 block font-semibold text-revix-dark">
            {isRtl ? "ملاحظات العقد" : "Contract Notes"}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-revix-border px-3 py-2 text-xs focus:border-revix-primary focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button type="submit" disabled={isConverting || !effectiveVehicleId}>
            {isConverting
              ? isRtl
                ? "جاري التحويل..."
                : "Converting..."
              : isRtl
                ? "إنشاء العقد وتخصيص السيارة"
                : "Assign Vehicle & Create Contract"}
          </Button>
        </div>
      </form>
    </StudioModal>
  );
}
