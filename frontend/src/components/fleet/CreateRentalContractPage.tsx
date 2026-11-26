"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useCreateRentalContractMutation,
  useListCustomersQuery,
  useListRentalContractsQuery,
  useListVehiclesQuery,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { Alert } from "@/components/ui/Alert";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { SectionCard } from "@/components/ui/SectionCard";
import { SignaturePadModal } from "@/components/shared/SignaturePadModal";
import { RentalContractPrintModal } from "./RentalContractPrintModal";
import { customerHref } from "@/lib/workspace/resourceRoutes";

interface CreateRentalContractPageProps {
  isRtl: boolean;
}

function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CreateRentalContractPage({ isRtl }: CreateRentalContractPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialVehicleId = searchParams.get("vehicleId") || "";
  const initialCustomerId = searchParams.get("customerId") || "";
  const initialStartParam = searchParams.get("startDate") || "";

  const { data: vehiclesData, isLoading: isLoadingVehicles } = useListVehiclesQuery({
    pageSize: 500,
  });
  const { data: customersData, isLoading: isLoadingCustomers } = useListCustomersQuery();
  const { data: contractsData } = useListRentalContractsQuery();
  const [createContract, { isLoading: isCreating }] = useCreateRentalContractMutation();

  const today = useMemo(() => toLocalIso(new Date()), []);
  const defaultStart =
    initialStartParam && initialStartParam >= today ? initialStartParam : today;
  const defaultEnd = useMemo(() => {
    const [y, m, d] = defaultStart.split("-").map(Number);
    return toLocalIso(new Date(y, (m || 1) - 1, (d || 1) + 1));
  }, [defaultStart]);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicleId);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [customerSearch, setCustomerSearch] = useState("");
  const [odometerOverride, setOdometerOverride] = useState<{
    vehicleId: string;
    value: number;
  } | null>(null);
  const [rateOverride, setRateOverride] = useState<{ key: string; value: number } | null>(
    null,
  );
  const [discount, setDiscount] = useState(0);
  const [insuranceFee, setInsuranceFee] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSignPadOpen, setIsSignPadOpen] = useState(false);
  const [createdContract, setCreatedContract] = useState<RentalContractDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const customers = useMemo(() => {
    const all = customersData?.data ?? [];
    const q = customerSearch.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        (c.customerCode ?? "").toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [customersData?.data, customerSearch]);

  const customerId = useMemo(() => {
    if (selectedCustomerId && (customersData?.data ?? []).some((c) => c.id === selectedCustomerId)) {
      return selectedCustomerId;
    }
    return customers[0]?.id || "";
  }, [selectedCustomerId, customersData?.data, customers]);

  const selectedCustomer = useMemo(
    () => (customersData?.data ?? []).find((c) => c.id === customerId) ?? null,
    [customersData?.data, customerId],
  );

  const activeContracts = useMemo(
    () => (contractsData?.data ?? []).filter((c) => c.status === "active"),
    [contractsData?.data],
  );

  const availableVehicles = useMemo(() => {
    const all = (vehiclesData?.data ?? []).filter(
      (v) =>
        !v.isPartnerVehicle &&
        Boolean(v.branchId) &&
        v.status !== "maintenance" &&
        v.status !== "out_of_service" &&
        (Number(v.dailyRate1to2 || 0) > 0 ||
          Number(v.dailyRate3to7 || 0) > 0 ||
          Number(v.dailyRate8Plus || 0) > 0),
    );
    if (!startDate || !endDate) return all;
    return all.filter((v) => {
      const hasOverlap = activeContracts.some(
        (c) =>
          c.vehicleId === v.id && c.startDate <= endDate && c.endDate >= startDate,
      );
      return !hasOverlap;
    });
  }, [vehiclesData?.data, activeContracts, startDate, endDate]);

  const vehicleId = useMemo(() => {
    if (selectedVehicleId && availableVehicles.some((v) => v.id === selectedVehicleId)) {
      return selectedVehicleId;
    }
    return availableVehicles[0]?.id || "";
  }, [selectedVehicleId, availableVehicles]);

  const selectedVehicle = useMemo(
    () => availableVehicles.find((v) => v.id === vehicleId) ?? null,
    [availableVehicles, vehicleId],
  );

  const totalDays = useMemo(() => {
    const parseUtc = (iso: string) => {
      const [y, m, d] = iso.split("-").map(Number);
      return y && m && d ? Date.UTC(y, m - 1, d) : NaN;
    };
    const s = parseUtc(startDate);
    const e = parseUtc(endDate);
    if (!Number.isFinite(s) || !Number.isFinite(e)) return 1;
    const diff = Math.round((e - s) / 86400000);
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  const rateKey = `${vehicleId}:${totalDays}`;
  const activeTierLabel =
    totalDays >= 8
      ? isRtl
        ? "شريحة 8–30 يوم"
        : "8–30d tier"
      : totalDays >= 3
        ? isRtl
          ? "شريحة 3–7 أيام"
          : "3–7d tier"
        : isRtl
          ? "شريحة 1–2 يوم"
          : "1–2d tier";

  const tierRate =
    totalDays >= 8
      ? Number(
          selectedVehicle?.dailyRate8Plus ||
            selectedVehicle?.dailyRate3to7 ||
            selectedVehicle?.dailyRate1to2 ||
            0,
        )
      : totalDays >= 3
        ? Number(selectedVehicle?.dailyRate3to7 || selectedVehicle?.dailyRate1to2 || 0)
        : Number(selectedVehicle?.dailyRate1to2 || 0);

  const dailyRate = rateOverride?.key === rateKey ? rateOverride.value : tierRate;
  const pickupOdometer =
    odometerOverride?.vehicleId === vehicleId
      ? odometerOverride.value
      : selectedVehicle?.mileageOdometer || 0;

  const setDailyRate = (value: number) => setRateOverride({ key: rateKey, value });
  const setPickupOdometer = (value: number) => setOdometerOverride({ vehicleId, value });

  const subtotal = dailyRate * totalDays;
  const totalAmount = Math.max(0, subtotal - discount + insuranceFee);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!vehicleId || !customerId) {
      setErrorMsg(
        isRtl
          ? "يرجى اختيار السيارة المتاحة والعميل."
          : "Please select an available vehicle and customer.",
      );
      return;
    }
    if (endDate < startDate) {
      setErrorMsg(
        isRtl
          ? "تاريخ التسليم يجب أن يكون بعد أو نفس تاريخ الاستلام."
          : "End date must be on or after start date.",
      );
      return;
    }
    try {
      const res = await createContract({
        vehicleId,
        customerId,
        startDate,
        endDate,
        pickupOdometer: Number(pickupOdometer) || 0,
        dailyRate: Number(dailyRate) || 0,
        discount: Number(discount) || 0,
        insuranceFee: Number(insuranceFee) || 0,
        depositAmount: Number(depositAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        notes: notes.trim() || null,
        customerSignatureDataUrl: signatureDataUrl,
      }).unwrap();
      setCreatedContract(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: { message?: string } } })?.data?.error?.message ||
        (isRtl ? "تعذر إنشاء عقد التأجير." : "Failed to create rental contract.");
      setErrorMsg(msg);
    }
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-8"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/workspace/fleet/rental-contracts"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-colors"
            title={isRtl ? "العودة للعقود" : "Back to Contracts"}
          >
            <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "إنشاء عقد تأجير جديد" : "New Rental Contract"}
            </h1>
            <p className="text-xs text-revix-secondary mt-0.5">
              {isRtl
                ? "حدد فترة الإيجار والعميل والسيارة المتاحة مع احتساب شريحة السعر تلقائياً"
                : "Select rental period, customer, and available vehicle with automatic tier pricing"}
            </p>
          </div>
        </div>

        <Link
          href="/workspace/fleet/rental-contracts"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3.5 text-xs font-semibold text-revix-secondary hover:bg-revix-surface"
        >
          <span>{isRtl ? "قائمة العقود" : "All Contracts"}</span>
        </Link>
      </div>

      {errorMsg && <Alert variant="error" message={errorMsg} />}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Main Form Column */}
        <div className="space-y-4 lg:col-span-8">
          {/* Section 1: Rental Period */}
          <SectionCard title={isRtl ? "١. فترة الإيجار" : "1. Rental Period"}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                  {isRtl ? "تاريخ الاستلام *" : "Start Date *"}
                </label>
                <RevixDatePicker
                  size="sm"
                  isRtl={isRtl}
                  required
                  minDate={today}
                  value={startDate}
                  onChange={(next) => {
                    const clamped = next && next < today ? today : next;
                    setStartDate(clamped);
                    if (endDate < clamped) setEndDate(clamped);
                  }}
                  buttonClassName="h-10 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                  {isRtl ? "تاريخ التسليم *" : "End Date *"}
                </label>
                <RevixDatePicker
                  size="sm"
                  isRtl={isRtl}
                  required
                  minDate={startDate >= today ? startDate : today}
                  value={endDate}
                  onChange={(next) => setEndDate(next)}
                  buttonClassName="h-10 rounded-lg text-xs font-mono"
                />
              </div>
              <div className="flex h-10 items-center justify-between rounded-lg border border-emerald-900/15 bg-emerald-50/70 px-3 text-xs">
                <span className="text-revix-secondary font-medium">
                  {isRtl ? "المدة:" : "Duration:"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-revix-dark">
                    {totalDays} {isRtl ? "يوم" : "d"}
                  </span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    {activeTierLabel}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Section 2: Customer & Vehicle */}
          <SectionCard title={isRtl ? "٢. العميل والسيارة" : "2. Customer & Vehicle"}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-revix-dark">
                    {isRtl ? "العميل *" : "Customer *"}
                  </label>
                  {selectedCustomer && (
                    <Link
                      href={customerHref(selectedCustomer.id)}
                      className="text-[11px] font-semibold text-revix-primary hover:underline"
                    >
                      {isRtl ? "ملف العميل" : "Profile"}
                    </Link>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="search"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={
                      isRtl
                        ? "بحث برقم العميل CUS-0001 أو الاسم أو الهاتف..."
                        : "Search CUS-0001, name, or phone..."
                    }
                    className="h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden"
                  />
                  <select
                    value={customerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    disabled={isLoadingCustomers}
                    className="h-10 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:outline-hidden"
                    required
                  >
                    {customers.length === 0 ? (
                      <option value="">
                        {isRtl ? "لا يوجد عملاء مطابقين" : "No matching customers"}
                      </option>
                    ) : (
                      customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.customerCode || "CUS"}] {c.fullName} ({c.phone})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                  {isRtl ? "السيارة (برقم اللوحة) *" : "Vehicle (License Plate) *"}
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  disabled={isLoadingVehicles}
                  className="h-10 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:outline-hidden"
                  required
                >
                  {availableVehicles.length === 0 ? (
                    <option value="">
                      {isRtl
                        ? "لا توجد سيارات مسعرة متاحة في هذه الفترة"
                        : "No priced vehicles available for these dates"}
                    </option>
                  ) : (
                    availableVehicles.map((v) => {
                      const label = v.variant
                        ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`
                        : "Vehicle";
                      return (
                        <option key={v.id} value={v.id}>
                          {v.licensePlate} ({v.assetCode || "VEH"}) • {label}
                          {v.branchName ? ` • ${v.branchName}` : ""}
                        </option>
                      );
                    })
                  )}
                </select>
                {availableVehicles.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-700">
                    {isRtl
                      ? "تأكد من تسعير الفئة في قائمة الأسعار (Price List) ونقل السيارة لفرع."
                      : "Ensure the vehicle variant has pricing in Price List and is assigned to a branch."}
                  </p>
                )}
              </div>
            </div>

            {selectedVehicle && (
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-emerald-900/10 bg-emerald-50/60 p-3.5 sm:grid-cols-4">
                <div>
                  <div className="text-[10.5px] text-slate-500">Vehicle ID</div>
                  <div className="font-mono text-xs font-bold text-revix-primary mt-0.5" dir="ltr">
                    {selectedVehicle.assetCode && selectedVehicle.assetCode !== selectedVehicle.licensePlate
                      ? `${selectedVehicle.assetCode} • ${selectedVehicle.licensePlate}`
                      : selectedVehicle.licensePlate}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-slate-500">{isRtl ? "الموديل" : "Model"}</div>
                  <div className="truncate text-xs font-semibold text-revix-dark mt-0.5">
                    {selectedVehicle.variant
                      ? `${selectedVehicle.variant.make} ${selectedVehicle.variant.model} ${selectedVehicle.variant.modelYear}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-slate-500">{isRtl ? "الفرع" : "Branch"}</div>
                  <div className="truncate text-xs font-semibold text-revix-dark mt-0.5">
                    {selectedVehicle.branchName || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] text-slate-500">
                    {isRtl ? "أسعار الشرائح" : "Tier Rates"}
                  </div>
                  <div className="font-mono text-[11px] font-semibold text-revix-primary mt-0.5" dir="ltr">
                    {Number(selectedVehicle.dailyRate1to2 || 0).toLocaleString()} /{" "}
                    {Number(selectedVehicle.dailyRate3to7 || 0).toLocaleString()} /{" "}
                    {Number(selectedVehicle.dailyRate8Plus || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Section 3: Pricing, Odometer & Payments */}
          <SectionCard
            title={isRtl ? "٣. التسعير والعداد والمدفوعات" : "3. Pricing, Odometer & Payments"}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                  {isRtl ? "عداد الخروج (كم)" : "Pickup Odometer (km)"}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={pickupOdometer === 0 ? "" : pickupOdometer}
                  onChange={(e) => setPickupOdometer(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-lg border border-revix-border px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="flex items-center justify-between gap-1 text-xs font-semibold text-revix-dark mb-1.5">
                  <span>{isRtl ? "السعر اليومي" : "Daily Rate"}</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                    {activeTierLabel}
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={dailyRate === 0 ? "" : dailyRate}
                  onChange={(e) => setDailyRate(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-lg border border-revix-border px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                  {isRtl ? "الخصم" : "Discount"}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={discount === 0 ? "" : discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-lg border border-revix-border px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                  {isRtl ? "رسوم التأمين" : "Insurance Fee"}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={insuranceFee === 0 ? "" : insuranceFee}
                  onChange={(e) => setInsuranceFee(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-lg border border-revix-border px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                  {isRtl ? "التأمين المسترد (وديعة)" : "Deposit"}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={depositAmount === 0 ? "" : depositAmount}
                  onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-lg border border-revix-border px-3 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                  {isRtl ? "المدفوع مقدماً" : "Paid Amount"}
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={paidAmount === 0 ? "" : paidAmount}
                  onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="h-10 w-full rounded-lg border border-revix-border px-3 font-mono text-xs"
                />
              </div>
            </div>
          </SectionCard>

          {/* Section 4: Notes & Signature */}
          <SectionCard title={isRtl ? "٤. الملاحظات والتوقيع" : "4. Notes & Signature"}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
              <div>
                <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                  {isRtl ? "ملاحظات العقد" : "Contract Notes"}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? "ملاحظات التسليم أو الشروط..." : "Pickup notes or terms..."}
                  className="h-10 w-full rounded-lg border border-revix-border px-3 text-xs"
                />
              </div>
              <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-revix-border px-3">
                {signatureDataUrl ? (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={signatureDataUrl} alt="Signature" className="h-7 object-contain" />
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {isRtl ? "تم التوقيع" : "Signed"}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-revix-secondary">
                    {isRtl ? "توقيع العميل (اختياري الآن)" : "Customer signature"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsSignPadOpen(true)}
                  className="cursor-pointer rounded-md border border-revix-primary/30 bg-emerald-50 px-3 py-1 text-xs font-semibold text-revix-primary hover:bg-emerald-100"
                >
                  {signatureDataUrl
                    ? isRtl
                      ? "تغيير"
                      : "Edit"
                    : isRtl
                      ? "توقيع العميل"
                      : "Sign"}
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Sticky Summary Column */}
        <div className="lg:col-span-4 lg:sticky lg:top-4">
          <div className="rounded-2xl border border-emerald-900/15 bg-revix-white p-5 shadow-xs space-y-4">
            <div className="border-b border-revix-border pb-3">
              <h2 className="text-sm font-bold text-revix-dark">
                {isRtl ? "ملخص العقد والحساب" : "Contract Summary"}
              </h2>
              <p className="text-[11px] text-revix-secondary mt-0.5">
                {startDate} → {endDate} ({totalDays} {isRtl ? "يوم" : "day(s)"})
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-revix-secondary">{isRtl ? "العميل" : "Customer"}</span>
                <span className="font-semibold text-revix-dark truncate max-w-[180px]">
                  {selectedCustomer ? selectedCustomer.fullName : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-revix-secondary">{isRtl ? "المركبة" : "Vehicle"}</span>
                <span className="font-mono font-semibold text-revix-dark" dir="ltr">
                  {selectedVehicle ? `${selectedVehicle.licensePlate}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-revix-secondary">{isRtl ? "الشريحة" : "Pricing Tier"}</span>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-revix-primary">
                  {activeTierLabel}
                </span>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-emerald-900/10 bg-emerald-50/75 p-3.5 text-xs">
              <div className="flex items-center justify-between text-revix-secondary">
                <span>
                  {isRtl
                    ? `إيجار المدة (${totalDays} × ${dailyRate.toLocaleString()})`
                    : `Rental (${totalDays} × ${dailyRate.toLocaleString()})`}
                </span>
                <span className="font-mono font-semibold text-revix-dark">
                  {subtotal.toLocaleString()}
                </span>
              </div>
              {insuranceFee > 0 && (
                <div className="flex items-center justify-between text-revix-secondary">
                  <span>{isRtl ? "+ رسوم التأمين" : "+ Insurance"}</span>
                  <span className="font-mono font-semibold text-revix-dark">
                    +{insuranceFee.toLocaleString()}
                  </span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex items-center justify-between text-rose-700">
                  <span>{isRtl ? "- الخصم" : "- Discount"}</span>
                  <span className="font-mono font-semibold">-{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-emerald-900/10 pt-2 text-base font-bold text-revix-primary">
                <span>{isRtl ? "الإجمالي" : "Total"}</span>
                <span className="font-mono">{totalAmount.toLocaleString()}</span>
              </div>
              {paidAmount > 0 && (
                <div className="flex items-center justify-between border-t border-emerald-900/10 pt-1.5 text-[11px]">
                  <span className="text-revix-secondary">
                    {isRtl ? `المدفوع: ${paidAmount.toLocaleString()}` : `Paid: ${paidAmount.toLocaleString()}`}
                  </span>
                  <span className="font-mono font-bold text-revix-dark">
                    {isRtl
                      ? `المتبقي: ${balanceDue.toLocaleString()}`
                      : `Due: ${balanceDue.toLocaleString()}`}
                  </span>
                </div>
              )}
              {depositAmount > 0 && (
                <div className="flex items-center justify-between text-[11px] text-revix-secondary">
                  <span>{isRtl ? "التأمين المسترد (وديعة)" : "Refundable Deposit"}</span>
                  <span className="font-mono font-semibold">{depositAmount.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isCreating || !vehicleId || !customerId}
                className="w-full h-10 cursor-pointer rounded-xl bg-revix-primary px-4 text-xs font-bold text-white shadow-xs hover:bg-revix-primary-hover disabled:opacity-50 transition-colors"
              >
                {isCreating
                  ? isRtl
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isRtl
                    ? "تأكيد العقد والطباعة"
                    : "Create & Print Contract"}
              </button>
              <Link
                href="/workspace/fleet/rental-contracts"
                className="flex h-9 w-full items-center justify-center rounded-xl border border-revix-border text-xs font-semibold text-revix-secondary hover:bg-revix-surface"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </Link>
            </div>
          </div>
        </div>
      </form>

      <SignaturePadModal
        isOpen={isSignPadOpen}
        isRtl={isRtl}
        onClose={() => setIsSignPadOpen(false)}
        onSave={(dataUrl: string) => setSignatureDataUrl(dataUrl)}
      />

      <RentalContractPrintModal
        contract={createdContract}
        isRtl={isRtl}
        onClose={() => {
          setCreatedContract(null);
          router.push("/workspace/fleet/rental-contracts");
        }}
        onSigned={(updated) => setCreatedContract(updated)}
      />
    </div>
  );
}
