"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useCreateReservationMutation,
  useListCustomersQuery,
  useListVariantsQuery,
  useListVehiclesQuery,
  type ReservationSource,
} from "@/store/api/fleetApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SmartBackButton } from "@/components/ui/SmartBackButton";
import { FormInput } from "@/components/ui/FormField";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { CustomerFormModal } from "./CustomerFormModal";
import { getApiErrorMessage } from "@/lib/api/errors";
import { reservationHref } from "@/lib/workspace/resourceRoutes";

interface CreateReservationPageProps {
  isRtl: boolean;
}

function toLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-xs bg-amber-200/90 px-0.5 text-revix-dark">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hh = String(Math.floor(i / 2)).padStart(2, "0");
  const mm = i % 2 === 0 ? "00" : "30";
  const value = `${hh}:${mm}`;
  const h12 = Math.floor(i / 2) % 12 || 12;
  const ampm = Math.floor(i / 2) < 12 ? "AM" : "PM";
  return { value, label: `${String(h12).padStart(2, "0")}:${mm} ${ampm}` };
});

export function CreateReservationPage({ isRtl }: CreateReservationPageProps) {
  const router = useRouter();
  const { data: wsCtx } = useGetWorkspaceContextQuery();
  const branches = useMemo(() => wsCtx?.data?.branches ?? [], [wsCtx?.data?.branches]);
  const { data: customersResp, isLoading: isLoadingCustomers } = useListCustomersQuery();
  const { data: variantsResp } = useListVariantsQuery();
  const { data: vehiclesResp } = useListVehiclesQuery({ pageSize: 500 });
  const [createReservation, { isLoading: isCreating }] = useCreateReservationMutation();

  const customers = useMemo(() => customersResp?.data ?? [], [customersResp?.data]);
  const variants = useMemo(() => variantsResp?.data ?? [], [variantsResp?.data]);
  const vehicles = useMemo(() => vehiclesResp?.data ?? [], [vehiclesResp?.data]);

  const today = useMemo(() => toLocalIso(new Date()), []);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalIso(d);
  }, []);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCustomerFocused, setIsCustomerFocused] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const customerBoxRef = useRef<HTMLDivElement | null>(null);

  const [branchId, setBranchId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [allowSimilar, setAllowSimilar] = useState(true);
  const [source, setSource] = useState<ReservationSource>("phone");
  const [externalBookingRef, setExternalBookingRef] = useState("");
  const [pickupDate, setPickupDate] = useState(today);
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnDate, setReturnDate] = useState(tomorrow);
  const [returnTime, setReturnTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 12);
    return customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.customerCode || "").toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [customers, customerQuery]);

  const availableBranches = useMemo(() => {
    if (!variantId) return branches;
    const branchIdsWithVariant = new Set(
      vehicles
        .filter(
          (v) =>
            v.variantId === variantId &&
            Boolean(v.branchId) &&
            v.status !== "maintenance" &&
            v.status !== "out_of_service",
        )
        .map((v) => v.branchId as string),
    );
    return branches.filter((b) => branchIdsWithVariant.has(b.id));
  }, [branches, vehicles, variantId]);

  const effectiveBranchId =
    branchId && availableBranches.some((b) => b.id === branchId)
      ? branchId
      : availableBranches[0]?.id || "";
  const activeBranch =
    availableBranches.find((b) => b.id === effectiveBranchId) ??
    availableBranches[0] ??
    branches[0];
  const currency = activeBranch?.currencyCode || wsCtx?.data?.company?.baseCurrency || "EGP";

  const availableUnitsForVariant = useMemo(() => {
    if (!variantId) return 0;
    return vehicles.filter(
      (v) =>
        v.variantId === variantId &&
        (!effectiveBranchId || v.branchId === effectiveBranchId) &&
        v.status === "available",
    ).length;
  }, [vehicles, variantId, effectiveBranchId]);

  const totalDays = useMemo(() => {
    const s = new Date(pickupDate).getTime();
    const e = new Date(returnDate).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 1;
    return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
  }, [pickupDate, returnDate]);

  const variantPricing = useMemo(() => {
    if (!variantId) return { r1: 0, r3: 0, r8: 0, appliedRate: 0 };
    const matchingVehicles = vehicles.filter((v) => v.variantId === variantId);
    const branchPriced = matchingVehicles.find(
      (v) =>
        v.branchId === effectiveBranchId &&
        (Number(v.dailyRate1to2 || 0) > 0 ||
          Number(v.dailyRate3to7 || 0) > 0 ||
          Number(v.dailyRate8Plus || 0) > 0),
    );
    const anyPriced =
      branchPriced ||
      matchingVehicles.find(
        (v) =>
          Number(v.dailyRate1to2 || 0) > 0 ||
          Number(v.dailyRate3to7 || 0) > 0 ||
          Number(v.dailyRate8Plus || 0) > 0,
      );

    const r1 = Number(anyPriced?.dailyRate1to2 || 0);
    const r3 = Number(anyPriced?.dailyRate3to7 || r1 || 0);
    const r8 = Number(anyPriced?.dailyRate8Plus || r3 || r1 || 0);
    const appliedRate = totalDays >= 8 ? r8 : totalDays >= 3 ? r3 : r1;
    return { r1, r3, r8, appliedRate };
  }, [vehicles, variantId, effectiveBranchId, totalDays]);

  const estimatedTotal = variantPricing.appliedRate * totalDays;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!effectiveBranchId || !selectedCustomerId || !variantId) {
      setErrorMsg(
        isRtl
          ? "يرجى اختيار العميل والفرع وفئة السيارة المطلوبة."
          : "Please select customer, branch, and vehicle variant.",
      );
      return;
    }

    try {
      await createReservation({
        branchId: effectiveBranchId,
        customerId: selectedCustomerId,
        variantId,
        allowSimilar,
        source,
        externalBookingRef: externalBookingRef.trim() || null,
        status: "confirmed",
        pickupDate,
        pickupTime: pickupTime || null,
        returnDate,
        returnTime: returnTime || null,
        dailyRate: variantPricing.appliedRate,
        notes: notes.trim() || null,
      }).unwrap();
      router.push(reservationHref());
    } catch (err) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر إنشاء الحجز." : "Failed to create reservation."),
      );
    }
  }

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8"
    >
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-3">
        <div className="flex items-center gap-3">
          <SmartBackButton
            isRtl={isRtl}
            fallbackHref={reservationHref()}
            title={isRtl ? "العودة للحجوزات" : "Back to reservations"}
            size={15}
          />
          <div>
            <h1 className="text-lg font-bold text-revix-dark">
              {isRtl ? "إنشاء حجز جديد (بالفئة)" : "New Variant Reservation"}
            </h1>
            <p className="text-xs text-revix-secondary">
              {isRtl
                ? "حجز فئة سيارة (أو ما يماثلها) مع حساب السعر تلقائياً وتخصيص اللوحة يوم الاستلام."
                : "Reserve a vehicle variant (or similar) with automatic tier pricing and plate assignment on pickup."}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* STEP 1: Customer (Exact same design & action as CreateRentalContractPage) */}
        <div className={`relative rounded-xl border border-revix-border bg-revix-white ${isCustomerDropdownOpen ? "z-30" : ""}`}>
          <div className="flex items-center justify-between gap-3 border-b border-revix-border/70 px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-bold text-revix-primary">
                1
              </span>
              <span className="text-sm font-bold text-revix-dark">
                {isRtl ? "بيانات العميل" : "Select Customer"}
              </span>
              {selectedCustomer && (
                <span className="truncate rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-revix-primary">
                  {selectedCustomer.customerCode || "CUS"} · {selectedCustomer.fullName}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-end gap-2">
              <div ref={customerBoxRef} className="relative flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
                  {isRtl ? "البحث عن العميل (بالكود أو الاسم أو الهاتف) *" : "Search Customer (ID, Name, or Phone) *"}
                </label>
                <div className="relative">
                  <RevixIcon
                    name="search"
                    size={14}
                    className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-revix-secondary"
                  />
                  <input
                    type="text"
                    value={
                      isCustomerFocused || isCustomerDropdownOpen
                        ? customerQuery
                        : selectedCustomer
                          ? `${selectedCustomer.customerCode || ""} · ${selectedCustomer.fullName} · ${selectedCustomer.phone}`
                          : customerQuery
                    }
                    onFocus={() => {
                      setCustomerQuery("");
                      setIsCustomerFocused(true);
                    }}
                    onBlur={() => setIsCustomerFocused(false)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerQuery(val);
                      setIsCustomerDropdownOpen(val.trim().length > 0);
                    }}
                    disabled={isLoadingCustomers}
                    placeholder={
                      isLoadingCustomers
                        ? isRtl
                          ? "جاري التحميل..."
                          : "Loading..."
                        : isRtl
                          ? "اكتب الكود أو الاسم أو الهاتف للبحث..."
                          : "Type ID, name, or phone to search..."
                    }
                    className="h-10 w-full rounded-lg border border-revix-border bg-revix-white ps-9 pe-8 text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-hidden"
                  />
                  {(selectedCustomer || customerQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId("");
                        setCustomerQuery("");
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="absolute top-1/2 end-2.5 -translate-y-1/2 cursor-pointer text-revix-secondary hover:text-revix-dark"
                    >
                      <RevixIcon name="x" size={14} />
                    </button>
                  )}
                </div>

                {isCustomerDropdownOpen && customerQuery.trim().length > 0 && (
                  <div className="absolute start-0 end-0 top-full z-30 mt-1 max-h-[214px] overflow-y-auto rounded-xl border border-revix-border bg-white shadow-lg">
                    <div className="sticky top-0 grid h-8 grid-cols-12 items-center gap-2 border-b border-revix-border bg-revix-surface px-3 text-[10.5px] font-bold uppercase text-revix-secondary">
                      <div className="col-span-2">{isRtl ? "الكود" : "ID"}</div>
                      <div className="col-span-6">{isRtl ? "الاسم" : "Name"}</div>
                      <div className="col-span-4">{isRtl ? "الهاتف" : "Phone"}</div>
                    </div>
                    {filteredCustomers.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-revix-secondary">
                        {isRtl ? "لا يوجد عملاء مطابقون" : "No matching customers"}
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustomerQuery("");
                            setIsCustomerDropdownOpen(false);
                          }}
                          className={`grid h-9 w-full cursor-pointer grid-cols-12 items-center gap-2 border-b border-revix-border/40 px-3 text-start text-xs transition-colors hover:bg-emerald-50/70 ${
                            c.id === selectedCustomerId ? "bg-emerald-50 font-semibold text-revix-primary" : "text-revix-dark"
                          }`}
                        >
                          <div className="col-span-2 font-mono font-bold text-revix-primary" dir="ltr">
                            {c.customerCode ? highlightMatch(c.customerCode, customerQuery) : "—"}
                          </div>
                          <div className="col-span-6 truncate font-semibold text-revix-dark">
                            {highlightMatch(c.fullName, customerQuery)}
                          </div>
                          <div className="col-span-4 truncate font-mono font-semibold text-revix-dark" dir="ltr">
                            {highlightMatch(c.phone, customerQuery)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                title={isRtl ? "إضافة عميل جديد" : "Add New Customer"}
                className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-revix-primary-hover"
              >
                <RevixIcon name="plus" size={14} />
                <span>{isRtl ? "عميل جديد" : "New"}</span>
              </button>
            </div>

            {selectedCustomer && (
              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-emerald-900/10 bg-emerald-50/45 p-3 text-xs sm:grid-cols-4">
                {[
                  {
                    label: isRtl ? "كود العميل" : "Customer ID",
                    value: selectedCustomer.customerCode || "—",
                    mono: true,
                    highlight: true,
                  },
                  { label: isRtl ? "الاسم الكامل" : "Full Name", value: selectedCustomer.fullName },
                  { label: isRtl ? "الهاتف" : "Phone", value: selectedCustomer.phone, mono: true },
                  { label: isRtl ? "البريد الإلكتروني" : "Email", value: selectedCustomer.email || "—" },
                  {
                    label: isRtl ? "الهوية / الجواز" : "National ID",
                    value: `${selectedCustomer.nationalId || "—"}${selectedCustomer.nationalIdExpiry ? ` (${selectedCustomer.nationalIdExpiry})` : ""}`,
                    mono: true,
                  },
                  { label: isRtl ? "رقم الرخصة" : "Driver License", value: selectedCustomer.driverLicenseNo || "—", mono: true },
                  { label: isRtl ? "انتهاء الرخصة" : "License Expiry", value: selectedCustomer.licenseExpiry || "—", mono: true },
                  {
                    label: isRtl ? "العنوان / الجنسية" : "Address / Nat.",
                    value: [selectedCustomer.nationality, selectedCustomer.address].filter(Boolean).join(" · ") || "—",
                  },
                ].map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-lg border border-emerald-900/10 bg-white/90 px-3 py-2 text-start"
                  >
                    <div className="text-[10.5px] font-medium text-slate-500">{tile.label}</div>
                    <div
                      className={`mt-0.5 truncate font-semibold ${
                        tile.highlight ? "font-bold text-revix-primary" : "text-revix-dark"
                      } ${tile.mono ? "font-mono" : ""}`}
                    >
                      {tile.mono ? <span dir="ltr" className="inline-block">{tile.value}</span> : tile.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: Variant, Branch, Source & Or Similar */}
        <div className="rounded-xl border border-revix-border bg-revix-white">
          <div className="flex items-center gap-2.5 border-b border-revix-border/70 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-bold text-revix-primary">
              2
            </span>
            <span className="text-sm font-bold text-revix-dark">
              {isRtl ? "الفئة المطلوبة والفرع والمصدر" : "Variant, Branch & Source"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="lg:col-span-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-revix-dark">
                  {isRtl ? "الفئة المطلوبة (Variant) *" : "Vehicle Variant *"}
                </label>
                {variantId && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                      availableUnitsForVariant > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {isRtl
                      ? `المتاح بالفرع: ${availableUnitsForVariant}`
                      : `Available in branch: ${availableUnitsForVariant}`}
                  </span>
                )}
              </div>
              <RevixSelect
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                placeholder={isRtl ? "اختر الفئة" : "Select variant"}
                options={variants.map((v) => ({
                  value: v.id,
                  label: `${v.make} ${v.model} ${v.modelYear}${v.trim ? ` ${v.trim}` : ""}`,
                }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
                {isRtl ? "فرع الاستلام *" : "Pickup Branch *"}
              </label>
              <RevixSelect
                value={effectiveBranchId}
                onChange={(e) => setBranchId(e.target.value)}
                placeholder={
                  variantId && availableBranches.length === 0
                    ? isRtl
                      ? "لا توجد فروع متاحة لهذه الفئة"
                      : "No branches have this variant"
                    : isRtl
                      ? "اختر الفرع"
                      : "Select branch"
                }
                options={availableBranches.map((b) => ({ value: b.id, label: b.name }))}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
                {isRtl ? "مصدر الحجز" : "Booking Source"}
              </label>
              <RevixSelect
                value={source}
                onChange={(e) => setSource(e.target.value as ReservationSource)}
                options={[
                  { value: "phone", label: isRtl ? "اتصال هاتفي" : "Phone Call" },
                  { value: "walk_in", label: isRtl ? "حجز بالفرع" : "Walk-in" },
                  { value: "website", label: isRtl ? "الموقع الإلكتروني" : "Website" },
                  { value: "ota_partner", label: isRtl ? "موقع حجوزات (OTA)" : "OTA Partner" },
                ]}
              />
            </div>

            <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-revix-border bg-revix-surface/40 px-3 sm:col-span-2 lg:col-span-4">
              <input
                type="checkbox"
                checked={allowSimilar}
                onChange={(e) => setAllowSimilar(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-revix-primary"
              />
              <span className="text-xs font-semibold text-revix-dark">
                {isRtl
                  ? "السماح بسيارة مماثلة (Or Similar) — في حال عدم توفر نفس الفئة يوم الاستلام يمكن تسليم سيارة بديلة مماثلة"
                  : "Allow equivalent vehicle (Or Similar) if exact variant is unavailable on pickup day"}
              </span>
            </label>
          </div>
        </div>

        {/* STEP 3: Calendar, Time & Auto Pricing */}
        <div className="rounded-xl border border-revix-border bg-revix-white">
          <div className="flex items-center justify-between gap-3 border-b border-revix-border/70 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-bold text-revix-primary">
                3
              </span>
              <span className="text-sm font-bold text-revix-dark">
                {isRtl ? "فترة الحجز والتسعير التلقائي" : "Reservation Period & Pricing"}
              </span>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-revix-primary" dir="ltr">
              {pickupDate} → {returnDate} ({totalDays}d)
            </span>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
                  {isRtl ? "تاريخ الاستلام *" : "Pickup Date *"}
                </label>
                <RevixDatePicker
                  value={pickupDate}
                  onChange={(val) => {
                    setPickupDate(val);
                    if (val > returnDate) setReturnDate(val);
                  }}
                  minDate={today}
                  isRtl={isRtl}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
                  {isRtl ? "وقت الاستلام" : "Pickup Time"}
                </label>
                <RevixSelect
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  options={TIME_SLOTS}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
                  {isRtl ? "تاريخ العودة *" : "Return Date *"}
                </label>
                <RevixDatePicker
                  value={returnDate}
                  onChange={setReturnDate}
                  minDate={pickupDate}
                  isRtl={isRtl}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-revix-dark">
                  {isRtl ? "وقت العودة" : "Return Time"}
                </label>
                <RevixSelect
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  options={TIME_SLOTS}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-emerald-900/15 bg-emerald-50/40 px-4 py-3 sm:grid-cols-4">
              <div>
                <div className="text-[11px] text-revix-secondary">
                  {isRtl ? "شرائح الفئة (1–2 / 3–7 / 8+)" : "Variant Tiers (1–2 / 3–7 / 8+)"}
                </div>
                <div className="mt-0.5 font-mono text-xs font-semibold text-revix-dark">
                  {variantId
                    ? `${variantPricing.r1.toLocaleString()} / ${variantPricing.r3.toLocaleString()} / ${variantPricing.r8.toLocaleString()}`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-revix-secondary">
                  {isRtl ? "السعر اليومي للفئة" : "Variant Daily Rate"}
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-revix-primary">
                  {variantPricing.appliedRate.toLocaleString()} {currency}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-revix-secondary">
                  {isRtl ? "المدة" : "Duration"}
                </div>
                <div className="mt-0.5 font-mono text-xs font-semibold text-revix-dark">
                  {totalDays} {isRtl ? "يوم" : "day(s)"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-revix-secondary">
                  {isRtl ? "الإجمالي التقديري" : "Estimated Total"}
                </div>
                <div className="mt-0.5 font-mono text-sm font-bold text-revix-dark">
                  {estimatedTotal.toLocaleString()} {currency}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className={source === "website" || source === "ota_partner" ? "sm:col-span-2" : "sm:col-span-3"}>
                <FormInput
                  type="text"
                  label={isRtl ? "ملاحظات" : "Notes"}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? "أي ملاحظات إضافية من العميل..." : "Any customer notes..."}
                />
              </div>
              {(source === "website" || source === "ota_partner") && (
                <FormInput
                  type="text"
                  label={isRtl ? "مرجع الحجز الخارجي" : "External Booking Ref"}
                  value={externalBookingRef}
                  onChange={(e) => setExternalBookingRef(e.target.value)}
                  placeholder="EXT-12345"
                  className="font-mono"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Link href={reservationHref()}>
            <Button type="button" variant="secondary">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
          </Link>
          <Button type="submit" disabled={isCreating}>
            {isCreating
              ? isRtl
                ? "جاري الحفظ..."
                : "Saving..."
              : isRtl
                ? "تأكيد الحجز"
                : "Confirm Reservation"}
          </Button>
        </div>
      </form>

      <CustomerFormModal
        isOpen={isAddCustomerOpen}
        isRtl={isRtl}
        editingCustomer={null}
        onClose={() => setIsAddCustomerOpen(false)}
        onCreated={(created) => {
          setSelectedCustomerId(created.id);
          setIsAddCustomerOpen(false);
        }}
      />
    </div>
  );
}
