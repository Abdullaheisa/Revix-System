"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { StudioModal } from "@/components/shared/workspace";
import {
  useListVehiclesQuery,
  useUpdateVehicleMutation,
  type FleetVehicleDto,
} from "@/store/api/fleetApi";
import { extractApiErrorCode } from "@/store/api/baseApi";

export interface PriceListPanelProps {
  isRtl: boolean;
  branchId?: string;
  baseCurrency?: string;
}

export function PriceListPanel({
  isRtl,
  branchId,
  baseCurrency = "EGP",
}: PriceListPanelProps) {
  const { data: vehiclesResp, isLoading } = useListVehiclesQuery(
    branchId ? { branchId } : undefined,
  );
  const [updateVehicle, { isLoading: isUpdating }] =
    useUpdateVehicleMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicleDto | null>(
    null,
  );
  const [dailyRate1to2, setDailyRate1to2] = useState<number>(0);
  const [dailyRate3to7, setDailyRate3to7] = useState<number>(0);
  const [dailyRate8to30, setDailyRate8to30] = useState<number>(0);
  const [damageExcess, setDamageExcess] = useState<number>(0);
  const [formError, setFormError] = useState<string | undefined>();

  const vehicles = vehiclesResp?.data ?? [];

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        (v.licensePlate ?? "").toLowerCase().includes(q) ||
        (v.vin ?? "").toLowerCase().includes(q),
    );
  }, [vehicles, searchQuery]);

  function openEditModal(vehicle: FleetVehicleDto) {
    setEditingVehicle(vehicle);
    setDailyRate1to2(Number(vehicle.dailyRate1to2 ?? 0));
    setDailyRate3to7(Number(vehicle.dailyRate3to7 ?? 0));
    setDailyRate8to30(Number(vehicle.dailyRate8Plus ?? 0));
    setDamageExcess(Number(vehicle.damageExcess ?? 0));
    setFormError(undefined);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!editingVehicle) return;
    setFormError(undefined);
    try {
      await updateVehicle({
        id: editingVehicle.id,
        data: {
          dailyRate1to2: Number(dailyRate1to2) || 0,
          dailyRate3to7: Number(dailyRate3to7) || 0,
          dailyRate8Plus: Number(dailyRate8to30) || 0,
          damageExcess: Number(damageExcess) || 0,
        },
      }).unwrap();
      setEditingVehicle(null);
    } catch (err) {
      setFormError(
        extractApiErrorCode(err) ??
          (isRtl ? "تعذر حفظ الأسعار" : "Failed to save prices"),
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-revix-dark">
          {isRtl ? "قائمة الأسعار" : "Price List"}
        </h1>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isRtl ? "بحث بالسيارة أو اللوحة..." : "Search vehicle or plate..."}
          className="h-[34px] w-64 rounded-[6px] border border-revix-border bg-revix-white px-3 text-[13px] text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden"
        />
      </div>

      <div className="overflow-hidden rounded-[8px] border border-revix-border bg-revix-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start text-[13px]">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/75 text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "السيارة" : "Vehicle"}
                </th>
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "1 - 2 يوم" : "1 - 2 Days"}
                </th>
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "3 - 7 أيام" : "3 - 7 Days"}
                </th>
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "8 - 30 يوم" : "8 - 30 Days"}
                </th>
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "تحمل الأضرار" : "Damage Excess"}
                </th>
                <th className="px-4 py-2.5 text-end">
                  {isRtl ? "إجراء" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/80">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[13px] text-revix-secondary"
                  >
                    {isRtl ? "جاري التحميل..." : "Loading..."}
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[13px] text-revix-secondary"
                  >
                    {isRtl ? "لا توجد سيارات" : "No vehicles found"}
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr
                    key={v.id}
                    className="transition-colors hover:bg-revix-surface/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-revix-dark">
                        {v.licensePlate}
                      </p>
                      <p className="font-mono text-[11.5px] text-revix-secondary">
                        {v.vin}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-revix-dark">
                      {Number(v.dailyRate1to2 ?? 0).toLocaleString()} {baseCurrency}
                    </td>
                    <td className="px-4 py-3 font-mono text-revix-dark">
                      {Number(v.dailyRate3to7 ?? 0).toLocaleString()} {baseCurrency}
                    </td>
                    <td className="px-4 py-3 font-mono text-revix-dark">
                      {Number(v.dailyRate8Plus ?? 0).toLocaleString()} {baseCurrency}
                    </td>
                    <td className="px-4 py-3 font-mono text-revix-secondary">
                      {Number(v.damageExcess ?? 0).toLocaleString()} {baseCurrency}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => openEditModal(v)}
                        className="cursor-pointer rounded-[6px] border border-revix-border bg-revix-white px-2.5 py-1 text-[12px] font-medium text-revix-dark transition-colors hover:border-revix-primary/40 hover:bg-revix-tint hover:text-revix-primary"
                      >
                        {isRtl ? "تعديل السعر" : "Edit Price"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StudioModal
        isOpen={Boolean(editingVehicle)}
        onClose={() => setEditingVehicle(null)}
        title={
          editingVehicle
            ? editingVehicle.licensePlate
            : isRtl
              ? "تعديل الأسعار"
              : "Edit Price"
        }
      >
        {formError ? (
          <div className="mb-4">
            <Alert
              variant="error"
              title={isRtl ? "تعذّر الحفظ" : "Unable to save"}
              message={formError}
              onClose={() => setFormError(undefined)}
            />
          </div>
        ) : null}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput
              type="number"
              min={0}
              label={`1 - 2 Days (${baseCurrency})`}
              value={dailyRate1to2}
              onChange={(e) => setDailyRate1to2(Number(e.target.value))}
              required
            />
            <FormInput
              type="number"
              min={0}
              label={`3 - 7 Days (${baseCurrency})`}
              value={dailyRate3to7}
              onChange={(e) => setDailyRate3to7(Number(e.target.value))}
            />
            <FormInput
              type="number"
              min={0}
              label={`8 - 30 Days (${baseCurrency})`}
              value={dailyRate8to30}
              onChange={(e) => setDailyRate8to30(Number(e.target.value))}
            />
          </div>

          <FormInput
            type="number"
            min={0}
            label={`Damage Excess (${baseCurrency})`}
            value={damageExcess}
            onChange={(e) => setDamageExcess(Number(e.target.value))}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingVehicle(null)}
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating
                ? isRtl
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isRtl
                  ? "حفظ"
                  : "Save"}
            </Button>
          </div>
        </form>
      </StudioModal>
    </div>
  );
}
