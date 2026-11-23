"use client";

import { DataTable } from "@/components/ui/DataTable";
import { useMemo, useState, type FormEvent } from "react";
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
  const { data: driversData } = useListDriversQuery();
  const [dispatchMovement, { isLoading }] = useDispatchMovementMutation();

  const vehicles = useMemo(
    () => (vehiclesData?.data ?? []).filter((v) => !v.isPartnerVehicle && v.status !== "on_rent"),
    [vehiclesData?.data],
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
          <RevixSelect
            size="sm"
            isRtl={isRtl}
            value={vehicleId}
            onChange={(e) => {
              setSelectedVehicleId(e.target.value);
              setOdoOverride(null);
            }}
            buttonClassName="h-9 rounded-lg text-xs"
            options={vehicles.map((v) => ({
              value: v.id,
              label: `${v.variant ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}` : "Vehicle"} • ${v.licensePlate} (${v.branchName || v.companyName || (isRtl ? "مخزون الشركة" : "Company Stock")})`,
            }))}
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

  const movements = useMemo(() => data?.data ?? [], [data?.data]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [receivingRow, setReceivingRow] = useState<VehicleMovementDto | null>(null);
  const [arrivalOdometerKm, setArrivalOdometerKm] = useState(0);
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveError, setReceiveError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return movements;
    return movements.filter((m) => m.status === statusFilter);
  }, [movements, statusFilter]);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-revix-border bg-white px-4 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", ar: "الكل", en: "All", count: movements.length },
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
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === t.id
                  ? "border-revix-primary bg-revix-primary text-white"
                  : "border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
              }`}
            >
              <span>{isRtl ? t.ar : t.en}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                  statusFilter === t.id
                    ? "bg-white/20 text-white"
                    : "bg-revix-surface text-revix-muted"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <Button
          onClick={() => setIsDispatchOpen(true)}
          className="h-9 px-3.5 text-xs font-semibold"
        >
          {isRtl ? "+ حركة / نقل سيارة" : "+ Dispatch Movement"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-revix-border bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <DataTable className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold uppercase tracking-wider text-revix-muted">
                <th className="px-4 py-3 text-start">{isRtl ? "رقم الحركة" : "Movement #"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "السيارة" : "Vehicle"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "المسار" : "Route"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "السواق" : "Driver"}</th>
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
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-revix-muted">
                    {isRtl ? "لا توجد حركات مسجلة" : "No movements recorded."}
                  </td>
                </tr>
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
                      <div className="mt-0.5 inline-block rounded border border-revix-border bg-revix-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-revix-secondary" dir="ltr">
                        {m.vehiclePlate || "—"}
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
        </div>
      </div>

      <DispatchMovementModal
        isOpen={isDispatchOpen}
        isRtl={isRtl}
        onClose={() => setIsDispatchOpen(false)}
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
