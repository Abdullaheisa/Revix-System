"use client";

import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { StudioModal } from "@/components/shared/workspace";
import { RevixSelect } from "@/components/ui/RevixSelect";
import {
  useCancelMovementMutation,
  useDispatchMovementMutation,
  useListDriversQuery,
  useListMovementsQuery,
  useListVehiclesQuery,
  useReceiveMovementMutation,
  type FleetVehicleDto,
  type VehicleMovementDto,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery, type BranchDto } from "@/store/api/workspaceApi";
import { formatCompanyDateTime } from "@/lib/date/companyDate";
import { getApiErrorMessage } from "@/lib/api/errors";

function VehicleColumnSelect({
  isRtl,
  vehicles,
  value,
  onChange,
}: {
  isRtl: boolean;
  vehicles: FleetVehicleDto[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selected = useMemo(
    () => vehicles.find((v) => v.id === value) ?? null,
    [vehicles, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      const model = v.variant
        ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`.toLowerCase()
        : "";
      return (
        (v.assetCode && v.assetCode.toLowerCase().includes(q)) ||
        v.licensePlate.toLowerCase().includes(q) ||
        model.includes(q) ||
        (v.branchName && v.branchName.toLowerCase().includes(q))
      );
    });
  }, [vehicles, query]);

  const selectedModel = selected?.variant
    ? `${selected.variant.make} ${selected.variant.model} ${selected.variant.modelYear}`
    : "";

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-revix-border bg-white px-3 text-xs hover:border-revix-primary focus:border-revix-primary focus:outline-hidden"
      >
        {selected ? (
          <div className="flex min-w-0 items-center gap-2">
            <span
              dir="ltr"
              className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-revix-primary"
            >
              {selected.assetCode || "—"}
            </span>
            <span className="truncate font-semibold text-revix-dark">{selectedModel}</span>
            <span
              dir="ltr"
              className="shrink-0 rounded border border-revix-border bg-revix-surface px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-revix-secondary"
            >
              {selected.licensePlate}
            </span>
            <span className="hidden sm:inline-block shrink-0 text-[11px] text-revix-secondary">
              · {selected.branchName || (isRtl ? "مخزون الشركة" : "Company Stock")}
            </span>
          </div>
        ) : (
          <span className="text-revix-muted">
            {isRtl ? "اختر السيارة..." : "Select vehicle..."}
          </span>
        )}
        <RevixIcon name={isOpen ? "chevron-up" : "chevron-down"} size={14} className="shrink-0 text-revix-secondary" />
      </button>

      {isOpen && (
        <div className="absolute start-0 end-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-revix-border bg-white shadow-xl">
          <div className="border-b border-revix-border p-2">
            <div className="relative">
              <RevixIcon
                name="search"
                size={13}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-revix-muted start-2.5"
              />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isRtl ? "ابحث برقم الأصل أو اللوحة أو الموديل..." : "Search Asset ID, plate, model..."}
                className="h-8 w-full rounded-md border border-revix-border bg-revix-surface/40 ps-8 pe-3 text-xs focus:border-revix-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div className="max-h-[214px] overflow-y-auto">
            <div className="sticky top-0 grid h-8 grid-cols-12 items-center gap-2 border-b border-revix-border bg-revix-surface px-3 text-[10.5px] font-bold uppercase text-revix-secondary">
              <div className="col-span-2">Asset ID</div>
              <div className="col-span-4">{isRtl ? "الموديل" : "Model"}</div>
              <div className="col-span-3">{isRtl ? "اللوحة" : "Plate"}</div>
              <div className="col-span-3">{isRtl ? "الموقع" : "Location"}</div>
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-revix-secondary">
                {isRtl ? "لا توجد سيارات مطابقة" : "No matching vehicles"}
              </div>
            ) : (
              filtered.map((v) => {
                const modelLabel = v.variant
                  ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`
                  : "—";
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onChange(v.id);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`grid h-9 w-full cursor-pointer grid-cols-12 items-center gap-2 border-b border-revix-border/40 px-3 text-start text-xs transition-colors hover:bg-emerald-50/70 ${
                      v.id === value ? "bg-emerald-50 font-semibold" : ""
                    }`}
                  >
                    <div className="col-span-2 font-mono font-bold text-revix-primary" dir="ltr">
                      <span className="inline-block">{v.assetCode || "—"}</span>
                    </div>
                    <div className="col-span-4 truncate font-semibold text-revix-dark">
                      {modelLabel}
                    </div>
                    <div className="col-span-3 truncate font-mono font-semibold text-revix-dark" dir="ltr">
                      <span className="inline-block">{v.licensePlate}</span>
                    </div>
                    <div className="col-span-3 truncate text-revix-secondary">
                      {v.branchName || (isRtl ? "مخزون الشركة" : "Company Stock")}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface DispatchMovementModalProps {
  isOpen: boolean;
  isRtl: boolean;
  initialVehicle?: FleetVehicleDto | null;
  onClose: () => void;
}

export function DispatchMovementModal({
  isOpen,
  isRtl,
  initialVehicle,
  onClose,
}: DispatchMovementModalProps) {
  const { data: ctx } = useGetWorkspaceContextQuery();
  const branches: BranchDto[] = useMemo(() => ctx?.data?.branches ?? [], [ctx?.data?.branches]);
  const { data: vehiclesData } = useListVehiclesQuery();
  const { data: movementsData } = useListMovementsQuery();
  const { data: driversData } = useListDriversQuery();
  const [dispatchMovement, { isLoading }] = useDispatchMovementMutation();

  const inTransitVehicleIds = useMemo(
    () =>
      new Set(
        (movementsData?.data ?? [])
          .filter((m) => m.status === "in_transit")
          .map((m) => m.vehicleId),
      ),
    [movementsData?.data],
  );

  const vehicles = useMemo(
    () =>
      (vehiclesData?.data ?? []).filter(
        (v) =>
          !v.isPartnerVehicle &&
          v.status !== "on_rent" &&
          (!inTransitVehicleIds.has(v.id) || v.id === initialVehicle?.id),
      ),
    [vehiclesData?.data, inTransitVehicleIds, initialVehicle?.id],
  );
  const drivers = useMemo(
    () => (driversData?.data ?? []).filter((d) => d.status === "active"),
    [driversData?.data],
  );

  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicle?.id || "");
  const vehicleId = selectedVehicleId || initialVehicle?.id || vehicles[0]?.id || "";
  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? initialVehicle ?? null,
    [vehicles, vehicleId, initialVehicle],
  );

  const targetBranches = useMemo(
    () => branches.filter((b) => b.id !== activeVehicle?.branchId),
    [branches, activeVehicle?.branchId],
  );
  const [toBranchId, setToBranchId] = useState("");
  const effectiveToBranchId = toBranchId || targetBranches[0]?.id || "";
  const [driverId, setDriverId] = useState("");
  const effectiveDriverId = driverId || drivers[0]?.id || "";
  const [odoOverride, setOdoOverride] = useState<number | null>(null);
  const dispatchOdometerKm = odoOverride ?? activeVehicle?.mileageOdometer ?? 0;
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!vehicleId || !effectiveToBranchId || !effectiveDriverId) {
      setErrorMsg(
        isRtl ? "اختر السيارة والفرع المستلم والسواق." : "Select vehicle, destination branch, and driver.",
      );
      return;
    }
    try {
      await dispatchMovement({
        vehicleId,
        toBranchId: effectiveToBranchId,
        driverId: effectiveDriverId,
        dispatchOdometerKm,
        notes: notes || null,
      }).unwrap();
      setOdoOverride(null);
      setNotes("");
      onClose();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err) ?? (isRtl ? "تعذر تسجيل الحركة" : "Failed to dispatch movement."));
    }
  };

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      title={isRtl ? "حركة / نقل سيارة لفرع" : "Dispatch Vehicle Movement"}
    >
      {errorMsg && <Alert variant="error" message={errorMsg} className="mb-3" />}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-revix-dark">
            {isRtl ? "السيارة *" : "Vehicle *"}
          </label>
          <VehicleColumnSelect
            isRtl={isRtl}
            vehicles={vehicles}
            value={vehicleId}
            onChange={(nextId) => {
              setSelectedVehicleId(nextId);
              setOdoOverride(null);
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-revix-dark">
              {isRtl ? "الفرع المستلم *" : "Destination Branch *"}
            </label>
            <RevixSelect
              size="sm"
              isRtl={isRtl}
              value={effectiveToBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              placeholder={isRtl ? "اختر الفرع..." : "Select branch..."}
              buttonClassName="h-9 rounded-lg text-xs"
              options={targetBranches.map((b) => ({
                value: b.id,
                label: b.name,
              }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-revix-dark">
              {isRtl ? "السواق *" : "Driver *"}
            </label>
            <RevixSelect
              size="sm"
              isRtl={isRtl}
              value={effectiveDriverId}
              onChange={(e) => setDriverId(e.target.value)}
              placeholder={isRtl ? "اختر السواق..." : "Select driver..."}
              buttonClassName="h-9 rounded-lg text-xs"
              options={drivers.map((d) => ({
                value: d.id,
                label: `${d.fullName} (${d.phonePrimary})`,
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormInput
            type="number"
            min={0}
            label={isRtl ? "عداد الخروج (كم) *" : "Dispatch Odometer (km) *"}
            value={dispatchOdometerKm}
            onChange={(e) => setOdoOverride(Number(e.target.value) || 0)}
            required
          />
          <FormInput
            label={isRtl ? "ملاحظات" : "Notes"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {isRtl ? "إلغاء" : "Cancel"}
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isRtl ? "تأكيد الخروج" : "Dispatch"}
          </Button>
        </div>
      </form>
    </StudioModal>
  );
}

export interface FleetMovementsPanelProps {
  isRtl: boolean;
}

export function FleetMovementsPanel({ isRtl }: FleetMovementsPanelProps) {
  const { data: ctx } = useGetWorkspaceContextQuery();
  const company = ctx?.data?.company ?? undefined;
  const membership = ctx?.data?.membership ?? null;
  const canReceiveBranch = (toBranchId: string) =>
    !membership ||
    membership.scopeType !== "assigned_branches" ||
    membership.branchIds.includes(toBranchId);
  const { data, isLoading } = useListMovementsQuery();
  const [receiveMovement, { isLoading: isReceiving }] = useReceiveMovementMutation();
  const [cancelMovement] = useCancelMovementMutation();

  const { data: vehiclesData } = useListVehiclesQuery();
  const movements = useMemo(() => data?.data ?? [], [data?.data]);
  const inTransitVehicleIds = useMemo(
    () =>
      new Set(
        movements.filter((m) => m.status === "in_transit").map((m) => m.vehicleId),
      ),
    [movements],
  );
  const companyStockVehicles = useMemo(
    () =>
      (vehiclesData?.data ?? []).filter(
        (v) =>
          !v.isPartnerVehicle &&
          !v.branchId &&
          v.status !== "on_rent" &&
          !inTransitVehicleIds.has(v.id),
      ),
    [vehiclesData?.data, inTransitVehicleIds],
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [dispatchInitialVehicle, setDispatchInitialVehicle] = useState<FleetVehicleDto | null>(null);
  const [receivingRow, setReceivingRow] = useState<VehicleMovementDto | null>(null);
  const [arrivalOdometerKm, setArrivalOdometerKm] = useState(0);
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveError, setReceiveError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return movements.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.movementNumber.toLowerCase().includes(q) ||
        (m.vehicleAssetCode && m.vehicleAssetCode.toLowerCase().includes(q)) ||
        (m.vehiclePlate && m.vehiclePlate.toLowerCase().includes(q)) ||
        (m.vehicleName && m.vehicleName.toLowerCase().includes(q)) ||
        (m.driverName && m.driverName.toLowerCase().includes(q))
      );
    });
  }, [movements, statusFilter, searchQuery]);

  const filteredCompanyStock = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return companyStockVehicles;
    return companyStockVehicles.filter((v) => {
      const model = v.variant
        ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`.toLowerCase()
        : "";
      return (
        (v.assetCode && v.assetCode.toLowerCase().includes(q)) ||
        v.licensePlate.toLowerCase().includes(q) ||
        model.includes(q)
      );
    });
  }, [companyStockVehicles, searchQuery]);

  const openReceive = (m: VehicleMovementDto) => {
    setReceivingRow(m);
    setArrivalOdometerKm(m.dispatchOdometerKm);
    setReceiveNotes("");
    setReceiveError(null);
  };

  const handleReceive = async (e: FormEvent) => {
    e.preventDefault();
    if (!receivingRow) return;
    setReceiveError(null);
    try {
      await receiveMovement({
        id: receivingRow.id,
        arrivalOdometerKm,
        notes: receiveNotes || null,
      }).unwrap();
      setReceivingRow(null);
    } catch (err) {
      setReceiveError(getApiErrorMessage(err) ?? (isRtl ? "تعذر تسجيل الاستلام" : "Failed to receive vehicle."));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "حركة ونقل السيارات" : "Vehicle Movements"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {movements.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <RevixIcon
              name="search"
              size={14}
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isRtl
                  ? "بحث برقم الأصل، اللوحة، رقم الحركة..."
                  : "Search Asset ID, plate, movement #..."
              }
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setDispatchInitialVehicle(null);
              setIsDispatchOpen(true);
            }}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "حركة / نقل سيارة" : "Dispatch Movement"}</span>
          </button>
        </div>
      </div>

      {companyStockVehicles.length > 0 && statusFilter !== "company_stock" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/70 bg-amber-50/70 px-4 py-2.5 text-xs shrink-0">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-200 px-1.5 font-mono text-[11px] font-bold text-amber-950">
              {companyStockVehicles.length}
            </span>
            <span>
              {isRtl
                ? "سيارة في مخزون الشركة لم يتم نقلها لفرع بعد."
                : "vehicle(s) in Company Stock waiting to be dispatched to a branch."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter("company_stock")}
            className="cursor-pointer rounded-lg border border-amber-400 bg-white px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
          >
            {isRtl ? "عرض مخزون الشركة" : "View Company Stock"}
          </button>
        </div>
      )}

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-revix-border">
        {[
          { id: "all", ar: "الكل", en: "All", count: movements.length },
          {
            id: "company_stock",
            ar: "مخزون الشركة (بانتظار النقل)",
            en: "Company Stock (Pending)",
            count: companyStockVehicles.length,
          },
          {
            id: "in_transit",
            ar: "في الطريق",
            en: "In Transit",
            count: movements.filter((m) => m.status === "in_transit").length,
          },
          {
            id: "received",
            ar: "تم الاستلام",
            en: "Received",
            count: movements.filter((m) => m.status === "received").length,
          },
          {
            id: "cancelled",
            ar: "ملغي",
            en: "Cancelled",
            count: movements.filter((m) => m.status === "cancelled").length,
          },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setStatusFilter(t.id)}
            className={`cursor-pointer shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-xs transition-colors ${
              statusFilter === t.id
                ? "border-revix-primary font-semibold text-revix-primary"
                : "border-transparent text-revix-secondary hover:text-revix-dark"
            }`}
          >
            {isRtl ? t.ar : t.en} ({t.count})
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
        {statusFilter === "company_stock" ? (
          <DataTable fitAvailableHeight className="text-xs">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                <th scope="col" className="sticky top-0 z-10 whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">Asset ID</th>
                <th scope="col" className="sticky top-0 z-10 whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "السيارة / الموديل" : "Vehicle / Model"}</th>
                <th scope="col" className="sticky top-0 z-10 whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "رقم اللوحة" : "Plate"}</th>
                <th scope="col" className="sticky top-0 z-10 whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "اللون" : "Color"}</th>
                <th scope="col" className="sticky top-0 z-10 whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "العداد" : "Odometer"}</th>
                <th scope="col" className="sticky top-0 z-10 whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الموقع الحالي" : "Current Location"}</th>
                <th scope="col" className="sticky top-0 z-10 whitespace-nowrap bg-revix-surface px-3 py-3 text-end font-semibold">{isRtl ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/60">
              {filteredCompanyStock.length === 0 ? (
                <TableEmptyRow
                  colSpan={7}
                  title={isRtl ? "لا توجد سيارات في مخزون الشركة" : "No vehicles in Company Stock"}
                  description={
                    isRtl
                      ? "تم نقل جميع السيارات إلى الفروع."
                      : "All vehicles have been dispatched to branches."
                  }
                />
              ) : (
                filteredCompanyStock.map((v) => {
                  const modelTitle = v.variant
                    ? `${v.variant.make} ${v.variant.model} ${v.variant.trim} ${v.variant.modelYear}`.replace(/\s+/g, " ").trim()
                    : "—";
                  return (
                    <tr key={v.id} className="hover:bg-revix-surface/35">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          dir="ltr"
                          className="inline-block rounded bg-revix-accent-soft px-2 py-0.5 font-mono text-xs font-bold text-revix-primary"
                        >
                          {v.assetCode || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-bold text-revix-dark">{modelTitle}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          dir="ltr"
                          className="inline-block rounded border border-revix-border bg-revix-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-revix-dark"
                        >
                          {v.licensePlate}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-revix-secondary">{v.color || "—"}</td>
                      <td className="px-3 py-3 font-mono text-revix-dark">
                        {Number(v.mileageOdometer || 0).toLocaleString()} km
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                          {isRtl ? "مخزون الشركة" : "Company Stock"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-end">
                        <button
                          type="button"
                          onClick={() => {
                            setDispatchInitialVehicle(v);
                            setIsDispatchOpen(true);
                          }}
                          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-revix-primary px-3 text-xs font-semibold text-white hover:bg-revix-primary-hover transition-colors"
                        >
                          <RevixIcon name="plus" size={12} />
                          <span>{isRtl ? "نقل لفرع" : "Dispatch"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </DataTable>
        ) : (
        <DataTable fitAvailableHeight className="text-xs">
          <thead>
            <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "رقم الحركة" : "Movement #"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "السيارة" : "Vehicle"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "المسار" : "Route"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "السواق" : "Driver"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "العداد" : "Odometer"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "الموظفون" : "Staff"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                <th className="px-4 py-3 text-end">{isRtl ? "إجراء" : "Action"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-revix-muted">
                    {isRtl ? "جاري التحميل..." : "Loading..."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <TableEmptyRow
                  colSpan={8}
                  title={isRtl ? "لا توجد حركات مسجلة" : "No movements recorded"}
                  description={
                    isRtl
                      ? "ستظهر هنا حركات تسليم واستلام ونقل المركبات بمجرد تسجيلها."
                      : "Vehicle dispatch, handover, and transfer movements will appear here."
                  }
                />
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-revix-surface/35">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-revix-primary" dir="ltr">
                        <span className="inline-block">{m.movementNumber}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-revix-muted" dir="ltr">
                        <span className="inline-block">{formatCompanyDateTime(m.dispatchedAt, company)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-revix-dark">{m.vehicleName || "—"}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {m.vehicleAssetCode && (
                          <span
                            className="inline-block rounded bg-revix-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-bold text-revix-primary"
                            dir="ltr"
                          >
                            {m.vehicleAssetCode}
                          </span>
                        )}
                        <span
                          className="inline-block rounded border border-revix-border bg-revix-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-revix-secondary"
                          dir="ltr"
                        >
                          {m.vehiclePlate || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 font-semibold text-revix-dark">
                        <span className="rounded bg-revix-surface px-2 py-0.5 text-[11px] border border-revix-border/70">
                          {m.fromBranchName || (isRtl ? "مخزون الشركة" : "Company Stock")}
                        </span>
                        <span className="text-revix-muted font-bold">
                          {isRtl ? "←" : "→"}
                        </span>
                        <span className="rounded bg-revix-primary/10 px-2 py-0.5 text-[11px] text-revix-primary font-bold">
                          {m.toBranchName || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-revix-dark">{m.driverName || "—"}</div>
                      {m.driverPhone && (
                        <div className="mt-0.5 font-mono text-[11px] text-revix-muted" dir="ltr">
                          <span className="inline-block">{m.driverPhone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px]">
                      <div className="flex items-center gap-1 text-revix-dark">
                        <span className="font-sans text-[10px] text-revix-muted">
                          {isRtl ? "خروج:" : "Out:"}
                        </span>
                        <span dir="ltr" className="font-semibold">
                          {m.dispatchOdometerKm.toLocaleString()} {isRtl ? "كم" : "km"}
                        </span>
                      </div>
                      {m.arrivalOdometerKm != null && (
                        <div className="mt-0.5 flex items-center gap-1 text-emerald-700">
                          <span className="font-sans text-[10px]">
                            {isRtl ? "وصول:" : "In:"}
                          </span>
                          <span dir="ltr" className="font-semibold">
                            {m.arrivalOdometerKm.toLocaleString()} {isRtl ? "كم" : "km"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[11px]">
                      <div className="flex items-center gap-1 text-revix-secondary">
                        <span className="text-revix-muted">{isRtl ? "إرسال:" : "Out:"}</span>
                        <span className="font-semibold text-revix-dark">{m.dispatchedByUserName || "—"}</span>
                      </div>
                      {m.receivedByUserName && (
                        <div className="mt-0.5 flex items-center gap-1 text-emerald-700">
                          <span>{isRtl ? "استلام:" : "In:"}</span>
                          <span className="font-semibold">{m.receivedByUserName}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          m.status === "received"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : m.status === "in_transit"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {m.status === "received"
                          ? isRtl
                            ? "تم الاستلام"
                            : "Received"
                          : m.status === "in_transit"
                            ? isRtl
                              ? "في الطريق"
                              : "In Transit"
                            : isRtl
                              ? "ملغي"
                              : "Cancelled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      {m.status === "in_transit" && canReceiveBranch(m.toBranchId) ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Button onClick={() => openReceive(m)}>
                            {isRtl ? "استلام بالفرع" : "Receive"}
                          </Button>
                          <button
                            type="button"
                            onClick={() => cancelMovement(m.id)}
                            className="cursor-pointer rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          >
                            {isRtl ? "إلغاء" : "Cancel"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-revix-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        )}
      </div>

      <DispatchMovementModal
        key={dispatchInitialVehicle?.id ?? "new"}
        isOpen={isDispatchOpen}
        isRtl={isRtl}
        initialVehicle={dispatchInitialVehicle}
        onClose={() => {
          setIsDispatchOpen(false);
          setDispatchInitialVehicle(null);
        }}
      />

      <StudioModal
        isOpen={Boolean(receivingRow)}
        onClose={() => setReceivingRow(null)}
        maxWidthClass="max-w-md"
        title={
          receivingRow
            ? `${isRtl ? "استلام بالفرع:" : "Receive at Branch:"} ${receivingRow.toBranchName || ""}`
            : ""
        }
      >
        {receiveError && <Alert variant="error" message={receiveError} className="mb-3" />}
        <form onSubmit={handleReceive} className="space-y-3">
          <FormInput
            type="number"
            min={receivingRow?.dispatchOdometerKm ?? 0}
            label={isRtl ? "عداد الوصول (كم) *" : "Arrival Odometer (km) *"}
            value={arrivalOdometerKm}
            onChange={(e) => setArrivalOdometerKm(Number(e.target.value) || 0)}
            required
          />
          <FormInput
            label={isRtl ? "ملاحظات الاستلام" : "Receipt Notes"}
            value={receiveNotes}
            onChange={(e) => setReceiveNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setReceivingRow(null)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" isLoading={isReceiving}>
              {isRtl ? "تأكيد الاستلام" : "Confirm Receipt"}
            </Button>
          </div>
        </form>
      </StudioModal>
    </div>
  );
}
