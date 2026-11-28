"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useConvertReservationToContractMutation,
  useGetReservationAvailableVehiclesQuery,
  type FleetVehicleDto,
} from "@/store/api/fleetApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { SmartBackButton } from "@/components/ui/SmartBackButton";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import { getApiErrorMessage } from "@/lib/api/errors";
import { smartMatch } from "@/lib/search/smartSearch";
import { rentalContractHref, reservationHref } from "@/lib/workspace/resourceRoutes";

interface ConvertReservationPageProps {
  reservationId: string;
  isRtl: boolean;
}

function getVehicleTierRate(vehicle: FleetVehicleDto, totalDays: number): number {
  const r1 = Number(vehicle.dailyRate1to2 || 0);
  const r3 = Number(vehicle.dailyRate3to7 || r1 || 0);
  const r8 = Number(vehicle.dailyRate8Plus || r3 || r1 || 0);
  return totalDays >= 8 ? r8 : totalDays >= 3 ? r3 : r1;
}

export function ConvertReservationPage({
  reservationId,
  isRtl,
}: ConvertReservationPageProps) {
  const router = useRouter();
  const { data, isLoading, isFetching, error, refetch } =
    useGetReservationAvailableVehiclesQuery(reservationId);
  const [convertReservation, { isLoading: isConverting }] =
    useConvertReservationToContractMutation();

  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const [isVehicleFocused, setIsVehicleFocused] = useState(false);
  const vehicleBoxRef = useRef<HTMLDivElement | null>(null);

  const [pickupOdometer, setPickupOdometer] = useState("");
  const [customDailyRate, setCustomDailyRate] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (vehicleBoxRef.current && !vehicleBoxRef.current.contains(e.target as Node)) {
        setIsVehicleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const reservation = data?.data?.reservation ?? null;
  const exactMatches = useMemo(() => data?.data?.exactMatches ?? [], [data?.data?.exactMatches]);
  const similarMatches = useMemo(() => data?.data?.similarMatches ?? [], [data?.data?.similarMatches]);
  const allCandidates = useMemo(
    () => [...exactMatches, ...similarMatches],
    [exactMatches, similarMatches],
  );

  const effectiveVehicleId =
    selectedVehicleId || exactMatches[0]?.id || similarMatches[0]?.id || "";
  const selectedVehicle = useMemo(
    () => allCandidates.find((v) => v.id === effectiveVehicleId) ?? null,
    [allCandidates, effectiveVehicleId],
  );

  const filteredVehicles = useMemo(() => {
    if (!vehicleQuery.trim()) return allCandidates.slice(0, 15);
    return allCandidates
      .filter((v) =>
        smartMatch(vehicleQuery, {
          id: [v.assetCode],
          plate: [v.licensePlate],
          vin: [v.vin],
          name: [
            v.variant
              ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear} ${v.variant.trim || ""}`
              : "",
            v.color,
          ],
        }),
      )
      .slice(0, 15);
  }, [allCandidates, vehicleQuery]);

  if (isLoading || !reservation || error) {
    return (
      <ResourceFeedback
        isRtl={isRtl}
        isLoading={isLoading || isFetching}
        error={error}
        onRetry={() => {
          void refetch();
        }}
        onBack={() => router.push(reservationHref())}
        loadingTitle={
          isRtl ? "جارٍ تحميل بيانات الحجز والسيارات المتاحة..." : "Loading reservation & available vehicles..."
        }
        backLabel={isRtl ? "العودة للحجوزات" : "Back to Reservations"}
      />
    );
  }

  const currency = reservation.currencyCode || "EGP";
  const totalDays = Math.max(1, Number(reservation.totalDays || 1));

  const vehicleAutoRate = selectedVehicle
    ? getVehicleTierRate(selectedVehicle, totalDays)
    : Number(reservation.dailyRate || 0);
  const effectiveDailyRate =
    customDailyRate !== null
      ? Number(customDailyRate) || 0
      : vehicleAutoRate > 0
        ? vehicleAutoRate
        : Number(reservation.dailyRate || 0);

  const effectiveOdometer =
    pickupOdometer !== ""
      ? pickupOdometer
      : String(selectedVehicle?.mileageOdometer ?? 0);
  const effectiveNotes = notes !== null ? notes : reservation.notes || "";
  const estimatedContractTotal = effectiveDailyRate * totalDays;

  function handleSelectVehicle(v: FleetVehicleDto) {
    setSelectedVehicleId(v.id);
    setVehicleQuery("");
    setIsVehicleDropdownOpen(false);
    setPickupOdometer(String(v.mileageOdometer ?? 0));
    const rateForVehicle = getVehicleTierRate(v, totalDays);
    setCustomDailyRate(
      String(rateForVehicle > 0 ? rateForVehicle : Number(reservation?.dailyRate || 0)),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!effectiveVehicleId || !reservation) {
      setErrorMsg(
        isRtl ? "يرجى اختيار سيارة متاحة أولاً." : "Please select an available vehicle first.",
      );
      return;
    }

    try {
      const res = await convertReservation({
        id: reservation.id,
        vehicleId: effectiveVehicleId,
        pickupOdometer: Number(effectiveOdometer) || 0,
        dailyRate: effectiveDailyRate,
        notes: effectiveNotes.trim() || null,
      }).unwrap();
      if (res?.data?.contract?.id) {
        router.push(rentalContractHref(res.data.contract.id));
      } else {
        router.push(reservationHref());
      }
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر تحويل الحجز إلى عقد." : "Failed to convert reservation to contract."),
      );
    }
  }

  const selectedModelLabel = selectedVehicle?.variant
    ? `${selectedVehicle.variant.make} ${selectedVehicle.variant.model} ${selectedVehicle.variant.modelYear}${
        selectedVehicle.variant.trim ? ` ${selectedVehicle.variant.trim}` : ""
      }`
    : selectedVehicle?.assetCode || "—";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-3">
        <div className="flex items-center gap-3">
          <SmartBackButton
            isRtl={isRtl}
            fallbackHref={reservationHref()}
            title={isRtl ? "العودة للحجوزات" : "Back to reservations"}
            size={15}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-revix-dark">
                {isRtl ? "تحويل الحجز إلى عقد إيجار" : "Convert Reservation to Contract"}
              </h1>
              <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-revix-primary">
                {reservation.reservationNumber}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-revix-secondary">
              {reservation.customerName} ({reservation.customerPhone}) •{" "}
              <span className="font-semibold text-revix-dark">{reservation.variantTitle}</span> •{" "}
              <span className="font-mono" dir="ltr">
                {reservation.pickupDate} → {reservation.returnDate} ({totalDays}{" "}
                {isRtl ? "أيام" : "d"})
              </span>
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* STEP 1: Search & Select Vehicle (by Asset ID, Plate, or Model) */}
        <div className={`relative rounded-xl border border-revix-border bg-revix-white ${isVehicleDropdownOpen ? "z-30" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-revix-border/70 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-bold text-revix-primary">
                1
              </span>
              <span className="text-sm font-bold text-revix-dark">
                {isRtl
                  ? `اختيار السيارة في ${reservation.branchName || "الفرع"}`
                  : `Select Vehicle in ${reservation.branchName || "Branch"}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">
                {isRtl ? `مطابقة للفئة: ${exactMatches.length}` : `Exact: ${exactMatches.length}`}
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-700">
                {isRtl ? `بدائل متاحة: ${similarMatches.length}` : `Alternatives: ${similarMatches.length}`}
              </span>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {allCandidates.length === 0 ? (
              <Alert
                variant="warning"
                message={
                  isRtl
                    ? "لا توجد سيارات متاحة حالياً في هذا الفرع."
                    : "No available vehicles found in this branch."
                }
              />
            ) : (
              <>
                {/* Search input by Asset ID, Plate, or Model */}
                <div ref={vehicleBoxRef} className="relative">
                  <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
                    {isRtl
                      ? "ابحث برقم اللوحة أو Asset ID (0001) أو اسم السيارة *"
                      : "Search by License Plate, Asset ID (0001), or Model *"}
                  </label>
                  <div className="relative">
                    <RevixIcon
                      name="search"
                      size={14}
                      className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-revix-secondary"
                    />
                    <input
                      type="text"
                      value={
                        isVehicleFocused || isVehicleDropdownOpen
                          ? vehicleQuery
                          : selectedVehicle
                            ? `${selectedVehicle.assetCode || ""} · ${selectedVehicle.licensePlate} · ${selectedModelLabel}`
                            : vehicleQuery
                      }
                      onFocus={() => {
                        setVehicleQuery("");
                        setIsVehicleFocused(true);
                        setIsVehicleDropdownOpen(true);
                      }}
                      onBlur={() => setIsVehicleFocused(false)}
                      onChange={(e) => {
                        setVehicleQuery(e.target.value);
                        setIsVehicleDropdownOpen(true);
                      }}
                      placeholder={
                        isRtl
                          ? "اكتب رقم اللوحة أو Asset ID أو الموديل..."
                          : "Type plate, Asset ID, or model..."
                      }
                      className="h-10 w-full rounded-lg border border-revix-border bg-revix-white ps-9 pe-8 text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-hidden"
                    />
                    {(selectedVehicle || vehicleQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId("");
                          setVehicleQuery("");
                          setIsVehicleDropdownOpen(true);
                        }}
                        className="absolute top-1/2 end-2.5 -translate-y-1/2 cursor-pointer text-revix-secondary hover:text-revix-dark"
                      >
                        <RevixIcon name="x" size={14} />
                      </button>
                    )}
                  </div>

                  {isVehicleDropdownOpen && (
                    <div className="absolute start-0 end-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-revix-border bg-white shadow-lg">
                      <div className="sticky top-0 grid h-8 grid-cols-12 items-center gap-2 border-b border-revix-border bg-revix-surface px-3 text-[10.5px] font-bold uppercase text-revix-secondary">
                        <div className="col-span-2">Asset ID</div>
                        <div className="col-span-3">{isRtl ? "اللوحة" : "Plate"}</div>
                        <div className="col-span-4">{isRtl ? "السيارة" : "Vehicle"}</div>
                        <div className="col-span-3 text-end">{isRtl ? "السعر / يوم" : "Rate / day"}</div>
                      </div>
                      {filteredVehicles.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-revix-secondary">
                          {isRtl ? "لا توجد سيارات مطابقة" : "No matching vehicles"}
                        </div>
                      ) : (
                        filteredVehicles.map((v) => {
                          const isExact = v.variantId === reservation.variantId;
                          const vRate = getVehicleTierRate(v, totalDays);
                          const vLabel = v.variant
                            ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`
                            : v.assetCode;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectVehicle(v)}
                              className={`grid h-10 w-full cursor-pointer grid-cols-12 items-center gap-2 border-b border-revix-border/40 px-3 text-start text-xs transition-colors hover:bg-emerald-50/70 ${
                                v.id === effectiveVehicleId
                                  ? "bg-emerald-50 font-semibold text-revix-primary"
                                  : "text-revix-dark"
                              }`}
                            >
                              <div className="col-span-2 font-mono font-bold text-revix-primary" dir="ltr">
                                {v.assetCode || "—"}
                              </div>
                              <div className="col-span-3 truncate font-mono font-bold text-revix-dark" dir="ltr">
                                {v.licensePlate}
                              </div>
                              <div className="col-span-4 flex items-center gap-1.5 truncate">
                                <span className="truncate font-semibold">{vLabel}</span>
                                {!isExact && (
                                  <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-700">
                                    {isRtl ? "بديلة" : "Similar"}
                                  </span>
                                )}
                              </div>
                              <div className="col-span-3 text-end font-mono font-bold text-revix-dark" dir="ltr">
                                {vRate.toLocaleString()} {currency}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Full Selected Vehicle Details Grid */}
                {selectedVehicle && (
                  <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-emerald-900/10 bg-emerald-50/45 p-3 text-xs sm:grid-cols-4">
                    {[
                      {
                        label: "Asset ID",
                        value: selectedVehicle.assetCode || "—",
                        mono: true,
                        highlight: true,
                      },
                      {
                        label: isRtl ? "رقم اللوحة" : "License Plate",
                        value: selectedVehicle.licensePlate || "—",
                        mono: true,
                      },
                      {
                        label: isRtl ? "الموديل والفئة" : "Model & Variant",
                        value: selectedModelLabel,
                      },
                      {
                        label: isRtl ? "المطابقة" : "Match Type",
                        value:
                          selectedVehicle.variantId === reservation.variantId
                            ? isRtl
                              ? "مطابقة للفئة المحجوزة"
                              : "Exact Variant Match"
                            : isRtl
                              ? "سيارة بديلة / مماثلة"
                              : "Alternative / Or Similar",
                        highlight: selectedVehicle.variantId === reservation.variantId,
                      },
                      {
                        label: isRtl ? "اللون" : "Color",
                        value: selectedVehicle.color || "—",
                      },
                      {
                        label: isRtl ? "آخر قراءة للعداد" : "Last KM Reading",
                        value: `${Number(selectedVehicle.mileageOdometer || 0).toLocaleString()} km`,
                        mono: true,
                      },
                      {
                        label: isRtl ? "رقم الشاسيه (VIN)" : "Chassis # (VIN)",
                        value: selectedVehicle.vin || "—",
                        mono: true,
                      },
                      {
                        label: isRtl ? "سياسة الكيلومترات" : "Mileage Policy",
                        value:
                          selectedVehicle.mileagePolicy === "limited"
                            ? `${Number(selectedVehicle.dailyKmLimit || 0).toLocaleString()} km/d (+${Number(selectedVehicle.extraKmRate || 0)} ${currency}/km)`
                            : isRtl
                              ? "كيلومترات مفتوحة"
                              : "Unlimited",
                      },
                      {
                        label: isRtl ? "أسعار الشرائح (1–2 / 3–7 / 8+)" : "Tier Rates (1–2 / 3–7 / 8+)",
                        value: `${Number(selectedVehicle.dailyRate1to2 || 0).toLocaleString()} / ${Number(selectedVehicle.dailyRate3to7 || 0).toLocaleString()} / ${Number(selectedVehicle.dailyRate8Plus || 0).toLocaleString()} ${currency}`,
                        mono: true,
                        highlight: true,
                        span2: true,
                      },
                      {
                        label: isRtl ? "التأمين / الديبوزت" : "Damage Excess / Deposit",
                        value: `${Number(selectedVehicle.damageExcess || 0).toLocaleString()} / ${Number(selectedVehicle.securityDeposit || 0).toLocaleString()} ${currency}`,
                        mono: true,
                        span2: true,
                      },
                    ].map((tile) => (
                      <div
                        key={tile.label}
                        className={`rounded-lg border border-emerald-900/10 bg-white/90 px-3 py-2 text-start ${
                          tile.span2 ? "sm:col-span-2" : ""
                        }`}
                      >
                        <div className="text-[10.5px] font-medium text-slate-500">
                          {tile.label}
                        </div>
                        <div
                          className={`mt-0.5 truncate font-semibold ${
                            tile.highlight ? "font-bold text-revix-primary" : "text-revix-dark"
                          } ${tile.mono ? "font-mono" : ""}`}
                        >
                          {tile.mono ? (
                            <span dir="ltr" className="inline-block">
                              {tile.value}
                            </span>
                          ) : (
                            tile.value
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* STEP 2: Handover & Pricing Confirmation */}
        <div className="rounded-xl border border-revix-border bg-revix-white">
          <div className="flex items-center gap-2.5 border-b border-revix-border/70 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-bold text-revix-primary">
              2
            </span>
            <span className="text-sm font-bold text-revix-dark">
              {isRtl ? "بيانات التسليم والتسعير النهائي" : "Handover & Final Pricing"}
            </span>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                type="number"
                min={0}
                required
                label={isRtl ? "عداد الخروج (كم) *" : "Pickup Odometer (km) *"}
                value={effectiveOdometer}
                onChange={(e) => setPickupOdometer(e.target.value)}
                className="font-mono font-bold"
              />
              <FormInput
                type="number"
                min={0}
                required
                label={isRtl ? `السعر اليومي (${currency}) *` : `Daily Rate (${currency}) *`}
                value={String(effectiveDailyRate)}
                onChange={(e) => setCustomDailyRate(e.target.value)}
                className="font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-xl border border-emerald-900/15 bg-emerald-50/40 px-4 py-3 text-xs">
              <div>
                <div className="text-[11px] text-revix-secondary">
                  {isRtl ? "المدة" : "Duration"}
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-revix-dark">
                  {totalDays} {isRtl ? "أيام" : "day(s)"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-revix-secondary">
                  {isRtl ? "السعر اليومي" : "Daily Rate"}
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-revix-primary" dir="ltr">
                  {effectiveDailyRate.toLocaleString()} {currency}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-revix-secondary">
                  {isRtl ? "إجمالي العقد" : "Contract Total"}
                </div>
                <div className="mt-0.5 font-mono text-sm font-extrabold text-revix-dark" dir="ltr">
                  {estimatedContractTotal.toLocaleString()} {currency}
                </div>
              </div>
            </div>

            <FormInput
              type="text"
              label={isRtl ? "ملاحظات العقد" : "Contract Notes"}
              value={effectiveNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRtl ? "أي ملاحظات عند التسليم..." : "Handover notes..."}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Link href={reservationHref()}>
            <Button type="button" variant="secondary">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
          </Link>
          <Button type="submit" disabled={isConverting || !effectiveVehicleId}>
            {isConverting
              ? isRtl
                ? "جاري إنشاء العقد..."
                : "Creating Contract..."
              : isRtl
                ? "إنشاء العقد وتخصيص السيارة"
                : "Assign Vehicle & Create Contract"}
          </Button>
        </div>
      </form>
    </div>
  );
}
