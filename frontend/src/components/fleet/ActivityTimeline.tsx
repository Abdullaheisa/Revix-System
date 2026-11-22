"use client";

import React from "react";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";
import { useListAuditLogsQuery, type AuditLogEntryDto } from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { formatCompanyDateTime } from "@/lib/date/companyDate";

interface ActivityTimelineProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
  isRtl?: boolean;
  title?: string;
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
  title,
}: ActivityTimelineProps) {
  const { data: ctx } = useGetWorkspaceContextQuery();
  const company = ctx?.data?.company;
  const { data, isLoading } = useListAuditLogsQuery({ entityType, entityId, limit });
  const logs = data?.data ?? [];

  return (
    <div className="rounded-xl border border-revix-border bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-revix-border bg-revix-surface/40">
        <div className="flex items-center gap-2">
          <RevixIcon name="clock" size={16} className="text-revix-green" />
          <h3 className="text-sm font-bold text-revix-dark">
            {title || (isRtl ? "سجل الموظفين والعمليات (Audit Trail)" : "Employee Activity & Audit Trail")}
          </h3>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-revix-border text-revix-muted">
          {logs.length} {isRtl ? "عملية" : "events"}
        </span>
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-xs text-revix-muted">
          {isRtl ? "جاري تحميل سجل العمليات..." : "Loading activity log..."}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-6 text-center text-xs text-revix-muted">
          {isRtl ? "لا توجد عمليات مسجلة بعد" : "No recorded actions yet."}
        </div>
      ) : (
        <div className="divide-y divide-revix-border/60">
          {logs.map((entry) => {
            const meta = getActionMeta(entry.action, isRtl);
            const chips = formatMetaSummary(entry, isRtl);
            const actorLabel =
              entry.actorName || entry.actorEmail || (isRtl ? "مستخدم النظام" : "System User");

            return (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-revix-surface/30 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}>
                    <RevixIcon name={meta.icon} size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-revix-dark">{meta.label}</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-revix-surface px-2 py-0.5 text-[11px] font-semibold text-revix-dark border border-revix-border/60">
                        <RevixIcon name="users-round" size={12} className="text-revix-green" />
                        {actorLabel}
                      </span>
                    </div>
                    {chips.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {chips.map((chip, idx) => (
                          <span
                            key={idx}
                            className="inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-revix-muted"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-[11px] font-mono text-revix-muted" dir="ltr">
                  <span className="inline-block">
                    {formatCompanyDateTime(entry.createdAt, company ?? undefined)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
