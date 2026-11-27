"use client";

import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  useCreateDriverMutation,
  useDeleteDriverMutation,
  useListDriversQuery,
  useUpdateDriverMutation,
  type DriverDto,
} from "@/store/api/fleetApi";
import { getApiErrorMessage } from "@/lib/api/errors";

export interface DriversPanelProps {
  isRtl: boolean;
  embedded?: boolean;
}

async function compressImageToDataUrl(file: File, maxDim = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function DocumentUploadCard({
  label,
  value,
  isRtl,
  onChange,
}: {
  label: string;
  value: string;
  isRtl: boolean;
  onChange: (val: string) => void;
}) {
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      onChange(dataUrl);
    } catch {
      // ignore invalid file
    }
    e.target.value = "";
  };

  return (
    <div className="rounded-xl border border-revix-border bg-revix-surface/30 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-revix-dark">{label}</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="cursor-pointer text-[11px] font-semibold text-red-600 hover:underline"
          >
            {isRtl ? "حذف" : "Remove"}
          </button>
        )}
      </div>

      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-revix-border bg-white">
          <img src={value} alt={label} className="h-36 w-full object-cover" />
        </div>
      ) : (
        <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-revix-border bg-white text-revix-muted hover:border-revix-primary hover:text-revix-primary transition-colors">
          <RevixIcon name="plus" size={18} />
          <span className="text-[11px] font-semibold">
            {isRtl ? "رفع صورة" : "Upload Image"}
          </span>
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      )}
    </div>
  );
}

export function DriversPanel({ isRtl, embedded = false }: DriversPanelProps) {
  const { data, isLoading } = useListDriversQuery();
  const [createDriver, { isLoading: isCreating }] = useCreateDriverMutation();
  const [updateDriver, { isLoading: isUpdating }] = useUpdateDriverMutation();
  const [deleteDriver] = useDeleteDriverMutation();

  const drivers = useMemo(() => data?.data ?? [], [data?.data]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<DriverDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phonePrimary, setPhonePrimary] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [email, setEmail] = useState("");
  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseIssueDate, setLicenseIssueDate] = useState("");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [idCardPhotoUrl, setIdCardPhotoUrl] = useState("");
  const [passportPhotoUrl, setPassportPhotoUrl] = useState("");
  const [licensePhotoUrl, setLicensePhotoUrl] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        d.phonePrimary.toLowerCase().includes(q) ||
        d.licenseNumber.toLowerCase().includes(q) ||
        (d.nationalIdNumber || "").toLowerCase().includes(q) ||
        (d.passportNumber || "").toLowerCase().includes(q),
    );
  }, [drivers, search]);

  const openNew = () => {
    setEditing(null);
    setFullName("");
    setPhonePrimary("");
    setPhoneSecondary("");
    setEmail("");
    setNationalIdNumber("");
    setPassportNumber("");
    setLicenseNumber("");
    setLicenseIssueDate("");
    setLicenseExpiryDate("");
    setAddress("");
    setStatus("active");
    setIdCardPhotoUrl("");
    setPassportPhotoUrl("");
    setLicensePhotoUrl("");
    setErrorMsg(null);
    setViewMode("form");
  };

  const openEdit = (d: DriverDto) => {
    setEditing(d);
    setFullName(d.fullName);
    setPhonePrimary(d.phonePrimary);
    setPhoneSecondary(d.phoneSecondary || "");
    setEmail(d.email || "");
    setNationalIdNumber(d.nationalIdNumber || "");
    setPassportNumber(d.passportNumber || "");
    setLicenseNumber(d.licenseNumber);
    setLicenseIssueDate(d.licenseIssueDate);
    setLicenseExpiryDate(d.licenseExpiryDate);
    setAddress(d.address || "");
    setStatus(d.status);
    setIdCardPhotoUrl(d.idCardPhotoUrl || "");
    setPassportPhotoUrl(d.passportPhotoUrl || "");
    setLicensePhotoUrl(d.licensePhotoUrl || "");
    setErrorMsg(null);
    setViewMode("form");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const missing: string[] = [];
    if (!fullName.trim()) missing.push(isRtl ? "الاسم الكامل" : "Full Name");
    if (!phonePrimary.trim()) missing.push(isRtl ? "رقم الهاتف 1" : "Phone 1");
    if (!licenseNumber.trim()) missing.push(isRtl ? "رقم الرخصة" : "License #");
    if (!licenseIssueDate) missing.push(isRtl ? "بداية الرخصة" : "License Issue");
    if (!licenseExpiryDate) missing.push(isRtl ? "نهاية الرخصة" : "License Expiry");
    if (missing.length > 0) {
      setErrorMsg(
        isRtl
          ? `يرجى إكمال الحقول المطلوبة: ${missing.join("، ")}`
          : `Please complete required fields: ${missing.join(", ")}`,
      );
      return;
    }
    if (licenseExpiryDate < licenseIssueDate) {
      setErrorMsg(
        isRtl
          ? "تاريخ انتهاء الرخصة لا يمكن أن يكون أقدم من تاريخ الإصدار."
          : "License expiry date cannot be earlier than the issue date.",
      );
      return;
    }
    const todayIso = new Date().toISOString().slice(0, 10);
    if (licenseExpiryDate < todayIso) {
      setErrorMsg(
        isRtl
          ? "رخصة السائق منتهية. يرجى إدخال تاريخ انتهاء ساري."
          : "Driver license is expired. Please enter a valid future expiry date.",
      );
      return;
    }
    try {
      const payload = {
        fullName,
        phonePrimary,
        phoneSecondary: phoneSecondary || null,
        email: email || null,
        nationalIdNumber: nationalIdNumber || null,
        passportNumber: passportNumber || null,
        licenseNumber,
        licenseIssueDate,
        licenseExpiryDate,
        idCardPhotoUrl: idCardPhotoUrl || null,
        passportPhotoUrl: passportPhotoUrl || null,
        licensePhotoUrl: licensePhotoUrl || null,
        address: address || null,
        status,
      };
      if (editing) {
        await updateDriver({ id: editing.id, ...payload }).unwrap();
      } else {
        await createDriver(payload).unwrap();
      }
      setViewMode("list");
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err) ?? (isRtl ? "تعذر حفظ بيانات السواق" : "Failed to save driver."));
    }
  };

  if (viewMode === "form") {
    return (
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-revix-border bg-white px-5 py-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 py-1.5 text-xs font-semibold text-revix-dark hover:bg-revix-surface"
            >
              <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
              <span>{isRtl ? "رجوع للسواقين" : "Back to Drivers"}</span>
            </button>
            <h2 className="text-base font-bold text-revix-dark">
              {editing ? (isRtl ? `تعديل سواق: ${editing.fullName}` : `Edit Driver: ${editing.fullName}`) : isRtl ? "إضافة سواق جديد" : "New Driver"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setViewMode("list")}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              {isRtl ? "حفظ البيانات" : "Save Driver"}
            </Button>
          </div>
        </div>

        {errorMsg && <Alert variant="error" message={errorMsg} />}

        {/* Card 1: Personal & Contact */}
        <div className="rounded-xl border border-revix-border bg-white p-5 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-revix-muted border-b border-revix-border/60 pb-2">
            {isRtl ? "البيانات الأساسية والتواصل" : "Basic & Contact Info"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <FormInput
              label={isRtl ? "الاسم الكامل *" : "Full Name *"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "رقم الهاتف 1 *" : "Phone 1 *"}
              value={phonePrimary}
              onChange={(e) => setPhonePrimary(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "رقم الهاتف 2" : "Phone 2"}
              value={phoneSecondary}
              onChange={(e) => setPhoneSecondary(e.target.value)}
            />
            <FormInput
              type="email"
              label={isRtl ? "البريد الإلكتروني" : "Email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="sm:col-span-3">
              <FormInput
                label={isRtl ? "العنوان" : "Address"}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-revix-dark">
                {isRtl ? "الحالة" : "Status"}
              </label>
              <RevixSelect
                size="sm"
                isRtl={isRtl}
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                buttonClassName="h-9 rounded-lg text-xs"
                options={[
                  { value: "active", label: isRtl ? "نشط" : "Active" },
                  { value: "inactive", label: isRtl ? "موقوف" : "Inactive" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Identity & License */}
        <div className="rounded-xl border border-revix-border bg-white p-5 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-revix-muted border-b border-revix-border/60 pb-2">
            {isRtl ? "الهوية ورخصة القيادة" : "Identity & Driver License"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <FormInput
              label={isRtl ? "رقم البطاقة / الهوية" : "National ID #"}
              value={nationalIdNumber}
              onChange={(e) => setNationalIdNumber(e.target.value)}
            />
            <FormInput
              label={isRtl ? "رقم جواز السفر" : "Passport #"}
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
            />
            <FormInput
              label={isRtl ? "رقم الرخصة *" : "License # *"}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              required
            />
            <div>
              <label className="mb-1 block text-xs font-semibold text-revix-dark">
                {isRtl ? "بداية الرخصة *" : "License Issue *"}
              </label>
              <RevixDatePicker
                isRtl={isRtl}
                value={licenseIssueDate}
                onChange={setLicenseIssueDate}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-revix-dark">
                {isRtl ? "نهاية الرخصة *" : "License Expiry *"}
              </label>
              <RevixDatePicker
                isRtl={isRtl}
                value={licenseExpiryDate}
                onChange={setLicenseExpiryDate}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Document Photos */}
        <div className="rounded-xl border border-revix-border bg-white p-5 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-revix-muted border-b border-revix-border/60 pb-2">
            {isRtl ? "صور المستندات (البطاقة، جواز السفر، الرخصة)" : "Document Photos (ID, Passport, License)"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DocumentUploadCard
              label={isRtl ? "صورة البطاقة / الهوية" : "National ID Photo"}
              value={idCardPhotoUrl}
              isRtl={isRtl}
              onChange={setIdCardPhotoUrl}
            />
            <DocumentUploadCard
              label={isRtl ? "صورة جواز السفر" : "Passport Photo"}
              value={passportPhotoUrl}
              isRtl={isRtl}
              onChange={setPassportPhotoUrl}
            />
            <DocumentUploadCard
              label={isRtl ? "صورة رخصة القيادة" : "Driver License Photo"}
              value={licensePhotoUrl}
              isRtl={isRtl}
              onChange={setLicensePhotoUrl}
            />
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        {!embedded ? (
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
              {isRtl ? "السواقين" : "Drivers"}
            </h1>
            <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
              {filtered.length}
            </span>
          </div>
        ) : (
          <div className="relative w-64">
            <RevixIcon
              name="search"
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isRtl ? "بحث بالاسم، الهاتف، الرخصة..." : "Search name, phone, license..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!embedded && (
            <div className="relative w-56">
              <RevixIcon
                name="search"
                className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isRtl ? "بحث بالاسم، الهاتف، الرخصة..." : "Search name, phone, license..."}
                className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
              />
            </div>
          )}
          <button
            type="button"
            onClick={openNew}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إضافة سواق" : "Add Driver"}</span>
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
        <DataTable fitAvailableHeight className="text-xs">
          <thead>
            <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الاسم" : "Name"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الهاتف" : "Phones"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الرخصة" : "License"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الصلاحية" : "Validity"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "الهوية / الجواز" : "ID / Passport"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-start font-semibold">{isRtl ? "المرفقات" : "Docs"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold">{isRtl ? "الحالة" : "Status"}</th>
              <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3 py-3 text-center font-semibold">{isRtl ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-revix-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-revix-muted">
                    {isRtl ? "جاري التحميل..." : "Loading..."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <TableEmptyRow
                  colSpan={8}
                  title={isRtl ? "لا يوجد سواقون مسجلون" : "No drivers registered"}
                  description={
                    isRtl
                      ? "أضف بيانات السائقين ورخص القيادة لتسهيل تسليم واستلام السيارات."
                      : "Register drivers and license details to streamline vehicle handovers."
                  }
                />
              ) : (
                filtered.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => openEdit(d)}
                    className="cursor-pointer hover:bg-revix-surface/35"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-revix-dark">{d.fullName}</div>
                      {d.email && <div className="text-[10px] text-revix-muted">{d.email}</div>}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      <div className="text-revix-dark">{d.phonePrimary}</div>
                      {d.phoneSecondary && (
                        <div className="text-[11px] text-revix-muted">{d.phoneSecondary}</div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold text-revix-dark">{d.licenseNumber}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-revix-secondary">
                      {d.licenseIssueDate} {isRtl ? "←" : "→"} {d.licenseExpiryDate}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-revix-dark">
                      <div>{d.nationalIdNumber || "—"}</div>
                      {d.passportNumber && <div className="text-revix-muted">{d.passportNumber}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {d.idCardPhotoUrl && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            {isRtl ? "بطاقة" : "ID"}
                          </span>
                        )}
                        {d.passportPhotoUrl && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                            {isRtl ? "جواز" : "Passport"}
                          </span>
                        )}
                        {d.licensePhotoUrl && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            {isRtl ? "رخصة" : "License"}
                          </span>
                        )}
                        {!d.idCardPhotoUrl && !d.passportPhotoUrl && !d.licensePhotoUrl && (
                          <span className="text-[11px] text-revix-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          d.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {d.status === "active" ? (isRtl ? "نشط" : "Active") : isRtl ? "موقوف" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="cursor-pointer rounded border border-revix-border px-2 py-1 text-[11px] font-semibold text-revix-dark hover:bg-revix-surface"
                        >
                          {isRtl ? "تعديل" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDriver(d.id)}
                          className="cursor-pointer rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                        >
                          {isRtl ? "حذف" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
      </div>
    </div>
  );
}
