"use client";

import { useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { useAppDispatch } from "@/store/hooks";
import { setPendingFleetReceiveContext } from "@/store/slices/workspaceSlice";
import { purchaseOrderHref, vehicleHref } from "@/lib/workspace/resourceRoutes";
import {
  useListPurchaseOrdersQuery,
  useListVariantsQuery,
  useListVehiclesQuery,
  type PurchaseOrderStatus,
  type VendorDto,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { formatCompanyDate } from "@/lib/date/companyDate";

interface VendorDetailPageProps {
  vendor: VendorDto;
  isRtl: boolean;
  onBack: () => void;
  onEdit: (vendor: VendorDto) => void;
}

const PO_STATUS_LABELS: Record<PurchaseOrderStatus, { ar: string; en: string; cls: string }> = {
  draft: { ar: "مسودة", en: "Draft", cls: "bg-revix-surface text-revix-secondary border-revix-border" },
  pending_approval: { ar: "بانتظار الاعتماد", en: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { ar: "معتمد", en: "Approved", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  partially_received: { ar: "استلام جزئي", en: "Partial", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  completed: { ar: "مكتمل", en: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { ar: "ملغي", en: "Cancelled", cls: "bg-rose-50 text-rose-700 border-rose-200" },
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

export function VendorDetailPage({
  vendor,
  isRtl,
  onBack,
  onEdit,
}: VendorDetailPageProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<"overview" | "vehicles" | "orders">("overview");
  const [vehicleFilter, setVehicleFilter] = useState<"all" | "received" | "pending">("all");

  const openPurchaseOrder = (poId: string) => {
    router.push(purchaseOrderHref(poId));
  };

  const openVehicle = (vehicleId: string) => {
    router.push(vehicleHref(vehicleId));
  };

  const openConvertPendingItem = (opts: {
    poId: string;
    itemId: string;
    variantId: string;
    vin?: string;
    color?: string;
    unitPrice?: number;
    poNumber?: string;
  }) => {
    dispatch(
      setPendingFleetReceiveContext({
        purchaseOrderId: opts.poId,
        itemId: opts.itemId,
        variantId: opts.variantId,
        vin: opts.vin || "",
        color: opts.color || "White",
        unitPrice: opts.unitPrice,
        poNumber: opts.poNumber,
      }),
    );
    router.push(purchaseOrderHref(opts.poId, "receive"));
  };
  const { data: wsCtx } = useGetWorkspaceContextQuery();
  const company = wsCtx?.data?.company;
  const defaultCurrency = company?.baseCurrency || "EGP";

  const { data: posRes, isLoading: isLoadingPos } = useListPurchaseOrdersQuery({
    vendorId: vendor.id,
    page: 1,
    pageSize: 100,
  });
  const { data: vehiclesRes, isLoading: isLoadingVehicles } = useListVehiclesQuery({
    page: 1,
    pageSize: 100,
  });
  const { data: variantsRes } = useListVariantsQuery();
  const variantById = useMemo(
    () => new Map((variantsRes?.data ?? []).map((v) => [v.id, v])),
    [variantsRes?.data],
  );

  const vendorPos = useMemo(() => posRes?.data ?? [], [posRes?.data]);
  const activePos = useMemo(
    () => vendorPos.filter((p) => p.status !== "cancelled"),
    [vendorPos],
  );
  const vendorPoMap = useMemo(
    () => new Map(vendorPos.map((p) => [p.id, p])),
    [vendorPos],
  );

  const vendorVehicles = useMemo(() => {
    const all = vehiclesRes?.data ?? [];
    const normalizedVendorName = vendor.name.trim().toLowerCase();
    return all.filter(
      (v) =>
        (v.purchaseOrderId && vendorPoMap.has(v.purchaseOrderId)) ||
        (v.vendorName && v.vendorName.trim().toLowerCase() === normalizedVendorName),
    );
  }, [vehiclesRes?.data, vendorPoMap, vendor.name]);

  const unifiedVehicleRows = useMemo(() => {
    type UnifiedRow = {
      key: string;
      kind: "received" | "pending";
      vehicleId?: string;
      poId?: string;
      itemId?: string;
      variantId?: string;
      title: string;
      poNumber: string;
      plate: string;
      vin: string;
      colorRaw: string;
      colorLabel: string;
      price: number | null;
      currency: string;
    };

    const rows: UnifiedRow[] = [];

    for (const vh of vendorVehicles) {
      const variant = vh.variant;
      const title = variant
        ? `${variant.make} ${variant.model}${variant.trim ? ` ${variant.trim}` : ""} ${variant.modelYear}`
        : "—";
      const po = vh.purchaseOrderId ? vendorPoMap.get(vh.purchaseOrderId) : undefined;
      const colorLabel = vh.color
        ? isRtl
          ? COLOR_AR_MAP[vh.color.trim().toLowerCase()] || vh.color
          : vh.color
        : "—";
      rows.push({
        key: `rec-${vh.id}`,
        kind: "received",
        vehicleId: vh.id,
        poId: po?.id,
        title,
        poNumber: po?.poNumber || vh.poNumber || "—",
        plate: vh.licensePlate || "—",
        vin: vh.vin || "—",
        colorRaw: vh.color || "White",
        colorLabel,
        price: vh.purchasePrice != null ? Number(vh.purchasePrice) : null,
        currency: po?.currency || defaultCurrency,
      });
    }

    for (const po of activePos) {
      for (const item of po.items ?? []) {
        const remaining = Math.max(0, (Number(item.quantity) || 0) - (Number(item.receivedCount) || 0));
        if (remaining <= 0) continue;
        const variant = variantById.get(item.variantId);
        const title = variant
          ? `${variant.make} ${variant.model}${variant.trim ? ` ${variant.trim}` : ""} ${variant.modelYear}`
          : isRtl
            ? "سيارة"
            : "Vehicle";
        const vinMatch = (item.notes || "").match(/VIN:\s*([^|,\n]+)/i);
        const colorMatch = (item.notes || "").match(/Color:\s*([^|,\n]+)/i);
        const extractedVin = vinMatch ? vinMatch[1].trim() : "";
        const extractedColor = colorMatch ? colorMatch[1].trim() : "";
        const colorLabel = extractedColor
          ? isRtl
            ? COLOR_AR_MAP[extractedColor.toLowerCase()] || extractedColor
            : extractedColor
          : "—";
        for (let i = 0; i < remaining; i += 1) {
          rows.push({
            key: `pend-${item.id}-${i}`,
            kind: "pending",
            poId: po.id,
            itemId: item.id,
            variantId: item.variantId,
            title,
            poNumber: po.poNumber,
            plate: "—",
            vin: extractedVin || "—",
            colorRaw: extractedColor || "White",
            colorLabel,
            price: Number(item.unitPrice) || 0,
            currency: po.currency || defaultCurrency,
          });
        }
      }
    }

    return rows;
  }, [vendorVehicles, vendorPoMap, activePos, variantById, defaultCurrency, isRtl]);

  const filteredVehicleRows = useMemo(() => {
    if (vehicleFilter === "all") return unifiedVehicleRows;
    return unifiedVehicleRows.filter((r) => r.kind === vehicleFilter);
  }, [unifiedVehicleRows, vehicleFilter]);

  const receivedCount = useMemo(
    () => unifiedVehicleRows.filter((r) => r.kind === "received").length,
    [unifiedVehicleRows],
  );
  const pendingCount = unifiedVehicleRows.length - receivedCount;

  const financials = useMemo(() => {
    const currency = activePos[0]?.currency || defaultCurrency;
    const totalAmount = activePos.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const totalPaid = activePos.reduce((sum, p) => sum + (Number(p.upfrontPaid) || 0), 0);
    const totalRemaining = activePos.reduce((sum, p) => sum + (Number(p.remainingAmount) || 0), 0);
    const totalOrderedUnits = activePos.reduce(
      (sum, p) => sum + (p.items ?? []).reduce((s, it) => s + (Number(it.quantity) || 0), 0),
      0,
    );
    return {
      currency,
      totalAmount,
      totalPaid,
      totalRemaining,
      totalOrderedUnits,
    };
  }, [activePos, defaultCurrency]);

  const tabs = [
    { id: "overview" as const, label: isRtl ? "نظرة عامة" : "Overview" },
    {
      id: "vehicles" as const,
      label: `${isRtl ? "السيارات المشتراة" : "Purchased Vehicles"} (${unifiedVehicleRows.length})`,
    },
    {
      id: "orders" as const,
      label: `${isRtl ? "أوامر الشراء" : "Purchase Orders"} (${vendorPos.length})`,
    },
  ];

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-3 overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Clean Top Header — matches PO & Vehicle detail pages */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-1 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            title={isRtl ? "العودة لدليل الموردين" : "Back to vendors"}
            aria-label={isRtl ? "العودة لدليل الموردين" : "Back to vendors"}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-revix-border bg-white text-revix-secondary hover:bg-revix-surface"
          >
            <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
          </button>
          <h1 className="truncate text-lg font-bold text-revix-dark">{vendor.name}</h1>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(vendor)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-revix-border bg-white px-3.5 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
          >
            <span>{isRtl ? "تعديل البيانات" : "Edit Vendor"}</span>
          </button>
        </div>
      </div>

      {/* Underline Tabs */}
      <nav
        aria-label={isRtl ? "أقسام المورد" : "Vendor sections"}
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-revix-border"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${
                active
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
        {activeTab === "overview" && (
          <div className="grid items-start gap-5 md:grid-cols-2">
            {/* Vendor Details */}
            <section className="overflow-hidden rounded-lg border border-revix-border bg-revix-white">
              <h3 className="border-b border-revix-border bg-revix-surface px-4 py-3 text-sm font-semibold text-revix-dark">
                {isRtl ? "بيانات المورد" : "Vendor Details"}
              </h3>
              <dl className="divide-y divide-revix-border px-4">
                {[
                  [isRtl ? "اسم المورد" : "Vendor name", vendor.name],
                  ...(vendor.legalName ? [[isRtl ? "الاسم القانوني" : "Legal name", vendor.legalName]] : []),
                  [isRtl ? "مسؤول التواصل" : "Contact person", vendor.contactPerson || "—"],
                  [isRtl ? "الهاتف" : "Phone", vendor.phone || "—"],
                  [isRtl ? "البريد الإلكتروني" : "Email", vendor.email || "—"],
                  [isRtl ? "الموقع" : "Location", `${vendor.city}, ${vendor.countryCode}`],
                  ...(vendor.commercialRegister
                    ? [[isRtl ? "السجل التجاري" : "Commercial Reg (CR)", vendor.commercialRegister]]
                    : []),
                  ...(vendor.taxNumber ? [[isRtl ? "الرقم الضريبي" : "Tax ID", vendor.taxNumber]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                    <dt className="text-revix-secondary">{label}</dt>
                    <dd className="text-end font-medium text-revix-dark tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Financial Summary */}
            <section className="overflow-hidden rounded-lg border border-revix-border bg-revix-white">
              <h3 className="border-b border-revix-border bg-revix-surface px-4 py-3 text-sm font-semibold text-revix-dark">
                {isRtl ? "ملخص التعاملات والمدفوعات" : "Purchases & Payments Summary"}
              </h3>
              <dl className="divide-y divide-revix-border px-4">
                {[
                  [
                    isRtl ? "إجمالي المشتريات" : "Total purchased",
                    isLoadingPos ? "…" : `${financials.totalAmount.toLocaleString()} ${financials.currency}`,
                    "text-revix-dark",
                  ],
                  [
                    isRtl ? "إجمالي المدفوع" : "Total paid",
                    isLoadingPos ? "…" : `${financials.totalPaid.toLocaleString()} ${financials.currency}`,
                    "text-emerald-700",
                  ],
                  [
                    isRtl ? "المتبقي" : "Balance due",
                    isLoadingPos ? "…" : `${financials.totalRemaining.toLocaleString()} ${financials.currency}`,
                    financials.totalRemaining > 0 ? "text-amber-700" : "text-revix-dark",
                  ],
                  [isRtl ? "عدد أوامر الشراء" : "Purchase orders", isLoadingPos ? "…" : String(activePos.length), "text-revix-dark"],
                  [
                    isRtl ? "إجمالي السيارات" : "Vehicles purchased",
                    isLoadingPos ? "…" : `${vendorVehicles.length} / ${financials.totalOrderedUnits}`,
                    "text-revix-dark",
                  ],
                ].map(([label, value, tone]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                    <dt className="text-revix-secondary">{label}</dt>
                    <dd className={`text-end font-semibold tabular-nums ${tone}`} dir="ltr">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        )}

        {activeTab === "vehicles" && (
          <section className="overflow-hidden rounded-lg border border-revix-border bg-revix-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-revix-border bg-revix-surface px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-revix-dark">
                  {isRtl ? "السيارات المشتراة" : "Purchased Vehicles"}
                </h3>
                <span className="rounded border border-revix-border bg-revix-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                  {filteredVehicleRows.length}
                </span>
              </div>

              <div className="flex items-center gap-1 rounded-md border border-revix-border bg-revix-white p-0.5 text-[11px]">
                {(
                  [
                    { id: "all", label: `${isRtl ? "الكل" : "All"} (${unifiedVehicleRows.length})` },
                    { id: "received", label: `${isRtl ? "مستلمة" : "Received"} (${receivedCount})` },
                    { id: "pending", label: `${isRtl ? "بانتظار التحويل" : "Pending"} (${pendingCount})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setVehicleFilter(f.id)}
                    className={`cursor-pointer rounded px-2.5 py-1 font-medium transition-colors ${
                      vehicleFilter === f.id
                        ? "bg-revix-primary text-white"
                        : "text-revix-secondary hover:text-revix-dark"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingVehicles || isLoadingPos ? (
              <div className="py-10 text-center text-xs text-revix-secondary">
                {isRtl ? "جاري التحميل..." : "Loading..."}
              </div>
            ) : filteredVehicleRows.length === 0 ? (
              <div className="py-10 text-center text-xs text-revix-secondary">
                {isRtl ? "لا توجد سيارات في هذا التصنيف." : "No vehicles found."}
              </div>
            ) : (
              <DataTable className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-revix-border bg-revix-surface/50 text-[11px] font-semibold text-revix-secondary">
                    <th className="px-4 py-2.5 text-start">{isRtl ? "السيارة" : "Vehicle"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "أمر الشراء" : "PO #"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "اللوحة" : "Plate"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "الشاسيه" : "Chassis #"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "اللون" : "Color"}</th>
                    <th className="px-3 py-2.5 text-start">{isRtl ? "السعر" : "Price"}</th>
                    <th className="px-4 py-2.5 text-end">{isRtl ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-revix-border/60">
                  {filteredVehicleRows.map((row) => (
                    <tr
                      key={row.key}
                      onClick={() => {
                        if (row.kind === "received" && row.vehicleId) {
                          openVehicle(row.vehicleId);
                        } else if (row.kind === "pending" && row.poId && row.itemId && row.variantId) {
                          openConvertPendingItem({
                            poId: row.poId,
                            itemId: row.itemId,
                            variantId: row.variantId,
                            vin: row.vin === "—" ? "" : row.vin,
                            color: row.colorRaw,
                            unitPrice: row.price ?? undefined,
                            poNumber: row.poNumber,
                          });
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-revix-surface/60"
                    >
                      <td className="px-4 py-2.5 font-semibold text-revix-dark whitespace-nowrap">
                        {row.title}
                      </td>
                      <td
                        className="px-3 py-2.5 font-mono text-revix-primary whitespace-nowrap"
                        onClick={(e) => {
                          if (row.poId) {
                            e.stopPropagation();
                            openPurchaseOrder(row.poId);
                          }
                        }}
                      >
                        {row.poId ? <span className="hover:underline">{row.poNumber}</span> : row.poNumber}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-revix-dark whitespace-nowrap" dir="ltr">
                        {row.plate}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-revix-secondary whitespace-nowrap">
                        {row.vin}
                      </td>
                      <td className="px-3 py-2.5 text-revix-dark whitespace-nowrap">
                        {row.colorLabel}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-revix-dark tabular-nums whitespace-nowrap" dir="ltr">
                        {row.price != null ? `${row.price.toLocaleString()} ${row.currency}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-end whitespace-nowrap">
                        {row.kind === "received" ? (
                          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {isRtl ? "مستلمة" : "Received"}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            {isRtl ? "تحويل للأصول" : "Convert"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </section>
        )}

        {activeTab === "orders" && (
          <section className="overflow-hidden rounded-lg border border-revix-border bg-revix-white">
            <div className="flex items-center justify-between border-b border-revix-border bg-revix-surface px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-revix-dark">
                  {isRtl ? "أوامر الشراء" : "Purchase Orders"}
                </h3>
                <span className="rounded border border-revix-border bg-revix-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                  {vendorPos.length}
                </span>
              </div>
            </div>
            {isLoadingPos ? (
              <div className="py-10 text-center text-xs text-revix-secondary">
                {isRtl ? "جاري التحميل..." : "Loading..."}
              </div>
            ) : vendorPos.length === 0 ? (
              <div className="py-10 text-center text-xs text-revix-secondary">
                {isRtl ? "لا توجد أوامر شراء لهذا المورد." : "No purchase orders for this vendor."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable className="w-full text-start text-xs">
                  <thead>
                    <tr className="border-b border-revix-border bg-revix-surface/50 text-[11px] font-semibold text-revix-secondary">
                      <th className="px-4 py-2.5 text-start">{isRtl ? "رقم الطلب" : "PO #"}</th>
                      <th className="px-3 py-2.5 text-start">{isRtl ? "التاريخ" : "Date"}</th>
                      <th className="px-3 py-2.5 text-start">{isRtl ? "الإجمالي" : "Total"}</th>
                      <th className="px-3 py-2.5 text-start">{isRtl ? "المدفوع" : "Paid"}</th>
                      <th className="px-3 py-2.5 text-start">{isRtl ? "المتبقي" : "Remaining"}</th>
                      <th className="px-4 py-2.5 text-end">{isRtl ? "الحالة" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-revix-border/60">
                    {vendorPos.map((po) => {
                      const st = PO_STATUS_LABELS[po.status] || PO_STATUS_LABELS.draft;
                      return (
                        <tr
                          key={po.id}
                          onClick={() => openPurchaseOrder(po.id)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") openPurchaseOrder(po.id);
                          }}
                          className="cursor-pointer transition-colors hover:bg-revix-surface/60 focus:bg-revix-surface/60 focus:outline-none"
                        >
                          <td className="px-4 py-2.5 font-mono font-semibold text-revix-primary whitespace-nowrap hover:underline">
                            {po.poNumber}
                          </td>
                          <td className="px-3 py-2.5 text-revix-secondary whitespace-nowrap">
                            {formatCompanyDate(po.orderDate, {
                              timezone: company?.timezone,
                              locale: isRtl ? "ar-EG" : "en-GB",
                            })}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-revix-dark tabular-nums whitespace-nowrap">
                            {Number(po.totalAmount).toLocaleString()} {po.currency}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-emerald-700 tabular-nums whitespace-nowrap">
                            {Number(po.upfrontPaid).toLocaleString()} {po.currency}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-revix-secondary tabular-nums whitespace-nowrap">
                            {Number(po.remainingAmount).toLocaleString()} {po.currency}
                          </td>
                          <td className="px-4 py-2.5 text-end whitespace-nowrap">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                              {isRtl ? st.ar : st.en}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
