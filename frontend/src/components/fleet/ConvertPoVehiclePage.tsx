import React, { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  navigateToWorkspacePage,
  clearPendingFleetReceiveContext,
} from "../../store/slices/workspaceSlice";
import {
  useListVariantsQuery,
  useCreateVehicleMutation,
  useReceiveVehicleMutation,
  useListPurchaseOrdersQuery,
} from "../../store/api/fleetApi";
import { useGetWorkspaceContextQuery, type BranchDto } from "../../store/api/workspaceApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";

interface ConvertPoVehiclePageProps {
  lang?: "ar" | "en";
  onBack?: () => void;
  onSuccess?: () => void;
}

const COLOR_OPTIONS = [
  { value: "White", label: "White", ar: "أبيض (White)" },
  { value: "Black", label: "Black", ar: "أسود (Black)" },
  { value: "Silver", label: "Silver", ar: "فضي (Silver)" },
  { value: "Gray", label: "Gray", ar: "رمادي (Gray)" },
  { value: "Blue", label: "Blue", ar: "أزرق (Blue)" },
  { value: "Red", label: "Red", ar: "أحمر (Red)" },
  { value: "Green", label: "Green", ar: "أخضر (Green)" },
  { value: "Gold", label: "Gold", ar: "ذهبي (Gold)" },
  { value: "Brown", label: "Brown", ar: "بني (Brown)" },
  { value: "Beige", label: "Beige", ar: "بيج (Beige)" },
];

export const ConvertPoVehiclePage: React.FC<ConvertPoVehiclePageProps> = ({
  lang = "ar",
  onBack,
  onSuccess,
}) => {
  const isAr = lang === "ar";
  const dispatch = useAppDispatch();

  const pendingReceive = useAppSelector((state) => state.workspace.pendingFleetReceiveContext);
  const selectedBranchId = useAppSelector((state) => state.workspace.selectedBranchId);

  const { data: variantsRes } = useListVariantsQuery();
  const { data: workspaceCtx } = useGetWorkspaceContextQuery();
  const { data: posRes } = useListPurchaseOrdersQuery();

  const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();
  const [receiveVehicle, { isLoading: isReceiving }] = useReceiveVehicleMutation();

  const variants = variantsRes?.data || [];
  const branches: BranchDto[] = workspaceCtx?.data?.branches || [];
  const purchaseOrders = posRes?.data || [];

  const activePo = useMemo(() => {
    if (!pendingReceive?.purchaseOrderId) return null;
    return purchaseOrders.find((p) => p.id === pendingReceive.purchaseOrderId) || null;
  }, [purchaseOrders, pendingReceive]);

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [vin, setVin] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [keyNumber, setKeyNumber] = useState("");
  const [color, setColor] = useState("White");
  const [mileageOdometer, setMileageOdometer] = useState<number>(0);
  const [deliveryPolicy, setDeliveryPolicy] = useState("branch_pickup");
  const [registrationExpiry, setRegistrationExpiry] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (pendingReceive) {
      setSelectedVariantId(pendingReceive.variantId || "");
      setVin(pendingReceive.vin || "");
      setColor(pendingReceive.color || "White");
      setLicensePlate("");
      setKeyNumber("");
      setMileageOdometer(0);
      setDeliveryPolicy("branch_pickup");
      setRegistrationExpiry("");
      setInsuranceExpiry("");
      setErrorMsg(null);
    }
  }, [pendingReceive]);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) || null,
    [variants, selectedVariantId],
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
      if (pendingReceive?.purchaseOrderId && pendingReceive?.itemId) {
        await receiveVehicle({
          purchaseOrderId: pendingReceive.purchaseOrderId,
          itemId: pendingReceive.itemId,
          branchId: defaultBranchId,
          vin: vin.trim().toUpperCase(),
          licensePlate: licensePlate.trim().toUpperCase(),
          keyNumber: keyNumber.trim().toUpperCase() || undefined,
          color: color.trim() || "White",
          mileageOdometer: Number(mileageOdometer) || 0,
          deliveryPolicy,
          registrationExpiry: registrationExpiry || null,
          insuranceExpiry: insuranceExpiry || null,
        }).unwrap();
      } else {
        await createVehicle({
          variantId: selectedVariantId,
          branchId: defaultBranchId,
          vin: vin.trim().toUpperCase(),
          licensePlate: licensePlate.trim().toUpperCase(),
          keyNumber: keyNumber.trim().toUpperCase() || undefined,
          color: color.trim() || "White",
          mileageOdometer: Number(mileageOdometer) || 0,
          deliveryPolicy,
          registrationExpiry: registrationExpiry || null,
          insuranceExpiry: insuranceExpiry || null,
        }).unwrap();
      }

      dispatch(clearPendingFleetReceiveContext());
      if (onSuccess) {
        onSuccess();
        return;
      }
      dispatch(
        navigateToWorkspacePage({
          section: "fleet",
          subPage: "vehicles",
        }),
      );
    } catch (err: any) {
      setErrorMsg(
        err?.data?.error?.message ||
          (isAr
            ? "تعذر تسجيل السيارة في الأسطول."
            : "Failed to register vehicle as a fleet asset."),
      );
    }
  };

  const isSubmitting = isCreating || isReceiving;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" dir={isAr ? "rtl" : "ltr"}>
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-revix-border pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 py-2 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
          >
            <RevixIcon name={isAr ? "arrow-right" : "arrow-left"} size={14} />
            <span>{isAr ? "رجوع" : "Back"}</span>
          </button>
          <div>
            <h2 className="text-lg font-bold text-revix-dark">
              {isAr ? "تحويل السيارة إلى أصل أسطول" : "Convert Vehicle to Fleet Asset"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg border border-revix-border bg-revix-white px-4 py-2 text-xs font-semibold text-revix-secondary hover:bg-revix-surface transition-colors"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50 transition-colors"
          >
            <RevixIcon name="car-front" size={14} />
            <span>
              {isSubmitting
                ? isAr
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isAr
                  ? "تأكيد التحويل للأصول"
                  : "Convert to Fleet Asset"}
            </span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-revix-alert/30 bg-revix-alert-soft px-4 py-3 text-xs font-medium text-revix-alert">
          {errorMsg}
        </div>
      )}

      {/* Main 2-Card Structured Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left/Primary Column (8 cols): Asset Identifiers & Physical Specs */}
        <div className="xl:col-span-8 overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-revix-border/70 px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-revix-primary/10 text-revix-primary">
              <RevixIcon name="file-text" size={16} />
            </div>
            <h3 className="text-sm font-bold text-revix-dark">
              {isAr ? "بيانات الأصل" : "Asset Details"}
            </h3>
          </div>

          <div className="p-6 space-y-5">
            {/* Row 1: VIN, License Plate, Key Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-revix-secondary mb-1.5">
                  {isAr ? "رقم الشاصي *" : "CHASSIS NUMBER *"}
                </label>
                <input
                  type="text"
                  required
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  placeholder="e.g. 1HGCR2F83HA001234"
                  className="h-10 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-mono font-semibold text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-revix-secondary mb-1.5">
                  {isAr ? "رقم اللوحة *" : "LICENSE PLATE *"}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="e.g. 12-34567"
                  className="h-10 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-mono font-semibold text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-revix-secondary mb-1.5">
                  {isAr ? "رقم المفتاح" : "KEY NUMBER"}
                </label>
                <input
                  type="text"
                  value={keyNumber}
                  onChange={(e) => setKeyNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. K-102"
                  className="h-10 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-mono font-semibold text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden"
                />
              </div>
            </div>

            {/* Row 2: Color, Current Odometer, Delivery Policy */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-revix-secondary mb-1.5">
                  {isAr ? "اللون *" : "COLOR *"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  buttonClassName="h-10 rounded-lg text-xs"
                  options={COLOR_OPTIONS.map((c) => ({
                    value: c.value,
                    label: isAr ? c.ar : c.label,
                  }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-revix-secondary mb-1.5">
                  {isAr ? "قراءة العداد *" : "CURRENT ODOMETER *"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    required
                    value={mileageOdometer}
                    onChange={(e) => setMileageOdometer(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-revix-border bg-revix-white px-3 pe-12 text-xs font-mono font-semibold text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden"
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center">
                    <span className="rounded bg-revix-surface px-2 py-0.5 text-[10px] font-bold text-revix-secondary">
                      KM
                    </span>
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-revix-secondary mb-1.5">
                  {isAr ? "سياسة التسليم" : "DELIVERY POLICY"}
                </label>
                <RevixSelect
                  size="sm"
                  isRtl={isAr}
                  value={deliveryPolicy}
                  onChange={(e) => setDeliveryPolicy(e.target.value)}
                  buttonClassName="h-10 rounded-lg text-xs"
                  options={[
                    {
                      value: "branch_pickup",
                      label: isAr ? "استلام من الفرع فقط" : "Branch Pickup Only",
                    },
                    {
                      value: "delivery_available",
                      label: isAr ? "التوصيل متاح" : "Delivery Available",
                    },
                    {
                      value: "airport_meetup",
                      label: isAr ? "تسليم بالمطار" : "Airport Meetup",
                    },
                  ]}
                />
              </div>
            </div>

            {/* Row 3: Registration & Insurance Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-revix-border/60">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-revix-secondary mb-1.5">
                  {isAr ? "تاريخ انتهاء الترخيص" : "REGISTRATION EXPIRY DATE"}
                </label>
                <RevixDatePicker
                  value={registrationExpiry}
                  onChange={setRegistrationExpiry}
                  isRtl={isAr}
                  placeholder={isAr ? "اختر تاريخ انتهاء الترخيص..." : "Select registration expiry..."}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-revix-secondary mb-1.5">
                  {isAr ? "تاريخ انتهاء التأمين" : "INSURANCE POLICY EXPIRY"}
                </label>
                <RevixDatePicker
                  value={insuranceExpiry}
                  onChange={setInsuranceExpiry}
                  isRtl={isAr}
                  placeholder={isAr ? "اختر تاريخ انتهاء التأمين..." : "Select insurance expiry..."}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right/Sidebar Column (4 cols): Vehicle Identity & Purchase Record (Read-Only) */}
        {pendingReceive && (
          <div className="xl:col-span-4 overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-revix-border/70 bg-revix-surface/40 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-revix-dark/5 text-revix-dark">
                <RevixIcon name="car-front" size={16} />
              </div>
              <h3 className="text-sm font-bold text-revix-dark">
                {isAr ? "سجل الشراء" : "Purchase Record"}
              </h3>
            </div>

            <div className="p-5 grid grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  {isAr ? "الشركة المصنعة" : "Manufacturer"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedVariant?.make || "—"}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-semibold text-revix-dark focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  {isAr ? "الموديل" : "Model"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedVariant?.model || "—"}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-semibold text-revix-dark focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  {isAr ? "الفريان" : "Variant"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedVariant?.trim || "—"}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-semibold text-revix-dark focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  {isAr ? "سنة الصنع" : "Model Year"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={String(selectedVariant?.modelYear || "—")}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-mono font-semibold text-revix-dark focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  SIPP
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedVariant?.sippCode || "—"}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-mono font-semibold text-revix-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  {isAr ? "نوع الهيكل" : "Body Style"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedVariant?.category || "—"}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-semibold capitalize text-revix-dark focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  {isAr ? "رقم أمر الشراء" : "Purchase Order"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={pendingReceive.poNumber || "—"}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-mono font-bold text-revix-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  {isAr ? "سعر الشراء" : "Purchase Price"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${Number(pendingReceive.unitPrice ?? 0).toLocaleString()} ${activePo?.currency || "EGP"}`}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-mono font-bold text-revix-primary focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  {isAr ? "المورد" : "Vendor"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={activePo?.vendorName || "—"}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-semibold text-revix-dark focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-revix-muted mb-1">
                  {isAr ? "تاريخ الشراء" : "Order Date"}
                </label>
                <input
                  type="text"
                  readOnly
                  value={activePo?.orderDate || "—"}
                  className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-mono text-revix-dark focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </form>
  );
};
