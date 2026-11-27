"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import {
  useCreateRentalContractMutation,
  useListCustomersQuery,
  useListRentalContractsQuery,
  useListVehiclesQuery,
  type RentalContractDto,
} from "@/store/api/fleetApi";
import { useUpdateMySignatureMutation } from "@/store/api/authApi";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";
import { Alert } from "@/components/ui/Alert";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { SignaturePadModal } from "@/components/shared/SignaturePadModal";
import { CustomerFormModal } from "./CustomerFormModal";
import { RentalContractPrintModal } from "./RentalContractPrintModal";
import { getApiErrorMessage } from "@/lib/api/errors";

interface CreateRentalContractPageProps {
  isRtl: boolean;
}

type ContractSectionKey = "customer" | "vehicle" | "period" | "pricing";

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
  const { data: ctx } = useGetWorkspaceContextQuery();
  const currentUser = ctx?.data?.user ?? null;
  const [updateMySignature, { isLoading: isSavingEmpSig }] = useUpdateMySignatureMutation();
  const [isEmpSignOpen, setIsEmpSignOpen] = useState(false);
  const [localEmpSigned, setLocalEmpSigned] = useState(false);

  const [createContract, { isLoading: isCreating }] = useCreateRentalContractMutation();

  const today = useMemo(() => toLocalIso(new Date()), []);
  const defaultStart =
    initialStartParam && initialStartParam >= today ? initialStartParam : today;
  const defaultEnd = useMemo(() => {
    const [y, m, d] = defaultStart.split("-").map(Number);
    return toLocalIso(new Date(y, (m || 1) - 1, (d || 1) + 1));
  }, [defaultStart]);

  const [openSections, setOpenSections] = useState<Record<ContractSectionKey, boolean>>({
    customer: true,
    vehicle: Boolean(initialVehicleId),
    period: true,
    pricing: false,
  });

  const toggleSection = (key: ContractSectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const openOnlySection = (key: ContractSectionKey) =>
    setOpenSections({
      customer: key === "customer",
      vehicle: key === "vehicle",
      period: key === "period",
      pricing: key === "pricing",
    });

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicleId);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [customerQuery, setCustomerQuery] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCustomerFocused, setIsCustomerFocused] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [isVehicleDropdownOpen, setIsVehicleDropdownOpen] = useState(false);
  const [isVehicleFocused, setIsVehicleFocused] = useState(false);
  const customerBoxRef = useRef<HTMLDivElement | null>(null);
  const vehicleBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (customerBoxRef.current && !customerBoxRef.current.contains(target)) {
        setIsCustomerDropdownOpen(false);
      }
      if (vehicleBoxRef.current && !vehicleBoxRef.current.contains(target)) {
        setIsVehicleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [createdContract, setCreatedContract] = useState<RentalContractDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  const customers = useMemo(() => customersData?.data ?? [], [customersData?.data]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.customerCode ?? "").toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [customers, customerQuery]);

  const customerId = useMemo(() => {
    if (selectedCustomerId && customers.some((c) => c.id === selectedCustomerId)) {
      return selectedCustomerId;
    }
    return "";
  }, [selectedCustomerId, customers]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
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

  const filteredVehicles = useMemo(() => {
    const q = vehicleQuery.trim().toLowerCase();
    if (!q) return availableVehicles;
    return availableVehicles.filter((v) => {
      const modelLabel = v.variant
        ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`.toLowerCase()
        : "";
      return (
        (v.assetCode ?? "").toLowerCase().includes(q) ||
        v.licensePlate.toLowerCase().includes(q) ||
        modelLabel.includes(q) ||
        (v.branchName ?? "").toLowerCase().includes(q)
      );
    });
  }, [availableVehicles, vehicleQuery]);

  const vehicleId = useMemo(() => {
    if (selectedVehicleId && availableVehicles.some((v) => v.id === selectedVehicleId)) {
      return selectedVehicleId;
    }
    return "";
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

  const dailyRate = tierRate;
  const pickupOdometer = Number(selectedVehicle?.mileageOdometer || 0);
  const depositAmount = Number(selectedVehicle?.securityDeposit || 0);

  const subtotal = dailyRate * totalDays;
  const totalAmount = Math.max(0, subtotal - discount);
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!customerId) {
      openOnlySection("customer");
      setErrorMsg(isRtl ? "يرجى اختيار أو إضافة العميل أولاً." : "Please select or add a customer first.");
      return;
    }
    if (!vehicleId) {
      openOnlySection("vehicle");
      setErrorMsg(isRtl ? "يرجى اختيار السيارة المتاحة." : "Please select an available vehicle.");
      return;
    }
    if (endDate < startDate) {
      openOnlySection("period");
      setErrorMsg(
        isRtl
          ? "تاريخ التسليم يجب أن يكون بعد أو نفس تاريخ الاستلام."
          : "End date must be on or after start date.",
      );
      return;
    }
    if (currentUser && !currentUser.signatureDataUrl && !localEmpSigned) {
      setIsEmpSignOpen(true);
      return;
    }
    await submitCreateContract();
  }

  async function submitCreateContract() {
    try {
      const res = await createContract({
        vehicleId,
        customerId,
        startDate,
        endDate,
        pickupOdometer: Number(pickupOdometer) || 0,
        dailyRate: Number(dailyRate) || 0,
        discount: Number(discount) || 0,
        insuranceFee: 0,
        depositAmount: Number(depositAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        notes: notes.trim() || null,
      }).unwrap();
      setCreatedContract(res.data);
    } catch (err: unknown) {
      setErrorMsg(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر إنشاء عقد التأجير." : "Failed to create rental contract."),
      );
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
                ? "١. اختر أو أضف العميل  ←  ٢. اختر السيارة  ←  ٣. حدد الفترة والتسعير"
                : "1. Select or add customer  →  2. Choose vehicle  →  3. Set period & pricing"}
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

      <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Main Collapsible Steps Column */}
        <div className="space-y-3 lg:col-span-8">
          {/* STEP 1: Customer */}
          <div className={`relative rounded-xl border border-revix-border bg-revix-white ${isCustomerDropdownOpen ? "z-20" : ""}`}>
            <button
              type="button"
              onClick={() => toggleSection("customer")}
              className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-start hover:bg-revix-surface/60 transition-colors ${openSections.customer ? "rounded-t-xl" : "rounded-xl"}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-bold text-revix-primary">
                  1
                </span>
                <span className="text-sm font-bold text-revix-dark">
                  {isRtl ? "بيانات العميل" : "Customer Details"}
                </span>
                {selectedCustomer && (
                  <span className="truncate rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-revix-primary">
                    {selectedCustomer.customerCode || "CUS"} · {selectedCustomer.fullName}
                  </span>
                )}
              </div>
              <RevixIcon
                name={openSections.customer ? "chevron-up" : "chevron-down"}
                size={16}
                className="shrink-0 text-revix-secondary"
              />
            </button>

            {openSections.customer && (
              <div className="border-t border-revix-border/70 p-4 space-y-4">
                <div className="flex items-end gap-2">
                  <div ref={customerBoxRef} className="relative flex-1 min-w-0">
                    <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                      {isRtl
                        ? "ابحث بالاسم أو الهاتف أو رقم العميل (0001) *"
                        : "Search Customer by ID (0001), Name, or Phone *"}
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
                        onBlur={() => {
                          setIsCustomerFocused(false);
                        }}
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
                                c.id === customerId ? "bg-emerald-50 font-semibold text-revix-primary" : "text-revix-dark"
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
                    className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-bold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
                  >
                    <RevixIcon name="plus" size={14} />
                    <span>{isRtl ? "عميل جديد" : "New"}</span>
                  </button>
                </div>

                {selectedCustomer && (
                  <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-emerald-900/10 bg-emerald-50/45 p-3 sm:grid-cols-4 text-xs">
                    {[
                      {
                        label: isRtl ? "كود العميل" : "Customer ID",
                        value: selectedCustomer.customerCode || "—",
                        mono: true,
                        highlight: true,
                      },
                      {
                        label: isRtl ? "الاسم الكامل" : "Full Name",
                        value: selectedCustomer.fullName,
                      },
                      {
                        label: isRtl ? "الهاتف" : "Phone",
                        value: selectedCustomer.phone,
                        mono: true,
                      },
                      {
                        label: isRtl ? "البريد الإلكتروني" : "Email",
                        value: selectedCustomer.email || "—",
                      },
                      {
                        label: isRtl ? "الهوية / الجواز" : "National ID",
                        value: `${selectedCustomer.nationalId || "—"}${selectedCustomer.nationalIdExpiry ? ` (${selectedCustomer.nationalIdExpiry})` : ""}`,
                        mono: true,
                      },
                      {
                        label: isRtl ? "رقم الرخصة" : "Driver License",
                        value: selectedCustomer.driverLicenseNo || "—",
                        mono: true,
                      },
                      {
                        label: isRtl ? "انتهاء الرخصة" : "License Expiry",
                        value: selectedCustomer.licenseExpiry || "—",
                        mono: true,
                      },
                      {
                        label: isRtl ? "العنوان / الجنسية" : "Address / Nat.",
                        value:
                          [selectedCustomer.nationality, selectedCustomer.address]
                            .filter(Boolean)
                            .join(" · ") || "—",
                      },
                    ].map((tile) => (
                      <div
                        key={tile.label}
                        className="rounded-lg border border-emerald-900/10 bg-white/90 px-3 py-2 text-start"
                      >
                        <div className="text-[10.5px] font-medium text-slate-500">
                          {tile.label}
                        </div>
                        <div
                          className={`mt-0.5 truncate font-semibold ${
                            tile.highlight ? "text-revix-primary font-bold" : "text-revix-dark"
                          } ${tile.mono ? "font-mono" : ""}`}
                        >
                          {tile.mono ? (
                            <span dir="ltr" className="inline-block">
                              {tile.value}
                            </span>
                          ) : (
                            tile.value
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => openOnlySection("vehicle")}
                    className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-revix-primary/30 bg-emerald-50 px-3 text-xs font-semibold text-revix-primary hover:bg-emerald-100"
                  >
                    <span>{isRtl ? "التالي: اختيار السيارة" : "Next: Select Vehicle"}</span>
                    <RevixIcon name={isRtl ? "chevron-left" : "chevron-right"} size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Vehicle */}
          <div className={`relative rounded-xl border border-revix-border bg-revix-white ${isVehicleDropdownOpen ? "z-20" : ""}`}>
            <button
              type="button"
              onClick={() => toggleSection("vehicle")}
              className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-start hover:bg-revix-surface/60 transition-colors ${openSections.vehicle ? "rounded-t-xl" : "rounded-xl"}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-bold text-revix-primary">
                  2
                </span>
                <span className="text-sm font-bold text-revix-dark">
                  {isRtl ? "اختيار السيارة" : "Select Vehicle"}
                </span>
                {selectedVehicle && (
                  <span className="truncate rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-revix-primary" dir="ltr">
                    {selectedVehicle.assetCode || "VEH"} · {selectedVehicle.licensePlate}
                  </span>
                )}
              </div>
              <RevixIcon
                name={openSections.vehicle ? "chevron-up" : "chevron-down"}
                size={16}
                className="shrink-0 text-revix-secondary"
              />
            </button>

            {openSections.vehicle && (
              <div className="border-t border-revix-border/70 p-4 space-y-4">
                <div ref={vehicleBoxRef} className="relative">
                  <label className="block text-xs font-semibold text-revix-dark mb-1.5">
                    {isRtl
                      ? "ابحث بالاسم أو رقم اللوحة أو Asset ID (0001) *"
                      : "Search Vehicle by Asset ID (0001), Plate, or Model *"}
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
                        isVehicleFocused || isVehicleDropdownOpen
                          ? vehicleQuery
                          : selectedVehicle
                            ? `${selectedVehicle.assetCode || ""} · ${selectedVehicle.licensePlate} · ${
                                selectedVehicle.variant
                                  ? `${selectedVehicle.variant.make} ${selectedVehicle.variant.model} ${selectedVehicle.variant.modelYear}`
                                  : ""
                              }`
                            : vehicleQuery
                      }
                      onFocus={() => {
                        setVehicleQuery("");
                        setIsVehicleFocused(true);
                      }}
                      onBlur={() => {
                        setIsVehicleFocused(false);
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVehicleQuery(val);
                        setIsVehicleDropdownOpen(val.trim().length > 0);
                      }}
                      disabled={isLoadingVehicles}
                      placeholder={
                        availableVehicles.length === 0
                          ? isRtl
                            ? "لا توجد سيارات مسعرة متاحة"
                            : "No priced vehicles available"
                          : isRtl
                            ? "اكتب رقم الأصل أو اللوحة أو الموديل للبحث..."
                            : "Type Asset ID, plate, or model to search..."
                      }
                      className="h-10 w-full rounded-lg border border-revix-border bg-revix-white ps-9 pe-8 text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-hidden"
                    />
                    {(selectedVehicle || vehicleQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId("");
                          setVehicleQuery("");
                          setIsVehicleDropdownOpen(false);
                        }}
                        className="absolute top-1/2 end-2.5 -translate-y-1/2 cursor-pointer text-revix-secondary hover:text-revix-dark"
                      >
                        <RevixIcon name="x" size={14} />
                      </button>
                    )}
                  </div>

                  {isVehicleDropdownOpen && vehicleQuery.trim().length > 0 && (
                    <div className="absolute start-0 end-0 top-full z-30 mt-1 max-h-[214px] overflow-y-auto rounded-xl border border-revix-border bg-white shadow-lg">
                      <div className="sticky top-0 grid h-8 grid-cols-12 items-center gap-2 border-b border-revix-border bg-revix-surface px-3 text-[10.5px] font-bold uppercase text-revix-secondary">
                        <div className="col-span-2">Asset ID</div>
                        <div className="col-span-3">{isRtl ? "اللوحة" : "Plate"}</div>
                        <div className="col-span-4">{isRtl ? "الموديل" : "Model"}</div>
                        <div className="col-span-3">{isRtl ? "الفرع" : "Branch"}</div>
                      </div>
                      {filteredVehicles.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-revix-secondary">
                          {isRtl ? "لا توجد سيارات مطابقة" : "No matching vehicles"}
                        </div>
                      ) : (
                        filteredVehicles.map((v) => {
                          const modelLabel = v.variant
                            ? `${v.variant.make} ${v.variant.model} ${v.variant.modelYear}`
                            : "—";
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setSelectedVehicleId(v.id);
                                setVehicleQuery("");
                                setIsVehicleDropdownOpen(false);
                              }}
                              className={`grid h-9 w-full cursor-pointer grid-cols-12 items-center gap-2 border-b border-revix-border/40 px-3 text-start text-xs transition-colors hover:bg-emerald-50/70 ${
                                v.id === vehicleId ? "bg-emerald-50 font-semibold text-revix-primary" : "text-revix-dark"
                              }`}
                            >
                              <div className="col-span-2 font-mono font-bold text-revix-primary" dir="ltr">
                                {v.assetCode ? highlightMatch(v.assetCode, vehicleQuery) : "—"}
                              </div>
                              <div className="col-span-3 truncate font-mono font-bold text-revix-dark" dir="ltr">
                                {highlightMatch(v.licensePlate, vehicleQuery)}
                              </div>
                              <div className="col-span-4 truncate font-semibold text-revix-dark">
                                {highlightMatch(modelLabel, vehicleQuery)}
                              </div>
                              <div className="col-span-3 truncate font-medium text-revix-secondary">
                                {v.branchName ? highlightMatch(v.branchName, vehicleQuery) : "—"}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {availableVehicles.length === 0 && (
                    <p className="mt-1.5 text-[11px] text-amber-700">
                      {isRtl
                        ? "تأكد من تسعير الفئة في قائمة الأسعار (Price List) ونقل السيارة لفرع."
                        : "Ensure the vehicle variant has pricing in Price List and is assigned to a branch."}
                    </p>
                  )}
                </div>

                {selectedVehicle && (
                  <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-emerald-900/10 bg-emerald-50/45 p-3 sm:grid-cols-4 text-xs">
                    {[
                      {
                        label: "Asset ID",
                        value: selectedVehicle.assetCode || "—",
                        mono: true,
                        highlight: true,
                      },
                      {
                        label: isRtl ? "رقم اللوحة" : "License Plate",
                        value: selectedVehicle.licensePlate,
                        mono: true,
                      },
                      {
                        label: isRtl ? "الموديل" : "Model",
                        value: selectedVehicle.variant
                          ? `${selectedVehicle.variant.make} ${selectedVehicle.variant.model} ${selectedVehicle.variant.modelYear}`
                          : "—",
                      },
                      {
                        label: isRtl ? "الفرع" : "Branch",
                        value: selectedVehicle.branchName || "—",
                      },
                      {
                        label: isRtl ? "اللون" : "Color",
                        value: selectedVehicle.color || "—",
                      },
                      {
                        label: isRtl ? "العداد" : "Odometer",
                        value: `${selectedVehicle.mileageOdometer.toLocaleString()} km`,
                        mono: true,
                      },
                      {
                        label: isRtl ? "أسعار الشرائح (1–2 / 3–7 / 8+)" : "Tier Rates (1–2 / 3–7 / 8+)",
                        value: `${Number(selectedVehicle.dailyRate1to2 || 0).toLocaleString()} / ${Number(selectedVehicle.dailyRate3to7 || 0).toLocaleString()} / ${Number(selectedVehicle.dailyRate8Plus || 0).toLocaleString()}`,
                        mono: true,
                        highlight: true,
                        span2: true,
                      },
                    ].map((tile) => (
                      <div
                        key={tile.label}
                        className={`rounded-lg border border-emerald-900/10 bg-white/90 px-3 py-2 text-start ${
                          tile.span2 ? "col-span-2" : ""
                        }`}
                      >
                        <div className="text-[10.5px] font-medium text-slate-500">
                          {tile.label}
                        </div>
                        <div
                          className={`mt-0.5 truncate font-semibold ${
                            tile.highlight ? "text-revix-primary font-bold" : "text-revix-dark"
                          } ${tile.mono ? "font-mono" : ""}`}
                        >
                          {tile.mono ? (
                            <span dir="ltr" className="inline-block">
                              {tile.value}
                            </span>
                          ) : (
                            tile.value
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections({
                        customer: false,
                        vehicle: false,
                        period: true,
                        pricing: true,
                      })
                    }
                    className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-revix-primary/30 bg-emerald-50 px-3 text-xs font-semibold text-revix-primary hover:bg-emerald-100"
                  >
                    <span>{isRtl ? "التالي: الفترة والتسعير" : "Next: Period & Pricing"}</span>
                    <RevixIcon name={isRtl ? "chevron-left" : "chevron-right"} size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: Rental Period */}
          <div className="rounded-xl border border-revix-border bg-revix-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("period")}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-start hover:bg-revix-surface/60 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-bold text-revix-primary">
                  3
                </span>
                <span className="text-sm font-bold text-revix-dark">
                  {isRtl ? "فترة الإيجار" : "Rental Period"}
                </span>
                <span className="truncate rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-revix-primary" dir="ltr">
                  {startDate} → {endDate} ({totalDays}d)
                </span>
              </div>
              <RevixIcon
                name={openSections.period ? "chevron-up" : "chevron-down"}
                size={16}
                className="shrink-0 text-revix-secondary"
              />
            </button>

            {openSections.period && (
              <div className="border-t border-revix-border/70 p-4">
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
              </div>
            )}
          </div>

          {/* STEP 4: Pricing, Odometer & Payments */}
          <div className="rounded-xl border border-revix-border bg-revix-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("pricing")}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-start hover:bg-revix-surface/60 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 font-mono text-xs font-bold text-revix-primary">
                  4
                </span>
                <span className="text-sm font-bold text-revix-dark">
                  {isRtl ? "التسعير والمدفوعات" : "Pricing & Payments"}
                </span>
              </div>
              <RevixIcon
                name={openSections.pricing ? "chevron-up" : "chevron-down"}
                size={16}
                className="shrink-0 text-revix-secondary"
              />
            </button>

            {openSections.pricing && (
              <div className="border-t border-revix-border/70 p-4 space-y-4">
                {/* Auto-populated read-only vehicle & tier pricing */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-900/10 bg-emerald-50/55 px-3.5 py-2.5">
                    <div className="text-[11px] font-medium text-revix-secondary">
                      {isRtl ? "عداد الخروج (كم)" : "Pickup Odometer (km)"}
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-revix-dark" dir="ltr">
                      {pickupOdometer.toLocaleString()} km
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-900/10 bg-emerald-50/55 px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-revix-secondary">
                      <span>{isRtl ? "السعر اليومي" : "Daily Rate"}</span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        {activeTierLabel}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-revix-primary" dir="ltr">
                      {dailyRate.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-900/10 bg-emerald-50/55 px-3.5 py-2.5">
                    <div className="text-[11px] font-medium text-revix-secondary">
                      {isRtl ? "التأمين المسترد (الديبوزت)" : "Security Deposit"}
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-bold text-revix-dark" dir="ltr">
                      {depositAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Editable contract fields */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-revix-border/60">
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
              </div>
            )}
          </div>
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
                <span className="font-semibold text-revix-dark truncate max-w-[190px]">
                  {selectedCustomer
                    ? `${selectedCustomer.customerCode || "CUS"} · ${selectedCustomer.fullName}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-revix-secondary">{isRtl ? "المركبة" : "Vehicle"}</span>
                <span className="font-mono font-semibold text-revix-dark" dir="ltr">
                  {selectedVehicle
                    ? `${selectedVehicle.assetCode || "VEH"} · ${selectedVehicle.licensePlate}`
                    : "—"}
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

      <CustomerFormModal
        isOpen={isAddCustomerOpen}
        isRtl={isRtl}
        editingCustomer={null}
        onClose={() => setIsAddCustomerOpen(false)}
        onCreated={(created) => setSelectedCustomerId(created.id)}
      />

      <SignaturePadModal
        isOpen={isEmpSignOpen}
        isRtl={isRtl}
        title={isRtl ? "توقيع الموظف المسئول (مطلوب قبل الطباعة)" : "Employee Signature (Required Before Printing)"}
        description={
          isRtl
            ? "لم تقم بإضافة توقيعك الشخصي بعد. وقّع مرة واحدة الآن ليُحفظ على حسابك ويظهر في جميع عقودك."
            : "You haven't saved your personal signature yet. Sign once now to save it to your account for all your contracts."
        }
        isSaving={isSavingEmpSig}
        onClose={() => setIsEmpSignOpen(false)}
        onSave={async (dataUrl) => {
          try {
            await updateMySignature({ signatureDataUrl: dataUrl }).unwrap();
            setLocalEmpSigned(true);
            setIsEmpSignOpen(false);
            await submitCreateContract();
          } catch (err) {
            setIsEmpSignOpen(false);
            setErrorMsg(
              getApiErrorMessage(err) ||
                (isRtl ? "تعذر حفظ توقيع الموظف." : "Failed to save employee signature."),
            );
          }
        }}
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
