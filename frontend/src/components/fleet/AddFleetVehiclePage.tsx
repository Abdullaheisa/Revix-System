"use client";

import React, { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  useCreateVehicleMutation,
  useListVariantsQuery,
  useListVehicleColorsQuery,
  useListVehiclesQuery,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { resolveAssetUrl } from "@/store/api/baseApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SmartBackButton } from "@/components/ui/SmartBackButton";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  DetailTileGrid,
  MASTER_INPUT_CLASS,
  MASTER_LABEL_CLASS,
} from "@/components/shared/workspace";

interface AddFleetVehiclePageProps {
  lang?: "ar" | "en";
}

export const AddFleetVehiclePage: React.FC<AddFleetVehiclePageProps> = ({
  lang = "ar",
}) => {
  const isRtl = lang === "ar";
  const router = useRouter();

  const { data: workspaceCtx } = useGetWorkspaceContextQuery();
  const { data: variantsRes, isLoading: isLoadingVariants } = useListVariantsQuery();
  const { data: colorsRes } = useListVehicleColorsQuery();
  const { data: vehiclesRes } = useListVehiclesQuery({ pageSize: 500 });
  const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();

  const branches = useMemo(() => workspaceCtx?.data.branches ?? [], [workspaceCtx]);
  const variants = useMemo(() => variantsRes?.data ?? [], [variantsRes]);
  const colors = useMemo(() => colorsRes?.data ?? [], [colorsRes]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vin, setVin] = useState("");
  const [keyNumber, setKeyNumber] = useState("");
  const [color, setColor] = useState("");
  const [mileageOdometer, setMileageOdometer] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const branchId = selectedBranchId || branches[0]?.id || "";
  const variantId = selectedVariantId || variants[0]?.id || "";

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === variantId) ?? null,
    [variants, variantId],
  );

  // Sample existing vehicle of the selected variant to preview inherited setup/pricing
  const inheritedSample = useMemo(() => {
    if (!variantId) return null;
    const list = (vehiclesRes?.data ?? []).filter((v) => v.variantId === variantId);
    return (
      list.find(
        (v) =>
          Number(v.dailyRate1to2 || 0) > 0 ||
          Boolean(v.photoUrl) ||
          (v.inclusions && v.inclusions.length > 0),
      ) ??
      list[0] ??
      null
    );
  }, [vehiclesRes?.data, variantId]);

  const hasVariantSetup = useMemo(() => {
    if (!variantId) return false;
    const list = (vehiclesRes?.data ?? []).filter((v) => v.variantId === variantId);
    return list.some(
      (v) =>
        Boolean(v.photoUrl?.trim()) &&
        ((v.inclusions && v.inclusions.length > 0) || Boolean(v.deliveryPolicy?.trim())),
    );
  }, [vehiclesRes?.data, variantId]);

  const variantTitle = selectedVariant
    ? `${selectedVariant.make} ${selectedVariant.model}${selectedVariant.trim ? ` ${selectedVariant.trim}` : ""} ${selectedVariant.modelYear}`
    : "—";

  async function saveVehicle(addAnother: boolean) {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!variantId || !branchId) {
      setErrorMsg(
        isRtl
          ? "يرجى اختيار الفريانت والفرع أولاً."
          : "Please select a variant and branch first.",
      );
      return;
    }
    if (!licensePlate.trim() || !vin.trim() || !color.trim()) {
      setErrorMsg(
        isRtl
          ? "رقم اللوحة ورقم الشاسيه واللون حقول مطلوبة."
          : "License plate, VIN, and color are required.",
      );
      return;
    }

    try {
      const res = await createVehicle({
        branchId,
        variantId,
        licensePlate: licensePlate.trim().toUpperCase(),
        vin: vin.trim().toUpperCase(),
        keyNumber: keyNumber.trim() || null,
        color: color.trim(),
        mileageOdometer: Number(mileageOdometer) || 0,
        notes: notes.trim() || null,
      }).unwrap();

      if (addAnother) {
        setSuccessMsg(
          isRtl
            ? `تمت إضافة السيارة (${res.data.licensePlate}) بنجاح. يمكنك إدخال السيارة التالية الآن.`
            : `Vehicle (${res.data.licensePlate}) added. Ready for the next vehicle.`,
        );
        setLicensePlate("");
        setVin("");
        setKeyNumber("");
        setMileageOdometer(0);
        setNotes("");
      } else if (!hasVariantSetup) {
        router.push(`/workspace/fleet/vehicles?variant=${encodeURIComponent(variantId)}&setup=1`);
      } else {
        router.push(`/workspace/fleet/vehicles?variant=${encodeURIComponent(variantId)}`);
      }
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) ??
          (isRtl ? "تعذر إضافة السيارة." : "Failed to add vehicle."),
      );
    }
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-8"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <SmartBackButton
            isRtl={isRtl}
            fallbackHref="/workspace/fleet/vehicles"
            title={isRtl ? "العودة لأصول السيارات" : "Back to Vehicle Assets"}
            size={16}
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "إضافة سيارة للأصول" : "Add Vehicle to Fleet"}
            </h1>
          </div>
        </div>
      </div>

      {errorMsg && <Alert variant="error" message={errorMsg} />}
      {successMsg && <Alert variant="success" message={successMsg} />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void saveVehicle(false);
        }}
        className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start"
      >
        {/* Main Form Column */}
        <div className="space-y-4 lg:col-span-8">
          <SectionCard
            title={isRtl ? "١. الفريانت والفرع" : "1. Variant & Branch"}
            rightSlot={
              <Link
                href="/workspace/fleet/variants"
                className="text-xs font-semibold text-revix-primary hover:underline"
              >
                {isRtl ? "+ إضافة فريانت جديد" : "+ New Variant"}
              </Link>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className={MASTER_LABEL_CLASS}>
                  {isRtl ? "الفريانت (الموديل والفئة) *" : "Model Variant *"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isRtl}
                  disabled={isLoadingVariants}
                  value={variantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  placeholder={isRtl ? "اختر الفريانت..." : "Select variant..."}
                  buttonClassName="h-10 rounded-lg text-xs"
                  options={variants.map((v) => ({
                    value: v.id,
                    label: `${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""} ${v.modelYear}`,
                  }))}
                />
              </div>

              <div>
                <label className={MASTER_LABEL_CLASS}>
                  {isRtl ? "الفرع المستلم *" : "Branch *"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isRtl}
                  value={branchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  placeholder={isRtl ? "اختر الفرع..." : "Select branch..."}
                  buttonClassName="h-10 rounded-lg text-xs"
                  options={branches.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.currencyCode})`,
                  }))}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={isRtl ? "٢. البيانات الفيزيائية للسيارة" : "2. Physical Vehicle Details"}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className={MASTER_LABEL_CLASS}>
                  {isRtl ? "رقم اللوحة *" : "License Plate *"}
                </label>
                <input
                  type="text"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder={isRtl ? "مثال: أ ب ج 1234" : "e.g. ABC 1234"}
                  className={`${MASTER_INPUT_CLASS} font-mono uppercase`}
                />
              </div>

              <div>
                <label className={MASTER_LABEL_CLASS}>
                  {isRtl ? "رقم الشاسيه (VIN) *" : "Chassis / VIN *"}
                </label>
                <input
                  type="text"
                  required
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="WBA..."
                  className={`${MASTER_INPUT_CLASS} font-mono uppercase`}
                />
              </div>

              <div>
                <label className={MASTER_LABEL_CLASS}>
                  {isRtl ? "رقم المفتاح" : "Key Number"}
                </label>
                <input
                  type="text"
                  value={keyNumber}
                  onChange={(e) => setKeyNumber(e.target.value)}
                  placeholder={isRtl ? "اختياري" : "Optional"}
                  className={`${MASTER_INPUT_CLASS} font-mono`}
                />
              </div>

              <div>
                <label className={MASTER_LABEL_CLASS}>
                  {isRtl ? "اللون *" : "Color *"}
                </label>
                {colors.length > 0 ? (
                  <RevixSelect
                    size="sm"
                    isRtl={isRtl}
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder={isRtl ? "اختر اللون..." : "Select color..."}
                    buttonClassName="h-10 rounded-lg text-xs"
                    options={colors.map((c) => ({
                      value: c.nameEn || c.nameAr,
                      label: isRtl ? c.nameAr : c.nameEn,
                    }))}
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder={isRtl ? "أبيض / أسود / فضي" : "White / Black / Silver"}
                    className={MASTER_INPUT_CLASS}
                  />
                )}
              </div>

              <div>
                <label className={MASTER_LABEL_CLASS}>
                  {isRtl ? "قراءة العداد الحالية (كم)" : "Current Odometer (km)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={mileageOdometer === 0 ? "" : mileageOdometer}
                  placeholder="0"
                  onChange={(e) => setMileageOdometer(Number(e.target.value) || 0)}
                  className={`${MASTER_INPUT_CLASS} font-mono`}
                />
              </div>

              <div>
                <label className={MASTER_LABEL_CLASS}>
                  {isRtl ? "ملاحظات (اختياري)" : "Notes (Optional)"}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? "أي ملاحظات إضافية..." : "Any extra notes..."}
                  className={MASTER_INPUT_CLASS}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Sticky Summary & Actions Column */}
        <div className="lg:col-span-4 lg:sticky lg:top-4">
          <div className="rounded-2xl border border-emerald-900/15 bg-revix-white p-5 shadow-xs space-y-4 text-xs">
            <div>
              <h2 className="text-sm font-bold text-revix-dark">
                {isRtl ? "ملخص الإضافة" : "Registration Summary"}
              </h2>
              <p className="text-[11px] text-revix-secondary mt-0.5">{variantTitle}</p>
            </div>

            {inheritedSample?.photoUrl && (
              <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-revix-border bg-revix-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveAssetUrl(inheritedSample.photoUrl)}
                  alt={variantTitle}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <DetailTileGrid
              columns={2}
              items={[
                {
                  label: isRtl ? "سعر 1–2 يوم" : "1–2d Rate",
                  value:
                    Number(inheritedSample?.dailyRate1to2 || 0) > 0
                      ? Number(inheritedSample?.dailyRate1to2).toLocaleString()
                      : isRtl
                        ? "غير مسعر"
                        : "Unpriced",
                },
                {
                  label: isRtl ? "سعر 3–7 أيام" : "3–7d Rate",
                  value:
                    Number(inheritedSample?.dailyRate3to7 || 0) > 0
                      ? Number(inheritedSample?.dailyRate3to7).toLocaleString()
                      : "—",
                },
                {
                  label: isRtl ? "سعر 8+ أيام" : "8+d Rate",
                  value:
                    Number(inheritedSample?.dailyRate8Plus || 0) > 0
                      ? Number(inheritedSample?.dailyRate8Plus).toLocaleString()
                      : "—",
                },
                {
                  label: isRtl ? "المزايا الموروثة" : "Inclusions",
                  value: inheritedSample?.inclusions?.length ?? 0,
                },
              ]}
            />

            <div className="space-y-2 pt-1">
              <Button type="submit" disabled={isCreating} className="w-full">
                {isCreating
                  ? isRtl
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : !hasVariantSetup
                    ? isRtl
                      ? "حفظ وتجهيز الفريانت (الصور والمزايا)"
                      : "Save & Setup Variant"
                    : isRtl
                      ? "حفظ والعودة للأسطول"
                      : "Save & Go to Fleet"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isCreating}
                onClick={() => void saveVehicle(true)}
                className="w-full"
              >
                {isRtl ? "حفظ وإضافة سيارة أخرى" : "Save & Add Another"}
              </Button>
              <Link
                href="/workspace/fleet/vehicles"
                className="flex h-9 w-full items-center justify-center rounded-xl border border-revix-border font-semibold text-revix-secondary hover:bg-revix-surface"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
