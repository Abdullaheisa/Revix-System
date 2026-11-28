"use client";

import { getApiErrorMessage } from "@/lib/api/errors";
import React, { useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { navigateToWorkspacePage, clearPendingFleetReceiveContext } from "../../store/slices/workspaceSlice";
import {
  useListVariantsQuery,
  useCreateVehicleMutation,
  useReceiveVehicleMutation,
  useListPurchaseOrdersQuery,
  useListInsuranceCompaniesQuery,
  useListVehicleColorsQuery,
  type PurchaseOrderDto,
} from "../../store/api/fleetApi";
import { useGetWorkspaceContextQuery, type BranchDto } from "../../store/api/workspaceApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";

interface ConvertPoVehiclePageProps {
  lang?: "ar" | "en";
  purchaseOrder?: PurchaseOrderDto | null;
  onBack?: () => void;
  onSuccess?: (vehicleId?: string) => void;
}

const COLOR_OPTIONS = [
  { value: "White", label: "White", ar: "أبيض" },
  { value: "Black", label: "Black", ar: "أسود" },
  { value: "Silver", label: "Silver", ar: "فضي" },
  { value: "Gray", label: "Gray", ar: "رمادي" },
  { value: "Blue", label: "Blue", ar: "أزرق" },
  { value: "Red", label: "Red", ar: "أحمر" },
  { value: "Green", label: "Green", ar: "أخضر" },
  { value: "Gold", label: "Gold", ar: "ذهبي" },
  { value: "Brown", label: "Brown", ar: "بني" },
  { value: "Beige", label: "Beige", ar: "بيج" },
];

export const ConvertPoVehiclePage: React.FC<ConvertPoVehiclePageProps> = ({ lang = "ar", purchaseOrder, onBack, onSuccess }) => {
  const isAr = lang === "ar";
  const dispatch = useAppDispatch();

  const pendingReceive = useAppSelector((state) => state.workspace.pendingFleetReceiveContext);
  const selectedBranchId = useAppSelector((state) => state.workspace.selectedBranchId);

  const { data: variantsRes } = useListVariantsQuery();
  const { data: workspaceCtx } = useGetWorkspaceContextQuery();
  const { data: posRes } = useListPurchaseOrdersQuery();
  const { data: insuranceCompaniesRes } = useListInsuranceCompaniesQuery();
  const { data: masterColorsRes } = useListVehicleColorsQuery();
  const insuranceCompanies = useMemo(
    () => insuranceCompaniesRes?.data ?? [],
    [insuranceCompaniesRes?.data],
  );

  const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();
  const [receiveVehicle, { isLoading: isReceiving }] = useReceiveVehicleMutation();

  const variants = useMemo(() => variantsRes?.data ?? [], [variantsRes?.data]);
  const branches: BranchDto[] = useMemo(() => workspaceCtx?.data?.branches ?? [], [workspaceCtx?.data?.branches]);
  const purchaseOrders = useMemo(() => posRes?.data ?? [], [posRes?.data]);

  const activePo = useMemo(() => {
    if (purchaseOrder) return purchaseOrder;
    if (!pendingReceive?.purchaseOrderId) return null;
    return purchaseOrders.find((p) => p.id === pendingReceive.purchaseOrderId) || null;
  }, [purchaseOrder, purchaseOrders, pendingReceive]);

  const fallbackPoItem = useMemo(() => {
    if (!activePo?.items?.length) return null;
    if (pendingReceive?.itemId) {
      return activePo.items.find((it) => it.id === pendingReceive.itemId) || null;
    }
    return activePo.items.find((it) => it.receivedCount < it.quantity) || activePo.items[0] || null;
  }, [activePo, pendingReceive]);

  const effectivePoId = pendingReceive?.purchaseOrderId || activePo?.id || "";
  const effectiveItemId = pendingReceive?.itemId || fallbackPoItem?.id || "";
  const effectiveVariantId = pendingReceive?.variantId || fallbackPoItem?.variantId || "";
  const presetVin = (pendingReceive?.vin || fallbackPoItem?.vin || "").trim().toUpperCase();
  const presetColor = (pendingReceive?.color || fallbackPoItem?.color || "White").trim();

  const [manualVin, setManualVin] = useState("");
  const vin = presetVin || manualVin;
  const [licensePlate, setLicensePlate] = useState("");
  const [keyNumber, setKeyNumber] = useState("");
  const [mileageOdometer, setMileageOdometer] = useState<number>(0);
  const [deliveryPolicy] = useState("branch_pickup");
  const [inServiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [insuranceCompanyId, setInsuranceCompanyId] = useState("");
  const [insuranceProviderName, setInsuranceProviderName] = useState("");
  const [insuranceCoverageType, setInsuranceCoverageType] = useState("comprehensive");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [insurancePremiumAmount, setInsurancePremiumAmount] = useState(0);
  const [insuranceStartDate, setInsuranceStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [showInsurance, setShowInsurance] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === effectiveVariantId) || null,
    [variants, effectiveVariantId],
  );

  const defaultBranchId =
    pendingReceive?.branchId ||
    activePo?.branchId ||
    (selectedBranchId && selectedBranchId !== "all" ? selectedBranchId : "") ||
    branches[0]?.id ||
    "";

  const handleBack = () => {
    dispatch(clearPendingFleetReceiveContext());
    if (onBack) {
      onBack();
      return;
    }
    dispatch(
      navigateToWorkspacePage({
        section: "fleet",
        subPage: pendingReceive ? "purchase-orders" : "vehicles",
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!vin.trim() || !licensePlate.trim()) {
      setErrorMsg(
        isAr
          ? "برجاء إدخال رقم الشاصي (VIN) ورقم اللوحة."
          : "VIN (Chassis Number) and License Plate are required.",
      );
      return;
    }

    try {
      let createdVehicleId: string | undefined;
      if (effectivePoId && effectiveItemId) {
        const chosenIns = insuranceCompanies.find((c) => c.id === insuranceCompanyId);
        const res = await receiveVehicle({
          purchaseOrderId: effectivePoId,
          itemId: effectiveItemId,
          branchId: null,
          vin: vin.trim().toUpperCase(),
          licensePlate: licensePlate.trim().toUpperCase(),
          keyNumber: keyNumber.trim().toUpperCase() || undefined,
          color: presetColor || "White",
          mileageOdometer: Number(mileageOdometer) || 0,
          deliveryPolicy,
          inServiceDate: inServiceDate || null,
          insuranceExpiry: showInsurance ? insuranceExpiry || null : null,
          insuranceCompanyId: showInsurance ? chosenIns?.id || null : null,
          insuranceProviderName: showInsurance
            ? chosenIns?.name || insuranceProviderName.trim() || null
            : null,
          insurancePolicyNumber: showInsurance ? insurancePolicyNumber.trim() || null : null,
          insuranceCoverageType: showInsurance ? insuranceCoverageType : undefined,
          insuranceStartDate: showInsurance ? insuranceStartDate || null : null,
          insurancePremiumAmount: showInsurance ? Number(insurancePremiumAmount) || 0 : 0,
        }).unwrap();
        createdVehicleId = res.data?.vehicle?.id;
      } else {
        const res = await createVehicle({
          variantId: effectiveVariantId,
          branchId: defaultBranchId,
          vin: vin.trim().toUpperCase(),
          licensePlate: licensePlate.trim().toUpperCase(),
          keyNumber: keyNumber.trim().toUpperCase() || undefined,
          color: presetColor || "White",
          mileageOdometer: Number(mileageOdometer) || 0,
          deliveryPolicy,
        }).unwrap();
        createdVehicleId = res.data?.id;
      }

      dispatch(clearPendingFleetReceiveContext());
      if (onSuccess) {
        onSuccess(createdVehicleId);
        return;
      }
      dispatch(
        navigateToWorkspacePage({
          section: "fleet",
          subPage: "vehicles",
        }),
      );
    } catch (err: unknown) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isAr
            ? "تعذر تسجيل السيارة في الأسطول."
            : "Failed to register vehicle as a fleet asset."),
      );
    }
  };

  const isSubmitting = isCreating || isReceiving;
  const variantTitle = selectedVariant
    ? [selectedVariant.make, selectedVariant.model, selectedVariant.trim, selectedVariant.modelYear]
        .filter(Boolean)
        .join(" ")
    : isAr
      ? "سيارة جديدة"
      : "Vehicle";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-5 overflow-hidden"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Clean Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pt-1">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            title={isAr ? "رجوع" : "Back"}
            aria-label={isAr ? "رجوع" : "Back"}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface transition-colors"
          >
            <RevixIcon name={isAr ? "arrow-right" : "arrow-left"} size={15} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-revix-dark sm:text-xl truncate">
              {isAr ? "استلام وتحويل السيارة للأصول" : "Receive Vehicle to Fleet"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-revix-secondary">
              <span className="font-medium text-revix-dark">{variantTitle}</span>
              {vin && (
                <>
                  <span className="text-revix-border">•</span>
                  <span className="rounded bg-revix-tint px-2 py-0.5 font-mono text-xs font-semibold text-revix-primary" dir="ltr">
                    {vin}
                  </span>
                </>
              )}
              {presetColor && (
                <>
                  <span className="text-revix-border">•</span>
                  <span className="text-xs font-medium text-revix-secondary">
                    {COLOR_OPTIONS.find((c) => c.value.toLowerCase() === presetColor.toLowerCase())?.[
                      isAr ? "ar" : "label"
                    ] ?? presetColor}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-revix-border bg-white px-4 text-[13px] font-medium text-revix-secondary hover:bg-revix-surface transition-colors"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-revix-primary px-4 text-[13px] font-medium text-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50 transition-colors"
          >
            <RevixIcon name="check" size={14} />
            <span>
              {isSubmitting
                ? isAr
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isAr
                  ? "تأكيد الاستلام"
                  : "Confirm & Convert"}
            </span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="shrink-0 rounded-lg border border-revix-alert/30 bg-revix-alert-soft px-4 py-3 text-[13px] font-medium text-revix-alert">
          {errorMsg}
        </div>
      )}

      {/* Compact Essential Form */}
      <div className="min-h-0 flex-initial overflow-y-auto rounded-xl border border-revix-border bg-revix-white p-6 text-[13px] space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
              {isAr ? "رقم اللوحة *" : "License Plate *"}
            </label>
            <input
              type="text"
              required
              autoFocus
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder={isAr ? "مثال: أ ب ج 1234" : "e.g. 12-34567"}
              className="h-10 w-full rounded-lg border border-revix-border bg-white px-3.5 text-[13px] font-medium text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
              {isAr ? "رقم المفتاح" : "Key Number"}
            </label>
            <input
              type="text"
              value={keyNumber}
              onChange={(e) => setKeyNumber(e.target.value.toUpperCase())}
              placeholder={isAr ? "مثال: K-102" : "e.g. K-102"}
              className="h-10 w-full rounded-lg border border-revix-border bg-white px-3.5 text-[13px] font-medium text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
              {isAr ? "قراءة العداد *" : "Odometer *"}
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                required
                value={mileageOdometer}
                onChange={(e) => setMileageOdometer(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-revix-border bg-white px-3.5 pe-12 text-[13px] font-medium text-revix-dark focus:border-revix-primary focus:outline-hidden"
              />
              <span className="pointer-events-none absolute inset-y-0 end-2.5 flex items-center">
                <span className="rounded bg-revix-surface px-2 py-0.5 text-[11px] font-medium text-revix-secondary">
                  {isAr ? "كم" : "KM"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {!presetVin && (
          <div className="max-w-sm">
            <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
              {isAr ? "رقم الشاصي *" : "Chassis Number *"}
            </label>
            <input
              type="text"
              required
              value={manualVin}
              onChange={(e) => setManualVin(e.target.value.toUpperCase())}
              placeholder="1HGCR2F83HA001234"
              className="h-10 w-full rounded-lg border border-revix-border bg-white px-3.5 font-mono text-[13px] font-medium text-revix-dark focus:border-revix-primary focus:outline-hidden"
            />
          </div>
        )}

        {/* Optional Collapsible Insurance */}
        <div className="border-t border-revix-border/70 pt-4">
          <button
            type="button"
            onClick={() => setShowInsurance((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-revix-primary hover:underline"
          >
            <RevixIcon name={showInsurance ? "chevron-up" : "plus"} size={14} />
            <span>
              {showInsurance
                ? isAr
                  ? "إخفاء بيانات التأمين"
                  : "Hide insurance details"
                : isAr
                  ? "إضافة تأمين أولي (اختياري)"
                  : "Add initial insurance (optional)"}
            </span>
          </button>

          {showInsurance && (
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                    {isAr ? "شركة التأمين" : "Insurance Company"}
                  </label>
                  {insuranceCompanies.length > 0 ? (
                    <RevixSelect
                      size="sm"
                      isRtl={isAr}
                      value={insuranceCompanyId}
                      onChange={(e) => {
                        setInsuranceCompanyId(e.target.value);
                        const c = insuranceCompanies.find((x) => x.id === e.target.value);
                        if (c) setInsuranceProviderName(c.name);
                      }}
                      placeholder={isAr ? "اختر شركة التأمين..." : "Select company..."}
                      buttonClassName="h-10 rounded-lg text-[13px]"
                      options={insuranceCompanies.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  ) : (
                    <input
                      type="text"
                      value={insuranceProviderName}
                      onChange={(e) => setInsuranceProviderName(e.target.value)}
                      placeholder={isAr ? "مثال: مصر للتأمين" : "e.g. Misr Insurance"}
                      className="h-10 w-full rounded-lg border border-revix-border bg-white px-3.5 text-[13px] focus:border-revix-primary focus:outline-hidden"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                    {isAr ? "نوع التأمين" : "Coverage Type"}
                  </label>
                  <RevixSelect
                    size="sm"
                    isRtl={isAr}
                    value={insuranceCoverageType}
                    onChange={(e) => setInsuranceCoverageType(e.target.value)}
                    buttonClassName="h-10 rounded-lg text-[13px]"
                    options={[
                      { value: "comprehensive", label: isAr ? "تأمين شامل" : "Comprehensive" },
                      { value: "compulsory_plate", label: isAr ? "تأمين اللوحة (إجباري)" : "Compulsory Plate" },
                      { value: "third_party", label: isAr ? "ضد الغير" : "Third-Party" },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                    {isAr ? "رقم البوليصة" : "Policy Number"}
                  </label>
                  <input
                    type="text"
                    value={insurancePolicyNumber}
                    onChange={(e) => setInsurancePolicyNumber(e.target.value.toUpperCase())}
                    placeholder="POL-2026-001"
                    className="h-10 w-full rounded-lg border border-revix-border bg-white px-3.5 font-mono text-[13px] focus:border-revix-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                    {isAr ? "قيمة التأمين" : "Insurance Amount"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={insurancePremiumAmount || ""}
                    onChange={(e) => setInsurancePremiumAmount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-10 w-full rounded-lg border border-revix-border bg-white px-3.5 text-[13px] focus:border-revix-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                    {isAr ? "بداية التأمين" : "Insurance Start"}
                  </label>
                  <RevixDatePicker
                    value={insuranceStartDate}
                    onChange={setInsuranceStartDate}
                    isRtl={isAr}
                    buttonClassName="h-10 rounded-lg text-[13px]"
                    placeholder={isAr ? "اختر تاريخ البداية..." : "Select start..."}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-revix-dark mb-1.5">
                    {isAr ? "انتهاء التأمين" : "Insurance Expiry"}
                  </label>
                  <RevixDatePicker
                    value={insuranceExpiry}
                    onChange={setInsuranceExpiry}
                    isRtl={isAr}
                    buttonClassName="h-10 rounded-lg text-[13px]"
                    placeholder={isAr ? "اختر تاريخ الانتهاء..." : "Select expiry..."}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};
