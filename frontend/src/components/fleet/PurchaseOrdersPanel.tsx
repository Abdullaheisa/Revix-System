"use client";

import { useMemo, useRef, useState } from "react";
import { ConvertPoVehiclePage } from "./ConvertPoVehiclePage";
import {
  formatCompanyDate,
  formatCompanyDateTime,
  getCompanyTodayIso,
} from "@/lib/date/companyDate";
import { useAppDispatch } from "@/store/hooks";
import {
  navigateToWorkspacePage,
  setPendingFleetReceiveContext,
} from "@/store/slices/workspaceSlice";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { RevixConfirmModal } from "@/components/shared/workspace";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import {
  useCreatePurchaseOrderMutation,
  useListPurchaseOrdersQuery,
  useListVariantsQuery,
  useListVendorsQuery,
  useListVehiclesQuery,
  useReceiveVehicleMutation,
  useSignPurchaseOrderMutation,
  useUpdatePurchaseOrderStatusMutation,
  type CreatePurchaseOrderItemInput,
  type PurchaseOrderDto,
  type PurchaseOrderStatus,
  type PaymentTermsType,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import type { BranchDto } from "@/store/api/workspaceApi";
import { PaymentTermsSelector } from "./PaymentTermsSelector";
import { formatVendorPaymentTerms } from "@/lib/fleet/paymentTerms";

interface PurchaseOrdersPanelProps {
  isRtl: boolean;
  branches: BranchDto[];
  activeBranch: BranchDto | null;
}

const PO_STATUS_LABELS: Record<
  PurchaseOrderStatus,
  { en: string; ar: string; badgeClass: string }
> = {
  draft: {
    en: "Draft",
    ar: "مسودة",
    badgeClass: "bg-revix-surface text-revix-secondary border-revix-border",
  },
  pending_approval: {
    en: "Pending Approval",
    ar: "بانتظار الاعتماد",
    badgeClass: "bg-revix-warning-soft text-revix-warning border-revix-warning/30",
  },
  approved: {
    en: "Approved & Ordered",
    ar: "معتمد وقيد التوريد",
    badgeClass: "bg-revix-info-soft text-revix-info border-revix-info/30",
  },
  partially_received: {
    en: "Partially Received",
    ar: "مستلم جزئيًا",
    badgeClass: "bg-revix-primary/10 text-revix-primary border-revix-primary/30",
  },
  completed: {
    en: "Completed",
    ar: "مكتمل التوريد",
    badgeClass: "bg-revix-accent-soft text-revix-accent border-revix-accent/30",
  },
  cancelled: {
    en: "Cancelled",
    ar: "ملغي",
    badgeClass: "bg-revix-alert-soft text-revix-alert border-revix-alert/30",
  },
};

export function PurchaseOrdersPanel({
  isRtl,
  branches,
  activeBranch,
}: PurchaseOrdersPanelProps) {
  const { data: wsContext } = useGetWorkspaceContextQuery();
  const membership = wsContext?.data.membership ?? null;
  const canApprovePo =
    !membership ||
    membership.roleCode === "owner" ||
    membership.roleCode === "ceo" ||
    membership.roleCode === "finance_manager" ||
    Boolean(membership.permissions.purchase_orders?.includes("approve")) ||
    Boolean(membership.permissions.finance?.includes("approve"));

  const [selectedBranchId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = usePersistedPage("fleet/purchase-orders");
  const pageSize = 15;
  const [selectedPoForDetails, setSelectedPoForDetails] = useState<PurchaseOrderDto | null>(null);
  const [pendingDeletePo, setPendingDeletePo] = useState<PurchaseOrderDto | null>(null);

  const { data, isLoading, refetch, isFetching } = useListPurchaseOrdersQuery({
    branchId: selectedBranchId !== "all" ? selectedBranchId : undefined,
    status: selectedStatus !== "all" ? (selectedStatus as PurchaseOrderStatus) : undefined,
    page,
    pageSize,
  });

  const dispatch = useAppDispatch();

  const { data: variantsData } = useListVariantsQuery();
  const { data: vendorsData } = useListVendorsQuery();
  const { data: vehiclesData } = useListVehiclesQuery();

  const [createPurchaseOrder, { isLoading: isCreating }] = useCreatePurchaseOrderMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdatePurchaseOrderStatusMutation();
  const [receiveVehicle, { isLoading: isReceiving }] = useReceiveVehicleMutation();
  const [signPurchaseOrder, { isLoading: isSigning }] = useSignPurchaseOrderMutation();
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isConvertingVehicle, setIsConvertingVehicle] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const [hasDrawnSig, setHasDrawnSig] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [receivingPo, setReceivingPo] = useState<PurchaseOrderDto | null>(null);

  // Form State for Create PO
  const [formBranchId, setFormBranchId] = useState(activeBranch?.id || branches[0]?.id || "");
  const [formVendorId, setFormVendorId] = useState("");
  const [formOrderDate, setFormOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDeliveryDate, setFormDeliveryDate] = useState("");
  const [formUpfrontPaid, setFormUpfrontPaid] = useState<number>(0);
  const [formInstallmentsCount, setFormInstallmentsCount] = useState<number>(1);
  const [formPaymentTermsType, setFormPaymentTermsType] = useState<PaymentTermsType>("net_terms");
  const [formPaymentTermsDays, setFormPaymentTermsDays] = useState<number>(30);
  const [formPaymentTermsConfig, setFormPaymentTermsConfig] = useState<string | null>("Net 30");
  const [formPaymentScheduleSummary, setFormPaymentScheduleSummary] = useState<string>("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<CreatePurchaseOrderItemInput[]>([
    { variantId: "", quantity: 1, unitPrice: 0, vin: "", color: "", notes: "" },
  ]);
  const [isChassisModalOpen, setIsChassisModalOpen] = useState(false);
  const [chassisByUnitKey, setChassisByUnitKey] = useState<Record<string, string>>({});
  const [draftChassisByUnitKey, setDraftChassisByUnitKey] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);

  // Form State for Receiving Vehicle
  const [recvItemId, setRecvItemId] = useState("");
  const [recvVin, setRecvVin] = useState("");
  const [recvPlate, setRecvPlate] = useState("");
  const [recvKeyNumber, setRecvKeyNumber] = useState("");
  const [recvColor, setRecvColor] = useState("White");
  const [recvMileage, setRecvMileage] = useState(15);
  const [recvRegExpiry, setRecvRegExpiry] = useState("");
  const [recvInsExpiry, setRecvInsExpiry] = useState("");
  const [recvNotes, setRecvNotes] = useState("");
  const [recvError, setRecvError] = useState<string | null>(null);

  const purchaseOrders = useMemo(() => data?.data ?? [], [data?.data]);
  const totalPurchaseOrders = data?.pagination?.totalItems ?? purchaseOrders.length;
  const variants = useMemo(() => variantsData?.data ?? [], [variantsData?.data]);

  const expandedVehicleUnits = useMemo(() => {
    const units: Array<{
      key: string;
      rowIndex: number;
      unitIndex: number;
      variantId: string;
      variantLabel: string;
      color: string;
      unitPrice: number;
      notes?: string | null;
    }> = [];
    formItems.forEach((item, rowIndex) => {
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const v = variants.find((vr) => vr.id === item.variantId);
      const variantLabel = v ? `${v.make} ${v.model} (${v.trim})` : "—";
      for (let u = 0; u < qty; u++) {
        units.push({
          key: `${rowIndex}-${u}`,
          rowIndex,
          unitIndex: u,
          variantId: item.variantId,
          variantLabel,
          color: item.color || "",
          unitPrice: Number(item.unitPrice) || 0,
          notes: item.notes ?? null,
        });
      }
    });
    return units;
  }, [formItems, variants]);
  const vendors = useMemo(() => vendorsData?.data ?? [], [vendorsData?.data]);
  const allFleetVehicles = useMemo(() => vehiclesData?.data ?? [], [vehiclesData?.data]);

  const paginatedPurchaseOrders = purchaseOrders;

  const stats = useMemo(() => {
    const total = purchaseOrders.length;
    const pending = purchaseOrders.filter((p) => p.status === "pending_approval").length;
    const active = purchaseOrders.filter(
      (p) => p.status === "approved" || p.status === "partially_received",
    ).length;
    const totalObligations = purchaseOrders.reduce(
      (sum, p) => sum + Number(p.totalAmount || 0),
      0,
    );
    return { total, pending, active, totalObligations };
  }, [purchaseOrders]);

  const formCalculatedTotal = useMemo(() => {
    return formItems.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
      0,
    );
  }, [formItems]);

  function handleOpenCreateModal() {
    const defaultVendor = vendors[0];
    setFormBranchId(activeBranch?.id || branches[0]?.id || "");
    setFormVendorId(defaultVendor?.id || "");
    setFormOrderDate(new Date().toISOString().slice(0, 10));
    setFormDeliveryDate("");
    setFormUpfrontPaid(0);
    setFormInstallmentsCount(1);
    if (defaultVendor) {
      const terms = formatVendorPaymentTerms(defaultVendor, isRtl);
      setFormPaymentTermsType(terms.type);
      setFormPaymentTermsDays(defaultVendor.paymentTermsDays ?? 30);
      setFormPaymentTermsConfig(defaultVendor.paymentTermsConfig || null);
    } else {
      setFormPaymentTermsType("net_terms");
      setFormPaymentTermsDays(30);
      setFormPaymentTermsConfig("Net 30");
    }
    setFormPaymentScheduleSummary("");
    setFormNotes("");
    const defaultVariantId = variants[0]?.id || "";
    setFormItems([
      { variantId: defaultVariantId, quantity: 1, unitPrice: 0, vin: "", color: "", notes: "" },
      { variantId: defaultVariantId, quantity: 1, unitPrice: 0, vin: "", color: "", notes: "" },
      { variantId: defaultVariantId, quantity: 1, unitPrice: 0, vin: "", color: "", notes: "" },
    ]);
    setCreateError(null);
    setIsCreateModalOpen(true);
  }

  function handleAddLineItem() {
    setFormItems((prev) => [
      ...prev,
      {
        variantId: variants[0]?.id || "",
        quantity: 1,
        unitPrice: 0,
        notes: "",
      },
    ]);
  }

  function handleRemoveLineItem(index: number) {
    if (formItems.length <= 1) return;
    setFormItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleItemChange(
    index: number,
    field: keyof CreatePurchaseOrderItemInput,
    val: any,
  ) {
    setFormItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, [field]: val };
      return copy;
    });
  }

  function handlePrintLpo(po: PurchaseOrderDto) {
    const printWin = window.open("", "_blank", "width=900,height=1000");
    if (!printWin) {
      window.print();
      return;
    }

    const tz = po.companyTimezone || activeBranch?.timezone || undefined;
    const orderDateStr = formatCompanyDate(po.orderDate, { timezone: tz, locale: "en-GB" });
    const companyTitle = po.companyName || po.branchName || "Company";
    const matchedVendor = vendors.find((v) => v.id === po.vendorId);
    const attentionPerson = matchedVendor?.contactPerson?.trim() || "";
    const companyHeaderHtml = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:2px solid #1f2937;padding-bottom:12px;margin-bottom:18px;">
        <div style="display:flex;align-items:center;">
          ${po.companyLogoUrl ? `<img src="${po.companyLogoUrl}" alt="${companyTitle}" style="height:30px;max-width:120px;width:auto;object-fit:contain;" />` : `<div style="font-size:14px;font-weight:700;color:#111;">${companyTitle}</div>`}
        </div>
        ${
          po.parentCompanyLogoUrl
            ? `<div style="display:flex;align-items:center;">
                <img src="${po.parentCompanyLogoUrl}" alt="${po.parentCompanyName || "Parent"}" style="height:28px;max-width:110px;width:auto;object-fit:contain;" />
              </div>`
            : ""
        }
      </div>
    `;

    const rowsHtml = (po.items ?? [])
      .map((item, idx) => {
        const v = variants.find((vr) => vr.id === item.variantId);
        const variation = v ? `${v.make} ${v.model} ${v.trim}` : item.variantId;
        const year = v?.modelYear || "—";
        return `
          <tr>
            <td style="text-align:center;font-family:monospace;">${idx + 1}</td>
            <td style="font-weight:600;">${variation}</td>
            <td style="font-family:monospace;">${item.vin || "—"}</td>
            <td style="text-align:center;font-family:monospace;">${year}</td>
            <td style="text-align:center;">${item.color || "—"}</td>
            <td style="text-align:center;font-family:monospace;">${item.quantity}</td>
            <td style="text-align:right;font-family:monospace;font-weight:600;">${Number(item.unitPrice).toLocaleString()} ${po.currency}</td>
          </tr>`;
      })
      .join("");

    const termsLines = (po.notes || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          Boolean(l) &&
          !l.startsWith("[Payment Terms & Schedule:") &&
          !l.startsWith("[شروط الدفع والجدولة:"),
      );
    const termsHtml =
      termsLines.length > 0
        ? termsLines
            .map((line, i) => `<div>${/^\d+[-.)]/.test(line) ? line : `${i + 1}- ${line}`}</div>`)
            .join("")
        : `<div>1- Payment: As per agreed purchase order terms.</div>
           <div>2- Delivery: Vehicles must match the specified chassis numbers and colors.</div>`;

    const [parsedSignerName, parsedSignerRole] = (po.signedByName || "").split("|");
    const sigHtml = po.signatureDataUrl
      ? `<div style="text-align:center;">
           <img src="${po.signatureDataUrl}" alt="Signature" style="height:52px;max-width:180px;object-fit:contain;display:block;margin:0 auto -4px auto;" />
           <div style="border-top:1px solid #374151;padding-top:6px;font-weight:700;font-size:11px;color:#111;">${parsedSignerName || "Authorized Signer"}</div>
           <div style="font-size:10px;color:#6b7280;margin-top:2px;">${parsedSignerRole || "Authorized Signature"}${po.signedAt ? ` • ${formatCompanyDateTime(po.signedAt, { timezone: tz, locale: "en-GB" })}` : ""}</div>
         </div>`
      : `<div style="text-align:center;margin-top:44px;">
           <div style="border-top:1px solid #374151;padding-top:6px;font-size:11px;font-weight:600;color:#4b5563;">Authorized Signature</div>
         </div>`;

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>LPO - ${po.poNumber}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 36px; font-size: 12px; }
    .top-bar { display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 24px; }
    .header-box { border-bottom: 1px solid #ccc; padding-bottom: 14px; margin-bottom: 18px; }
    .company-name { font-size: 16px; font-weight: 700; }
    .subject { text-align: center; margin: 18px 0; }
    .subject span { border-bottom: 2px solid #111; padding-bottom: 2px; font-size: 14px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0 24px; }
    th, td { border: 1px solid #999; padding: 7px 8px; }
    th { background: #1f2937; color: #fff; font-size: 11px; }
    tfoot td { background: #f9fafb; font-weight: 700; }
    .terms { margin-bottom: 24px; line-height: 1.6; }
    .terms-title { font-weight: 700; text-decoration: underline; margin-bottom: 6px; }
    .sig-box { width: 240px; margin-top: 28px; }
    @page { size: auto; margin: 0; }
    @media print { body { margin: 0; padding: 16mm 14mm; } }
  </style>
</head>
<body>
  ${companyHeaderHtml}
  <div class="top-bar" style="margin-bottom:14px;">
    <div>Date : <span style="font-weight:400;">${orderDateStr}</span></div>
    <div>Ref : <span style="font-family:monospace;">${po.poNumber}</span></div>
  </div>
  <div style="margin-bottom:18px;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;line-height:1.6;">
    <div><span style="color:#6b7280;font-weight:600;">To (Vendor) :</span> <strong style="color:#111;">${matchedVendor?.name || po.vendorName || "—"}</strong></div>
    ${attentionPerson ? `<div><span style="color:#6b7280;font-weight:600;">Attention By :</span> <span style="color:#111;">${attentionPerson}</span></div>` : ""}
  </div>
  <div class="subject"><span>Subject: Vehicles Purchase</span></div>
  <p style="line-height:1.6;">
    We at <strong>${companyTitle}</strong> would like to thank you for your support.<br/>
    Kindly find below our LPO.
  </p>
  <table>
    <thead>
      <tr>
        <th style="text-align:center;">NO</th>
        <th style="text-align:left;">VARIATION</th>
        <th style="text-align:left;">CHASSIS #</th>
        <th style="text-align:center;">YEAR</th>
        <th style="text-align:center;">EX COLOR</th>
        <th style="text-align:center;">QTY</th>
        <th style="text-align:right;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr>
        <td colspan="6" style="text-align:right;">Total Amount</td>
        <td style="text-align:right;font-family:monospace;font-size:13px;">${Number(po.totalAmount).toLocaleString()} ${po.currency}</td>
      </tr>
    </tfoot>
  </table>
  <div class="terms">
    <div class="terms-title">Terms &amp; Conditions:</div>
    ${termsHtml}
  </div>
  <p style="line-height:1.6;">
    Thank you and looking forward to doing more business with your company in the future.<br/>
    <strong>Best Regards,</strong>
  </p>
  <div style="display:flex;justify-content:flex-end;margin-top:24px;">
    <div style="width:220px;">${sigHtml}</div>
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`);
    printWin.document.close();
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (!formBranchId || !formVendorId) {
      setCreateError(
        isRtl
          ? "برجاء اختيار الفرع والمورد."
          : "Please select both branch and vendor.",
      );
      return;
    }

    if (formItems.some((it) => !it.variantId || it.quantity <= 0 || it.unitPrice < 0)) {
      setCreateError(
        isRtl
          ? "برجاء التأكد من اختيار فئة السيارة والكمية وسعر الوحدة لكل بند."
          : "Please check all line items for valid variant, quantity, and unit price.",
      );
      return;
    }

    const missingChassisCount = expandedVehicleUnits.filter(
      (u) => !chassisByUnitKey[u.key]?.trim(),
    ).length;
    if (missingChassisCount > 0) {
      setCreateError(
        isRtl
          ? `يجب إدخال رقم الشاصي لجميع السيارات أولاً (متبقي ${missingChassisCount} سيارة بدون رقم شاصي).`
          : `Please enter a Chassis Number for all vehicles (${missingChassisCount} missing).`,
      );
      return;
    }

    if (!formNotes.trim()) {
      setCreateError(
        isRtl
          ? "برجاء كتابة الشروط والأحكام (Terms & Conditions) الخاصة بأمر الشراء."
          : "Please enter the Terms & Conditions for this purchase order.",
      );
      return;
    }

    const combinedNotes = [
      formNotes.trim(),
      formPaymentScheduleSummary
        ? `[${isRtl ? "شروط الدفع والجدولة" : "Payment Terms & Schedule"}: ${formPaymentScheduleSummary}]`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const expandedItems = expandedVehicleUnits.map((unit) => ({
        variantId: unit.variantId,
        quantity: 1,
        unitPrice: unit.unitPrice,
        vin: chassisByUnitKey[unit.key]?.trim() || null,
        color: unit.color?.trim() || null,
        notes: unit.notes?.trim() || null,
      }));

      const created = await createPurchaseOrder({
        branchId: formBranchId,
        vendorId: formVendorId,
        orderDate: formOrderDate,
        expectedDeliveryDate: formDeliveryDate || null,
        totalAmount: formCalculatedTotal,
        upfrontPaid: Number(formUpfrontPaid) || 0,
        installmentsCount: Number(formInstallmentsCount) || 1,
        notes: combinedNotes || null,
        items: expandedItems,
      }).unwrap();

      setIsCreateModalOpen(false);
      setChassisByUnitKey({});
      setSelectedPoForDetails(created?.data ?? (created as any));
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (created?.data) {
        setTimeout(() => {
          handlePrintLpo(created.data);
        }, 300);
      }
    } catch (err: any) {
      setCreateError(
        err?.data?.error?.message ||
          (isRtl
            ? "تعذر إنشاء أمر الشراء."
            : "Failed to create purchase order."),
      );
    }
  }

  function handleOpenReceiveModal(po: PurchaseOrderDto, targetItemId?: string) {
    const targetItem = targetItemId
      ? po.items?.find((it) => it.id === targetItemId)
      : (po.items?.find((it) => it.receivedCount < it.quantity) || po.items?.[0]);

    if (targetItem) {
      dispatch(
        setPendingFleetReceiveContext({
          purchaseOrderId: po.id,
          itemId: targetItem.id,
          variantId: targetItem.variantId,
          branchId: po.branchId,
          poNumber: po.poNumber,
          unitPrice: targetItem.unitPrice,
          vin: targetItem.vin || "",
          color: targetItem.color || "",
        }),
      );
      setIsConvertingVehicle(true);
    }
  }

  async function handleReceiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receivingPo) return;
    setRecvError(null);

    if (!recvPlate.trim() || !recvKeyNumber.trim()) {
      setRecvError(
        isRtl
          ? "برجاء كتابة رقم اللوحة ورقم المفتاح."
          : "License Plate and Key Number are required.",
      );
      return;
    }

    try {
      await receiveVehicle({
        purchaseOrderId: receivingPo.id,
        itemId: recvItemId,
        branchId: receivingPo.branchId,
        vin: recvVin.trim().toUpperCase(),
        licensePlate: recvPlate.trim().toUpperCase(),
        keyNumber: recvKeyNumber.trim() || null,
        color: recvColor.trim() || "White",
        mileageOdometer: Number(recvMileage) || 0,
        registrationExpiry: recvRegExpiry || null,
        insuranceExpiry: recvInsExpiry || null,
        notes: recvNotes.trim() || null,
      }).unwrap();

      setReceivingPo(null);
    } catch (err: any) {
      setRecvError(
        err?.data?.error?.message ||
          (isRtl
            ? "تعذر تسجيل استلام السيارة."
            : "Failed to receive vehicle asset."),
      );
    }
  }

  if (isConvertingVehicle) {
    return (
      <ConvertPoVehiclePage
        lang={isRtl ? "ar" : "en"}
        onBack={() => setIsConvertingVehicle(false)}
        onSuccess={() => setIsConvertingVehicle(false)}
      />
    );
  }

  if (selectedPoForDetails) {
    const po =
      purchaseOrders.find((p) => p.id === selectedPoForDetails.id) ??
      selectedPoForDetails;
    const totalQty = po.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
    const totalRcv = po.items?.reduce((acc, it) => acc + it.receivedCount, 0) || 0;
    const progressPct = totalQty > 0 ? Math.round((totalRcv / totalQty) * 100) : 0;
    const statusConfig = PO_STATUS_LABELS[po.status] || PO_STATUS_LABELS.draft;

    return (
      <>
        {/* Formal Printable LPO / Purchase Order Document */}
        <div
          className="hidden print:block bg-white p-8 text-black font-sans"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {/* Top Bar: Date & Ref */}
          <div className="flex items-center justify-between text-xs font-semibold mb-6">
            <div>
              Date :{" "}
              <span className="font-normal">
                {new Date(po.orderDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              Ref : <span className="font-mono font-bold">{po.poNumber}</span>
            </div>
          </div>

          {/* Company & Parent Company Header */}
          <div className="flex items-center justify-between border-b border-gray-300 pb-4 mb-5">
            <div>
              <div className="text-base font-bold text-gray-900">
                {po.companyName || po.branchName || "Company"}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Attention By : <span className="font-semibold text-gray-900">{po.vendorName || "—"}</span>
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="text-center mb-5">
            <h1 className="inline-block border-b-2 border-black pb-0.5 text-sm font-bold tracking-wide">
              Subject: Vehicles Purchase
            </h1>
          </div>

          {/* Intro */}
          <p className="text-xs text-gray-800 leading-relaxed mb-4">
            We at <span className="font-semibold">{po.companyName || po.branchName || "our company"}</span> would like to thank you for your support.
            <br />
            Kindly find below our LPO.
          </p>

          {/* Vehicles Table matching LPO format */}
          <table className="w-full border-collapse border border-gray-400 text-xs mb-6">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-400 px-2.5 py-2 text-center">NO</th>
                <th className="border border-gray-400 px-2.5 py-2 text-start">VARIATION</th>
                <th className="border border-gray-400 px-2.5 py-2 text-start">CHASSIS #</th>
                <th className="border border-gray-400 px-2.5 py-2 text-center">YEAR</th>
                <th className="border border-gray-400 px-2.5 py-2 text-center">EX COLOR</th>
                <th className="border border-gray-400 px-2.5 py-2 text-center">QTY</th>
                <th className="border border-gray-400 px-2.5 py-2 text-end">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {(po.items ?? []).map((item, idx) => {
                const v = variants.find((vr) => vr.id === item.variantId);
                return (
                  <tr key={item.id}>
                    <td className="border border-gray-300 px-2.5 py-2 text-center font-mono">
                      {idx + 1}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 font-semibold">
                      {v ? `${v.make} ${v.model} ${v.trim}` : item.variantId}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 font-mono">
                      {item.vin || "—"}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 text-center font-mono">
                      {v?.modelYear || "—"}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 text-center">
                      {item.color || "—"}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 text-center font-mono">
                      {item.quantity}
                    </td>
                    <td className="border border-gray-300 px-2.5 py-2 text-end font-mono font-semibold">
                      {Number(item.unitPrice).toLocaleString()} {po.currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={6} className="border border-gray-300 px-2.5 py-2 text-end">
                  Total Amount
                </td>
                <td className="border border-gray-300 px-2.5 py-2 text-end font-mono text-sm">
                  {Number(po.totalAmount).toLocaleString()} {po.currency}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Terms & Conditions (Numbered 1-, 2-, 3-...) */}
          <div className="mb-6 text-xs">
            <div className="font-bold underline mb-2">Terms &amp; Conditions:</div>
            <div className="space-y-1 text-gray-800">
              {(po.notes || "")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, i) => (
                  <div key={i}>
                    {/^\d+[-.)]/.test(line) ? line : `${i + 1}- ${line}`}
                  </div>
                ))}
              {!po.notes && (
                <>
                  <div>1- Payment: As per agreed purchase order terms.</div>
                  <div>2- Delivery: Vehicles must match the specified chassis numbers and colors.</div>
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-800 mb-8">
            Thank you and looking forward to doing more business with your company in the future.
            <br />
            <span className="font-semibold">Best Regards,</span>
          </p>

          {/* Electronic Signature Block */}
          <div className="flex items-end justify-between pt-4">
            <div className="w-64">
              {po.signatureDataUrl ? (
                <div className="space-y-1">
                  <img
                    src={po.signatureDataUrl}
                    alt="Authorized Signature"
                    className="h-16 object-contain"
                  />
                  <div className="border-t border-gray-400 pt-1 text-[11px] font-semibold">
                    {po.signedByName || "Authorized Signer"}
                  </div>
                  {po.signedAt && (
                    <div className="text-[10px] text-gray-500">
                      Signed: {new Date(po.signedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-400 pt-2 text-xs text-gray-600">
                  Authorized Signature
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedPoForDetails(null)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-revix-primary hover:underline"
            >
              <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
              <span>{isRtl ? "الرجوع لأوامر الشراء" : "Back to Purchase Orders"}</span>
            </button>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-xl font-bold text-revix-dark">
                {po.poNumber}
              </h1>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.badgeClass}`}
              >
                {isRtl ? statusConfig.ar : statusConfig.en}
              </span>
            </div>
            <p className="text-xs text-revix-secondary">
              {isRtl ? "تاريخ الطلب:" : "Order Date:"} {po.orderDate}
              {po.expectedDeliveryDate
                ? ` • ${isRtl ? "التسليم المتوقع:" : "Expected:"} ${po.expectedDeliveryDate}`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrintLpo(po)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 py-1.5 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
            >
              <RevixIcon name="file-text" size={14} />
              <span>{isRtl ? "تحميل PDF / طباعة" : "Download PDF / Print"}</span>
            </button>
            {canApprovePo && (
              <button
                type="button"
                onClick={() => {
                  setHasDrawnSig(Boolean(po.signatureDataUrl));
                  setIsSignModalOpen(true);
                  if (po.signatureDataUrl) {
                    setTimeout(() => {
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      const img = new Image();
                      img.onload = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      };
                      img.src = po.signatureDataUrl!;
                    }, 50);
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-primary/30 bg-revix-primary/10 px-3 py-1.5 text-xs font-semibold text-revix-primary hover:bg-revix-primary/20 transition-colors"
              >
                <RevixIcon name="check-circle-2" size={14} />
                <span>
                  {po.signatureDataUrl
                    ? isRtl
                      ? "تحديث التوقيع الإلكتروني"
                      : "Update E-Signature"
                    : isRtl
                      ? "توقيع أمر الشراء إلكترونياً"
                      : "Sign PO (E-Signature)"}
                </span>
              </button>
            )}
            {(po.status === "draft" || po.status === "pending_approval") && canApprovePo && (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => updateStatus({ id: po.id, status: "approved" })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50"
              >
                <RevixIcon name="shield-check" size={14} />
                <span>{isRtl ? "اعتماد أمر الشراء" : "Approve Purchase Order"}</span>
              </button>
            )}
            {(po.status === "approved" || po.status === "partially_received") && totalQty - totalRcv > 0 && (
              <button
                type="button"
                onClick={() => handleOpenReceiveModal(po)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover"
              >
                <RevixIcon name="car-front" size={14} />
                <span>{isRtl ? "تحويل سيارة للأصول" : "Convert Car to Asset"}</span>
              </button>
            )}
            {po.status !== "cancelled" && po.status !== "completed" && (
              <button
                type="button"
                onClick={() => setPendingDeletePo(po)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <RevixIcon name="trash-2" size={14} />
                <span>{isRtl ? "حذف / إلغاء" : "Delete / Cancel"}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-revix-border bg-revix-surface/60 p-4 text-xs sm:grid-cols-4">
          <div>
            <span className="block text-[10px] text-revix-muted">{isRtl ? "المورد" : "Vendor"}</span>
            <span className="font-semibold text-revix-dark">{po.vendorName || "Vendor"}</span>
          </div>
          <div>
            <span className="block text-[10px] text-revix-muted">{isRtl ? "فرع الاستلام" : "Target Branch"}</span>
            <span className="font-semibold text-revix-dark">{po.companyName || po.branchName || "Company"}</span>
          </div>
          <div>
            <span className="block text-[10px] text-revix-muted">{isRtl ? "إجمالي المبلغ" : "Total Amount"}</span>
            <span className="font-mono font-bold text-revix-dark">{Number(po.totalAmount).toLocaleString()} {po.currency}</span>
          </div>
          <div>
            <span className="block text-[10px] text-revix-muted">{isRtl ? "المتبقي بالأقساط" : "Remaining Balance"}</span>
            <span className="font-mono font-bold text-revix-primary">{Number(po.remainingAmount).toLocaleString()} {po.currency}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-revix-border bg-revix-white px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-revix-secondary">{isRtl ? "خطة السداد:" : "Payment Terms:"}</span>
            {(po as any).paymentMethod === "cash" && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">
                <RevixIcon name="check-circle-2" className="h-3 w-3" />
                <span>{isRtl ? "كاش بالكامل" : "Full Cash"}</span>
              </span>
            )}
            {(po as any).paymentMethod === "down_payment_installments" && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-200">
                <RevixIcon name="wallet" className="h-3 w-3" />
                <span>
                  {isRtl
                    ? `مقدم ${po.upfrontPaid.toLocaleString()} ${po.currency} + ${po.installmentsCount || 0} أقساط`
                    : `Down ${po.upfrontPaid.toLocaleString()} ${po.currency} + ${po.installmentsCount || 0} installments`}
                </span>
              </span>
            )}
            {(po as any).paymentMethod === "deferred_credit" && (
              <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 font-bold text-sky-700 border border-sky-200">
                <RevixIcon name="clock" className="h-3 w-3" />
                <span>
                  {isRtl
                    ? `آجل تجاري (المتبقي: ${po.remainingAmount.toLocaleString()} ${po.currency})`
                    : `Credit Terms (Remaining: ${po.remainingAmount.toLocaleString()} ${po.currency})`}
                </span>
              </span>
            )}
            {(po as any).paymentMethod !== "cash" &&
              (po as any).paymentMethod !== "down_payment_installments" &&
              (po as any).paymentMethod !== "deferred_credit" && (
                <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 font-bold text-sky-700 border border-sky-200">
                  <RevixIcon name="clock" className="h-3 w-3" />
                  <span>
                    {Number(po.remainingAmount) === 0
                      ? isRtl
                        ? "مدفوع بالكامل"
                        : "Paid in Full"
                      : isRtl
                        ? `آجل تجاري (المتبقي: ${Number(po.remainingAmount).toLocaleString()} ${po.currency})`
                        : `Credit Terms (Remaining: ${Number(po.remainingAmount).toLocaleString()} ${po.currency})`}
                  </span>
                </span>
              )}
          </div>
          {po.notes && <span className="text-revix-secondary">{po.notes}</span>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-revix-primary/20 bg-revix-primary/5 p-3 text-xs">
          <div className="flex items-center gap-2">
            <RevixIcon name="car-front" className="h-4 w-4 text-revix-primary" />
            <span className="font-bold text-revix-dark">
              {isRtl ? `إجمالي السيارات: ${totalQty}` : `Total Vehicles: ${totalQty}`}
            </span>
            <span className="text-revix-secondary">({progressPct}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-revix-accent-soft px-2 py-0.5 font-semibold text-revix-accent">
              {totalRcv} {isRtl ? "تم تحويلها للأصول" : "in fleet"}
            </span>
            {totalQty - totalRcv > 0 && (
              <span className="rounded-md bg-revix-warning-soft px-2 py-0.5 font-semibold text-revix-warning">
                {totalQty - totalRcv} {isRtl ? "بانتظار الوصول" : "pending"}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-revix-border bg-revix-white">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/50 text-[11px] font-semibold uppercase tracking-wide text-revix-secondary">
                <th className="px-4 py-3 text-start">#</th>
                <th className="px-4 py-3 text-start">
                  {isRtl ? "الفريان / الموديل" : "Variant"}
                </th>
                <th className="px-4 py-3 text-start">SIPP</th>
                <th className="px-4 py-3 text-start">
                  {isRtl ? "اللون" : "Color"}
                </th>
                <th className="px-4 py-3 text-start">
                  {isRtl ? "رقم الشاصي (VIN)" : "Chassis Number"}
                </th>
                <th className="px-4 py-3 text-start">
                  {isRtl ? "السعر" : "Unit Price"}
                </th>
                <th className="px-4 py-3 text-start">
                  {isRtl ? "الحالة" : "Status"}
                </th>
                <th className="px-4 py-3 text-end">
                  {isRtl ? "الإجراء" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/70">
              {po.items?.flatMap((item, itemIdx) => {
                const matchedVariant = variantsData?.data?.find(
                  (v) => v.id === item.variantId,
                );
                const displayVariantName =
                  (item as any).variantName ||
                  (matchedVariant
                    ? `${matchedVariant.make} ${matchedVariant.model} ${matchedVariant.modelYear}`
                    : item.variantId);
                const sippCode =
                  (item as any).sippCode || matchedVariant?.sippCode || "CAR";
                const linkedVehicles = (item as any).receivedVehicles || [];
                const slots = Array.from({ length: item.quantity }, (_, idx) => idx);

                return slots.map((slotIdx) => {
                  const receivedCar = linkedVehicles[slotIdx];
                  const isConverted = Boolean(receivedCar);
                  const displayVin = receivedCar?.vin || item.vin || "—";
                  const displayColor = receivedCar?.color || item.color || "—";

                  return (
                    <tr
                      key={`${item.id}-${slotIdx}`}
                      className="transition-colors hover:bg-revix-surface/40"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-revix-secondary">
                        {itemIdx + 1}
                        {slots.length > 1 ? `.${slotIdx + 1}` : ""}
                      </td>
                      <td className="px-4 py-3 font-semibold text-revix-dark">
                        {displayVariantName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-revix-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-revix-primary">
                          {sippCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-revix-dark">{displayColor}</td>
                      <td className="px-4 py-3 font-mono text-revix-dark">
                        {displayVin}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-revix-dark">
                        {Number(item.unitPrice).toLocaleString()} {po.currency}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            isConverted
                              ? "bg-revix-accent-soft text-revix-accent"
                              : "bg-revix-warning-soft text-revix-warning"
                          }`}
                        >
                          {isConverted
                            ? isRtl
                              ? `بالأسطول (${receivedCar.plateNumber})`
                              : `In Fleet (${receivedCar.plateNumber})`
                            : isRtl
                              ? "بانتظار الوصول"
                              : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        {!isConverted &&
                        (po.status === "approved" ||
                          po.status === "partially_received") ? (
                          <button
                            type="button"
                            onClick={() => handleOpenReceiveModal(po, item.id)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-revix-primary-hover transition-colors"
                          >
                            <RevixIcon name="car-front" size={13} />
                            <span>
                              {isRtl ? "تحويل للأسطول" : "Convert to Fleet Asset"}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-revix-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        <RevixConfirmModal
          isOpen={Boolean(pendingDeletePo)}
          isRtl={isRtl}
          title={isRtl ? "تأكيد حذف / إلغاء أمر الشراء" : "Confirm Delete / Cancel PO"}
          message={
            pendingDeletePo
              ? isRtl
                ? `هل أنت متأكد من إلغاء وحذف أمر الشراء "${pendingDeletePo.poNumber}"؟`
                : `Are you sure you want to cancel purchase order "${pendingDeletePo.poNumber}"?`
              : ""
          }
          confirmLabel={isRtl ? "تأكيد الحذف" : "Confirm Delete"}
          isLoading={isUpdatingStatus}
          onConfirm={async () => {
            if (!pendingDeletePo) return;
            await updateStatus({ id: pendingDeletePo.id, status: "cancelled" });
            setPendingDeletePo(null);
            setSelectedPoForDetails(null);
          }}
          onCancel={() => setPendingDeletePo(null)}
        />

        {/* Electronic Signature Modal */}
        {isSignModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-revix-border bg-revix-surface/30 px-5 py-3.5">
                <h3 className="text-sm font-bold text-revix-dark">
                  {isRtl ? "التوقيع الإلكتروني لأمر الشراء" : "Electronic Signature"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSignModalOpen(false)}
                  className="rounded-lg p-1 text-revix-muted hover:bg-revix-surface hover:text-revix-dark"
                >
                  <RevixIcon name="x" className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs text-revix-secondary">
                  {isRtl
                    ? "وقّع داخل المربع أدناه ليتم حفظ التوقيع في قاعدة البيانات وإظهاره في مستند أمر الشراء:"
                    : "Draw your signature below. It will be stored in the database and printed on the LPO:"}
                </p>
                <div className="overflow-hidden rounded-xl border-2 border-dashed border-revix-border bg-white">
                  <canvas
                    ref={sigCanvasRef}
                    width={380}
                    height={160}
                    className="w-full h-40 cursor-crosshair touch-none"
                    onMouseDown={(e) => {
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      const rect = canvas.getBoundingClientRect();
                      ctx.beginPath();
                      ctx.moveTo(
                        ((e.clientX - rect.left) / rect.width) * canvas.width,
                        ((e.clientY - rect.top) / rect.height) * canvas.height,
                      );
                      ctx.lineWidth = 2.2;
                      ctx.lineCap = "round";
                      ctx.strokeStyle = "#111827";
                      setIsDrawingSig(true);
                      setHasDrawnSig(true);
                    }}
                    onMouseMove={(e) => {
                      if (!isDrawingSig) return;
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      const rect = canvas.getBoundingClientRect();
                      ctx.lineTo(
                        ((e.clientX - rect.left) / rect.width) * canvas.width,
                        ((e.clientY - rect.top) / rect.height) * canvas.height,
                      );
                      ctx.stroke();
                    }}
                    onMouseUp={() => setIsDrawingSig(false)}
                    onMouseLeave={() => setIsDrawingSig(false)}
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      ctx?.clearRect(0, 0, canvas.width, canvas.height);
                      setHasDrawnSig(false);
                    }}
                    className="rounded-lg border border-revix-border px-3 py-1.5 text-xs font-semibold text-revix-secondary hover:bg-revix-surface"
                  >
                    {isRtl ? "مسح" : "Clear"}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSignModalOpen(false)}
                      className="rounded-lg border border-revix-border px-3 py-1.5 text-xs font-semibold text-revix-secondary hover:bg-revix-surface"
                    >
                      {isRtl ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      type="button"
                      disabled={!hasDrawnSig || isSigning}
                      onClick={async () => {
                        const canvas = sigCanvasRef.current;
                        if (!canvas) return;
                        const dataUrl = canvas.toDataURL("image/png");
                        const res = await signPurchaseOrder({
                          id: po.id,
                          signatureDataUrl: dataUrl,
                        }).unwrap();
                        setSelectedPoForDetails(res.data);
                        setIsSignModalOpen(false);
                      }}
                      className="rounded-lg bg-revix-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
                    >
                      {isSigning
                        ? isRtl
                          ? "جاري الحفظ..."
                          : "Saving..."
                        : isRtl
                          ? "حفظ التوقيع"
                          : "Save Signature"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {!isCreateModalOpen && (
        <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "أوامر شراء السيارات (PO)" : "Vehicle Purchase Orders (PO)"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-medium text-revix-dark shadow-xs transition hover:bg-revix-surface active:scale-95 disabled:opacity-50"
          >
            <RevixIcon
              name="refresh-cw"
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-revix-primary" : "text-revix-secondary"}`}
            />
            <span>{isRtl ? "تحديث" : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-revix-white shadow-xs transition hover:bg-revix-primary-hover active:scale-95"
          >
            <RevixIcon name="plus" className="h-4 w-4" />
            <span>{isRtl ? "إنشاء أمر شراء PO" : "New Purchase Order"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "إجمالي أوامر الشراء" : "Total Orders"}
            </span>
            <div className="rounded-md bg-revix-surface p-1.5 text-revix-primary">
              <RevixIcon name="file-text" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "بانتظار الاعتماد" : "Pending Approval"}
            </span>
            <div className="rounded-md bg-revix-warning-soft p-1.5 text-revix-warning">
              <RevixIcon name="clock" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.pending}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "قيد التوريد والاستلام" : "Active In-Flight"}
            </span>
            <div className="rounded-md bg-revix-info-soft p-1.5 text-revix-info">
              <RevixIcon name="car-front" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.active}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "إجمالي الالتزامات المالية" : "Total Obligations"}
            </span>
            <div className="rounded-md bg-revix-accent-soft p-1.5 text-revix-accent">
              <RevixIcon name="wallet" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold tracking-tight text-revix-dark">
            {stats.totalObligations.toLocaleString()}{" "}
            <span className="text-xs font-normal text-revix-secondary">
              {purchaseOrders[0]?.currency || "EGP"}
            </span>
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-revix-border bg-revix-surface/60 p-3 sm:flex-row sm:items-center sm:justify-between">
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
            {isRtl ? "الكل" : "All"} ({purchaseOrders.length})
          </button>
          {(
            [
              "draft",
              "pending_approval",
              "approved",
              "partially_received",
              "completed",
            ] as PurchaseOrderStatus[]
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
              {isRtl ? PO_STATUS_LABELS[st].ar : PO_STATUS_LABELS[st].en}
            </button>
          ))}
        </div>
      </div>

      {/* PO List */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-revix-border bg-revix-white text-xs text-revix-secondary">
          <RevixIcon name="refresh-cw" className="mr-2 h-4 w-4 animate-spin text-revix-primary" />
          {isRtl ? "جاري تحميل أوامر الشراء..." : "Loading purchase orders..."}
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-revix-border bg-revix-white p-10 text-center">
          <div className="rounded-full bg-revix-surface p-3 text-revix-secondary">
            <RevixIcon name="file-text" className="h-8 w-8" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-revix-dark">
            {isRtl ? "لا توجد أوامر شراء مطابقة" : "No purchase orders found"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-revix-secondary">
            {isRtl
              ? "أنشئ أمر شراء جديد للسيارات مع المورد لتسجيل الدفعات واستلام السيارات في الأسطول."
              : "Create vehicle POs with suppliers to track payments and receive cars into your fleet register."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 py-1.5 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" className="h-3.5 w-3.5" />
            <span>{isRtl ? "إنشاء أمر شراء الآن" : "Create PO Now"}</span>
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-revix-border bg-revix-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                    <th className={`py-2.5 px-3 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "رقم الطلب" : "PO Number"}</th>
                    <th className={`py-2.5 px-3 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "المورد" : "Vendor"}</th>
                    <th className={`py-2.5 px-3 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "الشركة" : "Company"}</th>
                    <th className={`py-2.5 px-3 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "التاريخ" : "Order Date"}</th>
                    <th className={`py-2.5 px-3 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "السيارات" : "Cars"}</th>
                    <th className={`py-2.5 px-3 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "الإجمالي" : "Total"}</th>
                    <th className="py-2.5 px-3 text-center">{isRtl ? "الحالة" : "Status"}</th>
                    <th className="py-2.5 px-3 text-center">{isRtl ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-revix-border/60">
                  {paginatedPurchaseOrders.map((po) => {
                    const totalQty = po.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
                    const totalRcv = po.items?.reduce((acc, it) => acc + it.receivedCount, 0) || 0;
                    const statusConfig = PO_STATUS_LABELS[po.status] || PO_STATUS_LABELS.draft;

                    return (
                      <tr
                        key={po.id}
                        onClick={() => setSelectedPoForDetails(po)}
                        className="cursor-pointer transition-colors hover:bg-revix-surface/60"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-revix-dark whitespace-nowrap">{po.poNumber}</td>
                        <td className="py-2.5 px-3 font-semibold text-revix-dark">{po.vendorName || "Vendor"}</td>
                        <td className="py-2.5 px-3 text-revix-secondary">{po.companyName || po.branchName || "—"}</td>
                        <td className="py-2.5 px-3 font-mono text-revix-secondary whitespace-nowrap">{po.orderDate}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-revix-dark">{totalRcv}/{totalQty}</span>
                          <span className="ms-1 text-revix-secondary">{isRtl ? "سيارة" : "cars"}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-revix-dark whitespace-nowrap">
                          {Number(po.totalAmount).toLocaleString()} {po.currency}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.badgeClass}`}>
                            {isRtl ? statusConfig.ar : statusConfig.en}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
              type="button"
              onClick={() => handlePrintLpo(po)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 py-1.5 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
            >
              <RevixIcon name="file-text" size={14} />
              <span>{isRtl ? "تحميل PDF / طباعة" : "Download PDF / Print"}</span>
            </button>
            {canApprovePo && (
              <button
                type="button"
                onClick={() => {
                  setHasDrawnSig(Boolean(po.signatureDataUrl));
                  setIsSignModalOpen(true);
                  if (po.signatureDataUrl) {
                    setTimeout(() => {
                      const canvas = sigCanvasRef.current;
                      if (!canvas) return;
                      const ctx = canvas.getContext("2d");
                      if (!ctx) return;
                      const img = new Image();
                      img.onload = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      };
                      img.src = po.signatureDataUrl!;
                    }, 50);
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-primary/30 bg-revix-primary/10 px-3 py-1.5 text-xs font-semibold text-revix-primary hover:bg-revix-primary/20 transition-colors"
              >
                <RevixIcon name="check-circle-2" size={14} />
                <span>
                  {po.signatureDataUrl
                    ? isRtl
                      ? "تحديث التوقيع الإلكتروني"
                      : "Update E-Signature"
                    : isRtl
                      ? "توقيع أمر الشراء إلكترونياً"
                      : "Sign PO (E-Signature)"}
                </span>
              </button>
            )}
            {(po.status === "draft" || po.status === "pending_approval") && canApprovePo && (
                              <button
                                type="button"
                                disabled={isUpdatingStatus}
                                onClick={() => updateStatus({ id: po.id, status: "approved" })}
                                className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md bg-revix-primary px-2.5 text-[11px] font-semibold text-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50"
                              >
                                <RevixIcon name="check" size={12} />
                                <span>{isRtl ? "موافقة" : "Approve"}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedPoForDetails(po)}
                              title={isRtl ? "عرض التفاصيل" : "View Details"}
                              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-revix-border bg-white text-revix-secondary hover:border-revix-primary/40 hover:text-revix-primary"
                            >
                              <RevixIcon name="eye" size={13} />
                            </button>
                            {po.status !== "cancelled" && po.status !== "completed" && (
                              <button
                                type="button"
                                onClick={() => setPendingDeletePo(po)}
                                title={isRtl ? "حذف / إلغاء الطلب" : "Delete / Cancel PO"}
                                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50"
                              >
                                <RevixIcon name="trash-2" size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          

          <RevixConfirmModal
            isOpen={Boolean(pendingDeletePo)}
            isRtl={isRtl}
            title={isRtl ? "تأكيد حذف / إلغاء أمر الشراء" : "Confirm Delete / Cancel PO"}
            message={
              pendingDeletePo
                ? isRtl
                  ? `هل أنت متأكد من إلغاء وحذف أمر الشراء "${pendingDeletePo.poNumber}"؟`
                  : `Are you sure you want to cancel purchase order "${pendingDeletePo.poNumber}"?`
                : ""
            }
            confirmLabel={isRtl ? "تأكيد الحذف" : "Confirm Delete"}
            isLoading={isUpdatingStatus}
            onConfirm={async () => {
              if (!pendingDeletePo) return;
              await updateStatus({ id: pendingDeletePo.id, status: "cancelled" });
              setPendingDeletePo(null);
            }}
            onCancel={() => setPendingDeletePo(null)}
          />


        {/* Unified Pagination */}
        <div className="overflow-hidden rounded-xl border border-revix-border bg-revix-white shadow-2xs">
          <RevixPagination
            currentPage={page}
            totalItems={totalPurchaseOrders}
            pageSize={pageSize}
            onPageChange={setPage}
            lang={isRtl ? "ar" : "en"}
            itemLabel={isRtl ? "أمر شراء" : "purchase orders"}
          />
        </div>
      </>
    )}

        </>
      )}

      {/* Create PO Full-Page 3-Step Workspace */}
      {isCreateModalOpen && (() => {
        const assignedChassisCount = expandedVehicleUnits.filter((u) =>
          chassisByUnitKey[u.key]?.trim(),
        ).length;
        const totalUnitsCount = expandedVehicleUnits.length;
        const selectedVendorObj = vendors.find((v) => v.id === formVendorId);
        const currencyCode = activeBranch?.currencyCode || "EGP";

        const steps: Array<{ id: 1 | 2 | 3; label: string }> = [
          { id: 1, label: isRtl ? "١. البيانات والسيارات" : "1. Order & Vehicles" },
          { id: 2, label: isRtl ? "٢. أرقام الشاصي" : "2. Chassis Numbers" },
          { id: 3, label: isRtl ? "٣. الدفع والشروط" : "3. Payment & Terms" },
        ];

        return (
          <form onSubmit={handleCreateSubmit} className="mx-auto max-w-5xl space-y-4">
            {/* Top Bar: Back + Title + Primary Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-revix-border pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 py-2 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
                >
                  <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
                  <span>{isRtl ? "رجوع" : "Back"}</span>
                </button>
                <h2 className="text-lg font-bold tracking-tight text-revix-dark">
                  {isRtl ? "إنشاء أمر شراء جديد" : "New Purchase Order"}
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-revix-border bg-revix-white px-4 py-2 text-xs font-semibold text-revix-secondary hover:bg-revix-surface transition-colors"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isCreating && (
                    <RevixIcon name="refresh-cw" className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{isRtl ? "إصدار أمر الشراء" : "Issue Purchase Order"}</span>
                </button>
              </div>
            </div>

            {createError && (
              <div className="rounded-xl border border-revix-alert/30 bg-revix-alert-soft px-4 py-3 text-xs font-medium text-revix-alert">
                {createError}
              </div>
            )}

            {/* Main Full-Width Step Content */}
            <div className="w-full space-y-5">
                {/* SECTION 1: Order Details & Vehicles */}
                <>
                    <div className="rounded-2xl border border-revix-border bg-revix-white p-5 shadow-xs space-y-4">
                      <h3 className="text-sm font-bold text-revix-dark">
                        {isRtl ? "بيانات المورد والتواريخ" : "Supplier & Dates"}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-revix-secondary mb-1.5">
                            {isRtl ? "الشركة" : "Company"}
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={wsContext?.data.company?.name || "—"}
                            className="h-9 w-full rounded-lg border border-revix-border/80 bg-revix-surface/50 px-3 text-xs font-semibold text-revix-dark focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-revix-secondary mb-1.5">
                            {isRtl ? "المورد *" : "Vendor *"}
                          </label>
                          <RevixSelect
                            size="sm"
                            isRtl={isRtl}
                            value={formVendorId}
                            onChange={(e) => {
                              const vId = e.target.value;
                              setFormVendorId(vId);
                              const selectedV = vendors.find((v) => v.id === vId);
                              if (selectedV) {
                                const terms = formatVendorPaymentTerms(selectedV, isRtl);
                                setFormPaymentTermsType(terms.type);
                                setFormPaymentTermsDays(selectedV.paymentTermsDays ?? 30);
                                setFormPaymentTermsConfig(selectedV.paymentTermsConfig || null);
                              }
                            }}
                            placeholder={isRtl ? "اختر المورد..." : "Select vendor..."}
                            buttonClassName="h-9 rounded-lg text-xs"
                            options={vendors.map((v) => ({
                              value: v.id,
                              label: `${v.name} (${v.city})`,
                            }))}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-revix-secondary mb-1.5">
                            {isRtl ? "تاريخ الطلب *" : "Order Date *"}
                          </label>
                          <RevixDatePicker
                            size="sm"
                            isRtl={isRtl}
                            value={formOrderDate}
                            onChange={(val) => setFormOrderDate(val)}
                            buttonClassName="h-9 rounded-lg text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-revix-secondary mb-1.5">
                            {isRtl ? "تاريخ التسليم" : "Expected Delivery"}
                          </label>
                          <RevixDatePicker
                            size="sm"
                            isRtl={isRtl}
                            value={formDeliveryDate}
                            onChange={(val) => setFormDeliveryDate(val)}
                            placeholder={isRtl ? "اختياري..." : "Optional..."}
                            buttonClassName="h-9 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-xs">
                      <div className="flex items-center justify-between border-b border-revix-border/70 px-5 py-3.5">
                        <h3 className="text-sm font-bold text-revix-dark">
                          {isRtl ? "السيارات المطلوبة" : "Vehicles"}
                        </h3>
                        <button
                          type="button"
                          onClick={handleAddLineItem}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary/10 px-3 py-1.5 text-xs font-semibold text-revix-primary hover:bg-revix-primary/20 transition-colors"
                        >
                          <RevixIcon name="plus" size={13} />
                          <span>{isRtl ? "إضافة سيارة" : "Add Row"}</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-start text-xs">
                          <thead>
                            <tr className="border-b border-revix-border/70 bg-revix-surface/40 text-[10px] font-bold uppercase tracking-wide text-revix-muted">
                              <th className="px-4 py-2.5 text-start w-[34%]">{isRtl ? "الفريان" : "Variant"}</th>
                              <th className="px-3 py-2.5 text-start w-[12%]">{isRtl ? "الكمية" : "Qty"}</th>
                              <th className="px-3 py-2.5 text-start w-[20%]">{isRtl ? "السعر" : "Unit Price"}</th>
                              <th className="px-3 py-2.5 text-start w-[20%]">{isRtl ? "اللون" : "Color"}</th>
                              <th className="px-3 py-2.5 text-end w-[11%]">{isRtl ? "الإجمالي" : "Subtotal"}</th>
                              <th className="px-3 py-2.5 w-10" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-revix-border/60">
                            {formItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-2.5">
                                  <RevixSelect
                                    size="sm"
                                    isRtl={isRtl}
                                    value={item.variantId}
                                    onChange={(e) => handleItemChange(idx, "variantId", e.target.value)}
                                    placeholder={isRtl ? "اختر الفريان..." : "Select variant..."}
                                    buttonClassName="h-9 rounded-lg text-xs"
                                    options={variants.map((v) => ({
                                      value: v.id,
                                      label: `${v.make} ${v.model} (${v.trim})`,
                                    }))}
                                  />
                                </td>
                                <td className="px-3 py-2.5">
                                  <input
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                                    className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-2.5 text-xs font-mono font-semibold text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden"
                                  />
                                </td>
                                <td className="px-3 py-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                                    className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-2.5 text-xs font-mono font-semibold text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden"
                                  />
                                </td>
                                <td className="px-3 py-2.5">
                                  <RevixSelect
                                    size="sm"
                                    isRtl={isRtl}
                                    value={item.color ?? ""}
                                    onChange={(e) => handleItemChange(idx, "color", e.target.value)}
                                    placeholder={isRtl ? "اللون..." : "Color..."}
                                    buttonClassName="h-9 rounded-lg text-xs"
                                    options={[
                                      { value: "White", label: isRtl ? "أبيض" : "White" },
                                      { value: "Black", label: isRtl ? "أسود" : "Black" },
                                      { value: "Silver", label: isRtl ? "فضي" : "Silver" },
                                      { value: "Gray", label: isRtl ? "رمادي" : "Gray" },
                                      { value: "Blue", label: isRtl ? "أزرق" : "Blue" },
                                      { value: "Red", label: isRtl ? "أحمر" : "Red" },
                                      { value: "Green", label: isRtl ? "أخضر" : "Green" },
                                      { value: "Gold", label: isRtl ? "ذهبي" : "Gold" },
                                      { value: "Brown", label: isRtl ? "بني" : "Brown" },
                                      { value: "Beige", label: isRtl ? "بيج" : "Beige" },
                                    ]}
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-end font-mono font-semibold text-revix-dark tabular-nums">
                                  {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                                </td>
                                <td className="px-3 py-2.5 text-end">
                                  <button
                                    type="button"
                                    disabled={formItems.length <= 1}
                                    onClick={() => handleRemoveLineItem(idx)}
                                    className="rounded-lg p-1.5 text-revix-muted hover:bg-revix-alert-soft hover:text-revix-alert disabled:opacity-30 transition-colors"
                                  >
                                    <RevixIcon name="trash-2" className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between border-t border-revix-border/70 bg-revix-surface/30 px-5 py-3 text-xs font-bold text-revix-dark">
                        <span>
                          {isRtl
                            ? `إجمالي السيارات: ${totalUnitsCount}`
                            : `Total Vehicles: ${totalUnitsCount}`}
                        </span>
                        <span className="font-mono text-sm text-revix-primary tabular-nums">
                          {formCalculatedTotal.toLocaleString()} {currencyCode}
                        </span>
                      </div>
                    </div>
                  </>

                {/* SECTION 2: Chassis Numbers */}
                {expandedVehicleUnits.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-revix-border/70 px-5 py-4">
                      <div>
                        <h3 className="text-sm font-bold text-revix-dark">
                          {isRtl ? "أرقام الشاصي للسيارات *" : "Assign Chassis Numbers *"}
                        </h3>
                      </div>
                      <span className="rounded-full bg-revix-primary/10 px-3 py-1 text-xs font-mono font-bold text-revix-primary">
                        {assignedChassisCount} / {totalUnitsCount}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-start text-xs">
                        <thead>
                          <tr className="border-b border-revix-border/70 bg-revix-surface/40 text-[10px] font-bold uppercase tracking-wide text-revix-muted">
                            <th className="px-4 py-2.5 text-start w-12">#</th>
                            <th className="px-3 py-2.5 text-start">{isRtl ? "الفريان" : "Variant"}</th>
                            <th className="px-3 py-2.5 text-start w-28">{isRtl ? "اللون" : "Color"}</th>
                            <th className="px-3 py-2.5 text-start w-28">{isRtl ? "السعر" : "Price"}</th>
                            <th className="px-4 py-2.5 text-start w-96">
                              {isRtl ? "رقم الشاصي *" : "Chassis Number *"}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-revix-border/60">
                          {expandedVehicleUnits.map((unit, i) => (
                            <tr key={unit.key}>
                              <td className="px-4 py-2.5 font-mono font-semibold text-revix-secondary">
                                {i + 1}
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-revix-dark">
                                {unit.variantLabel}
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-revix-dark">
                                {unit.color || "—"}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-semibold text-revix-dark tabular-nums">
                                {unit.unitPrice.toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5">
                                <input
                                  type="text"
                                  value={chassisByUnitKey[unit.key] ?? ""}
                                  onChange={(e) =>
                                    setChassisByUnitKey((prev) => ({
                                      ...prev,
                                      [unit.key]: e.target.value.toUpperCase(),
                                    }))
                                  }
                                  placeholder="e.g. 1HGCR2F83HA001234"
                                  className="h-10 w-full rounded-lg border border-revix-border bg-revix-white px-3.5 text-sm font-mono uppercase text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SECTION 3: Payment & Terms */}
                <div className="overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-revix-border/70 px-5 py-4">
                      <h3 className="text-sm font-bold text-revix-dark">
                        {isRtl ? "الدفع والشروط والأحكام" : "Payment & Terms"}
                      </h3>
                      {selectedVendorObj && (
                        <span className="text-[11px] font-semibold text-revix-secondary">
                          {formatVendorPaymentTerms(selectedVendorObj, isRtl).label}
                        </span>
                      )}
                    </div>

                    <div className="p-5 space-y-5">
                      <PaymentTermsSelector
                        valueType={formPaymentTermsType}
                        valueDays={formPaymentTermsDays}
                        valueConfig={formPaymentTermsConfig}
                        totalAmount={formCalculatedTotal}
                        currency={currencyCode}
                        upfrontPaid={formUpfrontPaid}
                        installmentsCount={formInstallmentsCount}
                        isRtl={isRtl}
                        onChange={(payload) => {
                          setFormPaymentTermsType(payload.type);
                          setFormPaymentTermsDays(payload.days);
                          setFormPaymentTermsConfig(payload.config || null);
                          if (typeof payload.upfrontPaid === "number") {
                            setFormUpfrontPaid(payload.upfrontPaid);
                          }
                          if (typeof payload.installmentsCount === "number") {
                            setFormInstallmentsCount(payload.installmentsCount);
                          }
                          if (payload.scheduleSummary) {
                            setFormPaymentScheduleSummary(payload.scheduleSummary);
                          }
                        }}
                      />

                      <div className="border-t border-revix-border/60 pt-4">
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-revix-secondary mb-1.5">
                          {isRtl ? "الشروط والأحكام *" : "Terms & Conditions *"}
                        </label>
                        <textarea
                          rows={4}
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          placeholder={
                            isRtl
                              ? "اكتب كل شرط في سطر جديد..."
                              : "Write each term on a new line..."
                          }
                          className="w-full rounded-lg border border-revix-border bg-revix-white p-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 border-t border-revix-border/70 bg-revix-surface/30 px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="rounded-lg border border-revix-border bg-revix-white px-4 py-2 text-xs font-semibold text-revix-secondary hover:bg-revix-surface transition-colors"
                      >
                        {isRtl ? "إلغاء" : "Cancel"}
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50 transition-colors"
                      >
                        {isCreating && (
                          <RevixIcon name="refresh-cw" className="h-3.5 w-3.5 animate-spin" />
                        )}
                        <span>{isRtl ? "إصدار أمر الشراء" : "Issue Purchase Order"}</span>
                      </button>
                    </div>
                  </div>
              </div>
          </form>
        );
      })()}

      {/* Receive & Convert Vehicle Modal */}
      {receivingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-revix-border bg-white shadow-dialog animate-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-revix-border px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-revix-dark">
                  {isRtl ? "استلام وتحويل سيارة إلى أصول الأسطول" : "Receive & Convert Car to Fleet Asset"}
                </h2>
                <p className="mt-0.5 text-xs text-revix-secondary font-mono">
                  {isRtl ? "أمر الشراء:" : "PO:"} {receivingPo.poNumber} • {receivingPo.branchName || "Branch"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceivingPo(null)}
                className="rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-colors"
              >
                <RevixIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleReceiveSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {recvError && (
                  <div className="rounded-lg bg-revix-alert-soft p-3 text-xs text-revix-alert">
                    {recvError}
                  </div>
                )}

                {/* Selected Car Highlight Card */}
                {(() => {
                  const currentItem = receivingPo.items?.find((it) => it.id === recvItemId);
                  const currentVariant = variants.find((v) => v.id === currentItem?.variantId);
                  return (
                    <div className="rounded-xl border border-revix-primary/25 bg-revix-primary/5 p-3.5 text-xs text-revix-dark">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-semibold text-revix-primary uppercase tracking-wider">
                            {isRtl ? "فئة السيارة المراد تحويلها للأصول" : "Target Vehicle Variant"}
                          </span>
                          <h4 className="text-sm font-bold mt-0.5">
                            {currentVariant
                              ? `${currentVariant.make} ${currentVariant.model} ${currentVariant.modelYear} (${currentVariant.trim})`
                              : "Vehicle Variant"}
                          </h4>
                          <p className="text-revix-secondary mt-0.5">
                            {isRtl ? "المورد:" : "Vendor:"} <span className="font-semibold text-revix-dark">{receivingPo.vendorName}</span> • {isRtl ? "فرع الاستلام:" : "Target:"} <span className="font-semibold text-revix-dark">{receivingPo.branchName}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-[11px] font-bold text-revix-primary border border-revix-border">
                            {currentVariant?.sippCode || "ICAR"}
                          </span>
                          {currentItem && (
                            <p className="mt-1 font-semibold text-revix-accent">
                              {isRtl ? "مستلم:" : "Received:"} {currentItem.receivedCount} / {currentItem.quantity}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Item Selector if multiple items */}
                {receivingPo.items && receivingPo.items.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark mb-1">
                      {isRtl ? "نوع السيارة في أمر الشراء" : "Select Vehicle Item from PO"} *
                    </label>
                    <RevixSelect
                      size="sm"
                      isRtl={isRtl}
                      value={recvItemId}
                      onChange={(e) => setRecvItemId(e.target.value)}
                      buttonClassName="h-9 rounded-lg text-xs"
                      options={receivingPo.items.map((it) => {
                        const itVar = variants.find((v) => v.id === it.variantId);
                        return {
                          value: it.id,
                          label: `${itVar ? `${itVar.make} ${itVar.model}` : "Item"} (${it.receivedCount}/${it.quantity} ${isRtl ? "مستلم" : "received"})`,
                        };
                      })}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark">
                      {isRtl ? "رقم الشاسيه (VIN)" : "Chassis / VIN Number"} *
                    </label>
                    <input
                      type="text"
                      required
                      value={recvVin}
                      onChange={(e) => setRecvVin(e.target.value.toUpperCase())}
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
                      value={recvPlate}
                      onChange={(e) => setRecvPlate(e.target.value.toUpperCase())}
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
                      value={recvColor}
                      onChange={(e) => setRecvColor(e.target.value)}
                      placeholder="White, Black..."
                      className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-revix-dark">
                      {isRtl ? "رقم المفتاح" : "Key Number"}
                    </label>
                    <input
                      type="text"
                      value={recvKeyNumber}
                      onChange={(e) => setRecvKeyNumber(e.target.value)}
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
                      value={recvMileage}
                      onChange={(e) => setRecvMileage(Number(e.target.value))}
                      className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
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
                      value={recvRegExpiry}
                      onChange={(val) => setRecvRegExpiry(val)}
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
                      value={recvInsExpiry}
                      onChange={(val) => setRecvInsExpiry(val)}
                      placeholder={isRtl ? "تاريخ انتهاء التأمين..." : "Insurance expiry..."}
                      buttonClassName="h-9 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-revix-dark">
                    {isRtl ? "ملاحظات الفحص والاستلام" : "Inspection & Receiving Notes"}
                  </label>
                  <input
                    type="text"
                    value={recvNotes}
                    onChange={(e) => setRecvNotes(e.target.value)}
                    placeholder={isRtl ? "استلام مفتاحين، كتالوج السيارة، فحص سليم..." : "Received with two keys, inspected..."}
                    className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              {createError && (
                <div className="mx-6 mb-2 rounded-lg border border-revix-alert/30 bg-revix-alert-soft p-3 text-xs font-medium text-revix-alert">
                  {createError}
                </div>
              )}

              {/* Fixed Sticky Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-revix-border bg-revix-surface/40 px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="rounded-lg border border-revix-border bg-revix-white px-3.5 py-2 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isReceiving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-4 py-2 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isReceiving && (
                    <RevixIcon name="refresh-cw" className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{isRtl ? "تأكيد تحويل السيارة إلى أصول الأسطول" : "Convert Car to Fleet Asset"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Chassis Numbers Assignment Popup Modal */}
      {isChassisModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-revix-border bg-revix-surface/30 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-revix-dark">
                  {isRtl
                    ? "تحديد أرقام الشاصي لكل سيارة"
                    : "Assign Chassis Number per Vehicle"}
                </h3>
                <p className="text-xs text-revix-secondary mt-0.5">
                  {isRtl
                    ? `إجمالي السيارات: ${expandedVehicleUnits.length} — أدخل رقم الشاصي الفريد لكل سيارة`
                    : `Total vehicles: ${expandedVehicleUnits.length} — enter a unique chassis number for each car`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChassisModalOpen(false)}
                className="rounded-lg p-1.5 text-revix-muted hover:bg-revix-surface hover:text-revix-dark transition-colors"
              >
                <RevixIcon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
              {expandedVehicleUnits.map((unit, i) => (
                <div
                  key={unit.key}
                  className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 rounded-xl border border-revix-border bg-revix-surface/20 p-3"
                >
                  <div className="sm:col-span-1 text-xs font-mono font-bold text-revix-secondary">
                    #{i + 1}
                  </div>
                  <div className="sm:col-span-4">
                    <div className="text-xs font-semibold text-revix-dark">
                      {unit.variantLabel}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="inline-flex rounded-md border border-revix-border bg-revix-white px-2 py-0.5 text-[11px] font-medium text-revix-dark">
                      {unit.color || (isRtl ? "غير محدد" : "—")}
                    </span>
                  </div>
                  <div className="sm:col-span-2 text-xs font-mono font-semibold text-revix-primary">
                    {unit.unitPrice.toLocaleString()}
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={draftChassisByUnitKey[unit.key] ?? ""}
                      onChange={(e) =>
                        setDraftChassisByUnitKey((prev) => ({
                          ...prev,
                          [unit.key]: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="e.g. 1HGCR2F83HA001234"
                      className="h-8 w-full rounded-lg border border-revix-border bg-revix-white px-2.5 text-xs font-mono uppercase text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-revix-border bg-revix-surface/40 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setIsChassisModalOpen(false)}
                className="rounded-lg border border-revix-border bg-revix-white px-4 py-2 text-xs font-semibold text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-all"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChassisByUnitKey({ ...draftChassisByUnitKey });
                  setIsChassisModalOpen(false);
                }}
                className="rounded-lg bg-revix-primary px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-all"
              >
                {isRtl ? "حفظ أرقام الشاصي" : "Save Chassis Numbers"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
