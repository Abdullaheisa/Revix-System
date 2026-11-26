"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useApplyVariantListingSetupMutation,
  useListRentalInclusionsQuery,
  useListVehiclePhotosQuery,
  type FleetVehicleDto,
  type VehicleVariantDto,
} from "@/store/api/fleetApi";
import { resolveAssetUrl } from "@/store/api/baseApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { DetailTileGrid } from "@/components/shared/workspace";
import { VariantSpecsSection } from "./variant-setup/VariantSpecsSection";
import { VariantPhotosSection } from "./variant-setup/VariantPhotosSection";
import { VariantInclusionsSection } from "./variant-setup/VariantInclusionsSection";
import { VariantDeliverySection } from "./variant-setup/VariantDeliverySection";

interface VariantSetupPageProps {
  variantId: string;
  variantTitle: string;
  variant?: VehicleVariantDto;
  sampleVehicle?: FleetVehicleDto | null;
  unitsCount: number;
  isRtl: boolean;
}

export function VariantSetupPage({
  variantId,
  variantTitle,
  variant,
  sampleVehicle,
  unitsCount,
  isRtl,
}: VariantSetupPageProps) {
  const router = useRouter();
  const { data: photosRes } = useListVehiclePhotosQuery({ pageSize: 100 });
  const { data: inclusionsRes } = useListRentalInclusionsQuery({ activeOnly: true });
  const [applyVariantSetup, { isLoading: isSaving }] =
    useApplyVariantListingSetupMutation();

  const [photoUrl, setPhotoUrl] = useState<string>(sampleVehicle?.photoUrl || "");
  const [photoTouched, setPhotoTouched] = useState(false);
  const [seats, setSeats] = useState<number>(
    sampleVehicle?.seats ?? variant?.seatingCapacity ?? 5,
  );
  const [doors, setDoors] = useState<number>(sampleVehicle?.doors ?? 4);
  const [transmission, setTransmission] = useState<string>(
    sampleVehicle?.transmission ?? variant?.transmission ?? "automatic",
  );
  const [fuelType, setFuelType] = useState<string>(
    sampleVehicle?.fuelType ?? variant?.fuelType ?? "petrol",
  );
  const [luggageCapacity, setLuggageCapacity] = useState<string>(
    sampleVehicle?.luggageCapacity ?? "2 Bags",
  );
  const [airConditioning, setAirConditioning] = useState<boolean>(
    sampleVehicle?.airConditioning ?? true,
  );
  const [description, setDescription] = useState<string>(
    sampleVehicle?.description ?? "",
  );
  const [inclusions, setInclusions] = useState<string[]>(
    sampleVehicle?.inclusions ?? [],
  );
  const [locationType, setLocationType] = useState<string>(
    sampleVehicle?.locationType ?? "branch_pickup",
  );
  const [fuelPolicy, setFuelPolicy] = useState<string>(
    sampleVehicle?.fuelPolicy ?? "full_to_full",
  );
  const [mileagePolicy, setMileagePolicy] = useState<"unlimited" | "limited">(
    sampleVehicle?.mileagePolicy ?? "unlimited",
  );
  const [dailyKmLimit, setDailyKmLimit] = useState<number>(
    sampleVehicle?.dailyKmLimit ?? 250,
  );
  const [extraKmRate, setExtraKmRate] = useState<number>(
    sampleVehicle?.extraKmRate ?? 0,
  );
  const [deliveryPolicy, setDeliveryPolicy] = useState<string>(
    sampleVehicle?.deliveryPolicy ?? "",
  );
  const [instantConfirmation, setInstantConfirmation] = useState<boolean>(
    sampleVehicle?.instantConfirmation ?? true,
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (photoTouched || photoUrl) return;
    const photos = photosRes?.data ?? [];
    if (photos.length === 0) return;
    const normTitle = variantTitle.trim().toLowerCase();
    const makeModel = variant ? `${variant.make} ${variant.model}`.trim().toLowerCase() : "";
    const matched =
      photos.find((p) => p.vehicleName.trim().toLowerCase() === normTitle) ||
      (makeModel
        ? photos.find((p) => p.vehicleName.trim().toLowerCase().includes(makeModel))
        : undefined) ||
      (makeModel
        ? photos.find((p) => normTitle.includes(p.vehicleName.trim().toLowerCase()))
        : undefined);
    if (matched) {
      setPhotoUrl(matched.photoUrl);
    }
  }, [photosRes?.data, variantTitle, variant, photoUrl, photoTouched]);

  const variantBackHref = `/workspace/fleet/vehicles?variant=${encodeURIComponent(variantId)}`;

  function toggleInclusion(name: string) {
    setInclusions((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSavedNotice(false);
    try {
      await applyVariantSetup({
        variantId,
        photoUrl: photoUrl.trim() || null,
        seats: Number(seats) || 5,
        doors: Number(doors) || 4,
        transmission,
        fuelType,
        luggageCapacity: luggageCapacity.trim() || "2 Bags",
        airConditioning,
        description: description.trim() || null,
        inclusions,
        locationType,
        fuelPolicy,
        mileagePolicy,
        dailyKmLimit: mileagePolicy === "limited" ? Number(dailyKmLimit) || 0 : 0,
        extraKmRate: mileagePolicy === "limited" ? Number(extraKmRate) || 0 : 0,
        deliveryPolicy: deliveryPolicy.trim() || null,
        instantConfirmation,
      }).unwrap();
      setSavedNotice(true);
      setTimeout(() => {
        router.push(variantBackHref);
      }, 600);
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: { message?: string } } })?.data?.error?.message ||
        (isRtl ? "تعذر حفظ إعدادات الفريانت." : "Failed to save variant setup.");
      setErrorMsg(msg);
    }
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-8"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={variantBackHref}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-colors"
            title={isRtl ? "العودة للفريانت" : "Back to Variant"}
          >
            <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? `تجهيز الفريانت: ${variantTitle}` : `Variant Setup: ${variantTitle}`}
            </h1>
            <p className="text-xs text-revix-secondary mt-0.5">
              {isRtl
                ? `يتم تطبيق المواصفات والصور والمزايا وسياسة التسليم على جميع سيارات هذا الفريانت (${unitsCount} سيارة) وتُورث تلقائياً لأي سيارة جديدة.`
                : `Specs, photos, inclusions, and delivery policies apply to all ${unitsCount} vehicle(s) in this variant and auto-inherit on future vehicles.`}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && <Alert variant="error" message={errorMsg} />}
      {savedNotice && (
        <Alert
          variant="success"
          message={
            isRtl
              ? "تم حفظ تجهيز الفريانت وتطبيقه على جميع سيارات الفئة بنجاح."
              : "Variant setup saved and applied to all vehicles in this variant."
          }
        />
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <div className="space-y-4 lg:col-span-8">
          <VariantSpecsSection
            isRtl={isRtl}
            seats={seats}
            setSeats={setSeats}
            doors={doors}
            setDoors={setDoors}
            transmission={transmission}
            setTransmission={setTransmission}
            fuelType={fuelType}
            setFuelType={setFuelType}
            luggageCapacity={luggageCapacity}
            setLuggageCapacity={setLuggageCapacity}
            airConditioning={airConditioning}
            setAirConditioning={setAirConditioning}
            description={description}
            setDescription={setDescription}
          />
          <VariantPhotosSection
            isRtl={isRtl}
            photos={photosRes?.data ?? []}
            photoUrl={photoUrl}
            setPhotoUrl={(url) => {
              setPhotoTouched(true);
              setPhotoUrl(url);
            }}
          />
          <VariantInclusionsSection
            isRtl={isRtl}
            availableInclusions={inclusionsRes?.data ?? []}
            inclusions={inclusions}
            onToggle={toggleInclusion}
          />
          <VariantDeliverySection
            isRtl={isRtl}
            locationType={locationType}
            setLocationType={setLocationType}
            fuelPolicy={fuelPolicy}
            setFuelPolicy={setFuelPolicy}
            mileagePolicy={mileagePolicy}
            setMileagePolicy={setMileagePolicy}
            dailyKmLimit={dailyKmLimit}
            setDailyKmLimit={setDailyKmLimit}
            extraKmRate={extraKmRate}
            setExtraKmRate={setExtraKmRate}
            deliveryPolicy={deliveryPolicy}
            setDeliveryPolicy={setDeliveryPolicy}
            instantConfirmation={instantConfirmation}
            setInstantConfirmation={setInstantConfirmation}
          />
        </div>

        {/* Sticky Save Summary Column */}
        <div className="lg:col-span-4 lg:sticky lg:top-4">
          <div className="rounded-2xl border border-emerald-900/15 bg-revix-white p-5 shadow-xs space-y-4 text-xs">
            <div>
              <h2 className="text-sm font-bold text-revix-dark">
                {isRtl ? "ملخص تجهيز الفريانت" : "Variant Setup Summary"}
              </h2>
              <p className="text-[11px] text-revix-secondary mt-0.5">{variantTitle}</p>
            </div>

            {photoUrl && (
              <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-revix-border bg-revix-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveAssetUrl(photoUrl)}
                  alt={variantTitle}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <DetailTileGrid
              columns={2}
              items={[
                { label: isRtl ? "عدد السيارات" : "Vehicles", value: unitsCount },
                { label: isRtl ? "المزايا" : "Inclusions", value: inclusions.length },
                { label: isRtl ? "ناقل الحركة" : "Transmission", value: transmission },
                {
                  label: isRtl ? "الكيلومترات" : "Mileage",
                  value:
                    mileagePolicy === "unlimited"
                      ? isRtl
                        ? "مفتوحة"
                        : "Unlimited"
                      : `${dailyKmLimit} km/d`,
                },
              ]}
            />

            <Button type="submit" disabled={isSaving} className="w-full">
              {isSaving
                ? isRtl
                  ? "جاري الحفظ والتطبيق..."
                  : "Saving..."
                : isRtl
                  ? "حفظ وتطبيق على كل الفريانت"
                  : "Save & Apply to Variant"}
            </Button>

            <Link
              href={variantBackHref}
              className="flex h-9 w-full items-center justify-center rounded-xl border border-revix-border font-semibold text-revix-secondary hover:bg-revix-surface"
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
