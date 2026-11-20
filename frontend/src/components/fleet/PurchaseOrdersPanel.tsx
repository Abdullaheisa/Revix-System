"use client";

import { useMemo, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  navigateToWorkspacePage,
  setPendingFleetReceiveContext,
} from "@/store/slices/workspaceSlice";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import {
  useCreatePurchaseOrderMutation,
  useListPurchaseOrdersQuery,
  useListVariantsQuery,
  useListVendorsQuery,
  useListVehiclesQuery,
  useReceiveVehicleMutation,
  useUpdatePurchaseOrderStatusMutation,
  type CreatePurchaseOrderItemInput,
  type PurchaseOrderDto,
  type PurchaseOrderStatus,
  type PaymentTermsType,
} from "@/store/api/fleetApi";
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
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranch?.id || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [page, setPage] = usePersistedPage("fleet/purchase-orders");
  const pageSize = 15;

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
    { variantId: "", quantity: 1, unitPrice: 0, notes: "" },
  ]);
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
    setFormItems([
      {
        variantId: variants[0]?.id || "",
        quantity: 1,
        unitPrice: 0,
        notes: "",
      },
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

    const combinedNotes = [
      formNotes.trim(),
      formPaymentScheduleSummary
        ? `[${isRtl ? "شروط الدفع والجدولة" : "Payment Terms & Schedule"}: ${formPaymentScheduleSummary}]`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await createPurchaseOrder({
        branchId: formBranchId,
        vendorId: formVendorId,
        orderDate: formOrderDate,
        expectedDeliveryDate: formDeliveryDate || null,
        totalAmount: formCalculatedTotal,
        upfrontPaid: Number(formUpfrontPaid) || 0,
        installmentsCount: Number(formInstallmentsCount) || 1,
        notes: combinedNotes || null,
        items: formItems.map((it) => ({
          variantId: it.variantId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          notes: it.notes?.trim() || null,
        })),
      }).unwrap();

      setIsCreateModalOpen(false);
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
        }),
      );
    }
    dispatch(
      navigateToWorkspacePage({
        section: "fleet",
        subPage: "add-vehicle",
      }),
    );
  }

  async function handleReceiveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receivingPo) return;
    setRecvError(null);

    if (!recvVin.trim() || !recvPlate.trim()) {
      setRecvError(
        isRtl
          ? "برجاء كتابة رقم الشاسيه (VIN) ورقم اللوحة."
          : "VIN and License Plate are required.",
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

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "أوامر شراء السيارات (PO)" : "Vehicle Purchase Orders (PO)"}
            </h1>
          </div>
          <p className="mt-1 text-xs text-revix-secondary sm:text-sm">
            {isRtl
              ? "إدارة طلبات شراء الأسطول، المدفوع مقدمًا، أقساط الموردين، والاستلام الفعلي للسيارات."
              : "Procurement lifecycle: PO commitments, vendor terms, and vehicle physical receiving."}
          </p>
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
        {/* Branch Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-revix-secondary shrink-0">
            {isRtl ? "الفرع:" : "Branch:"}
          </span>
          <div className="w-52">
            <RevixSelect
              size="sm"
              isRtl={isRtl}
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                setPage(1);
              }}
              buttonClassName="h-8 rounded-lg text-xs"
              options={[
                { value: "all", label: isRtl ? "جميع الفروع" : "All Branches" },
                ...branches.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.currencyCode})`,
                })),
              ]}
            />
          </div>
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
          <div className="space-y-3.5">
            {paginatedPurchaseOrders.map((po) => {
            const totalQty = po.items?.reduce((acc, it) => acc + it.quantity, 0) || 0;
            const totalRcv = po.items?.reduce((acc, it) => acc + it.receivedCount, 0) || 0;
            const progressPct = totalQty > 0 ? Math.round((totalRcv / totalQty) * 100) : 0;
            const statusConfig = PO_STATUS_LABELS[po.status] || PO_STATUS_LABELS.draft;

            return (
              <div
                key={po.id}
                className="rounded-xl border border-revix-border bg-revix-white p-4 shadow-xs transition hover:border-revix-primary/30"
              >
                {/* PO Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-revix-dark">
                      {po.poNumber}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.badgeClass}`}
                    >
                      {isRtl ? statusConfig.ar : statusConfig.en}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-revix-secondary">
                    <span>
                      {isRtl ? "تاريخ الطلب:" : "Order Date:"} {po.orderDate}
                    </span>
                    {po.expectedDeliveryDate && (
                      <span>
                        • {isRtl ? "التسليم المتوقع:" : "Expected:"} {po.expectedDeliveryDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vendor, Branch & Financial Bar */}
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-revix-surface/70 p-3 text-xs sm:grid-cols-4">
                  <div>
                    <span className="block text-[10px] text-revix-muted">
                      {isRtl ? "المورد" : "Vendor"}
                    </span>
                    <span className="font-semibold text-revix-dark">
                      {po.vendorName || "Vendor"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-revix-muted">
                      {isRtl ? "فرع الاستلام" : "Target Branch"}
                    </span>
                    <span className="font-semibold text-revix-dark">
                      {po.branchName || "Branch"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-revix-muted">
                      {isRtl ? "إجمالي المبلغ" : "Total Amount"}
                    </span>
                    <span className="font-bold text-revix-dark">
                      {po.totalAmount.toLocaleString()} {po.currency}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-revix-muted">
                      {isRtl ? "المتبقي بالأقساط" : "Remaining"}
                    </span>
                    <span className="font-bold text-revix-primary">
                      {po.remainingAmount.toLocaleString()} {po.currency}
                    </span>
                  </div>
                </div>

                {/* Payment Terms & Financial Schedule Badge */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-revix-surface/50 px-3 py-1.5 text-[11px] border border-revix-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-revix-muted">{isRtl ? "خطة السداد:" : "Payment Plan:"}</span>
                    {po.remainingAmount === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200">
                        <RevixIcon name="wallet" className="h-3 w-3" />
                        <span>{isRtl ? "كاش فوري (مسدد 100%)" : "100% Cash / Paid"}</span>
                      </span>
                    ) : po.installmentsCount > 1 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 font-bold text-purple-700 border border-purple-200">
                        <RevixIcon name="calendar" className="h-3 w-3" />
                        <span>
                          {isRtl
                            ? `تقسيط على ${po.installmentsCount} أقساط (مقدم: ${po.upfrontPaid.toLocaleString()} ${po.currency} • قسط: ${Math.round(po.remainingAmount / po.installmentsCount).toLocaleString()} ${po.currency})`
                            : `${po.installmentsCount} installments (Upfront: ${po.upfrontPaid.toLocaleString()} ${po.currency})`}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 font-bold text-sky-700 border border-sky-200">
                        <RevixIcon name="clock" className="h-3 w-3" />
                        <span>
                          {isRtl
                            ? `آجل تجاري (المتبقي: ${po.remainingAmount.toLocaleString()} ${po.currency})`
                            : `Credit Terms (Remaining: ${po.remainingAmount.toLocaleString()} ${po.currency})`}
                        </span>
                      </span>
                    )}
                  </div>

                  {po.notes && (
                    <span className="text-[10px] text-revix-secondary truncate max-w-sm" title={po.notes}>
                      {po.notes}
                    </span>
                  )}
                </div>

                {/* Order Vehicles Summary Bar */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-revix-primary/20 bg-revix-primary/5 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-revix-primary/10 p-1.5 text-revix-primary">
                      <RevixIcon name="car-front" className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-revix-dark">
                        {isRtl
                          ? `إجمالي السيارات المشتراة في هذا الطلب: ${totalQty} سيارات`
                          : `Total Cars Purchased in PO: ${totalQty} cars`}
                      </span>
                      <span className="mx-2 text-revix-border">|</span>
                      <span className="text-revix-secondary">
                        {isRtl
                          ? `${po.items?.length || 0} أنواع وفئات مختلفة`
                          : `${po.items?.length || 0} vehicle types`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-md bg-revix-accent-soft px-2 py-0.5 font-semibold text-revix-accent">
                      {totalRcv} {isRtl ? "تم تحويلها للأصول" : "in fleet"}
                    </span>
                    {totalQty - totalRcv > 0 && (
                      <span className="rounded-md bg-revix-warning-soft px-2 py-0.5 font-semibold text-revix-warning">
                        {totalQty - totalRcv} {isRtl ? "بانتظار الوصول والتحويل" : "pending arrival"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Detailed Vehicles List Breakdown Per Type */}
                <div className="mt-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-revix-dark flex items-center gap-1.5">
                      <RevixIcon name="layers" className="h-3.5 w-3.5 text-revix-primary" />
                      <span>{isRtl ? "قائمة سيارات أمر الشراء (متابعة الوصول والتحويل للأصول):" : "Order Vehicles & Fleet Conversion List:"}</span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-revix-primary">
                      {progressPct}% {isRtl ? "مكتمل" : "completed"}
                    </span>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-revix-surface">
                    <div
                      className="h-full bg-revix-primary transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Individual Items and their physical units */}
                  <div className="space-y-3 pt-1">
                    {po.items?.map((item) => {
                      const itemVariant = variants.find((v) => v.id === item.variantId);
                      const poVehicles = allFleetVehicles.filter(
                        (v) => v.purchaseOrderId === po.id && v.variantId === item.variantId,
                      );
                      const remainingForItem = item.quantity - item.receivedCount;

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-revix-border bg-revix-surface/30 p-3 text-xs space-y-2.5"
                        >
                          {/* Variant Line Header */}
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-revix-border/50 pb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-[11px] font-bold text-revix-primary border border-revix-border">
                                {itemVariant?.sippCode || "ICAR"}
                              </span>
                              <span className="font-bold text-revix-dark text-sm">
                                {itemVariant ? `${itemVariant.make} ${itemVariant.model} ${itemVariant.modelYear}` : "Vehicle Variant"}{" "}
                                <span className="font-normal text-xs text-revix-secondary">({itemVariant?.trim})</span>
                              </span>
                              <span className="text-xs text-revix-secondary">
                                • {isRtl ? `الكمية: ${item.quantity} سيارات` : `Qty: ${item.quantity}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-revix-secondary">
                                {item.unitPrice.toLocaleString()} {po.currency} {isRtl ? "للسيارة" : "/unit"}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  remainingForItem === 0
                                    ? "bg-revix-accent-soft text-revix-accent"
                                    : "bg-revix-primary/10 text-revix-primary"
                                }`}
                              >
                                {remainingForItem === 0
                                  ? (isRtl ? "مكتمل التحويل للأصول" : "All Converted")
                                  : (isRtl ? `متبقي ${remainingForItem} بانتظار الوصول` : `${remainingForItem} pending`)}
                              </span>
                            </div>
                          </div>

                          {/* Unit-by-unit listing */}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: item.quantity }).map((_, unitIdx) => {
                              const convertedCar = poVehicles[unitIdx];
                              const isConverted = Boolean(convertedCar);

                              return (
                                <div
                                  key={unitIdx}
                                  className={`flex flex-col justify-between rounded-lg border p-2.5 text-xs transition ${
                                    isConverted
                                      ? "border-revix-accent/30 bg-revix-accent-soft/20"
                                      : "border-dashed border-revix-border bg-revix-white hover:border-revix-primary/50"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-semibold text-revix-dark">
                                        {isRtl ? `سيارة رقم ${unitIdx + 1}` : `Vehicle #${unitIdx + 1}`}
                                      </span>
                                      {isConverted ? (
                                        <span className="inline-flex items-center gap-1 rounded bg-revix-accent-soft px-1.5 py-0.2 text-[10px] font-bold text-revix-accent">
                                          <RevixIcon name="check-circle-2" className="h-3 w-3" />
                                          <span>{isRtl ? "بالأسطول" : "In Fleet"}</span>
                                        </span>
                                      ) : (
                                        <span className="rounded bg-revix-surface px-1.5 py-0.2 text-[10px] font-medium text-revix-secondary">
                                          {isRtl ? "بانتظار الوصول" : "Awaiting Arrival"}
                                        </span>
                                      )}
                                    </div>

                                    {isConverted && convertedCar ? (
                                      <div className="mt-1.5 space-y-0.5 text-[11px]">
                                        <div className="flex items-center justify-between">
                                          <span className="text-revix-muted">{isRtl ? "اللوحة:" : "Plate:"}</span>
                                          <span className="font-mono font-bold text-revix-dark">{convertedCar.licensePlate}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-revix-muted">{isRtl ? "الشاسيه:" : "VIN:"}</span>
                                          <span className="font-mono text-[10px] text-revix-secondary truncate max-w-[120px]" title={convertedCar.vin}>
                                            {convertedCar.vin}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-revix-muted pt-0.5">
                                          <span>{convertedCar.color}</span>
                                          <span>{convertedCar.mileageOdometer.toLocaleString()} {isRtl ? "كم" : "km"}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="mt-1.5 text-[11px] text-revix-secondary leading-relaxed">
                                        {isRtl
                                          ? "عند وصول هذه السيارة فعلياً، اضغط زر التحويل لتسجيل الشاسيه واللوحة."
                                          : "When this car physically arrives, click convert to assign VIN and license plate."}
                                      </p>
                                    )}
                                  </div>

                                  {!isConverted && (
                                    <div className="mt-2.5 pt-2 border-t border-revix-border/40">
                                      {(po.status === "approved" || po.status === "partially_received") ? (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenReceiveModal(po, item.id)}
                                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-revix-primary px-2.5 py-1 text-xs font-semibold text-revix-white shadow-xs transition hover:bg-revix-primary-hover active:scale-95"
                                        >
                                          <RevixIcon name="car-front" className="h-3.5 w-3.5" />
                                          <span>{isRtl ? "العربية وصلت؟ تحويل للأصول" : "Arrived? Convert to Asset"}</span>
                                        </button>
                                      ) : (
                                        <span className="block text-center text-[10px] text-revix-muted">
                                          {isRtl ? "يتطلب اعتماد الأمر أولاً" : "Requires PO approval"}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PO Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-revix-border/60 pt-3">
                  {po.status === "draft" && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => updateStatus({ id: po.id, status: "pending_approval" })}
                      className="rounded-lg border border-revix-border bg-revix-white px-3 py-1.5 text-xs font-semibold text-revix-dark shadow-xs hover:bg-revix-surface"
                    >
                      {isRtl ? "إرسال للاعتماد المالي" : "Submit for Approval"}
                    </button>
                  )}

                  {po.status === "pending_approval" && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => updateStatus({ id: po.id, status: "approved" })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 py-1.5 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover"
                    >
                      <RevixIcon name="shield-check" className="h-3.5 w-3.5" />
                      <span>{isRtl ? "اعتماد أمر الشراء (Approve)" : "Approve Purchase Order"}</span>
                    </button>
                  )}

                  {(po.status === "approved" || po.status === "partially_received") && totalQty - totalRcv > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenReceiveModal(po)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 py-1.5 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover active:scale-95"
                    >
                      <RevixIcon name="car-front" className="h-3.5 w-3.5" />
                      <span>{isRtl ? "تحويل سيارة للأصول" : "Convert Car to Asset"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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

      {/* Create PO Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-revix-border bg-white shadow-dialog animate-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-revix-border px-6 py-4">
              <h2 className="text-base font-bold text-revix-dark">
                {isRtl ? "إنشاء أمر شراء سيارات جديد (PO)" : "Create Vehicle Purchase Order"}
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-colors"
              >
                <RevixIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {createError && (
                  <div className="rounded-lg bg-revix-alert-soft p-3 text-xs text-revix-alert">
                    {createError}
                  </div>
                )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-revix-dark mb-1">
                    {isRtl ? "الفرع المستلم" : "Receiving Branch"} *
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
                    {isRtl ? "المورد" : "Vendor / Supplier"} *
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
                    placeholder={isRtl ? "اختر المورد..." : "Select Vendor..."}
                    buttonClassName="h-9 rounded-lg text-xs"
                    options={vendors.map((v) => ({
                      value: v.id,
                      label: `${v.name} (${v.city})`,
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-revix-dark mb-1">
                    {isRtl ? "تاريخ أمر الشراء" : "Order Date"} *
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
                  <label className="block text-xs font-semibold text-revix-dark mb-1">
                    {isRtl ? "تاريخ التسليم المتوقع" : "Expected Delivery Date"}
                  </label>
                  <RevixDatePicker
                    size="sm"
                    isRtl={isRtl}
                    value={formDeliveryDate}
                    onChange={(val) => setFormDeliveryDate(val)}
                    placeholder={isRtl ? "تاريخ التسليم المتوقع..." : "Expected delivery date..."}
                    buttonClassName="h-9 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div className="rounded-xl border border-revix-border bg-revix-surface/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-revix-dark">
                    {isRtl ? "بنود السيارات والكميات المطلوبة" : "Vehicle Line Items"}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-revix-primary hover:underline"
                  >
                    <RevixIcon name="plus" className="h-3.5 w-3.5" />
                    <span>{isRtl ? "إضافة بند سيارة" : "Add Vehicle Item"}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg border border-revix-border bg-revix-white p-2.5"
                    >
                      <div className="col-span-5">
                        <label className="block text-[10px] text-revix-muted mb-0.5">
                          {isRtl ? "فئة السيارة" : "Variant"}
                        </label>
                        <RevixSelect
                          size="sm"
                          isRtl={isRtl}
                          value={item.variantId}
                          onChange={(e) => handleItemChange(idx, "variantId", e.target.value)}
                          placeholder={isRtl ? "اختر الفئة..." : "Select Variant..."}
                          buttonClassName="h-8 rounded-md text-xs font-normal"
                          options={variants.map((v) => ({
                            value: v.id,
                            label: `${v.make} ${v.model} (${v.trim})`,
                          }))}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-revix-muted">
                          {isRtl ? "العدد" : "Qty"}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                          className="mt-0.5 h-8 w-full rounded-md border border-revix-border bg-revix-white px-2 text-xs font-semibold text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                        />
                      </div>

                      <div className="col-span-4">
                        <label className="block text-[10px] text-revix-muted">
                          {isRtl ? "سعر الشراء للسيارة" : "Unit Price"}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                          className="mt-0.5 h-8 w-full rounded-md border border-revix-border bg-revix-white px-2 text-xs font-semibold text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                        />
                      </div>

                      <div className="col-span-1 flex justify-end pt-3">
                        <button
                          type="button"
                          disabled={formItems.length <= 1}
                          onClick={() => handleRemoveLineItem(idx)}
                          className="rounded-md p-1 text-revix-muted hover:bg-revix-alert-soft hover:text-revix-alert disabled:opacity-30 transition-colors"
                        >
                          <RevixIcon name="trash-2" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Summary */}
                <div className="flex items-center justify-between border-t border-revix-border/70 pt-2 text-xs font-bold text-revix-dark">
                  <span>{isRtl ? "إجمالي أمر الشراء:" : "Calculated Total:"}</span>
                  <span className="text-base text-revix-primary">
                    {formCalculatedTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Enterprise Payment Terms & Financial Schedule */}
              <div className="rounded-xl border border-revix-border bg-white p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-revix-dark">
                    {isRtl ? "شروط الدفع والجدولة المالية لأمر الشراء" : "Payment Terms & Financial Schedule"}
                  </label>
                  {(() => {
                    const selectedV = vendors.find((v) => v.id === formVendorId);
                    if (!selectedV) return null;
                    const terms = formatVendorPaymentTerms(selectedV, isRtl);
                    return (
                      <span className="text-[10px] text-revix-secondary flex items-center gap-1">
                        <span>{isRtl ? "شروط المورد المعتمدة:" : "Vendor Terms:"}</span>
                        <span className="font-semibold text-revix-dark">
                          {terms.label}
                        </span>
                      </span>
                    );
                  })()}
                </div>

                <PaymentTermsSelector
                  valueType={formPaymentTermsType}
                  valueDays={formPaymentTermsDays}
                  valueConfig={formPaymentTermsConfig}
                  totalAmount={formCalculatedTotal}
                  currency={activeBranch?.currencyCode || "JOD"}
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
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-revix-dark">
                  {isRtl ? "ملاحظات إضافية على أمر الشراء" : "Order Notes & Contract Terms"}
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={
                    isRtl
                      ? "شروط التسليم، مواصفات الضمان، شروط الدفعات..."
                      : "Delivery terms, warranty specs, installment notes..."
                  }
                  className="mt-1 w-full rounded-lg border border-revix-border bg-revix-white p-2.5 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                />
              </div>

              </div>

              {/* Fixed Sticky Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-revix-border bg-revix-surface/40 px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-revix-border bg-revix-white px-3.5 py-2 text-xs font-semibold text-revix-dark hover:bg-revix-surface transition-colors"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-4 py-2 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isCreating && (
                    <RevixIcon name="refresh-cw" className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{isRtl ? "حفظ وإصدار أمر الشراء" : "Issue Purchase Order"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}
