"use client";
import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { parseFleetResourceRoute, vehicleHref, type VehicleProfileTab } from "@/lib/workspace/resourceRoutes";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import { useGetVehicleQuery } from "@/store/api/fleetApi";
import { VehicleProfilePage } from "./vehicle-profile/VehicleProfilePage";

import { getApiErrorMessage } from "@/lib/api/errors";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { navigateToWorkspacePage, setPendingFleetReceiveContext, clearPendingFleetReceiveContext } from "@/store/slices/workspaceSlice";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { VehicleInspectionsTab } from "./vehicle-profile/VehicleInspectionsTab";
import { getExpiryMeta } from "@/lib/fleet/vehicleLifecycleData";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import { useCreateVehicleMutation, useListVehiclesQuery, useListVariantsQuery, useListPurchaseOrdersQuery, useReceiveVehicleMutation, useUpdateVehicleStatusMutation, useListInsuranceCompaniesQuery, useGetVehicleLifecycleQuery, useSaveVehicleInsuranceMutation, useUpdateVehiclePricingMutation, useAddVehicleMaintenanceMutation, useToggleVehicleBookableMutation, type FleetVehicleDto, type FleetVehicleStatus, type PurchaseOrderDto, type PurchaseOrderItemDto, type VehicleVariantDto } from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery, type BranchDto, type CompanyDto } from "@/store/api/workspaceApi";

interface FleetVehiclesPanelProps {
  isRtl: boolean;
  branches: BranchDto[];
  activeBranch: BranchDto | null;
  company: CompanyDto | null;
  onGoVariants?: () => void;
  onGoPurchaseOrders?: () => void;
}

const VEHICLE_STATUS_CONFIG: Record<
  FleetVehicleStatus,
  { en: string; ar: string; badgeClass: string; dotClass: string }
> = {
  available: {
    en: "Available",
    ar: "جاهزة",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dotClass: "bg-emerald-500",
  },
  on_rent: {
    en: "On Rent",
    ar: "مؤجرة",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
    dotClass: "bg-sky-500",
  },
  maintenance: {
    en: "Maintenance",
    ar: "صيانة",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
    dotClass: "bg-amber-500",
  },
  reserved: {
    en: "Reserved",
    ar: "محجوزة",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200/80",
    dotClass: "bg-violet-500",
  },
  out_of_service: {
    en: "Out of Service",
    ar: "خارج الخدمة",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
    dotClass: "bg-rose-500",
  },
};

const COLOR_AR_MAP: Record<string, string> = {
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
};

interface PendingDeliveryItem {
  id: string; // `${po.id}::${item.id}`
  po: PurchaseOrderDto;
  item: PurchaseOrderItemDto;
  variant?: VehicleVariantDto;
  remainingCount: number;
  branchName?: string;
}

export function FleetVehiclesPanel({ isRtl, branches, activeBranch, company }: FleetVehiclesPanelProps) {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const resourceRoute = parseFleetResourceRoute(pathname);
  const detailId = resourceRoute?.id || searchParams.get("id");
  const activeVehicleTab: VehicleProfileTab = resourceRoute?.tab ?? "overview";
  const { data: detailResponse, isLoading: isLoadingDetail, isFetching: isFetchingDetail, error: detailError, refetch: refetchDetail } = useGetVehicleQuery(detailId ?? "", { skip: !detailId });
  const selectedVehicleForDetails = detailId ? detailResponse?.data ?? null : null;
  const isNetworkMain = company?.operatingMode === "network_main";
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedStatus] = useState<string>("all");
  const [search, setSearch] = useState("");



  const [includeNetwork] = useState(isNetworkMain);
  const [page, setPage] = usePersistedPage("fleet/vehicles");
  const pageSize = 15;
  const dispatch = useAppDispatch();
  const { data: wsContext } = useGetWorkspaceContextQuery();
  const membership = wsContext?.data.membership ?? null;
  const canCreateFleet =
    !membership ||
    membership.roleCode === "owner" ||
    membership.roleCode === "ceo" ||
    Boolean(membership.permissions.fleet?.includes("create"));

  const { data, isLoading } = useListVehiclesQuery({
    branchId: selectedBranchId !== "all" ? selectedBranchId : undefined,
    status: selectedStatus !== "all" ? (selectedStatus as FleetVehicleStatus) : undefined,
    search: search.trim() || undefined,
    includeNetwork: isNetworkMain && includeNetwork,
    page,
    pageSize,
  });

  const { data: variantsData } = useListVariantsQuery();
  const { data: poData } = useListPurchaseOrdersQuery({
    branchId: selectedBranchId !== "all" ? selectedBranchId : undefined,
  });

  const [createVehicle, { isLoading: isCreatingDirect }] = useCreateVehicleMutation();
  const [receiveVehicle, { isLoading: isReceivingPo }] = useReceiveVehicleMutation();
  const [updateStatus] = useUpdateVehicleStatusMutation();

  const vehicles = useMemo(() => data?.data ?? [], [data?.data]);

  const syncVehicleUrl = (id: string | null, tab: VehicleProfileTab = "overview", push = false) => {
 const params = new URLSearchParams(searchParams.toString()); for (const key of ["id", "tab", "mode"]) params.delete(key);
 const path = id ? vehicleHref(id, tab) : "/workspace/fleet/vehicles";
 const href = path + (params.size ? "?" + params : "");
 if (push) router.push(href); else router.replace(href);
};

  const openVehicleDetails = (vehicle: FleetVehicleDto) => syncVehicleUrl(vehicle.id, "overview", true);

  const closeVehicleDetails = () => syncVehicleUrl(null, "overview", true);

  const switchVehicleTab = (tab: VehicleProfileTab, id?: string) => { if (id || detailId) syncVehicleUrl(id || detailId, tab); };


  const totalVehicles = data?.pagination?.totalItems ?? vehicles.length;
  const variants = useMemo(() => variantsData?.data ?? [], [variantsData?.data]);
  const purchaseOrders = useMemo(() => poData?.data ?? [], [poData?.data]);

  const paginatedVehicles = vehicles;

  // Compute pending incoming deliveries (POs approved/partially_received with remaining cars)
  const pendingDeliveries: PendingDeliveryItem[] = useMemo(() => {
    const list: PendingDeliveryItem[] = [];
    for (const po of purchaseOrders) {
      if (po.status === "approved" || po.status === "partially_received") {
        for (const item of po.items || []) {
          const remaining = item.quantity - item.receivedCount;
          if (remaining > 0) {
            const variant = variants.find((v) => v.id === item.variantId);
            const branch = branches.find((b) => b.id === po.branchId);
            list.push({
              id: `${po.id}::${item.id}`,
              po,
              item,
              variant,
              remainingCount: remaining,
              branchName: branch?.name || po.branchName,
            });
          }
        }
      }
    }
    return list;
  }, [purchaseOrders, variants, branches]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === "available").length;
    const onRent = vehicles.filter((v) => v.status === "on_rent").length;
    const maintenance = vehicles.filter((v) => v.status === "maintenance").length;
    const partnerVehicles = vehicles.filter((v) => v.isPartnerVehicle).length;
    return { total, available, onRent, maintenance, partnerVehicles };
  }, [vehicles]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"convert_po" | "direct">("convert_po");
  const [selectedPendingId, setSelectedPendingId] = useState<string>("");

  // Form State
  const [formBranchId, setFormBranchId] = useState(activeBranch?.id || branches[0]?.id || "");
  const [formVariantId, setFormVariantId] = useState("");
  const [formVin, setFormVin] = useState("");
  const [formPlate, setFormPlate] = useState("");
  const [formKeyNumber, setFormKeyNumber] = useState("");
  const [formColor, setFormColor] = useState("White");
  const [formMileage, setFormMileage] = useState(15);
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const activePendingItem = useMemo(() => {
    return (
      pendingDeliveries.find((d) => d.id === selectedPendingId) ||
      pendingDeliveries[0] ||
      null
    );
  }, [pendingDeliveries, selectedPendingId]);

  function handleOpenConvertModal(targetItem?: PendingDeliveryItem) {
    const target = targetItem || pendingDeliveries[0];
    if (target) {
      dispatch(
        setPendingFleetReceiveContext({
          purchaseOrderId: target.po.id,
          itemId: target.item.id,
          variantId: target.item.variantId,
          branchId: target.po.branchId ?? undefined,
          poNumber: target.po.poNumber,
          unitPrice: target.item.unitPrice,
        }),
      );
    } else {
      dispatch(clearPendingFleetReceiveContext());
    }
    dispatch(
      navigateToWorkspacePage({
        section: "fleet",
        subPage: "add-vehicle",
      }),
    );
  }

  function handleOpenDirectModal() {
    dispatch(clearPendingFleetReceiveContext());
    dispatch(
      navigateToWorkspacePage({
        section: "fleet",
        subPage: "add-vehicle",
      }),
    );
  }

  function handleSelectPendingItem(id: string) {
    setSelectedPendingId(id);
    const item = pendingDeliveries.find((d) => d.id === id);
    if (item) {
      setFormBranchId(item.po.branchId || activeBranch?.id || branches[0]?.id || "");
      setFormVariantId(item.item.variantId);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (modalMode === "convert_po") {
      if (!activePendingItem) {
        setFormError(
          isRtl
            ? "برجاء اختيار شحنة أمر الشراء المراد استلامها وتحويلها للأسطول."
            : "Please select an arriving purchase order shipment.",
        );
        return;
      }

      if (!formVin.trim() || !formPlate.trim()) {
        setFormError(
          isRtl
            ? "برجاء كتابة رقم الشاسيه (VIN) ورقم اللوحة المعدنية."
            : "Chassis/VIN and License Plate are required.",
        );
        return;
      }

      try {
        await receiveVehicle({
          purchaseOrderId: activePendingItem.po.id,
          itemId: activePendingItem.item.id,
          branchId: activePendingItem.po.branchId,
          vin: formVin.trim().toUpperCase(),
          licensePlate: formPlate.trim().toUpperCase(),
          keyNumber: formKeyNumber.trim() || null,
          color: formColor.trim() || "White",
          mileageOdometer: Number(formMileage) || 0,
          notes: formNotes.trim() || null,
        }).unwrap();

        setIsModalOpen(false);
      } catch (err: unknown) {
        setFormError(
          getApiErrorMessage(err) ||
            (isRtl
              ? "تعذر تحويل الشحنة إلى سيارة بالأسطول."
              : "Failed to convert shipment into fleet vehicle."),
        );
      }
    } else {
      // Direct registration mode
      if (!formBranchId || !formVariantId || !formVin.trim() || !formPlate.trim()) {
        setFormError(
          isRtl
            ? "برجاء استكمال الحقول المطلوبة (الفرع، الفئة، رقم الشاسيه، ورقم اللوحة)."
            : "Please fill required fields: branch, variant, VIN, and license plate.",
        );
        return;
      }

      try {
        await createVehicle({
          branchId: formBranchId,
          variantId: formVariantId,
          vin: formVin.trim().toUpperCase(),
          licensePlate: formPlate.trim().toUpperCase(),
          keyNumber: formKeyNumber.trim() || null,
          color: formColor.trim() || "White",
          mileageOdometer: Number(formMileage) || 0,
        }).unwrap();

        setIsModalOpen(false);
      } catch (err: unknown) {
        setFormError(
          getApiErrorMessage(err) ||
            (isRtl
              ? "تعذر تسجيل السيارة في الأسطول مباشرة."
              : "Failed to register vehicle asset directly."),
        );
      }
    }
  }

  const isSubmitting = isCreatingDirect || isReceivingPo;

  if (detailId && (!selectedVehicleForDetails || detailError)) {
    return <ResourceFeedback isRtl={isRtl} isLoading={isLoadingDetail || isFetchingDetail} error={detailError} onRetry={() => { void refetchDetail(); }} onBack={closeVehicleDetails} />;
  }
  if (selectedVehicleForDetails) {
    return <VehicleProfilePage key={selectedVehicleForDetails.id} vehicle={selectedVehicleForDetails} isRtl={isRtl} company={company} activeVehicleTab={activeVehicleTab} onClose={closeVehicleDetails} onTabChange={switchVehicleTab} />;
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Clean Top Header & Compact Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "أصول السيارات" : "Vehicle Assets"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {totalVehicles}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
            <RevixIcon
              name="search"
              className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ${
                isRtl ? "right-3" : "left-3"
              }`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={isRtl ? "بحث برقم المركبة، اللوحة، الشاسيه..." : "Search Vehicle ID, plate, VIN..."}
              className={`h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-hidden ${
                isRtl ? "pr-8.5 pl-3" : "pl-8.5 pr-3"
              }`}
            />
          </div>
          {branches.length > 1 && (
            <div className="w-44">
              <RevixSelect
                size="sm"
                isRtl={isRtl}
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  setPage(1);
                }}
                buttonClassName="h-9 rounded-lg text-xs"
                options={[
                  {
                    value: "all",
                    label: isRtl ? "كل الفروع والمخزون" : "All Branches & Stock",
                  },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Vehicles Table */}
      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-revix-border bg-revix-white text-xs text-revix-secondary">
          <RevixIcon name="refresh-cw" className="mr-2 h-4 w-4 animate-spin text-revix-primary" />
          {isRtl ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
            <DataTable fitAvailableHeight className="text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">Vehicle ID</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "السيارة" : "Vehicle"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "الفرع" : "Branch"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "اللوحة" : "Plate"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "اللون" : "Color"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "الشاسيه" : "Chassis #"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "المفتاح" : "Key"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "العداد" : "Odometer"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "الحالة" : "Status"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-end font-semibold">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/60">
                {paginatedVehicles.length === 0 ? (
                  <TableEmptyRow
                    colSpan={10}
                    title={isRtl ? "لا توجد سيارات مسجلة في الأسطول" : "No vehicles registered in fleet"}
                    description={
                      isRtl
                        ? "أضف أول مركبة لبدء متابعة حالتها وحجوزاتها وصيانتها."
                        : "Add your first vehicle to start tracking status, bookings, and maintenance."
                    }
                  />
                ) : paginatedVehicles.map((vh) => {
                    const statusConfig = VEHICLE_STATUS_CONFIG[vh.status] || VEHICLE_STATUS_CONFIG.available;

                    const variant = vh.variant;
                    const variantTitle = variant
                      ? `${variant.make} ${variant.model}${variant.trim ? ` ${variant.trim}` : ""} ${variant.modelYear}`
                      : "Fleet Vehicle";
                    const locationLabel =
                      vh.branchName || vh.companyName || (isRtl ? "مخزون الشركة" : "Company Stock");
                    const colorLabel = vh.color
                      ? isRtl
                        ? COLOR_AR_MAP[vh.color.trim().toLowerCase()] || vh.color
                        : vh.color
                      : "—";

                    return (
                      <tr
                        key={vh.id}
                        onClick={() => openVehicleDetails(vh)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") openVehicleDetails(vh); }}
                        className="cursor-pointer transition-colors hover:bg-revix-surface/60 focus:bg-revix-surface/60 focus:outline-none"
                      >
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="rounded bg-revix-accent-soft px-2 py-0.5 font-mono text-[11px] font-bold text-revix-primary" dir="ltr">
                            {vh.assetCode || "—"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-revix-dark whitespace-nowrap">{variantTitle}</span>
                            {vh.isPartnerVehicle && (
                              <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                                {isRtl ? "شريك" : "Partner"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
                              vh.branchName
                                ? "bg-revix-primary/10 text-revix-primary"
                                : "bg-revix-surface text-revix-secondary border border-revix-border"
                            }`}
                          >
                            {locationLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="rounded-md border border-revix-border bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-dark whitespace-nowrap" dir="ltr">
                            {vh.licensePlate}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-revix-dark whitespace-nowrap">
                          {colorLabel}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-xs text-revix-secondary select-all whitespace-nowrap">
                          {vh.vin || "—"}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-xs text-revix-secondary whitespace-nowrap">
                          {vh.keyNumber || "—"}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-xs font-medium text-revix-dark tabular-nums whitespace-nowrap">
                          {vh.mileageOdometer.toLocaleString()} {isRtl ? "كم" : "km"}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {!vh.isPartnerVehicle ? (
                            <div className="inline-block w-28 text-start">
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
                                buttonClassName={`h-7 rounded-full border px-2.5 text-[11px] font-semibold ${statusConfig.badgeClass}`}
                                options={[
                                  { value: "available", label: isRtl ? "جاهزة" : "Available" },
                                  { value: "on_rent", label: isRtl ? "مؤجرة" : "On Rent" },
                                  { value: "maintenance", label: isRtl ? "صيانة" : "Maintenance" },
                                  { value: "reserved", label: isRtl ? "محجوزة" : "Reserved" },
                                  { value: "out_of_service", label: isRtl ? "خارج الخدمة" : "Out of Service" },
                                ]}
                              />
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.badgeClass}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`} />
                              {isRtl ? statusConfig.ar : statusConfig.en}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openVehicleDetails(vh)}
                              title={isRtl ? "ملف السيارة" : "View vehicle"}
                              className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-revix-border bg-white px-2.5 text-[11px] font-medium text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark"
                            >
                              <RevixIcon name="eye" size={12} />
                              <span>{isRtl ? "عرض" : "View"}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </DataTable>
          </div>

          {/* Unified Compact Pagination */}
          <div className="shrink-0 overflow-hidden rounded-lg border border-revix-border bg-revix-white empty:hidden">
            <RevixPagination compact
              currentPage={page}
              totalItems={totalVehicles}
              pageSize={pageSize}
              onPageChange={setPage}
              lang={isRtl ? "ar" : "en"}
              itemLabel={isRtl ? "سيارة" : "vehicles"}
            />
          </div>
        </>
      )}

      {/* Main Vehicle Registration / Conversion Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-revix-border bg-white shadow-dialog animate-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-revix-border px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-revix-dark">
                  {modalMode === "convert_po"
                    ? isRtl
                      ? "استلام وتحويل سيارة واردة إلى الأسطول"
                      : "Receive & Convert Arrived Vehicle to Fleet"
                    : isRtl
                      ? "تسجيل سيارة مباشرة بالأسطول (بدون أمر شراء)"
                      : "Register Vehicle Asset Directly"}
                </h2>
                <p className="mt-0.5 text-xs text-revix-secondary">
                  {modalMode === "convert_po"
                    ? isRtl
                      ? "تسجيل بيانات الأصل الفعلية (الشاسيه واللوحة والعداد) للشحنات الواصلة من أوامر الشراء."
                      : "Assign VIN, plate, odometer, and keys to vehicles physically received from purchase orders."
                    : isRtl
                      ? "تسجيل سيارة مملوكة سابقاً أو مشتراة نقداً بشكل مباشر."
                      : "Direct entry for pre-owned or unlinked corporate vehicles."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-colors"
              >
                <RevixIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex shrink-0 border-b border-revix-border bg-revix-surface/40 px-6 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalMode("convert_po");
                  setFormError(null);
                  if (pendingDeliveries.length > 0 && !activePendingItem) {
                    setSelectedPendingId(pendingDeliveries[0]!.id);
                    setFormBranchId(pendingDeliveries[0]!.po.branchId || activeBranch?.id || branches[0]?.id || "");
                    setFormVariantId(pendingDeliveries[0]!.item.variantId);
                  }
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold transition ${
                  modalMode === "convert_po"
                    ? "border-revix-primary text-revix-primary"
                    : "border-transparent text-revix-secondary hover:text-revix-dark"
                }`}
              >
                <RevixIcon name="car-front" className="h-3.5 w-3.5" />
                <span>{isRtl ? "تحويل سيارة واردة من أمر شراء" : "Convert Arriving PO Vehicle"}</span>
                {pendingDeliveries.length > 0 && (
                  <span className="rounded-full bg-revix-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-revix-primary">
                    {pendingDeliveries.reduce((a, b) => a + b.remainingCount, 0)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalMode("direct");
                  setFormError(null);
                  setFormBranchId(activeBranch?.id || branches[0]?.id || "");
                  setFormVariantId(variants[0]?.id || "");
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold transition ${
                  modalMode === "direct"
                    ? "border-revix-primary text-revix-primary"
                    : "border-transparent text-revix-secondary hover:text-revix-dark"
                }`}
              >
                <RevixIcon name="plus" className="h-3.5 w-3.5" />
                <span>{isRtl ? "تسجيل سيارة مباشرة بالأسطول" : "Direct Registration"}</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {formError && (
                  <div className="rounded-lg bg-revix-alert-soft p-3 text-xs text-revix-alert">
                    {formError}
                  </div>
                )}

                {modalMode === "convert_po" ? (
                  <>
                    {/* Select Pending Shipment */}
                    {pendingDeliveries.length > 0 ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-revix-dark mb-1">
                            {isRtl ? "اختر الشحنة / أمر الشراء الوارد" : "Select Arriving Shipment / PO"} *
                          </label>
                          <RevixSelect
                            size="sm"
                            isRtl={isRtl}
                            value={selectedPendingId || pendingDeliveries[0]?.id || ""}
                            onChange={(e) => handleSelectPendingItem(e.target.value)}
                            buttonClassName="h-9 rounded-lg text-xs"
                            options={pendingDeliveries.map((d) => ({
                              value: d.id,
                              label: `${d.po.poNumber} • ${d.variant ? `${d.variant.make} ${d.variant.model}` : "Car"} • ${d.po.vendorName || "Vendor"} (${isRtl ? "متبقي" : "rem"}: ${d.remainingCount}) • ${d.branchName}`,
                            }))}
                          />
                        </div>

                        {/* Arriving Shipment Highlight Card */}
                        {activePendingItem && (
                          <div className="rounded-xl border border-revix-primary/30 bg-revix-primary/5 p-3.5 text-xs text-revix-dark">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-[10px] font-semibold text-revix-primary uppercase tracking-wider">
                                  {isRtl ? "بيانات الشحنة المعتمدة" : "Approved Shipment Details"}
                                </span>
                                <h4 className="text-sm font-bold mt-0.5">
                                  {activePendingItem.variant
                                    ? [activePendingItem.variant.make, activePendingItem.variant.model, activePendingItem.variant.modelYear, activePendingItem.variant.trim].filter(Boolean).join(" ")
                                    : "Vehicle Variant"}
                                </h4>
                                <p className="text-revix-secondary mt-0.5">
                                  {isRtl ? "المورد:" : "Vendor:"}{" "}
                                  <span className="font-semibold text-revix-dark">
                                    {activePendingItem.po.vendorName}
                                  </span>{" "}
                                  • {isRtl ? "أمر الشراء:" : "PO:"}{" "}
                                  <span className="font-mono font-bold text-revix-primary">
                                    {activePendingItem.po.poNumber}
                                  </span>
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-[11px] font-bold text-revix-primary">
                                  {activePendingItem.variant?.sippCode || "ICAR"}
                                </span>
                                <p className="mt-1 font-semibold text-revix-accent">
                                  {isRtl ? "متبقي للاستلام:" : "Remaining:"}{" "}
                                  {activePendingItem.remainingCount} /{" "}
                                  {activePendingItem.item.quantity}
                                </p>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-revix-primary/15 flex items-center justify-between text-[11px] text-revix-secondary">
                              <span>
                                {isRtl ? "الفرع المستلم:" : "Branch:"}{" "}
                                <strong className="text-revix-dark font-medium">
                                  {activePendingItem.branchName}
                                </strong>
                              </span>
                              <span>
                                {isRtl ? "سعر الشراء للسيارة:" : "Unit Purchase Price:"}{" "}
                                <strong className="text-revix-dark font-medium font-mono">
                                  {activePendingItem.item.unitPrice.toLocaleString()}{" "}
                                  {activePendingItem.po.currency}
                                </strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-revix-warning/50 bg-revix-warning-soft/40 p-4 text-center">
                        <RevixIcon name="info" className="mx-auto h-6 w-6 text-revix-warning" />
                        <h4 className="mt-2 text-xs font-bold text-revix-dark">
                          {isRtl ? "لا توجد شحنات معلقة حالياً" : "No Pending Deliveries"}
                        </h4>
                        <p className="mt-1 text-xs text-revix-secondary">
                          {isRtl
                            ? "جميع أوامر الشراء الحالية مكتملة التوريد. يمكنك التبديل إلى 'تسجيل سيارة مباشرة بالأسطول' أو إنشاء أمر شراء جديد."
                            : "All current POs are fully received. Switch to 'Direct Registration' or create a new purchase order."}
                        </p>
                        <button
                          type="button"
                          onClick={() => setModalMode("direct")}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-3 py-1.5 text-xs font-semibold text-revix-white shadow-xs"
                        >
                          <RevixIcon name="plus" className="h-3.5 w-3.5" />
                          <span>{isRtl ? "التبديل إلى التسجيل المباشر" : "Switch to Direct Entry"}</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Direct Mode Selectors */
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-revix-dark mb-1">
                        {isRtl ? "الفرع المخصص" : "Branch"} *
                      </label>
                      <RevixSelect
                        size="sm"
                        isRtl={isRtl}
                        value={formBranchId}
                        onChange={(e) => setFormBranchId(e.target.value)}
                        buttonClassName="h-9 rounded-lg text-xs"
                        options={branches.map((b) => ({
                          value: b.id,
                          label: `${b.name} (${b.currencyCode})`,
                        }))}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-revix-dark mb-1">
                        {isRtl ? "فئة الموديل (الفريان)" : "Vehicle Variant"} *
                      </label>
                      <RevixSelect
                        size="sm"
                        isRtl={isRtl}
                        value={formVariantId}
                        onChange={(e) => setFormVariantId(e.target.value)}
                        placeholder={isRtl ? "اختر فئة السيارة..." : "Select Vehicle Variant..."}
                        buttonClassName="h-9 rounded-lg text-xs"
                        options={variants.map((v) => ({
                          value: v.id,
                          label: [v.make, v.model, v.trim].filter(Boolean).join(" "),
                        }))}
                      />
                    </div>
                  </div>
                )}

                {/* Common Physical Vehicle Inputs */}
                <div className="border-t border-revix-border pt-3 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-revix-dark">
                        {isRtl ? "رقم الشاسيه (VIN)" : "Chassis / VIN Number"} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formVin}
                        onChange={(e) => setFormVin(e.target.value.toUpperCase())}
                        placeholder="JTDKN3DU..."
                        className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-mono uppercase text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-revix-dark">
                        {isRtl ? "رقم اللوحة المعدنية" : "License Plate"} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formPlate}
                        onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                        placeholder="Cairo 1234 ABC..."
                        className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-mono text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-revix-dark">
                        {isRtl ? "اللون الفعلي" : "Color"} *
                      </label>
                      <input
                        type="text"
                        required
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-revix-dark">
                        {isRtl ? "رقم المفتاح" : "Key Number"}
                      </label>
                      <input
                        type="text"
                        value={formKeyNumber}
                        onChange={(e) => setFormKeyNumber(e.target.value)}
                        placeholder="KEY-01"
                        className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-mono text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-revix-dark">
                        {isRtl ? "قراءة العداد (كم)" : "Mileage (km)"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formMileage}
                        onChange={(e) => setFormMileage(Number(e.target.value))}
                        className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-mono text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                  </div>

                  {modalMode === "convert_po" && (
                    <div>
                      <label className="block text-xs font-semibold text-revix-dark">
                        {isRtl ? "ملاحظات الفحص والاستلام" : "Inspection & Receiving Notes"}
                      </label>
                      <input
                        type="text"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder={isRtl ? "فحص البودي سليم، استلام مفتاحين..." : "Body inspected, two keys received..."}
                        className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Sticky Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-revix-border bg-revix-surface/40 px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-revix-border bg-revix-white px-3.5 py-2 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || (modalMode === "convert_po" && pendingDeliveries.length === 0)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-4 py-2 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isSubmitting && (
                    <RevixIcon name="refresh-cw" className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>
                    {modalMode === "convert_po"
                      ? isRtl
                        ? "تحويل الشحنة إلى سيارة بالأسطول"
                        : "Convert to Fleet Asset"
                      : isRtl
                        ? "تسجيل السيارة بالأسطول مباشرة"
                        : "Register Vehicle Asset"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
