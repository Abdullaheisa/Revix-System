"use client";

import { DataTable } from "@/components/ui/DataTable";
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

export function DriversPanel({ isRtl }: DriversPanelProps) {
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
    if (!licenseIssueDate || !licenseExpiryDate) {
      setErrorMsg(isRtl ? "يرجى تحديد تاريخ بداية ونهاية الرخصة." : "Please select license issue and expiry dates.");
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
      <form onSubmit={handleSubmit} className="space-y-4">
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-revix-dark">
          {isRtl ? "السواقين" : "Drivers"}
        </h2>
        <div className="flex items-center gap-2.5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isRtl ? "بحث بالاسم، الهاتف، الرخصة..." : "Search name, phone, license..."}
            className="h-9 w-60 rounded-lg border border-revix-border bg-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:outline-hidden"
          />
          <Button onClick={openNew}>
            {isRtl ? "+ إضافة سواق" : "+ Add Driver"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-revix-border bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <DataTable className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold uppercase tracking-wider text-revix-muted">
                <th className="px-4 py-3 text-start">{isRtl ? "الاسم" : "Name"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "الهاتف" : "Phones"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "الرخصة" : "License"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "الصلاحية" : "Validity"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "الهوية / الجواز" : "ID / Passport"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "المرفقات" : "Docs"}</th>
                <th className="px-3 py-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                <th className="px-4 py-3 text-end">{isRtl ? "إجراء" : "Actions"}</th>
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
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-revix-muted">
                    {isRtl ? "لا يوجد سواقين مسجلين" : "No drivers registered."}
                  </td>
                </tr>
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
    </div>
  );
}
