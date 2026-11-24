"use client";
import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { navigateToWorkspacePage, setPendingFleetReceiveContext, clearPendingFleetReceiveContext } from "@/store/slices/workspaceSlice";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { VehicleInspectionsTab } from "../vehicle-profile/VehicleInspectionsTab";
import { ActivityTimeline } from "../ActivityTimeline";
import { DispatchMovementModal } from "../FleetMovementsPanel";
import { getExpiryMeta } from "@/lib/fleet/vehicleLifecycleData";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import { useCreateVehicleMutation, useListVehiclesQuery, useListVariantsQuery, useListPurchaseOrdersQuery, useListRentalContractsQuery, useReceiveVehicleMutation, useUpdateVehicleStatusMutation, useListInsuranceCompaniesQuery, useGetVehicleLifecycleQuery, useSaveVehicleInsuranceMutation, useUpdateVehiclePricingMutation, useAddVehicleMaintenanceMutation, useToggleVehicleBookableMutation, type FleetVehicleDto, type FleetVehicleStatus, type PurchaseOrderDto, type PurchaseOrderItemDto, type VehicleVariantDto } from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery, type BranchDto, type CompanyDto } from "@/store/api/workspaceApi";
import { Link } from "@/i18n/navigation";
import { DetailTileGrid } from "@/components/shared/workspace";
import { purchaseOrderHref, type VehicleProfileTab } from "@/lib/workspace/resourceRoutes";

export interface VehicleProfilePageProps {
 vehicle: FleetVehicleDto; isRtl: boolean; company: CompanyDto | null;
 activeVehicleTab: VehicleProfileTab;
 onClose: () => void;
 onTabChange: (tab: VehicleProfileTab, vehicleId?: string) => void;
}
export function VehicleProfilePage({ vehicle, isRtl, company, activeVehicleTab, onClose: closeVehicleDetails, onTabChange: switchVehicleTab }: VehicleProfilePageProps) {
 const setActiveVehicleTab = switchVehicleTab;
 const dispatch = useAppDispatch();
 const [updateStatus] = useUpdateVehicleStatusMutation();
 const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
 const [isRailOpen, setIsRailOpen] = useState(false);
 const [timelineSubTab, setTimelineSubTab] = useState<
   "movements" | "activity" | "odometer" | "inspections"
 >("movements");
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

    const insExpiry = lifecycle?.insurancePolicies?.[0]?.expiryDate ?? null;
    const insMeta = getExpiryMeta(insExpiry, isRtl);
    const readinessSteps: Array<{
      label: string;
      sub: string;
      done: boolean;
      actionLabel?: string;
      onAction?: () => void;
    }> = [
      {
        label: isRtl ? "وثيقة التأمين" : "Insurance Policy",
        sub: vh.insuranceCompany || insExpiry || (isRtl ? "لم يتم ربط وثيقة تأمين" : "No active policy linked"),
        done: insMeta.valid || (lifecycle?.insurancePolicies?.length ?? 0) > 0,
        actionLabel: (insMeta.valid || (lifecycle?.insurancePolicies?.length ?? 0) > 0) ? undefined : (isRtl ? "تسجيل التأمين" : "Add Insurance"),
        onAction: (insMeta.valid || (lifecycle?.insurancePolicies?.length ?? 0) > 0) ? undefined : () => setActiveVehicleTab("insurance"),
      },
      {
        label: isRtl ? "شرائح الأسعار" : "Market Pricing Tiers",
        sub: (vh.dailyRate1to2 ?? 0) > 0 ? `${(vh.dailyRate1to2 ?? 0).toLocaleString()} / day` : (isRtl ? "لم يتم تسعير السيارة" : "Daily tiers not set"),
        done: (vh.dailyRate1to2 ?? 0) > 0,
        actionLabel: (vh.dailyRate1to2 ?? 0) > 0 ? undefined : (isRtl ? "قائمة الأسعار" : "Price List"),
        onAction:
          (vh.dailyRate1to2 ?? 0) > 0
            ? undefined
            : () => dispatch(navigateToWorkspacePage({ section: "fleet", subPage: "price-list" })),
      },
    ];
    const completedCount = readinessSteps.filter((s) => s.done).length;
    const isBookingReady = completedCount === readinessSteps.length && vh.status === "available";

    const { data: contractsRes } = useListRentalContractsQuery();
    const vehicleContracts = (contractsRes?.data ?? []).filter((c) => c.vehicleId === vh.id);

    const tabs: Array<{
      id: "overview" | "insurance" | "contracts" | "history" | "movement" | "maintenance" | "inspections";
      label: string;
    }> = [
      { id: "overview", label: isRtl ? "نظرة عامة" : "Overview" },
      { id: "insurance", label: isRtl ? "التأمين" : "Insurance" },
      { id: "contracts", label: isRtl ? "العقود" : "Contract" },
      { id: "history", label: isRtl ? "السجل" : "History" },
      { id: "movement", label: isRtl ? "الحركة" : "Movement" },
      { id: "maintenance", label: isRtl ? "الصيانة" : "Maintenance" },
      { id: "inspections", label: isRtl ? "الفحص 3D والحوادث" : "3D Inspection & Accidents" },
    ];

    const policies = lifecycle?.insurancePolicies ?? [];
    const maintLogs = lifecycle?.maintenanceLogs ?? [];
    const odoLogs = lifecycle?.odometerLogs ?? [];
    const inspections = lifecycle?.inspections ?? [];
    const damagePoints = lifecycle?.damagePoints ?? [];
    const totalInsurancePaid = policies.reduce((acc, p) => acc + (p.premiumAmount || 0), 0);
    const totalMaintCost = maintLogs.reduce((acc, m) => acc + (m.cost || 0), 0);
    const nextScheduledMaint = maintLogs.find((m) => m.nextServiceDate || m.nextServiceKm);

    const currency = company?.baseCurrency || "EGP";
    const locationLabel =
      vh.branchName || vh.companyName || (isRtl ? "مخزون الشركة" : "Company Stock");

    const colorLabel = vh.color
      ? isRtl
        ? (
            {
              white: "أبيض",
              black: "أسود",
              silver: "فضي",
              gray: "رمادي",
              grey: "رمادي",
              blue: "أزرق",
              red: "أحمر",
              brown: "بني",
              gold: "ذهبي",
              green: "أخضر",
              beige: "بيج",
            }[vh.color.trim().toLowerCase()] || vh.color
          )
        : vh.color
      : "—";

    return (
      <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
        {lifecycleToast && (
          <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">
            {lifecycleToast}
          </div>
        )}

        {/* Clean Top Header — matches single Purchase Order page */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-1 shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={closeVehicleDetails}
              title={isRtl ? "العودة لأصول السيارات" : "Back to vehicle assets"}
              aria-label={isRtl ? "العودة لأصول السيارات" : "Back to vehicle assets"}
              className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface focus-visible:outline-revix-primary"
            >
              <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
            </button>

            <h1 className="truncate text-lg font-bold text-revix-dark">
              {variant
                ? `${variant.make} ${variant.model}${variant.trim ? ` ${variant.trim}` : ""} ${variant.modelYear}`
                : "Vehicle Asset"}
            </h1>
            {vh.assetCode && (
              <span
                dir="ltr"
                className="shrink-0 rounded-md bg-revix-accent-soft px-2.5 py-0.5 font-mono text-xs font-bold text-revix-primary"
              >
                {vh.assetCode}
              </span>
            )}
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
            {!vh.isPartnerVehicle && (
              <div className="w-24">
                <RevixSelect
                  size="sm"
                  isRtl={isRtl}
                  value={vh.status}
                  onChange={(e) =>
                    updateStatus({ id: vh.id, status: e.target.value as FleetVehicleStatus })
                  }
                  buttonClassName="h-9 rounded-md text-xs font-semibold"
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
            {!vh.isPartnerVehicle &&
              company?.operatingMode !== "local_partner" &&
              vh.status !== "on_rent" && (
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(true)}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-revix-border bg-white px-3 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
              >
                <span>{isRtl ? "نقل لفرع" : "Move branch"}</span>
              </button>
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
                        ? "تم تحويل السيارة للأسطول الجاهز للحجز"
                        : "Vehicle published to Bookable Fleet"
                      : isRtl
                        ? "تم إخفاء السيارة من الأسطول الجاهز للحجز"
                        : "Vehicle removed from Bookable Fleet",
                  );
                }}
                className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-3.5 text-xs font-semibold transition-colors ${
                  vh.isBookable
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-revix-primary bg-revix-primary text-white shadow-xs hover:bg-revix-primary-hover"
                }`}
              >
                <RevixIcon name={vh.isBookable ? "check" : "plus"} size={14} />
                <span>
                  {vh.isBookable
                    ? isRtl
                      ? "منشورة في الأسطول"
                      : "In Live Fleet"
                    : isRtl
                      ? "تحويل للأسطول"
                      : "Publish to Fleet"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Underline Tabs — matches single Purchase Order page */}
        <nav
          aria-label={isRtl ? "أقسام السيارة" : "Vehicle sections"}
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-revix-border"
        >
          {tabs.map((tab) => {
            const isActive = activeVehicleTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  switchVehicleTab(tab.id, vh.id);
                  if (tab.id === "maintenance") {
                    setMaintOdo(vh.mileageOdometer || 0);
                  }
                }}
                className={`cursor-pointer shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-revix-primary ${
                  isActive
                    ? "border-revix-primary font-semibold text-revix-primary"
                    : "border-transparent text-revix-secondary hover:text-revix-dark"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Scrollable Tab Content */}
        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 pb-4">
          {/* TAB: CONTRACT */}
          {activeVehicleTab === "contracts" && (
            <section className="overflow-hidden rounded-xl border border-revix-border bg-revix-white">
              <div className="flex items-center justify-between border-b border-revix-border bg-revix-surface/65 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-revix-dark">
                    {isRtl ? "عقود الإيجار" : "Rental Contracts"}
                  </h3>
                  <span className="rounded-md bg-revix-white px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
                    {vehicleContracts.length}
                  </span>
                </div>
              </div>
              <DataTable className="text-xs">
                <thead>
                  <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "رقم العقد" : "Contract #"}</th>
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "العميل" : "Customer"}</th>
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "الفترة" : "Dates"}</th>
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "الإجمالي" : "Total"}</th>
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-revix-border/60">
                  {vehicleContracts.length === 0 ? (
                    <TableEmptyRow
                      colSpan={5}
                      title={isRtl ? "لا توجد عقود لهذه السيارة" : "No contracts for this vehicle"}
                      description={
                        isRtl
                          ? "ستظهر هنا جميع عقود الإيجار المرتبطة بهذه السيارة."
                          : "All rental contracts linked to this vehicle will appear here."
                      }
                    />
                  ) : (
                    vehicleContracts.map((c) => (
                      <tr key={c.id} className="hover:bg-revix-surface/40">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-revix-primary" dir="ltr">
                          {c.contractNumber}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-revix-dark">
                          {c.customerName || "—"}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-revix-secondary" dir="ltr">
                          {c.startDate.slice(0, 10)} → {c.endDate.slice(0, 10)}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-revix-dark" dir="ltr">
                          {Number(c.totalAmount).toLocaleString()} {currency}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="inline-flex rounded-full border border-revix-border bg-revix-surface px-2 py-0.5 text-[11px] font-semibold text-revix-dark">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </section>
          )}

          {/* TAB: HISTORY */}
          {activeVehicleTab === "history" && (
            <div className="space-y-4">
              <section className="overflow-hidden rounded-xl border border-revix-border bg-revix-white p-4">
                <ActivityTimeline
                  entityType="fleet_vehicle"
                  entityId={vh.id}
                  isRtl={isRtl}
                  participantsLabel={isRtl ? "مسؤولو السيارة" : "Vehicle participants"}
                  participants={[
                    { label: isRtl ? "أضاف السيارة" : "Added by", value: vh.createdByUserName },
                    { label: isRtl ? "الفرع الحالي" : "Current branch", value: locationLabel },
                    { label: isRtl ? "أمر الشراء" : "Purchase order", value: vh.poNumber },
                  ]}
                />
              </section>

              <section className="overflow-hidden rounded-xl border border-revix-border bg-revix-white">
                <div className="border-b border-revix-border bg-revix-surface/65 px-4 py-3">
                  <h3 className="text-sm font-semibold text-revix-dark">
                    {isRtl ? "سجل قراءات العداد" : "Odometer Log"}
                  </h3>
                </div>
                <DataTable className="text-xs">
                  <thead>
                    <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                      <th className="px-3.5 py-2.5 text-start">{isRtl ? "القراءة" : "Reading"}</th>
                      <th className="px-3.5 py-2.5 text-start">{isRtl ? "النوع" : "Source"}</th>
                      <th className="px-3.5 py-2.5 text-start">{isRtl ? "التاريخ" : "Date"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-revix-border/60">
                    {odoLogs.length === 0 ? (
                      <TableEmptyRow
                        colSpan={3}
                        compact
                        title={isRtl ? "لا توجد قراءات مسجلة بعد" : "No odometer logs recorded yet"}
                      />
                    ) : (
                      odoLogs.map((o) => (
                        <tr key={o.id} className="hover:bg-revix-surface/40">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-revix-dark">
                            {o.odometerKm.toLocaleString()} {isRtl ? "كم" : "km"}
                          </td>
                          <td className="px-3.5 py-2.5 text-revix-secondary">{o.source}</td>
                          <td className="px-3.5 py-2.5 font-mono text-revix-secondary" dir="ltr">
                            {String(o.recordedAt).slice(0, 10)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </DataTable>
              </section>
            </div>
          )}

          {/* TAB: MOVEMENT */}
          {activeVehicleTab === "movement" && (
            <section className="overflow-hidden rounded-xl border border-revix-border bg-revix-white">
              <div className="flex items-center justify-between border-b border-revix-border bg-revix-surface/65 px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-revix-dark">
                    {isRtl ? "سجل حركات السيارة" : "Vehicle Movements"}
                  </h3>
                  <span className="rounded-md bg-revix-white px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
                    {lifecycle?.movements?.length ?? 0}
                  </span>
                </div>
                {!vh.isPartnerVehicle &&
                  company?.operatingMode !== "local_partner" &&
                  vh.status !== "on_rent" && (
                    <button
                      type="button"
                      onClick={() => setIsMoveModalOpen(true)}
                      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3 text-xs font-semibold text-white hover:bg-revix-primary-hover"
                    >
                      <RevixIcon name="plus" size={13} />
                      <span>{isRtl ? "نقل لفرع" : "Move branch"}</span>
                    </button>
                  )}
              </div>
              <DataTable className="text-xs">
                <thead>
                  <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "رقم الحركة" : "Ref"}</th>
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "المسار" : "Route"}</th>
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "السواق" : "Driver"}</th>
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "العداد" : "Odometer"}</th>
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "الموظفون" : "Staff"}</th>
                    <th className="px-3.5 py-2.5 text-start">{isRtl ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-revix-border/60">
                  {!(lifecycle?.movements && lifecycle.movements.length > 0) ? (
                    <TableEmptyRow
                      colSpan={6}
                      title={isRtl ? "لا توجد حركات نقل مسجلة بعد" : "No movements recorded yet"}
                      description={
                        isRtl
                          ? "ستظهر هنا جميع حركات نقل وتسليم هذه السيارة بين الفروع."
                          : "All branch transfer and dispatch movements for this vehicle will appear here."
                      }
                    />
                  ) : (
                    lifecycle.movements.map((m) => (
                      <tr key={m.id} className="hover:bg-revix-surface/25">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-revix-primary whitespace-nowrap" dir="ltr">
                          {m.movementNumber}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-revix-dark">
                          {m.fromBranchName || (isRtl ? "مخزون الشركة" : "Company Stock")}{" "}
                          <span className="text-revix-muted">{isRtl ? "←" : "→"}</span>{" "}
                          {m.toBranchName || "—"}
                        </td>
                        <td className="px-3.5 py-2.5 text-revix-secondary">{m.driverName || "—"}</td>
                        <td className="px-3.5 py-2.5 font-mono text-xs whitespace-nowrap">
                          <span className="font-semibold text-revix-dark">
                            {m.dispatchOdometerKm.toLocaleString()} {isRtl ? "كم" : "km"}
                          </span>
                          {m.arrivalOdometerKm != null && (
                            <span className="font-semibold text-emerald-700">
                              {" "}
                              {isRtl ? "←" : "→"} {m.arrivalOdometerKm.toLocaleString()}{" "}
                              {isRtl ? "كم" : "km"}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-xs text-revix-secondary">
                          {m.dispatchedByUserName || "—"}
                          {m.receivedByUserName ? ` / ${m.receivedByUserName}` : ""}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold border whitespace-nowrap ${
                              m.status === "received"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : m.status === "in_transit"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {m.status === "received"
                              ? isRtl ? "تم الاستلام" : "Received"
                              : m.status === "in_transit"
                                ? isRtl ? "في الطريق" : "In Transit"
                                : isRtl ? "ملغي" : "Cancelled"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </DataTable>
            </section>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeVehicleTab === "overview" && (
            <DetailTileGrid
              columns={4}
              items={[
                ...(vh.assetCode
                  ? [
                      {
                        label: "Vehicle ID",
                        value: vh.assetCode,
                        valueClassName: "font-mono font-bold text-revix-primary",
                      },
                    ]
                  : []),
                {
                  label: isRtl ? "الموديل / الفئة" : "Model Variation",
                  value: variant
                    ? `${variant.make} ${variant.model}${variant.trim ? ` ${variant.trim}` : ""} ${variant.modelYear}`
                    : "—",
                },
                { label: isRtl ? "رقم الشاسيه" : "Chassis #", value: vh.vin || "—" },
                { label: isRtl ? "رقم اللوحة" : "License plate", value: vh.licensePlate || "—" },
                { label: isRtl ? "رقم المفتاح" : "Key #", value: vh.keyNumber || "—" },
                { label: isRtl ? "اللون" : "Color", value: colorLabel },
                {
                  label: isRtl ? "قراءة العداد" : "Odometer",
                  value: `${vh.mileageOdometer.toLocaleString()} ${isRtl ? "كم" : "km"}`,
                },
                { label: isRtl ? "الفرع" : "Branch", value: locationLabel },
                { label: isRtl ? "المورد" : "Vendor", value: vh.vendorName || "—" },
                {
                  label: isRtl ? "أمر الشراء" : "Purchase order",
                  value: vh.poNumber ? (
                    vh.purchaseOrderId ? (
                      <Link
                        href={purchaseOrderHref(vh.purchaseOrderId)}
                        className="inline-flex items-center gap-1 font-mono font-semibold text-revix-primary hover:underline"
                      >
                        <span dir="ltr">{vh.poNumber}</span>
                      </Link>
                    ) : (
                      vh.poNumber
                    )
                  ) : (
                    "—"
                  ),
                },
                {
                  label: isRtl ? "سعر الشراء" : "Purchase price",
                  value:
                    vh.purchasePrice != null
                      ? `${Number(vh.purchasePrice).toLocaleString()} ${currency}`
                      : "—",
                },
                {
                  label: isRtl ? "السعر اليومي" : "Daily rate",
                  value: vh.dailyRate1to2
                    ? `${Number(vh.dailyRate1to2).toLocaleString()} ${currency}`
                    : "—",
                },
                {
                  label: isRtl ? "تكلفة التأمين" : "Insurance paid",
                  value: `${totalInsurancePaid.toLocaleString()} ${currency}`,
                },
                {
                  label: isRtl ? "تكلفة الصيانة" : "Maintenance cost",
                  value: `${totalMaintCost.toLocaleString()} ${currency}`,
                },
                {
                  label: isRtl ? "بوليصة التأمين" : "Insurance policy",
                  value: insExpiry ? (
                    insExpiry
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchVehicleTab("insurance", vh.id)}
                      className="cursor-pointer font-semibold text-revix-primary hover:underline"
                    >
                      {isRtl ? "غير مسجل — تسجيل التأمين" : "Not set — Add Insurance"}
                    </button>
                  ),
                },
              ]}
            />
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
            <div className="space-y-4">
              {/* Clean Single Policy Table Card — matches PO detail table */}
              <section className="overflow-hidden rounded-lg border border-revix-border bg-revix-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border bg-revix-surface px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-sm font-semibold text-revix-dark">
                      {isRtl ? "بوالص التأمين" : "Insurance Policies"}
                    </h3>
                    <span className="rounded bg-revix-white border border-revix-border px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                      {policies.length}
                    </span>
                    <span className="hidden sm:inline text-revix-border">|</span>
                    <div className="hidden sm:flex items-center gap-3 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 text-revix-secondary">
                        <span className={`h-1.5 w-1.5 rounded-full ${platePolicy ? "bg-emerald-500" : "bg-amber-400"}`} />
                        {isRtl ? "إجباري:" : "Plate:"}{" "}
                        <strong className="font-medium text-revix-dark">
                          {platePolicy ? platePolicy.expiryDate : isRtl ? "غير مسجل" : "None"}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-revix-secondary">
                        <span className={`h-1.5 w-1.5 rounded-full ${compPolicy ? "bg-emerald-500" : "bg-amber-400"}`} />
                        {isRtl ? "شامل:" : "Comp:"}{" "}
                        <strong className="font-medium text-revix-dark">
                          {compPolicy ? compPolicy.expiryDate : isRtl ? "غير مسجل" : "None"}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsModal("comprehensive")}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-revix-primary px-3 text-xs font-semibold text-white hover:bg-revix-primary-hover transition-colors"
                  >
                    <RevixIcon name="plus" size={14} />
                    <span>{isRtl ? "إضافة بوليصة" : "Add Policy"}</span>
                  </button>
                </div>
                {policies.length === 0 ? (
                  <div className="py-12 text-center text-xs text-revix-secondary">
                    {isRtl ? "لا توجد بوالص تأمين مسجلة لهذه السيارة حتى الآن." : "No insurance policies recorded for this vehicle yet."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <DataTable className="w-full text-start text-xs">
                      <thead>
                        <tr className="border-b border-revix-border bg-revix-surface/50 text-[11px] font-semibold text-revix-secondary">
                          <th className="px-4 py-2.5 text-start">{isRtl ? "النوع" : "Type"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "الشركة" : "Provider"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "رقم البوليصة" : "Policy #"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "المدفوع" : "Paid"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "التحمل" : "Deductible"}</th>
                          <th className="px-3 py-2.5 text-start">{isRtl ? "البدء" : "Start"}</th>
                          <th className="px-4 py-2.5 text-start">{isRtl ? "الانتهاء" : "Expiry"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-revix-border/60">
                        {policies.map((p) => (
                          <tr key={p.id} className="hover:bg-revix-surface/40">
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                                  p.coverageType === "compulsory_plate"
                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {coverageLabel(p.coverageType)}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-semibold text-revix-dark">{p.providerName}</td>
                            <td className="px-3 py-3 font-mono text-revix-secondary">{p.policyNumber}</td>
                            <td className="px-3 py-3 font-mono font-semibold text-revix-dark tabular-nums">
                              <span dir="ltr" className="inline-block">{p.premiumAmount.toLocaleString()} {currency}</span>
                            </td>
                            <td className="px-3 py-3 font-mono text-revix-secondary tabular-nums">
                              {p.deductibleAmount > 0 ? p.deductibleAmount.toLocaleString() : "—"}
                            </td>
                            <td className="px-3 py-3 font-mono text-revix-secondary tabular-nums">{p.startDate}</td>
                            <td className="px-4 py-3 font-mono font-semibold text-revix-dark tabular-nums">{p.expiryDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </div>
                )}
              </section>

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

        {/* TAB 4: MAINTENANCE */}
        {activeVehicleTab === "maintenance" && (
          <div className="space-y-4">
            {/* Clean Maintenance History Table — matches PO detail table */}
            <section className="overflow-hidden rounded-lg border border-revix-border bg-revix-white">
              <div className="flex items-center justify-between gap-3 border-b border-revix-border bg-revix-surface px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-revix-dark">
                    {isRtl ? "سجل الصيانة" : "Maintenance History"}
                  </h3>
                  <span className="rounded border border-revix-border bg-revix-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                    {maintLogs.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMaintOdo(vh.mileageOdometer || 0);
                    setIsMaintModalOpen(true);
                  }}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-revix-primary px-3 text-xs font-semibold text-white hover:bg-revix-primary-hover transition-colors"
                >
                  <RevixIcon name="plus" size={14} />
                  <span>{isRtl ? "تسجيل صيانة" : "Log Maintenance"}</span>
                </button>
              </div>
              {maintLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-revix-secondary">
                  {isRtl ? "لا توجد سجلات صيانة لهذه السيارة حتى الآن." : "No maintenance logs recorded for this vehicle yet."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="w-full text-start text-xs">
                    <thead>
                      <tr className="border-b border-revix-border bg-revix-surface/50 text-[11px] font-semibold text-revix-secondary">
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
                        <tr key={m.id} className="hover:bg-revix-surface/40">
                          <td className="px-4 py-3 font-mono text-revix-secondary tabular-nums">{m.serviceDate}</td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-revix-dark">{m.serviceType}</div>
                            {m.createdByUserName && (
                              <div className="mt-0.5 text-[10px] text-revix-muted">
                                {isRtl ? "بواسطة:" : "By:"} {m.createdByUserName}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-revix-secondary">{m.workshopName || "—"}</td>
                          <td className="px-3 py-3 font-mono text-revix-dark tabular-nums">{m.odometerAtService.toLocaleString()} {isRtl ? "كم" : "km"}</td>
                          <td className="px-3 py-3 font-mono text-revix-secondary tabular-nums">
                            {m.nextServiceDate || (m.nextServiceKm ? `${m.nextServiceKm.toLocaleString()} ${isRtl ? "كم" : "km"}` : "—")}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-revix-dark tabular-nums">
                            <span dir="ltr" className="inline-block">{m.cost.toLocaleString()} {currency}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )}
            </section>

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
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-revix-border/70 pb-3">
              {[
                { id: "movements" as const, ar: "حركات النقل", en: "Movements", count: lifecycle?.movements?.length ?? 0 },
                { id: "activity" as const, ar: "الموظفين والعمليات", en: "Employee Activity" },
                { id: "odometer" as const, ar: "قراءات العداد", en: "Odometer", count: odoLogs.length },
                { id: "inspections" as const, ar: "الفحوصات والحوادث", en: "Inspections", count: inspections.length },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setTimelineSubTab(sub.id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    timelineSubTab === sub.id
                      ? "border-revix-primary bg-revix-primary text-white"
                      : "border-revix-border bg-white text-revix-secondary hover:bg-revix-surface"
                  }`}
                >
                  <span>{isRtl ? sub.ar : sub.en}</span>
                  {sub.count !== undefined && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                        timelineSubTab === sub.id
                          ? "bg-white/20 text-white"
                          : "bg-revix-surface text-revix-muted"
                      }`}
                    >
                      {sub.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {timelineSubTab === "movements" && (
              !(lifecycle?.movements && lifecycle.movements.length > 0) ? (
                <div className="py-10 text-center text-xs text-revix-secondary">
                  {isRtl ? "لا توجد حركات نقل مسجلة بعد" : "No movements recorded yet."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="w-full text-start text-xs">
                    <thead>
                      <tr className="border-b border-revix-border bg-revix-surface/40 text-[11px] font-bold text-revix-muted">
                        <th className="px-3 py-2.5 text-start">{isRtl ? "رقم الحركة" : "Ref"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "المسار" : "Route"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "السواق" : "Driver"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "العداد" : "Odometer"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "الموظفون" : "Staff"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-revix-border/60">
                      {lifecycle.movements.map((m) => (
                        <tr key={m.id} className="hover:bg-revix-surface/25">
                          <td className="px-3 py-2.5 font-mono font-bold text-revix-primary whitespace-nowrap" dir="ltr">
                            {m.movementNumber}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-revix-dark">
                            {m.fromBranchName || (isRtl ? "مخزون الشركة" : "Company Stock")}{" "}
                            <span className="text-revix-muted">{isRtl ? "←" : "→"}</span>{" "}
                            {m.toBranchName || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-revix-secondary">{m.driverName || "—"}</td>
                          <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                            <span className="font-semibold text-revix-dark">
                              {m.dispatchOdometerKm.toLocaleString()} {isRtl ? "كم" : "km"}
                            </span>
                            {m.arrivalOdometerKm != null && (
                              <span className="font-semibold text-emerald-700">
                                {" "}
                                {isRtl ? "←" : "→"} {m.arrivalOdometerKm.toLocaleString()}{" "}
                                {isRtl ? "كم" : "km"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-revix-secondary">
                            {m.dispatchedByUserName || "—"}
                            {m.receivedByUserName ? ` / ${m.receivedByUserName}` : ""}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold border whitespace-nowrap ${
                                m.status === "received"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : m.status === "in_transit"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {m.status === "received"
                                ? isRtl ? "تم الاستلام" : "Received"
                                : m.status === "in_transit"
                                  ? isRtl ? "في الطريق" : "In Transit"
                                  : isRtl ? "ملغي" : "Cancelled"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              )
            )}

            {timelineSubTab === "activity" && (
              <ActivityTimeline
                entityType="fleet_vehicle"
                entityId={vh.id}
                isRtl={isRtl}
                participantsLabel={isRtl ? "مسؤولو السيارة" : "Vehicle participants"}
                participants={[
                  { label: isRtl ? "أضاف السيارة" : "Added by", value: vh.createdByUserName },
                  { label: isRtl ? "الفرع الحالي" : "Current branch", value: locationLabel },
                  { label: isRtl ? "أمر الشراء" : "Purchase order", value: vh.poNumber },
                ]}
              />
            )}

            {timelineSubTab === "odometer" && (
              odoLogs.length === 0 ? (
                <div className="py-10 text-center text-xs text-revix-secondary">
                  {isRtl ? "لا توجد قراءات مسجلة بعد" : "No odometer logs recorded yet."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable className="w-full text-start text-xs">
                    <thead>
                      <tr className="border-b border-revix-border bg-revix-surface/40 text-[11px] font-bold text-revix-muted">
                        <th className="px-3 py-2.5 text-start">{isRtl ? "المصدر" : "Source"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "المرجع" : "Ref"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "القراءة" : "Odometer"}</th>
                        <th className="px-3 py-2.5 text-start">{isRtl ? "الزيادة" : "Delta"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-revix-border/60">
                      {odoLogs.map((o) => {
                        const srcMap: Record<string, { ar: string; en: string }> = {
                          movement_dispatch: { ar: "إرسال لفرع", en: "Movement Dispatch" },
                          movement_arrival: { ar: "استلام بالفرع", en: "Branch Receipt" },
                          contract_pickup: { ar: "تسليم عقد إيجار", en: "Contract Pickup" },
                          contract_return: { ar: "عودة عقد إيجار", en: "Contract Return" },
                          maintenance: { ar: "صيانة", en: "Maintenance" },
                          inspection: { ar: "فحص", en: "Inspection" },
                        };
                        const srcLabel = srcMap[o.source]
                          ? isRtl
                            ? srcMap[o.source].ar
                            : srcMap[o.source].en
                          : o.source;
                        return (
                          <tr key={o.id} className="hover:bg-revix-surface/25">
                            <td className="px-3 py-2.5 font-semibold">{srcLabel}</td>
                            <td className="px-3 py-2.5 text-revix-secondary font-mono">
                              {o.referenceLabel || "—"}
                            </td>
                            <td className="px-3 py-2.5 font-mono font-bold whitespace-nowrap">
                              {o.odometerKm.toLocaleString()} {isRtl ? "كم" : "km"}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-emerald-700 whitespace-nowrap">
                              +{o.deltaKm.toLocaleString()} {isRtl ? "كم" : "km"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                </div>
              )
            )}

            {timelineSubTab === "inspections" && (
              inspections.length === 0 ? (
                <div className="py-10 text-center text-xs text-revix-secondary">
                  {isRtl ? "لا توجد فحوصات مسجلة بعد" : "No inspections recorded yet."}
                </div>
              ) : (
                <div className="divide-y divide-revix-border/60 text-xs">
                  {inspections.map((insp) => (
                    <div key={insp.id} className="py-3 first:pt-0">
                      <div className="flex items-center justify-between font-bold text-revix-dark">
                        <span className="capitalize">
                          {insp.inspectionType} {insp.customerName ? `• ${insp.customerName}` : ""}
                          {insp.inspectedBy ? ` • ${isRtl ? "بواسطة:" : "By:"} ${insp.inspectedBy}` : ""}
                        </span>
                        <span className="font-mono text-revix-primary">
                          {insp.odometerKm.toLocaleString()} {isRtl ? "كم" : "km"}
                        </span>
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
              )
            )}
          </div>
        )}
        </div>
        <DispatchMovementModal
          isOpen={isMoveModalOpen}
          isRtl={isRtl}
          initialVehicle={vh}
          onClose={() => setIsMoveModalOpen(false)}
        />
      </div>
    );

}
