"use client";

import React from "react";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";
import { useListAuditLogsQuery, type AuditLogEntryDto } from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { formatCompanyDate, formatCompanyDateTime } from "@/lib/date/companyDate";

interface ActivityParticipant {
  label: string;
  value?: string | null;
}

interface ActivityTimelineProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
  isRtl?: boolean;
  title?: string;
  participantsLabel?: string;
  participants?: ActivityParticipant[];
}

function getActionMeta(action: string, isRtl: boolean): {
  label: string;
  tone: string;
  icon: RevixIconName;
} {
  switch (action) {
    case "fleet.po_created":
      return {
        label: isRtl ? "إنشاء أمر شراء" : "Created Purchase Order",
        tone: "bg-blue-50 text-blue-700 border-blue-200",
        icon: "file-text",
      };
    case "fleet.po_status_approved":
      return {
        label: isRtl ? "الموافقة على أمر الشراء" : "Approved Purchase Order",
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "shield",
      };
    case "fleet.po_status_cancelled":
      return {
        label: isRtl ? "إلغاء أمر الشراء" : "Cancelled Purchase Order",
        tone: "bg-red-50 text-red-700 border-red-200",
        icon: "x",
      };
    case "fleet.po_signed":
      return {
        label: isRtl ? "توقيع أمر الشراء" : "Signed Purchase Order",
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "check-circle-2",
      };
    case "fleet.po_vehicle_received":
    case "fleet.vehicle_received_from_po":
      return {
        label: isRtl ? "استلام وتحويل السيارة للأسطول" : "Received & Converted Vehicle to Fleet Asset",
        tone: "bg-revix-green/10 text-revix-green border-revix-green/30",
        icon: "car-front",
      };
    case "fleet.vehicle_created":
      return {
        label: isRtl ? "تسجيل سيارة بالأسطول" : "Registered Fleet Vehicle",
        tone: "bg-blue-50 text-blue-700 border-blue-200",
        icon: "car-front",
      };
    case "fleet.vehicle_status_updated":
      return {
        label: isRtl ? "تغيير حالة السيارة" : "Updated Vehicle Status",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "car-front",
      };
    case "fleet.vehicle_maintenance_logged":
      return {
        label: isRtl ? "تسجيل / إدخال صيانة" : "Logged Maintenance / Workshop",
        tone: "bg-orange-50 text-orange-700 border-orange-200",
        icon: "wrench",
      };
    case "fleet.vehicle_inspected":
      return {
        label: isRtl ? "فحص السيارة" : "Vehicle Inspection",
        tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
        icon: "check-circle-2",
      };
    case "fleet.vehicle_insurance_updated":
      return {
        label: isRtl ? "تحديث بوليصة التأمين" : "Updated Insurance Policy",
        tone: "bg-teal-50 text-teal-700 border-teal-200",
        icon: "shield",
      };
    case "fleet.vehicle_pricing_updated":
    case "fleet.variant_pricing_updated":
      return {
        label: isRtl ? "تحديث شرائح الأسعار" : "Updated Pricing Tiers",
        tone: "bg-purple-50 text-purple-700 border-purple-200",
        icon: "file-text",
      };
    case "fleet.rental_contract_created":
    case "fleet.vehicle_booked":
      return {
        label: isRtl ? "إنشاء حجز / عقد إيجار" : "Booked / Created Rental Contract",
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "users-round",
      };
    case "fleet.rental_contract_completed":
    case "fleet.vehicle_returned":
      return {
        label: isRtl ? "استلام السيارة وإنهاء العقد" : "Completed Contract & Returned Vehicle",
        tone: "bg-blue-50 text-blue-700 border-blue-200",
        icon: "check-circle-2",
      };
    case "fleet.rental_contract_cancelled":
    case "fleet.vehicle_booking_cancelled":
      return {
        label: isRtl ? "إلغاء عقد الإيجار" : "Cancelled Rental Contract",
        tone: "bg-red-50 text-red-700 border-red-200",
        icon: "x",
      };
    case "fleet.movement_dispatched":
      return {
        label: isRtl ? "إرسال / حركة نقل لفرع" : "Dispatched Vehicle Movement",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "car-front",
      };
    case "fleet.movement_received":
      return {
        label: isRtl ? "استلام السيارة بالفرع" : "Received Vehicle at Branch",
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "check-circle-2",
      };
    case "fleet.driver_created":
      return {
        label: isRtl ? "إضافة سائق جديد" : "Added Driver",
        tone: "bg-blue-50 text-blue-700 border-blue-200",
        icon: "users-round",
      };
    default:
      return {
        label: action.replace(/^fleet\./, "").replace(/_/g, " "),
        tone: "bg-revix-surface text-revix-dark border-revix-border",
        icon: "clock",
      };
  }
}

function formatMetaSummary(entry: AuditLogEntryDto, isRtl: boolean): string[] {
  const m = entry.metadata || {};
  const chips: string[] = [];
  if (m.poNumber) chips.push(`PO: ${String(m.poNumber)}`);
  if (m.contractNumber) chips.push(`${isRtl ? "عقد:" : "Contract:"} ${String(m.contractNumber)}`);
  if (m.licensePlate) chips.push(`${isRtl ? "لوحة:" : "Plate:"} ${String(m.licensePlate)}`);
  if (m.vin) chips.push(`VIN: ${String(m.vin)}`);
  if (m.serviceType) chips.push(`${isRtl ? "الصيانة:" : "Service:"} ${String(m.serviceType)}`);
  if (m.workshopName) chips.push(`${isRtl ? "الورشة:" : "Workshop:"} ${String(m.workshopName)}`);
  if (m.nextStatus) chips.push(`${isRtl ? "الحالة:" : "Status:"} ${String(m.nextStatus)}`);
  if (m.status && !m.nextStatus) chips.push(`${isRtl ? "الحالة:" : "Status:"} ${String(m.status)}`);
  if (m.providerName) chips.push(`${isRtl ? "التأمين:" : "Insurer:"} ${String(m.providerName)}`);
  if (m.dailyRate1to2 !== undefined) chips.push(`1-2d: ${String(m.dailyRate1to2)}`);
  if (m.movementNumber) chips.push(`${String(m.movementNumber)}`);
  if (m.fromBranch && m.toBranch) chips.push(`${String(m.fromBranch)} ${isRtl ? "←" : "→"} ${String(m.toBranch)}`);
  if (m.driverName) chips.push(`${isRtl ? "السواق:" : "Driver:"} ${String(m.driverName)}`);
  if (m.dispatchOdometerKm !== undefined) chips.push(`${isRtl ? "خروج:" : "Out:"} ${Number(m.dispatchOdometerKm).toLocaleString()} ${isRtl ? "كم" : "km"}`);
  if (m.arrivalOdometerKm !== undefined) chips.push(`${isRtl ? "وصول:" : "In:"} ${Number(m.arrivalOdometerKm).toLocaleString()} ${isRtl ? "كم" : "km"}`);
  return chips;
}

export function ActivityTimeline({
  entityType,
  entityId,
  limit = 50,
  isRtl = true,
  participantsLabel,
  participants,
}: ActivityTimelineProps) {
  const { data: ctx } = useGetWorkspaceContextQuery();
  const company = ctx?.data?.company;
  const { currentData: data, isFetching, isError, refetch } = useListAuditLogsQuery({ entityType, entityId, limit });
  const logs = data?.data ?? [];

  const options = { timezone: company?.timezone, locale: isRtl ? "ar-EG" : "en-GB" };
  const days = new Map<string, AuditLogEntryDto[]>();
  for (const entry of [...logs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    const day = formatCompanyDate(entry.createdAt, options);
    const entries = days.get(day);
    if (entries) entries.push(entry);
    else days.set(day, [entry]);
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="@container w-full space-y-3 py-1 text-sm">
      <div className="space-y-1">
        {isError ? (
          <p role="alert" className="text-xs text-rose-600">
            {isRtl ? "تعذّر تحميل السجل." : "Could not load activity."}{" "}
            <button type="button" className="cursor-pointer underline" onClick={() => refetch()}>
              {isRtl ? "إعادة المحاولة" : "Retry"}
            </button>
          </p>
        ) : !data && isFetching ? (
          <p role="status" className="text-xs text-revix-secondary">
            {isRtl ? "جارٍ تحميل النشاط…" : "Loading activity…"}
          </p>
        ) : !logs.length ? (
          <p className="text-xs text-revix-secondary">
            {isRtl ? "لا توجد حركات مسجلة." : "No activity recorded."}
          </p>
        ) : (
          Array.from(days, ([day, entries], index) => (
            <details key={day} open={index === 0}>
              <summary className="cursor-pointer py-1.5 text-xs font-semibold text-revix-secondary">
                {day} <span className="ms-1 font-normal">({entries.length})</span>
              </summary>
              <ol className="grid grid-cols-1 gap-x-5 gap-y-1 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4 max-h-[min(36dvh,18rem)] overflow-y-auto overscroll-contain pe-2">
                {entries.map((entry) => {
                  const meta = getActionMeta(entry.action, isRtl);
                  const details = formatMetaSummary(entry, isRtl).filter(
                    (value) => !(entityType === "purchase_order" && value.startsWith("PO:")),
                  );
                  return (
                    <li key={entry.id} className="flex min-w-0 items-start gap-2 border-s-2 border-revix-border ps-2 py-1">
                      <span className={`relative grid size-5 shrink-0 place-items-center rounded-full border ${meta.tone}`}>
                        <RevixIcon name={meta.icon} size={12} />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline gap-x-2 text-xs leading-5 text-revix-secondary">
                          <strong className="font-semibold text-revix-dark">{meta.label}</strong>
                          <time dateTime={entry.createdAt} className="tabular-nums">
                            {formatCompanyDateTime(entry.createdAt, options)}
                          </time>
                        </p>
                        <p className="text-xs leading-5 text-revix-secondary">
                          <bdi>{entry.actorName || entry.actorEmail || (isRtl ? "النظام" : "System")}</bdi>
                        </p>
                        {details.length > 0 && (
                          <p className="mt-1 text-xs text-revix-secondary">{details.join(" · ")}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </details>
          ))
        )}
      </div>

      {participants && participants.length > 0 && (
        <details className="w-full border-t border-revix-border py-3 text-xs">
          <summary className="cursor-pointer font-medium text-revix-secondary">
            {participantsLabel || (isRtl ? "المسؤولون" : "Participants")}
          </summary>
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            {participants.map((p) => (
              <div key={p.label} className="flex gap-3">
                <dt className="text-revix-secondary">{p.label}</dt>
                <dd className="font-medium text-revix-dark">{p.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  );
}
