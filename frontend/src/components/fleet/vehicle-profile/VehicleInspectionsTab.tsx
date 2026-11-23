"use client";

import { DataTable } from "@/components/ui/DataTable";
import { useState } from "react";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { SectionCard } from "@/components/ui/SectionCard";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Vehicle3DDamageViewer,
  VEHICLE_ZONES,
  getZoneLabel,
} from "@/components/shared/Vehicle3DDamageViewer";
import { getFleetText } from "@/lib/i18n/fleetText";
import {
  getDamageSeverityOptions,
  getInspectionTypeOptions,
} from "@/lib/fleet/vehicleLifecycleData";
import {
  useAddVehicleInspectionMutation,
  type VehicleDamagePointDto,
  type VehicleInspectionDto,
} from "@/store/api/fleetApi";

interface VehicleInspectionsTabProps {
  vehicleId: string;
  currentOdometer: number;
  damagePoints: VehicleDamagePointDto[];
  inspections: VehicleInspectionDto[];
  isRtl: boolean;
  onSuccessToast: (msg: string) => void;
}

export function VehicleInspectionsTab({
  vehicleId,
  currentOdometer,
  damagePoints,
  inspections,
  isRtl,
  onSuccessToast,
}: VehicleInspectionsTabProps) {
  const [addInspection, { isLoading: isSaving }] = useAddVehicleInspectionMutation();
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [inspType, setInspType] = useState("checkin");
  const [inspCustomer, setInspCustomer] = useState("");
  const [inspBookingRef, setInspBookingRef] = useState("");
  const [inspOdo, setInspOdo] = useState(currentOdometer);
  const [inspHasAccident, setInspHasAccident] = useState(false);
  const [inspAccidentNotes, setInspAccidentNotes] = useState("");
  const [inspSeverity, setInspSeverity] = useState("minor_scratch");
  const [inspDmgDesc, setInspDmgDesc] = useState("");
  const [inspRepairCost, setInspRepairCost] = useState(0);

  const t = getFleetText(isRtl).inspections;

  const toggleZone = (zoneKey: string) => {
    setSelectedZones((prev) =>
      prev.includes(zoneKey) ? prev.filter((z) => z !== zoneKey) : [...prev, zoneKey],
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addInspection({
      vehicleId,
      inspectionType: inspType,
      bookingRef: inspBookingRef.trim() || null,
      customerName: inspCustomer.trim() || null,
      odometerKm: Number(inspOdo) || currentOdometer,
      hasAccident: inspHasAccident,
      accidentNotes: inspAccidentNotes.trim() || null,
      damagePoints: selectedZones.map((zoneKey) => ({
        zoneKey,
        severity: inspSeverity,
        description: inspDmgDesc.trim() || null,
        repairCost: Number(inspRepairCost) || 0,
      })),
    }).unwrap();
    setSelectedZones([]);
    setInspDmgDesc("");
    setInspAccidentNotes("");
    setInspRepairCost(0);
    onSuccessToast(t.savedToast);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <SectionCard
          className="lg:col-span-7"
          title={t.mapTitle}
          rightSlot={
            selectedZones.length > 0 ? (
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                {t.selectedCount(selectedZones.length)}
              </span>
            ) : null
          }
        >
          <Vehicle3DDamageViewer
            damagePoints={damagePoints}
            selectedZones={selectedZones}
            onToggleZone={toggleZone}
            isRtl={isRtl}
          />
        </SectionCard>

        <SectionCard className="lg:col-span-5" title={t.formTitle}>
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">{t.typeLabel}</label>
                <RevixSelect
                  size="sm"
                  isRtl={isRtl}
                  value={inspType}
                  onChange={(e) => setInspType(e.target.value)}
                  buttonClassName="h-9 rounded-lg text-xs"
                  options={getInspectionTypeOptions(isRtl)}
                />
              </div>
              <LabeledInput
                label={t.odometerLabel}
                type="number"
                required
                mono
                value={inspOdo}
                onChange={(e) => setInspOdo(Number(e.target.value))}
                placeholder={t.odometerPlaceholder}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label={t.customerLabel}
                type="text"
                value={inspCustomer}
                onChange={(e) => setInspCustomer(e.target.value)}
                placeholder={t.customerPlaceholder}
              />
              <LabeledInput
                label={t.bookingLabel}
                type="text"
                mono
                value={inspBookingRef}
                onChange={(e) => setInspBookingRef(e.target.value)}
                placeholder={t.bookingPlaceholder}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold">{t.damagedPartsLabel}</label>
                {selectedZones.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedZones([])}
                    className="cursor-pointer text-[11px] font-semibold text-red-600 hover:underline"
                  >
                    {t.clearAll}
                  </button>
                )}
              </div>
              <RevixSelect
                size="sm"
                isRtl={isRtl}
                value=""
                onChange={(e) => {
                  if (e.target.value) toggleZone(e.target.value);
                }}
                placeholder={t.partPickerPlaceholder}
                buttonClassName="h-9 rounded-lg text-xs"
                options={VEHICLE_ZONES.map((z) => ({ value: z.key, label: isRtl ? z.ar : z.en }))}
              />
              {selectedZones.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedZones.map((zk) => (
                    <span
                      key={zk}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                    >
                      {getZoneLabel(zk, isRtl)}
                      <button
                        type="button"
                        onClick={() => toggleZone(zk)}
                        className="cursor-pointer text-blue-500 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {selectedZones.length > 0 && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <div>
                  <label className="block font-semibold mb-1">{t.severityLabel}</label>
                  <RevixSelect
                    size="sm"
                    isRtl={isRtl}
                    value={inspSeverity}
                    onChange={(e) => setInspSeverity(e.target.value)}
                    buttonClassName="h-8 rounded-md text-xs"
                    options={getDamageSeverityOptions(isRtl)}
                  />
                </div>
                <LabeledInput
                  label={t.repairCostLabel}
                  type="number"
                  mono
                  inputSize="sm"
                  value={inspRepairCost}
                  onChange={(e) => setInspRepairCost(Number(e.target.value))}
                  placeholder="0"
                />
                <div className="col-span-2">
                  <input
                    type="text"
                    value={inspDmgDesc}
                    onChange={(e) => setInspDmgDesc(e.target.value)}
                    placeholder={t.damageDescPlaceholder}
                    className="h-8 w-full rounded-md border border-revix-border bg-white px-2.5 text-xs"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 font-semibold text-revix-dark">
              <input
                type="checkbox"
                checked={inspHasAccident}
                onChange={(e) => setInspHasAccident(e.target.checked)}
              />
              <span>{t.accidentCheckbox}</span>
            </label>

            {inspHasAccident && (
              <textarea
                rows={2}
                value={inspAccidentNotes}
                onChange={(e) => setInspAccidentNotes(e.target.value)}
                placeholder={t.accidentPlaceholder}
                className="w-full rounded-lg border border-revix-border p-2.5 text-xs"
              />
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full cursor-pointer rounded-lg bg-revix-primary py-2.5 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
            >
              {isSaving ? t.savingBtn : t.saveBtn}
            </button>
          </form>
        </SectionCard>
      </div>

      <SectionCard
        noPadding
        title={t.tableTitle}
        rightSlot={<span className="font-mono text-xs text-revix-secondary">{inspections.length}</span>}
      >
        {inspections.length === 0 ? (
          <EmptyState message={t.tableEmpty} />
        ) : (
          <div className="overflow-x-auto">
            <DataTable className="w-full text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold uppercase tracking-wider text-revix-muted">
                  <th className="px-4 py-2.5 text-start">{t.colDate}</th>
                  <th className="px-3 py-2.5 text-start">{t.colType}</th>
                  <th className="px-3 py-2.5 text-start">{t.colCustomerRef}</th>
                  <th className="px-3 py-2.5 text-start">{t.colOdometer}</th>
                  <th className="px-3 py-2.5 text-start">{t.colParts}</th>
                  <th className="px-4 py-2.5 text-end">{t.colAccident}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/60">
                {inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-revix-surface/30">
                    <td className="px-4 py-3 font-mono text-revix-secondary">
                      {new Date(insp.inspectedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 font-semibold text-revix-dark capitalize">
                      {insp.inspectionType}
                    </td>
                    <td className="px-3 py-3 text-revix-dark">
                      {insp.customerName || "—"}
                      {insp.bookingRef && (
                        <span className="ms-1.5 font-mono text-[11px] text-revix-primary">
                          #{insp.bookingRef}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold text-revix-dark">
                      {insp.odometerKm.toLocaleString()} {t.kmUnit}
                    </td>
                    <td className="px-3 py-3">
                      {insp.damagePoints.length === 0 ? (
                        <span className="text-emerald-600 font-semibold">{t.cleanLabel}</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {insp.damagePoints.map((dp) => (
                            <span
                              key={dp.id}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                dp.severity === "major_damage"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {getZoneLabel(dp.zoneKey, isRtl)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {insp.hasAccident ? (
                        <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                          {insp.accidentNotes || t.yesLabel}
                        </span>
                      ) : (
                        <span className="text-revix-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
