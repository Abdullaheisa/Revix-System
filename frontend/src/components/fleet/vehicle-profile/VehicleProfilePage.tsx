"use client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { navigateToWorkspacePage, setPendingFleetReceiveContext, clearPendingFleetReceiveContext } from "@/store/slices/workspaceSlice";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { VehicleInspectionsTab } from "../vehicle-profile/VehicleInspectionsTab";
import { getExpiryMeta } from "@/lib/fleet/vehicleLifecycleData";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import { useCreateVehicleMutation, useListVehiclesQuery, useListVariantsQuery, useListPurchaseOrdersQuery, useReceiveVehicleMutation, useUpdateVehicleStatusMutation, useListInsuranceCompaniesQuery, useGetVehicleLifecycleQuery, useSaveVehicleInsuranceMutation, useUpdateVehiclePricingMutation, useAddVehicleMaintenanceMutation, useToggleVehicleBookableMutation, type FleetVehicleDto, type FleetVehicleStatus, type PurchaseOrderDto, type PurchaseOrderItemDto, type VehicleVariantDto } from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery, type BranchDto, type CompanyDto } from "@/store/api/workspaceApi";
import type { VehicleProfileTab } from "@/lib/workspace/resourceRoutes";

export interface VehicleProfilePageProps {
 vehicle: FleetVehicleDto; isRtl: boolean; company: CompanyDto | null;
 activeVehicleTab: VehicleProfileTab;
 onClose: () => void;
 onTabChange: (tab: VehicleProfileTab, vehicleId?: string) => void;
}
export function VehicleProfilePage({ vehicle, isRtl, company, activeVehicleTab, onClose: closeVehicleDetails, onTabChange: switchVehicleTab }: VehicleProfilePageProps) {
 const setActiveVehicleTab = switchVehicleTab;
 const [updateStatus] = useUpdateVehicleStatusMutation();
   const { data: insuranceCompaniesRes } = useListInsuranceCompaniesQuery();
  const insuranceCompanies = insuranceCompaniesRes?.data ?? [];

  const { data: lifecycleRes } = useGetVehicleLifecycleQuery(
    vehicle.id,
    { skip: false },
  );
  const lifecycle = lifecycleRes?.data;

  const [saveInsurance, { isLoading: isSavingInsurance }] = useSaveVehicleInsuranceMutation();
  const [updatePricing, { isLoading: isSavingPricing }] = useUpdateVehiclePricingMutation();
  const [addMaintenance, { isLoading: isSavingMaint }] = useAddVehicleMaintenanceMutation();
  const [toggleBookable, { isLoading: isTogglingBookable }] = useToggleVehicleBookableMutation();

  // Lifecycle tab form states
  const [insCompanyId, setInsCompanyId] = useState("");
  const [insProviderName, setInsProviderName] = useState("");
  const [insPolicyNo, setInsPolicyNo] = useState("");
  const [insCoverage, setInsCoverage] = useState("comprehensive");
  const [insPremium, setInsPremium] = useState(0);
  const [insDeductible, setInsDeductible] = useState(0);
  const [insStart, setInsStart] = useState("");
  const [insEnd, setInsEnd] = useState("");
  const [isInsModalOpen, setIsInsModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);

  const [rate1to2, setRate1to2] = useState(0);
  const [rate3to7, setRate3to7] = useState(0);
  const [rate8Plus, setRate8Plus] = useState(0);
  const [dmgExcess, setDmgExcess] = useState(0);
  const [mileagePol, setMileagePol] = useState<"unlimited" | "limited">("unlimited");
  const [dailyKm, setDailyKm] = useState(200);
  const [extraKm, setExtraKm] = useState(0);

  const [maintType, setMaintType] = useState("");
  const [maintWorkshop, setMaintWorkshop] = useState("");
  const [maintOdo, setMaintOdo] = useState(0);
  const [maintNextKm, setMaintNextKm] = useState(0);
  const [maintNextDate, setMaintNextDate] = useState("");
  const [maintCost, setMaintCost] = useState(0);
  const [maintDate, setMaintDate] = useState(new Date().toISOString().slice(0, 10));
  const [lifecycleToast, setLifecycleToast] = useState<string | null>(null);


    const vh = vehicle;
    const variant = vh.variant;

    const regMeta = getExpiryMeta(vh.registrationExpiry, isRtl);
    const insMeta = getExpiryMeta(vh.insuranceExpiry || lifecycle?.insurancePolicies?.[0]?.expiryDate, isRtl);
    const readinessSteps: Array<{
      label: string;
      sub: string;
      done: boolean;
      actionLabel?: string;
      onAction?: () => void;
    }> = [
      {
        label: isRtl ? "ترخيص السير" : "Vehicle Registration",
        sub: vh.registrationExpiry || (isRtl ? "يرجى تسجيل تاريخ الانتهاء" : "Expiry date not set"),
        done: regMeta.valid,
      },
      {
        label: isRtl ? "وثيقة التأمين" : "Insurance Policy",
        sub: vh.insuranceCompany || vh.insuranceExpiry || (isRtl ? "لم يتم ربط وثيقة تأمين" : "No active policy linked"),
        done: insMeta.valid || (lifecycle?.insurancePolicies?.length ?? 0) > 0,
        actionLabel: (insMeta.valid || (lifecycle?.insurancePolicies?.length ?? 0) > 0) ? undefined : (isRtl ? "تسجيل التأمين" : "Add Insurance"),
        onAction: (insMeta.valid || (lifecycle?.insurancePolicies?.length ?? 0) > 0) ? undefined : () => setActiveVehicleTab("insurance"),
      },
      {
        label: isRtl ? "شرائح الأسعار" : "Market Pricing Tiers",
        sub: (vh.dailyRate1to2 ?? 0) > 0 ? `${(vh.dailyRate1to2 ?? 0).toLocaleString()} / day` : (isRtl ? "لم يتم تسعير السيارة" : "Daily tiers not set"),
        done: (vh.dailyRate1to2 ?? 0) > 0,
        actionLabel: (vh.dailyRate1to2 ?? 0) > 0 ? undefined : (isRtl ? "تحديد الأسعار" : "Set Pricing"),
        onAction: (vh.dailyRate1to2 ?? 0) > 0 ? undefined : () => setActiveVehicleTab("pricing"),
      },
    ];
    const completedCount = readinessSteps.filter((s) => s.done).length;
    const isBookingReady = completedCount === readinessSteps.length && vh.status === "available";

    const tabs: Array<{
      id: "overview" | "insurance" | "pricing" | "maintenance" | "inspections" | "timeline";
      label: string;
    }> = [
      { id: "overview", label: isRtl ? "نظرة عامة" : "Overview" },
      { id: "insurance", label: isRtl ? "التأمين" : "Insurance" },
      { id: "pricing", label: isRtl ? "شرائح الأسعار" : "Pricing Tiers" },
      { id: "maintenance", label: isRtl ? "الصيانة" : "Maintenance" },
      { id: "inspections", label: isRtl ? "الفحص 3D والحوادث" : "3D Inspection & Accidents" },
      { id: "timeline", label: isRtl ? "السجل والعداد" : "Odometer & History" },
    ];

    const policies = lifecycle?.insurancePolicies ?? [];
    const maintLogs = lifecycle?.maintenanceLogs ?? [];
    const odoLogs = lifecycle?.odometerLogs ?? [];
    const inspections = lifecycle?.inspections ?? [];
    const damagePoints = lifecycle?.damagePoints ?? [];
    const totalInsurancePaid = policies.reduce((acc, p) => acc + (p.premiumAmount || 0), 0);
    const totalMaintCost = maintLogs.reduce((acc, m) => acc + (m.cost || 0), 0);
    const nextScheduledMaint = maintLogs.find((m) => m.nextServiceDate || m.nextServiceKm);

    return (
      <div className="mx-auto max-w-6xl space-y-5" dir={isRtl ? "rtl" : "ltr"}>
        {lifecycleToast && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
            {lifecycleToast}
          </div>
        )}

        {/* Enterprise Hero Header Card */}
        <div className="overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xs">
          <div className="border-b border-revix-border/60 bg-revix-surface/30 px-5 py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={closeVehicleDetails}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-revix-secondary hover:text-revix-dark transition-colors"
            >
              <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
              <span>{isRtl ? "العودة إلى أصول السيارات" : "Back to Vehicle Assets"}</span>
            </button>
          </div>

          <div className="p-5 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-revix-border bg-revix-surface/70 text-revix-primary">
                  <RevixIcon name="car-front" size={22} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight text-revix-dark">
                      {variant
                        ? `${variant.make} ${variant.model} ${variant.modelYear}`
                        : "Vehicle Asset"}
                    </h1>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {!vh.isPartnerVehicle && (
                  <div className="w-36">
                    <RevixSelect
                      size="sm"
                      isRtl={isRtl}
                      value={vh.status}
                      onChange={(e) =>
                        updateStatus({
                          id: vh.id,
                          status: e.target.value as FleetVehicleStatus,
                        })
                      }
                      buttonClassName="h-9 rounded-lg text-xs font-semibold"
                      options={[
                        { value: "available", label: isRtl ? "جاهزة" : "Available" },
                        { value: "on_rent", label: isRtl ? "مؤجرة" : "On Rent" },
                        { value: "maintenance", label: isRtl ? "صيانة" : "Maintenance" },
                        { value: "reserved", label: isRtl ? "محجوزة" : "Reserved" },
                        { value: "out_of_service", label: isRtl ? "خارج الخدمة" : "Out of Service" },
                      ]}
                    />
                  </div>
                )}
                {!vh.isPartnerVehicle && (
                  <button
                    type="button"
                    disabled={isTogglingBookable}
                    onClick={async () => {
                      await toggleBookable({ id: vh.id, isBookable: !vh.isBookable }).unwrap();
                      setLifecycleToast(
                        !vh.isBookable
                          ? isRtl
                            ? "تم تحويل السيارة للأسطول الجاهز للحجز (Fleet)"
                            : "Vehicle published to Bookable Fleet"
                          : isRtl
                            ? "تم إخفاء السيارة من الأسطول الجاهز للحجز"
                            : "Vehicle removed from Bookable Fleet",
                      );
                    }}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                      vh.isBookable
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-revix-primary bg-revix-primary text-white hover:bg-revix-primary-hover"
                    }`}
                  >
                    <RevixIcon name={vh.isBookable ? "check" : "plus"} size={14} />
                    <span>
                      {vh.isBookable
                        ? isRtl ? "منشورة في الأسطول" : "In Live Fleet"
                        : isRtl ? "تحويل للأسطول" : "Publish to Fleet"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto border-t border-revix-border/70 bg-revix-surface/30 px-5 pt-2">
            {tabs.map((tab) => {
              const isActive = activeVehicleTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    switchVehicleTab(tab.id, vh.id);
                    if (tab.id === "pricing") {
                      setRate1to2(vh.dailyRate1to2 || 0);
                      setRate3to7(vh.dailyRate3to7 || 0);
                      setRate8Plus(vh.dailyRate8Plus || 0);
                      setDmgExcess(vh.damageExcess || 0);
                      setMileagePol(vh.mileagePolicy || "unlimited");
                      setDailyKm(vh.dailyKmLimit || 200);
                      setExtraKm(vh.extraKmRate || 0);
                    }
                    if (tab.id === "maintenance") {
                      setMaintOdo(vh.mileageOdometer || 0);
                    }
                  }}
                  className={`cursor-pointer whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-revix-primary text-revix-primary"
                      : "border-transparent text-revix-secondary hover:text-revix-dark"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeVehicleTab === "overview" && (
          <div className="space-y-5">
            {/* Financial & Operational KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-revix-border bg-revix-white p-4 shadow-2xs text-start">
                <div className="text-[11px] font-semibold text-revix-muted">
                  {isRtl ? "سعر الشراء والمورد" : "Purchase & Vendor"}
                </div>
                <div className="mt-1.5 font-mono text-lg font-bold text-revix-dark">
                  <span dir="ltr" className="inline-block">
                    {vh.purchasePrice != null ? `${Number(vh.purchasePrice).toLocaleString()} EGP` : "—"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-revix-secondary truncate">
                  <span>{vh.vendorName || "—"}</span>
                  {vh.poNumber && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-revix-primary" dir="ltr">
                        {vh.poNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-revix-border bg-revix-white p-4 shadow-2xs text-start">
                <div className="text-[11px] font-semibold text-revix-muted">
                  {isRtl ? "التأمين المدفوع" : "Insurance Paid"}
                </div>
                <div className="mt-1.5 font-mono text-lg font-bold text-revix-dark">
                  <span dir="ltr" className="inline-block">
                    {totalInsurancePaid.toLocaleString()} EGP
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-revix-secondary truncate">
                  {vh.insuranceCompany || (isRtl ? "غير مؤمّن" : "No provider")}
                </div>
              </div>

              <div className="rounded-2xl border border-revix-border bg-revix-white p-4 shadow-2xs text-start">
                <div className="text-[11px] font-semibold text-revix-muted">
                  {isRtl ? "تكلفة الصيانة" : "Maintenance Cost"}
                </div>
                <div className="mt-1.5 font-mono text-lg font-bold text-revix-dark">
                  <span dir="ltr" className="inline-block">
                    {totalMaintCost.toLocaleString()} EGP
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-revix-secondary">
                  {maintLogs.length} {isRtl ? "زيارة صيانة" : "service visits"}
                  {nextScheduledMaint?.nextServiceDate ? ` • ${nextScheduledMaint.nextServiceDate}` : ""}
                </div>
              </div>

              <div className="rounded-2xl border border-revix-border bg-revix-white p-4 shadow-2xs text-start">
                <div className="text-[11px] font-semibold text-revix-muted">
                  {isRtl ? "السعر اليومي بالسوق" : "Market Daily Rate"}
                </div>
                <div className="mt-1.5 font-mono text-lg font-bold text-revix-primary">
                  <span dir="ltr" className="inline-block">
                    {vh.dailyRate1to2 ? `${Number(vh.dailyRate1to2).toLocaleString()} EGP` : "—"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-revix-secondary">
                  {damagePoints.filter((d) => !d.isResolved).length}{" "}
                  {isRtl ? "أضرار نشطة" : "active damages"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-8 space-y-5">
                <div className="overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xs">
                  <div className="flex items-center justify-between border-b border-revix-border/70 px-5 py-3.5">
                    <h2 className="text-sm font-bold text-revix-dark">
                      {isRtl ? "المواصفات والهوية" : "Specifications & Identifiers"}
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-revix-border/50 text-xs">
                    {[
                      { label: isRtl ? "الشركة المصنعة" : "Manufacturer", value: variant?.make || "—" },
                      { label: isRtl ? "الموديل" : "Model", value: variant?.model || "—" },
                      { label: isRtl ? "الفئة" : "Variant", value: variant?.trim || "—" },
                      { label: isRtl ? "سنة الصنع" : "Model Year", value: variant?.modelYear || "—", mono: true },
                      { label: isRtl ? "رقم اللوحة" : "License Plate", value: vh.licensePlate || "—", mono: true },
                      { label: isRtl ? "رقم الشاسيه" : "Chassis / VIN", value: vh.vin || "—", mono: true },
                      { label: isRtl ? "رقم المفتاح" : "Key Number", value: vh.keyNumber || "—", mono: true },
                      { label: "SIPP", value: variant?.sippCode || "—", mono: true, accent: true },
                      { label: isRtl ? "اللون" : "Color", value: vh.color || "—" },
                      { label: isRtl ? "العداد الحالي" : "Odometer", value: `${vh.mileageOdometer.toLocaleString()} ${isRtl ? "كم" : "km"}`, mono: true },
                      { label: isRtl ? "المورد" : "Vendor", value: vh.vendorName || "—" },
                      { label: isRtl ? "أمر الشراء" : "PO Number", value: vh.poNumber || "—", mono: true },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-revix-white p-4 text-start">
                        <div className="text-[11px] font-medium text-revix-muted">{item.label}</div>
                        <div
                          className={`mt-1 text-xs font-bold truncate ${
                            item.accent
                              ? "text-revix-primary"
                              : "text-revix-dark"
                          } ${item.mono ? "font-mono" : ""}`}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-revix-border bg-revix-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-revix-dark">
                        {isRtl ? "ترخيص السير" : "Vehicle Registration"}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${regMeta.badgeClass}`}>
                        {regMeta.label}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-bold text-revix-dark">
                      {vh.registrationExpiry || "—"}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-revix-surface">
                      <div className={`h-full rounded-full ${regMeta.barClass}`} style={{ width: `${regMeta.pct}%` }} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-revix-border bg-revix-white p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-revix-dark">
                        {isRtl ? "بوليصة التأمين" : "Insurance Policy"}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${insMeta.badgeClass}`}>
                        {insMeta.label}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-bold text-revix-dark">
                      {vh.insuranceExpiry || "—"}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-revix-surface">
                      <div className={`h-full rounded-full ${insMeta.barClass}`} style={{ width: `${insMeta.pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xs">
                <div className="flex items-center justify-between border-b border-revix-border/70 bg-revix-surface/40 px-5 py-3.5">
                  <h2 className="text-sm font-bold text-revix-dark">
                    {isRtl ? "جاهزية الحجز" : "Booking Readiness"}
                  </h2>
                  <span className="font-mono text-xs font-bold text-revix-primary">
                    {completedCount} / {readinessSteps.length}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {readinessSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          step.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {step.done ? "✓" : "!"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-revix-dark">{step.label}</div>
                        <div className="mt-0.5 text-[11px] text-revix-secondary">{step.sub}</div>
                        {step.actionLabel && step.onAction && (
                          <button
                            type="button"
                            onClick={step.onAction}
                            className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-revix-primary hover:underline"
                          >
                            <span>{step.actionLabel}</span>
                            <RevixIcon name={isRtl ? "arrow-left" : "arrow-right"} size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div
                    className={`mt-2 rounded-xl border p-3 text-xs font-semibold ${
                      isBookingReady
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {isBookingReady
                      ? isRtl
                        ? "السيارة مكتملة الأوراق وجاهزة للحجز"
                        : "Vehicle is compliant and ready for booking"
                      : isRtl
                        ? "استكمل التأمين والتراخيص قبل إتاحة السيارة للحجز"
                        : "Complete insurance & compliance before booking"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSURANCE */}
        {activeVehicleTab === "insurance" && (() => {
          const platePolicy = policies.find((p) => p.coverageType === "compulsory_plate");
          const compPolicy = policies.find((p) => p.coverageType === "comprehensive");
          const coverageLabel = (type: string) => {
            if (type === "compulsory_plate") return isRtl ? "تأمين اللوحة (إجباري)" : "Compulsory Plate";
            if (type === "comprehensive") return isRtl ? "تأمين شامل" : "Comprehensive";
            if (type === "third_party") return isRtl ? "ضد الغير" : "Third-Party";
            return type;
          };

          const openInsModal = (type: "compulsory_plate" | "comprehensive") => {
            setInsCoverage(type);
            setIsInsModalOpen(true);
          };

          return (
            <div className="space-y-5">
              {/* Dual Coverage Overview: Compulsory Plate + Comprehensive */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-revix-border bg-revix-white p-5 shadow-2xs flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700">
                      <RevixIcon name="file-text" size={18} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-revix-dark">
                          {isRtl ? "تأمين اللوحة (إجباري)" : "Compulsory Plate Insurance"}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            platePolicy
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {platePolicy ? (isRtl ? "مسجل" : "Active") : (isRtl ? "غير مسجل" : "Missing")}
                        </span>
                      </div>
                      {platePolicy ? (
                        <div className="text-xs text-revix-secondary space-y-0.5">
                          <div className="font-semibold text-revix-dark">{platePolicy.providerName}</div>
                          <div className="font-mono text-[11px]" dir="ltr">
                            {platePolicy.policyNumber} • {platePolicy.premiumAmount.toLocaleString()} EGP
                          </div>
                          <div className="text-[11px]">
                            {isRtl ? "ينتهي في:" : "Expires:"}{" "}
                            <span className="font-mono font-semibold text-revix-dark">{platePolicy.expiryDate}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-revix-secondary">
                          {isRtl ? "التأمين الإجباري للوحة والمرور" : "Mandatory traffic & plate coverage"}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsModal("compulsory_plate")}
                    className="shrink-0 cursor-pointer rounded-lg border border-revix-border bg-revix-white px-3.5 py-2 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
                  >
                    {platePolicy ? (isRtl ? "تحديث" : "Update") : (isRtl ? "تسجيل تأمين اللوحة" : "Add Plate")}
                  </button>
                </div>

                <div className="rounded-2xl border border-revix-border bg-revix-white p-5 shadow-2xs flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                      <RevixIcon name="shield-check" size={18} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-revix-dark">
                          {isRtl ? "التأمين الشامل" : "Comprehensive Insurance"}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            compPolicy
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {compPolicy ? (isRtl ? "مسجل" : "Active") : (isRtl ? "غير مسجل" : "Missing")}
                        </span>
                      </div>
                      {compPolicy ? (
                        <div className="text-xs text-revix-secondary space-y-0.5">
                          <div className="font-semibold text-revix-dark">{compPolicy.providerName}</div>
                          <div className="font-mono text-[11px]" dir="ltr">
                            {compPolicy.policyNumber} • {compPolicy.premiumAmount.toLocaleString()} EGP
                          </div>
                          <div className="text-[11px]">
                            {isRtl ? "ينتهي في:" : "Expires:"}{" "}
                            <span className="font-mono font-semibold text-revix-dark">{compPolicy.expiryDate}</span>
                            {compPolicy.deductibleAmount > 0 && (
                              <span className="ms-2">
                                • {isRtl ? "التحمل:" : "Deductible:"}{" "}
                                <span className="font-mono">{compPolicy.deductibleAmount.toLocaleString()}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-revix-secondary">
                          {isRtl ? "تغطية شاملة ضد الحوادث والسرقة" : "Full commercial hull, accident & theft coverage"}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsModal("comprehensive")}
                    className="shrink-0 cursor-pointer rounded-lg bg-revix-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-revix-primary-hover transition-colors"
                  >
                    {compPolicy ? (isRtl ? "تحديث" : "Update") : (isRtl ? "تسجيل تأمين شامل" : "Add Comprehensive")}
                  </button>
                </div>
              </div>

              {/* Full-Width Policy History Table */}
              <div className="overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xs">
                <div className="border-b border-revix-border/70 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-revix-dark">
                      {isRtl ? "سجل بوالص التأمين" : "Insurance Policy History"}
                    </h3>
                    <span className="rounded-full bg-revix-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                      {policies.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsModal("comprehensive")}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 py-1.5 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
                  >
                    <RevixIcon name="plus" size={14} />
                    <span>{isRtl ? "إضافة بوليصة" : "Add Policy"}</span>
                  </button>
                </div>
                {policies.length === 0 ? (
                  <div className="p-10 text-center text-xs text-revix-secondary">
                    {isRtl ? "لا توجد بوالص تأمين مسجلة لهذه السيارة حتى الآن." : "No insurance policies recorded for this vehicle yet."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs">
                      <thead>
                        <tr className="border-b border-revix-border bg-revix-surface/40 text-[10px] font-bold uppercase text-revix-muted">
                          <th className="px-4 py-2.5 text-start">{isRtl ? "النوع" : "Type"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "الشركة / الجهة" : "Provider"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "رقم البوليصة" : "Policy #"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "المدفوع" : "Paid"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "التحمل" : "Deductible"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "البدء" : "Start"}</th>
                          <th className="px-4 py-2.5 text-start">{isRtl ? "الانتهاء" : "Expiry"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-revix-border/60">
                        {policies.map((p) => (
                          <tr key={p.id} className="hover:bg-revix-surface/30">
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                                  p.coverageType === "compulsory_plate"
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {coverageLabel(p.coverageType)}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-bold text-revix-dark">{p.providerName}</td>
                            <td className="px-3 py-3 font-mono">{p.policyNumber}</td>
                            <td className="px-3 py-3 font-mono font-bold text-revix-primary">
                              <span dir="ltr" className="inline-block">{p.premiumAmount.toLocaleString()} EGP</span>
                            </td>
                            <td className="px-3 py-3 font-mono text-revix-secondary">
                              {p.deductibleAmount > 0 ? p.deductibleAmount.toLocaleString() : "—"}
                            </td>
                            <td className="px-3 py-3 font-mono text-revix-secondary">{p.startDate}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-revix-dark">{p.expiryDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Clean Centered Modal for Adding / Updating Insurance Policy */}
              {isInsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
                  <div className="w-full max-w-lg rounded-2xl border border-revix-border bg-revix-white shadow-xl" dir={isRtl ? "rtl" : "ltr"}>
                    <div className="flex items-center justify-between border-b border-revix-border px-5 py-4">
                      <h3 className="text-sm font-bold text-revix-dark">
                        {insCoverage === "compulsory_plate"
                          ? isRtl ? "تسجيل تأمين اللوحة (إجباري)" : "Record Compulsory Plate Policy"
                          : isRtl ? "إضافة / تحديث بوليصة التأمين" : "Add / Update Insurance Policy"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsInsModalOpen(false)}
                        className="cursor-pointer rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface"
                      >
                        <RevixIcon name="x" size={16} />
                      </button>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const chosen = insuranceCompanies.find((c) => c.id === insCompanyId);
                        const providerName =
                          chosen?.name ||
                          insProviderName.trim() ||
                          (insCoverage === "compulsory_plate"
                            ? isRtl
                              ? "المجمعة المصرية للتأمين الإجباري"
                              : "Compulsory Traffic Pool"
                            : "");
                        if (!providerName || !insPolicyNo.trim() || !insStart || !insEnd) return;
                        await saveInsurance({
                          vehicleId: vh.id,
                          insuranceCompanyId: chosen?.id || null,
                          providerName,
                          policyNumber: insPolicyNo.trim(),
                          coverageType: insCoverage,
                          premiumAmount: Number(insPremium) || 0,
                          deductibleAmount: Number(insDeductible) || 0,
                          startDate: insStart,
                          expiryDate: insEnd,
                        }).unwrap();
                        setInsPolicyNo("");
                        setIsInsModalOpen(false);
                        setLifecycleToast(isRtl ? "تم حفظ بوليصة التأمين بنجاح" : "Insurance policy saved");
                      }}
                      className="p-5 space-y-4 text-xs"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-revix-dark mb-1">
                            {isRtl ? "نوع التأمين *" : "Coverage Type *"}
                          </label>
                          <RevixSelect
                            size="sm"
                            isRtl={isRtl}
                            value={insCoverage}
                            onChange={(e) => setInsCoverage(e.target.value)}
                            buttonClassName="h-9 rounded-lg text-xs"
                            options={[
                              { value: "comprehensive", label: isRtl ? "تأمين شامل" : "Comprehensive" },
                              { value: "compulsory_plate", label: isRtl ? "تأمين اللوحة (إجباري)" : "Compulsory Plate" },
                              { value: "third_party", label: isRtl ? "ضد الغير" : "Third-Party" },
                            ]}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-revix-dark mb-1">
                            {isRtl ? "رقم البوليصة *" : "Policy Number *"}
                          </label>
                          <input
                            type="text"
                            required
                            value={insPolicyNo}
                            onChange={(e) => setInsPolicyNo(e.target.value.toUpperCase())}
                            placeholder="POL-2026-001"
                            className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-revix-dark mb-1">
                          {insCoverage === "compulsory_plate"
                            ? isRtl ? "جهة التأمين (اختياري للإجباري)" : "Insurance Provider (Optional)"
                            : isRtl ? "شركة التأمين *" : "Insurance Company *"}
                        </label>
                        {insuranceCompanies.length > 0 ? (
                          <RevixSelect
                            size="sm"
                            isRtl={isRtl}
                            value={insCompanyId}
                            onChange={(e) => {
                              setInsCompanyId(e.target.value);
                              const c = insuranceCompanies.find((x) => x.id === e.target.value);
                              if (c) setInsProviderName(c.name);
                            }}
                            placeholder={
                              insCoverage === "compulsory_plate"
                                ? isRtl ? "المجمعة المصرية (أو اختر شركة)..." : "Traffic Pool (or select)..."
                                : isRtl ? "اختر شركة التأمين..." : "Select insurance company..."
                            }
                            buttonClassName="h-9 rounded-lg text-xs"
                            options={insuranceCompanies.map((c) => ({ value: c.id, label: c.name }))}
                          />
                        ) : (
                          <input
                            type="text"
                            required={insCoverage !== "compulsory_plate"}
                            value={insProviderName}
                            onChange={(e) => setInsProviderName(e.target.value)}
                            placeholder={
                              insCoverage === "compulsory_plate"
                                ? isRtl ? "المجمعة المصرية للتأمين الإجباري" : "Compulsory Traffic Pool"
                                : isRtl ? "مثال: مصر للتأمين" : "e.g. Misr Insurance"
                            }
                            className="h-9 w-full rounded-lg border border-revix-border px-3 text-xs"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-revix-dark mb-1">
                            {isRtl ? "المبلغ المدفوع *" : "Premium Paid *"}
                          </label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={insPremium || ""}
                            onChange={(e) => setInsPremium(Number(e.target.value) || 0)}
                            placeholder="0"
                            className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-revix-dark mb-1">
                            {isRtl ? "مبلغ التحمل" : "Deductible"}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={insDeductible || ""}
                            onChange={(e) => setInsDeductible(Number(e.target.value) || 0)}
                            placeholder="0"
                            className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-revix-dark mb-1">
                            {isRtl ? "تاريخ البدء *" : "Start Date *"}
                          </label>
                          <RevixDatePicker value={insStart} onChange={setInsStart} isRtl={isRtl} />
                        </div>
                        <div>
                          <label className="block font-semibold text-revix-dark mb-1">
                            {isRtl ? "تاريخ الانتهاء *" : "Expiry Date *"}
                          </label>
                          <RevixDatePicker value={insEnd} onChange={setInsEnd} isRtl={isRtl} />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-revix-border pt-3.5">
                        <button
                          type="button"
                          onClick={() => setIsInsModalOpen(false)}
                          className="cursor-pointer rounded-lg border border-revix-border px-4 py-2 font-semibold text-revix-secondary hover:bg-revix-surface"
                        >
                          {isRtl ? "إلغاء" : "Cancel"}
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingInsurance}
                          className="cursor-pointer rounded-lg bg-revix-primary px-5 py-2 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
                        >
                          {isSavingInsurance
                            ? isRtl ? "جاري الحفظ..." : "Saving..."
                            : isRtl ? "حفظ بوليصة التأمين" : "Save Insurance Policy"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 3: PRICING TIERS */}
        {activeVehicleTab === "pricing" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await updatePricing({
                vehicleId: vh.id,
                dailyRate1to2: Number(rate1to2) || 0,
                dailyRate3to7: Number(rate3to7) || 0,
                dailyRate8Plus: Number(rate8Plus) || 0,
                damageExcess: Number(dmgExcess) || 0,
                mileagePolicy: mileagePol,
                dailyKmLimit: Number(dailyKm) || 0,
                extraKmRate: Number(extraKm) || 0,
              }).unwrap();
              setLifecycleToast(isRtl ? "تم تحديث شرائح الأسعار" : "Pricing tiers updated");
            }}
            className="rounded-2xl border border-revix-border bg-revix-white p-6 shadow-2xs space-y-5 text-xs"
          >
            <h3 className="text-sm font-bold text-revix-dark">
              {isRtl ? "شرائح أسعار التأجير بالسوق" : "Market Rental Pricing Tiers"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-revix-dark mb-1">
                  {isRtl ? "1–2 يوم (يومي)" : "1–2 Days (Daily)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={rate1to2}
                  onChange={(e) => setRate1to2(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-revix-dark mb-1">
                  {isRtl ? "3–7 أيام (يومي)" : "3–7 Days (Daily)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={rate3to7}
                  onChange={(e) => setRate3to7(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-revix-dark mb-1">
                  {isRtl ? "+8 أيام (يومي)" : "8+ Days (Daily)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={rate8Plus}
                  onChange={(e) => setRate8Plus(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-revix-dark mb-1">
                  {isRtl ? "مبلغ التحمل / التأمين" : "Damage Excess"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={dmgExcess}
                  onChange={(e) => setDmgExcess(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-revix-border pt-4">
              <button
                type="submit"
                disabled={isSavingPricing}
                className="cursor-pointer rounded-lg bg-revix-primary px-5 py-2 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
              >
                {isSavingPricing ? (isRtl ? "جاري الحفظ..." : "Saving...") : (isRtl ? "حفظ الأسعار" : "Save Pricing Tiers")}
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: MAINTENANCE */}
        {activeVehicleTab === "maintenance" && (
          <div className="space-y-5">
            {/* Maintenance Summary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-revix-border bg-revix-white p-4 shadow-2xs text-start">
                <div className="text-[11px] font-semibold text-revix-muted">
                  {isRtl ? "عدد زيارات الصيانة" : "Total Service Visits"}
                </div>
                <div className="mt-1.5 font-mono text-lg font-bold text-revix-dark">
                  {maintLogs.length}
                </div>
              </div>
              <div className="rounded-2xl border border-revix-border bg-revix-white p-4 shadow-2xs text-start">
                <div className="text-[11px] font-semibold text-revix-muted">
                  {isRtl ? "إجمالي تكلفة الصيانة" : "Total Maintenance Cost"}
                </div>
                <div className="mt-1.5 font-mono text-lg font-bold text-revix-primary">
                  <span dir="ltr" className="inline-block">{totalMaintCost.toLocaleString()} EGP</span>
                </div>
              </div>
              <div className="rounded-2xl border border-revix-border bg-revix-white p-4 shadow-2xs text-start">
                <div className="text-[11px] font-semibold text-revix-muted">
                  {isRtl ? "موعد الصيانة القادمة" : "Next Scheduled Service"}
                </div>
                <div className="mt-1.5 font-mono text-sm font-bold text-revix-dark">
                  {nextScheduledMaint?.nextServiceDate ||
                    (nextScheduledMaint?.nextServiceKm
                      ? `${nextScheduledMaint.nextServiceKm.toLocaleString()} ${isRtl ? "كم" : "km"}`
                      : isRtl ? "غير مجدولة" : "Not scheduled")}
                </div>
              </div>
            </div>

            {/* Full-Width Maintenance History Table */}
            <div className="overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xs">
              <div className="border-b border-revix-border/70 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-revix-dark">
                    {isRtl ? "سجل الصيانة" : "Maintenance History"}
                  </h3>
                  <span className="rounded-full bg-revix-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                    {maintLogs.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMaintOdo(vh.mileageOdometer || 0);
                    setIsMaintModalOpen(true);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-revix-primary-hover transition-colors"
                >
                  <RevixIcon name="plus" size={14} />
                  <span>{isRtl ? "تسجيل صيانة" : "Log Maintenance"}</span>
                </button>
              </div>
              {maintLogs.length === 0 ? (
                <div className="p-10 text-center text-xs text-revix-secondary">
                  {isRtl ? "لا توجد سجلات صيانة لهذه السيارة حتى الآن." : "No maintenance logs recorded for this vehicle yet."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="border-b border-revix-border bg-revix-surface/40 text-[10px] font-bold uppercase text-revix-muted">
                        <th className="px-4 py-2.5 text-start">{isRtl ? "التاريخ" : "Date"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "نوع الصيانة" : "Service"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "المركز / الورشة" : "Workshop"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "العداد" : "Odometer"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "الصيانة القادمة" : "Next Due"}</th>
                        <th className="px-4 py-2.5 text-start">{isRtl ? "التكلفة" : "Cost"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-revix-border/60">
                      {maintLogs.map((m) => (
                        <tr key={m.id} className="hover:bg-revix-surface/30">
                          <td className="px-4 py-3 font-mono">{m.serviceDate}</td>
                          <td className="px-3 py-3 font-bold text-revix-dark">{m.serviceType}</td>
                          <td className="px-3 py-3 text-revix-secondary">{m.workshopName || "—"}</td>
                          <td className="px-3 py-3 font-mono">{m.odometerAtService.toLocaleString()} {isRtl ? "كم" : "km"}</td>
                          <td className="px-3 py-3 font-mono text-revix-secondary">
                            {m.nextServiceDate || (m.nextServiceKm ? `${m.nextServiceKm.toLocaleString()} ${isRtl ? "كم" : "km"}` : "—")}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-revix-primary">
                            <span dir="ltr" className="inline-block">{m.cost.toLocaleString()} EGP</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Clean Centered Modal for Logging Maintenance */}
            {isMaintModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
                <div className="w-full max-w-lg rounded-2xl border border-revix-border bg-revix-white shadow-xl" dir={isRtl ? "rtl" : "ltr"}>
                  <div className="flex items-center justify-between border-b border-revix-border px-5 py-4">
                    <h3 className="text-sm font-bold text-revix-dark">
                      {isRtl ? "تسجيل صيانة / موعد قادم" : "Log Maintenance & Next Service"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsMaintModalOpen(false)}
                      className="cursor-pointer rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface"
                    >
                      <RevixIcon name="x" size={16} />
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!maintType.trim()) return;
                      await addMaintenance({
                        vehicleId: vh.id,
                        serviceType: maintType.trim(),
                        workshopName: maintWorkshop.trim() || null,
                        odometerAtService: Number(maintOdo) || 0,
                        nextServiceKm: maintNextKm > 0 ? Number(maintNextKm) : null,
                        nextServiceDate: maintNextDate || null,
                        cost: Number(maintCost) || 0,
                        status: "completed",
                        serviceDate: maintDate,
                      }).unwrap();
                      setMaintType("");
                      setMaintWorkshop("");
                      setMaintCost(0);
                      setMaintNextKm(0);
                      setMaintNextDate("");
                      setIsMaintModalOpen(false);
                      setLifecycleToast(isRtl ? "تم تسجيل الصيانة بنجاح" : "Maintenance record saved");
                    }}
                    className="p-5 space-y-4 text-xs"
                  >
                    <div>
                      <label className="block font-semibold text-revix-dark mb-1">
                        {isRtl ? "نوع الصيانة *" : "Service Type *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={maintType}
                        onChange={(e) => setMaintType(e.target.value)}
                        placeholder={isRtl ? "مثال: صيانة 10,000 كم، تغيير زيت وفلتر" : "e.g. 10,000 KM Service, Oil Change"}
                        className="h-9 w-full rounded-lg border border-revix-border px-3"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-revix-dark mb-1">
                        {isRtl ? "المركز / الورشة" : "Workshop / Service Center"}
                      </label>
                      <input
                        type="text"
                        value={maintWorkshop}
                        onChange={(e) => setMaintWorkshop(e.target.value)}
                        placeholder={isRtl ? "مثال: مركز صيانة التوكيل" : "e.g. Authorized Service Center"}
                        className="h-9 w-full rounded-lg border border-revix-border px-3"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-revix-dark mb-1">
                          {isRtl ? "العداد الحالي" : "Odometer (km)"}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={maintOdo || ""}
                          onChange={(e) => setMaintOdo(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-revix-dark mb-1">
                          {isRtl ? "التكلفة" : "Cost (EGP)"}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={maintCost || ""}
                          onChange={(e) => setMaintCost(Number(e.target.value) || 0)}
                          placeholder="0"
                          className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-revix-dark mb-1">
                          {isRtl ? "القادمة (كم)" : "Next (km)"}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={maintNextKm || ""}
                          onChange={(e) => setMaintNextKm(Number(e.target.value) || 0)}
                          placeholder="10000"
                          className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-revix-dark mb-1">
                          {isRtl ? "تاريخ الصيانة" : "Service Date"}
                        </label>
                        <RevixDatePicker value={maintDate} onChange={setMaintDate} isRtl={isRtl} />
                      </div>
                      <div>
                        <label className="block font-semibold text-revix-dark mb-1">
                          {isRtl ? "تاريخ الصيانة القادمة" : "Next Service Date"}
                        </label>
                        <RevixDatePicker value={maintNextDate} onChange={setMaintNextDate} isRtl={isRtl} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-revix-border pt-3.5">
                      <button
                        type="button"
                        onClick={() => setIsMaintModalOpen(false)}
                        className="cursor-pointer rounded-lg border border-revix-border px-4 py-2 font-semibold text-revix-secondary hover:bg-revix-surface"
                      >
                        {isRtl ? "إلغاء" : "Cancel"}
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingMaint}
                        className="cursor-pointer rounded-lg bg-revix-primary px-5 py-2 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
                      >
                        {isSavingMaint ? (isRtl ? "جاري الحفظ..." : "Saving...") : (isRtl ? "حفظ سجل الصيانة" : "Save Maintenance")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: 3D INSPECTION & ACCIDENTS */}
        {activeVehicleTab === "inspections" && (
          <VehicleInspectionsTab
            vehicleId={vh.id}
            currentOdometer={vh.mileageOdometer}
            damagePoints={damagePoints}
            inspections={inspections}
            isRtl={isRtl}
            onSuccessToast={setLifecycleToast}
          />
        )}

        {/* TAB 6: ODOMETER & HISTORY */}
        {activeVehicleTab === "timeline" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xs">
              <div className="border-b border-revix-border/70 px-5 py-3.5">
                <h3 className="text-sm font-bold text-revix-dark">
                  {isRtl ? "سجل قراءات العداد (كم)" : "Odometer History"}
                </h3>
              </div>
              {odoLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-revix-secondary">
                  {isRtl ? "لا توجد قراءات مسجلة بعد" : "No odometer logs recorded yet."}
                </div>
              ) : (
                <table className="w-full text-start text-xs">
                  <thead>
                    <tr className="border-b border-revix-border bg-revix-surface/40 text-[10px] font-bold uppercase text-revix-muted">
                      <th className="px-4 py-2.5 text-start">{isRtl ? "المصدر" : "Source"}</th>
                      <th className="px-3 py-2.5 text-start">{isRtl ? "المرجع" : "Reference"}</th>
                      <th className="px-3 py-2.5 text-start">{isRtl ? "القراءة" : "Odometer"}</th>
                      <th className="px-3 py-2.5 text-start">{isRtl ? "الزيادة" : "Delta"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-revix-border/60">
                    {odoLogs.map((o) => (
                      <tr key={o.id}>
                        <td className="px-4 py-2.5 font-semibold capitalize">{o.source}</td>
                        <td className="px-3 py-2.5 text-revix-secondary">{o.referenceLabel || "—"}</td>
                        <td className="px-3 py-2.5 font-mono font-bold">{o.odometerKm.toLocaleString()} km</td>
                        <td className="px-3 py-2.5 font-mono text-emerald-700">+{o.deltaKm.toLocaleString()} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xs">
              <div className="border-b border-revix-border/70 px-5 py-3.5">
                <h3 className="text-sm font-bold text-revix-dark">
                  {isRtl ? "سجل الفحوصات والحوادث" : "Inspections & Accidents Log"}
                </h3>
              </div>
              {inspections.length === 0 ? (
                <div className="p-6 text-center text-xs text-revix-secondary">
                  {isRtl ? "لا توجد فحوصات مسجلة بعد" : "No inspections recorded yet."}
                </div>
              ) : (
                <div className="divide-y divide-revix-border/60 p-4 space-y-3 text-xs">
                  {inspections.map((insp) => (
                    <div key={insp.id} className="pt-2 first:pt-0">
                      <div className="flex items-center justify-between font-bold text-revix-dark">
                        <span className="capitalize">
                          {insp.inspectionType} {insp.customerName ? `• ${insp.customerName}` : ""}
                        </span>
                        <span className="font-mono text-revix-primary">{insp.odometerKm.toLocaleString()} km</span>
                      </div>
                      {insp.hasAccident && (
                        <div className="mt-1 rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                          {isRtl ? "حادث:" : "Accident:"} {insp.accidentNotes || "Recorded"}
                        </div>
                      )}
                      {insp.damagePoints.length > 0 && (
                        <div className="mt-1 text-[11px] text-revix-secondary">
                          {insp.damagePoints.map((dp) => `${dp.zoneKey} (${dp.severity})`).join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );

}
