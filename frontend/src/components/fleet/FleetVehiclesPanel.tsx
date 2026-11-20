"use client";

import { useMemo, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  navigateToWorkspacePage,
  setPendingFleetReceiveContext,
  clearPendingFleetReceiveContext,
} from "@/store/slices/workspaceSlice";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import {
  useCreateVehicleMutation,
  useListVehiclesQuery,
  useListVariantsQuery,
  useListPurchaseOrdersQuery,
  useReceiveVehicleMutation,
  useUpdateVehicleStatusMutation,
  type FleetVehicleDto,
  type FleetVehicleStatus,
  type PurchaseOrderDto,
  type PurchaseOrderItemDto,
  type VehicleVariantDto,
} from "@/store/api/fleetApi";
import {
  useGetWorkspaceContextQuery,
  type BranchDto,
  type CompanyDto,
} from "@/store/api/workspaceApi";

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
    en: "Available & Ready",
    ar: "جاهزة ومتاحة للتأجير",
    badgeClass: "bg-revix-accent-soft text-revix-accent border-revix-accent/30",
    dotClass: "bg-revix-accent",
  },
  on_rent: {
    en: "On Rent",
    ar: "مؤجرة حاليًا",
    badgeClass: "bg-revix-info-soft text-revix-info border-revix-info/30",
    dotClass: "bg-revix-info",
  },
  maintenance: {
    en: "In Maintenance",
    ar: "في الصيانة والفحص",
    badgeClass: "bg-revix-warning-soft text-revix-warning border-revix-warning/30",
    dotClass: "bg-revix-warning",
  },
  reserved: {
    en: "Reserved",
    ar: "محجوزة",
    badgeClass: "bg-revix-primary/10 text-revix-primary border-revix-primary/30",
    dotClass: "bg-revix-primary",
  },
  out_of_service: {
    en: "Out of Service",
    ar: "خارج الخدمة",
    badgeClass: "bg-revix-alert-soft text-revix-alert border-revix-alert/30",
    dotClass: "bg-revix-alert",
  },
};

interface PendingDeliveryItem {
  id: string; // `${po.id}::${item.id}`
  po: PurchaseOrderDto;
  item: PurchaseOrderItemDto;
  variant?: VehicleVariantDto;
  remainingCount: number;
  branchName?: string;
}

export function FleetVehiclesPanel({
  isRtl,
  branches,
  activeBranch,
  company,
  onGoVariants,
  onGoPurchaseOrders,
}: FleetVehiclesPanelProps) {
  const isNetworkMain = company?.operatingMode === "network_main";
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranch?.id || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [includeNetwork, setIncludeNetwork] = useState(false);
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

  const { data, isLoading, refetch, isFetching } = useListVehiclesQuery({
    branchId: selectedBranchId !== "all" ? selectedBranchId : undefined,
    status: selectedStatus !== "all" ? (selectedStatus as FleetVehicleStatus) : undefined,
    search: search.trim() || undefined,
    includeNetwork: isNetworkMain && includeNetwork,
    page,
    pageSize,
  });

  const { data: variantsData } = useListVariantsQuery();
  const { data: poData, refetch: refetchPos } = useListPurchaseOrdersQuery({
    branchId: selectedBranchId !== "all" ? selectedBranchId : undefined,
  });

  const [createVehicle, { isLoading: isCreatingDirect }] = useCreateVehicleMutation();
  const [receiveVehicle, { isLoading: isReceivingPo }] = useReceiveVehicleMutation();
  const [updateStatus] = useUpdateVehicleStatusMutation();

  const vehicles = useMemo(() => data?.data ?? [], [data?.data]);
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

  const pendingOrders = useMemo(() => {
    return purchaseOrders
      .filter((po) => po.status === "approved" || po.status === "partially_received")
      .map((po) => {
        const totalQty = po.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
        const totalRcv = po.items?.reduce((sum, it) => sum + it.receivedCount, 0) || 0;
        const remaining = totalQty - totalRcv;
        const branch = branches.find((b) => b.id === po.branchId);
        return {
          po,
          totalQty,
          totalRcv,
          remaining,
          branchName: branch?.name || po.branchName,
        };
      })
      .filter((p) => p.remaining > 0);
  }, [purchaseOrders, branches]);

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
  const [formRegExpiry, setFormRegExpiry] = useState("");
  const [formInsExpiry, setFormInsExpiry] = useState("");
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
          branchId: target.po.branchId,
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
      setFormBranchId(item.po.branchId);
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
          registrationExpiry: formRegExpiry || null,
          insuranceExpiry: formInsExpiry || null,
          notes: formNotes.trim() || null,
        }).unwrap();

        setIsModalOpen(false);
      } catch (err: any) {
        setFormError(
          err?.data?.error?.message ||
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
          registrationExpiry: formRegExpiry || null,
          insuranceExpiry: formInsExpiry || null,
        }).unwrap();

        setIsModalOpen(false);
      } catch (err: any) {
        setFormError(
          err?.data?.error?.message ||
            (isRtl
              ? "تعذر تسجيل السيارة في الأسطول مباشرة."
              : "Failed to register vehicle asset directly."),
        );
      }
    }
  }

  const isSubmitting = isCreatingDirect || isReceivingPo;

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "سجل سيارات الأسطول" : "Fleet Vehicles Asset Register"}
            </h1>
          </div>
          <p className="mt-1 text-xs text-revix-secondary sm:text-sm">
            {isRtl
              ? "متابعة سيارات الأسطول، تحويل الشحنات الواردة من أوامر الشراء، وتسجيل الأصول وأرقام اللوحات والجاهزية التشغيلية."
              : "Manage fleet vehicles, convert incoming shipments from purchase orders, and register asset identifiers."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              refetch();
              refetchPos();
            }}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-medium text-revix-dark shadow-xs transition hover:bg-revix-surface active:scale-95 disabled:opacity-50 shrink-0"
            title={isRtl ? "تحديث البيانات" : "Refresh data"}
          >
            <RevixIcon
              name="refresh-cw"
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-revix-primary" : "text-revix-secondary"}`}
            />
            <span>{isRtl ? "تحديث" : "Refresh"}</span>
          </button>

          {pendingDeliveries.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenConvertModal()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-revix-primary/30 bg-revix-primary/5 px-3.5 text-xs font-semibold text-revix-primary shadow-xs transition hover:bg-revix-primary hover:text-revix-white active:scale-95 shrink-0"
            >
              <RevixIcon name="car-front" className="h-4 w-4" />
              <span>{isRtl ? "تحويل شحنة واردة" : "Convert Arriving PO"}</span>
              <span className="rounded-full bg-revix-primary text-revix-white px-1.5 py-0.2 text-[10px] font-bold">
                {pendingDeliveries.reduce((a, b) => a + b.remainingCount, 0)}
              </span>
            </button>
          )}

          {/* Primary Action: Add Vehicle to Fleet Assets */}
          {canCreateFleet && (
            <button
              type="button"
              onClick={handleOpenDirectModal}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-revix-primary px-4 text-xs font-semibold text-revix-white shadow-xs transition hover:bg-revix-primary-hover active:scale-95 shrink-0"
            >
              <RevixIcon name="plus" className="h-4 w-4" />
              <span>{isRtl ? "إضافة سيارة للأصول" : "Add Vehicle to Assets"}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "إجمالي الأسطول" : "Total Fleet Size"}
            </span>
            <div className="rounded-md bg-revix-surface p-1.5 text-revix-primary">
              <RevixIcon name="car-front" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "جاهزة ومتاحة" : "Available & Ready"}
            </span>
            <div className="rounded-md bg-revix-accent-soft p-1.5 text-revix-accent">
              <RevixIcon name="check-circle-2" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-accent">
            {stats.available}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "مؤجرة على الطريق" : "On Road (Rented)"}
            </span>
            <div className="rounded-md bg-revix-info-soft p-1.5 text-revix-info">
              <RevixIcon name="activity" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-info">
            {stats.onRent}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "في الصيانة" : "In Maintenance"}
            </span>
            <div className="rounded-md bg-revix-warning-soft p-1.5 text-revix-warning">
              <RevixIcon name="wrench" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-warning">
            {stats.maintenance}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <RevixIcon
              name="search"
              className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-secondary ${
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
              placeholder={isRtl ? "بحث برقم اللوحة، الشاسيه..." : "Search plate, VIN..."}
              className={`h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors ${
                isRtl ? "pr-8.5 pl-3" : "pl-8.5 pr-3"
              }`}
            />
          </div>

          {/* Branch Filter */}
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
                { value: "all", label: isRtl ? "جميع الفروع" : "All Branches" },
                ...branches.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.currencyCode})`,
                })),
              ]}
            />
          </div>

          {/* Network Partner Toggle for Main Network Companies */}
          {isNetworkMain && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-revix-border bg-revix-white px-2.5 py-1.5 text-xs font-semibold text-revix-secondary hover:bg-revix-surface">
              <input
                type="checkbox"
                checked={includeNetwork}
                onChange={(e) => {
                  setIncludeNetwork(e.target.checked);
                  setPage(1);
                }}
                className="h-3.5 w-3.5 accent-revix-primary"
              />
              <RevixIcon name="network" className="h-3.5 w-3.5 text-revix-primary" />
              <span>
                {isRtl ? "عرض سيارات الشركاء (شبكة الشركات)" : "Include Partner Fleet"}
              </span>
            </label>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setSelectedStatus("all");
              setPage(1);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              selectedStatus === "all"
                ? "bg-revix-primary text-revix-white"
                : "border border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
            }`}
          >
            {isRtl ? "الكل" : "All"} ({vehicles.length})
          </button>
          {(
            ["available", "on_rent", "maintenance", "reserved", "out_of_service"] as FleetVehicleStatus[]
          ).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setSelectedStatus(st);
                setPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                selectedStatus === st
                  ? "bg-revix-primary text-revix-white"
                  : "border border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
              }`}
            >
              {isRtl ? VEHICLE_STATUS_CONFIG[st].ar : VEHICLE_STATUS_CONFIG[st].en}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Grid */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-revix-border bg-revix-white text-xs text-revix-secondary">
          <RevixIcon name="refresh-cw" className="mr-2 h-4 w-4 animate-spin text-revix-primary" />
          {isRtl ? "جاري تحميل سجل أسطول السيارات..." : "Loading fleet vehicles register..."}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-revix-border bg-revix-white p-10 text-center">
          <div className="rounded-full bg-revix-surface p-3 text-revix-secondary">
            <RevixIcon name="car-front" className="h-8 w-8" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-revix-dark">
            {isRtl ? "لا توجد سيارات مسجلة في الأسطول" : "No vehicles registered in fleet"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-revix-secondary">
            {isRtl
              ? "يمكنك تحويل شحنة واردة من أوامر الشراء (PO) لتصبح سيارة بالأسطول، أو تسجيل سيارة مباشرة."
              : "Convert an arrived vehicle from an approved purchase order, or register an existing vehicle directly."}
          </p>
          {canCreateFleet && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenConvertModal()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 py-1.5 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover"
              >
                <RevixIcon name="car-front" className="h-3.5 w-3.5" />
                <span>{isRtl ? "تحويل سيارة واردة للأسطول" : "Receive & Convert to Fleet"}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenDirectModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3.5 py-1.5 text-xs font-semibold text-revix-dark shadow-xs hover:bg-revix-surface"
              >
                <RevixIcon name="plus" className="h-3.5 w-3.5 text-revix-secondary" />
                <span>{isRtl ? "تسجيل سيارة مباشرة" : "Direct Register"}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedVehicles.map((vh) => {
              const statusConfig =
                VEHICLE_STATUS_CONFIG[vh.status] || VEHICLE_STATUS_CONFIG.available;
              const variant = vh.variant;

              return (
                <div
                  key={vh.id}
                  className="flex flex-col justify-between rounded-xl border border-revix-border bg-revix-white p-4 shadow-xs transition hover:border-revix-primary/40 hover:shadow-sm"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md border border-revix-border bg-revix-surface px-2 py-0.5 font-mono text-xs font-bold text-revix-dark">
                          {vh.licensePlate}
                        </span>
                        {vh.isPartnerVehicle && (
                          <span className="rounded-md bg-revix-info-soft px-1.5 py-0.5 text-[10px] font-semibold text-revix-info">
                            {isRtl ? "شريك محلي" : "Partner Asset"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusConfig.badgeClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`} />
                          <span>{isRtl ? statusConfig.ar : statusConfig.en}</span>
                        </span>
                      </div>
                    </div>

                    {/* Make & Model */}
                    <div className="mt-3">
                      <h3 className="text-base font-bold text-revix-dark">
                        {variant ? `${variant.make} ${variant.model}` : "Fleet Vehicle"}{" "}
                        <span className="font-normal text-revix-secondary">
                          {variant?.modelYear}
                        </span>
                      </h3>
                      <p className="text-xs text-revix-secondary">
                        {variant?.trim} • {vh.color}{" "}
                        {vh.keyNumber ? `• Key: ${vh.keyNumber}` : ""}
                      </p>
                    </div>

                    {/* VIN Monospace */}
                    <div className="mt-3 flex items-center justify-between rounded-md bg-revix-surface/70 px-2.5 py-1.5 font-mono text-[11px] text-revix-secondary">
                      <span className="text-[10px] text-revix-muted">VIN:</span>
                      <span className="font-semibold text-revix-dark select-all">
                        {vh.vin}
                      </span>
                    </div>

                    {/* Specs & Branch */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="block text-[10px] text-revix-muted">
                          {isRtl ? "الفرع المخصص" : "Branch"}
                        </span>
                        <span className="font-semibold text-revix-dark">
                          {vh.branchName || "Branch"}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] text-revix-muted">
                          {isRtl ? "العداد الحالي" : "Odometer"}
                        </span>
                        <span className="font-semibold text-revix-dark font-mono">
                          {vh.mileageOdometer.toLocaleString()} {isRtl ? "كم" : "km"}
                        </span>
                      </div>
                    </div>

                    {/* Vehicle Model Specifications */}
                    {variant && (
                      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-lg bg-revix-surface/60 p-2 text-center text-[10px]">
                        <div>
                          <span className="block text-revix-muted">
                            {isRtl ? "ناقل الحركة" : "Trans"}
                          </span>
                          <span className="font-semibold text-revix-dark capitalize">
                            {variant.transmission === "automatic"
                              ? isRtl
                                ? "أوتوماتيك"
                                : "Auto"
                              : isRtl
                                ? "يدوي"
                                : "Manual"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-revix-muted">
                            {isRtl ? "الوقود" : "Fuel"}
                          </span>
                          <span className="font-semibold text-revix-dark capitalize">
                            {variant.fuelType === "petrol"
                              ? isRtl
                                ? "بنزين"
                                : "Petrol"
                              : variant.fuelType === "diesel"
                                ? isRtl
                                  ? "ديزل"
                                  : "Diesel"
                                : variant.fuelType}
                          </span>
                        </div>
                        <div>
                          <span className="block text-revix-muted">
                            {isRtl ? "كود SIPP" : "SIPP"}
                          </span>
                          <span className="font-mono font-bold text-revix-primary">
                            {variant.sippCode}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Toggle Dropdown */}
                  {!vh.isPartnerVehicle && (
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-revix-border/60 pt-3 text-xs">
                      <span className="text-revix-muted shrink-0">
                        {isRtl ? "تغيير الحالة:" : "Quick Status:"}
                      </span>
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
                          buttonClassName="h-7 rounded-md text-[11px] font-semibold"
                          options={[
                            { value: "available", label: isRtl ? "جاهزة" : "Available" },
                            { value: "on_rent", label: isRtl ? "مؤجرة" : "On Rent" },
                            { value: "maintenance", label: isRtl ? "صيانة" : "Maintenance" },
                            { value: "reserved", label: isRtl ? "محجوزة" : "Reserved" },
                            { value: "out_of_service", label: isRtl ? "خارج الخدمة" : "Out of Service" },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Unified Pagination */}
          <div className="overflow-hidden rounded-xl border border-revix-border bg-revix-white shadow-2xs">
            <RevixPagination
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
                    setFormBranchId(pendingDeliveries[0]!.po.branchId);
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
                                    ? `${activePendingItem.variant.make} ${activePendingItem.variant.model} ${activePendingItem.variant.modelYear} (${activePendingItem.variant.trim})`
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
                          label: `${v.make} ${v.model} (${v.trim})`,
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-revix-dark mb-1">
                        {isRtl ? "انتهاء رخصة السير" : "Registration Expiry"}
                      </label>
                      <RevixDatePicker
                        size="sm"
                        isRtl={isRtl}
                        value={formRegExpiry}
                        onChange={(val) => setFormRegExpiry(val)}
                        placeholder={isRtl ? "تاريخ انتهاء الرخصة..." : "Registration expiry..."}
                        buttonClassName="h-9 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-revix-dark mb-1">
                        {isRtl ? "انتهاء التأمين" : "Insurance Expiry"}
                      </label>
                      <RevixDatePicker
                        size="sm"
                        isRtl={isRtl}
                        value={formInsExpiry}
                        onChange={(val) => setFormInsExpiry(val)}
                        placeholder={isRtl ? "تاريخ انتهاء التأمين..." : "Insurance expiry..."}
                        buttonClassName="h-9 rounded-lg text-xs"
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
