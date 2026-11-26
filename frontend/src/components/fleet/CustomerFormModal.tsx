"use client";

import { useMemo, useState } from "react";
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  type CustomerDto,
} from "@/store/api/fleetApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixDatePicker } from "@/components/ui/RevixDatePicker";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { FormInput } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { WORLD_NATIONALITIES } from "@/lib/constants/nationalities";

interface CustomerFormModalProps {
  isOpen: boolean;
  isRtl: boolean;
  editingCustomer: CustomerDto | null;
  onClose: () => void;
  onCreated?: (customer: CustomerDto) => void;
  variant?: "modal" | "page";
}

export function CustomerFormModal(props: CustomerFormModalProps) {
  if (!props.isOpen) return null;
  return <CustomerForm key={props.editingCustomer?.id ?? "new"} {...props} />;
}

function CustomerForm({
  isOpen,
  isRtl,
  editingCustomer,
  onClose,
  onCreated,
  variant = "modal",
}: CustomerFormModalProps) {
  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nationalityOptions = useMemo(
    () =>
      WORLD_NATIONALITIES.map((n) => ({
        value: n.value,
        label: isRtl ? `${n.ar} (${n.en})` : n.en,
      })),
    [isRtl],
  );

  const [fullName, setFullName] = useState(editingCustomer?.fullName ?? "");
  const [phone, setPhone] = useState(editingCustomer?.phone ?? "");
  const [secondaryPhone, setSecondaryPhone] = useState(editingCustomer?.secondaryPhone ?? "");
  const [email, setEmail] = useState(editingCustomer?.email ?? "");
  const [nationalId, setNationalId] = useState(editingCustomer?.nationalId ?? "");
  const [nationalIdExpiry, setNationalIdExpiry] = useState(editingCustomer?.nationalIdExpiry ?? "");
  const [driverLicenseNo, setDriverLicenseNo] = useState(editingCustomer?.driverLicenseNo ?? "");
  const [licenseExpiry, setLicenseExpiry] = useState(editingCustomer?.licenseExpiry ?? "");
  const [nationality, setNationality] = useState(editingCustomer?.nationality ?? "");
  const [address, setAddress] = useState(editingCustomer?.address ?? "");
  const [workAddress, setWorkAddress] = useState(editingCustomer?.workAddress ?? "");
  const [notes, setNotes] = useState(editingCustomer?.notes ?? "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSaving = isCreating || isUpdating;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        secondaryPhone: secondaryPhone.trim() || null,
        email: email.trim() || null,
        nationalId: nationalId.trim() || null,
        nationalIdExpiry: nationalIdExpiry || null,
        driverLicenseNo: driverLicenseNo.trim() || null,
        licenseExpiry: licenseExpiry || null,
        nationality: nationality.trim() || null,
        address: address.trim() || null,
        workAddress: workAddress.trim() || null,
        notes: notes.trim() || null,
      };
      if (editingCustomer) {
        await updateCustomer({ id: editingCustomer.id, ...payload }).unwrap();
      } else {
        const res = await createCustomer(payload).unwrap();
        onCreated?.(res.data);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: { message?: string } } })?.data?.error?.message ||
        (isRtl ? "تعذر حفظ بيانات العميل" : "Failed to save customer.");
      setErrorMsg(msg);
    }
  }

  const formSections = (
    <>
      {errorMsg && <Alert variant="error" message={errorMsg} />}

      {/* Card 1: Personal & Contact */}
      <div className="rounded-xl border border-revix-border bg-white p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-revix-muted border-b border-revix-border/60 pb-2">
          {isRtl ? "البيانات الأساسية والتواصل" : "Basic & Contact Info"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <FormInput
            label={isRtl ? "الاسم بالكامل *" : "Full Name *"}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={isRtl ? "مثال: أحمد محمد علي" : "e.g. Ahmed Mohamed Ali"}
            required
          />
          <FormInput
            label={isRtl ? "رقم الهاتف *" : "Phone *"}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={isRtl ? "مثال: +20 100 000 0000" : "e.g. +20 100 000 0000"}
            required
          />
          <FormInput
            label={isRtl ? "رقم هاتف ثاني" : "Secondary Phone"}
            value={secondaryPhone}
            onChange={(e) => setSecondaryPhone(e.target.value)}
            placeholder={isRtl ? "مثال: +20 111 000 0000" : "e.g. +20 111 000 0000"}
          />
          <FormInput
            type="email"
            label={isRtl ? "البريد الإلكتروني" : "Email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
          />
        </div>
      </div>

      {/* Card 2: Identity, License & Nationality */}
      <div className="rounded-xl border border-revix-border bg-white p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-revix-muted border-b border-revix-border/60 pb-2">
          {isRtl ? "الهوية ورخصة القيادة والجنسية" : "Identity, License & Nationality"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <FormInput
            label={isRtl ? "الرقم القومي / الجواز" : "National ID / Passport"}
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder={isRtl ? "مثال: 29501011234567" : "e.g. 29501011234567"}
          />
          <div>
            <label className="mb-1 block text-xs font-semibold text-revix-dark">
              {isRtl ? "انتهاء البطاقة / الجواز" : "ID / Passport Expiry"}
            </label>
            <RevixDatePicker
              isRtl={isRtl}
              minDate={today}
              value={nationalIdExpiry}
              onChange={(next) => setNationalIdExpiry(next)}
            />
          </div>
          <FormInput
            label={isRtl ? "رقم رخصة القيادة" : "Driver License"}
            value={driverLicenseNo}
            onChange={(e) => setDriverLicenseNo(e.target.value)}
            placeholder="DL-849201"
          />
          <div>
            <label className="mb-1 block text-xs font-semibold text-revix-dark">
              {isRtl ? "تاريخ انتهاء الرخصة" : "License Expiry"}
            </label>
            <RevixDatePicker
              isRtl={isRtl}
              minDate={today}
              value={licenseExpiry}
              onChange={(next) => setLicenseExpiry(next)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-revix-dark">
              {isRtl ? "الجنسية" : "Nationality"}
            </label>
            <RevixSelect
              size="sm"
              searchable
              isRtl={isRtl}
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder={isRtl ? "اختر الجنسية..." : "Select nationality..."}
              buttonClassName="h-9 rounded-lg text-xs"
              options={nationalityOptions}
            />
          </div>
        </div>
      </div>

      {/* Card 3: Addresses & Notes */}
      <div className="rounded-xl border border-revix-border bg-white p-5 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-revix-muted border-b border-revix-border/60 pb-2">
          {isRtl ? "العناوين والملاحظات" : "Addresses & Notes"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <FormInput
            label={isRtl ? "عنوان السكن (Home Address)" : "Home Address"}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={isRtl ? "مثال: القاهرة، التجمع الخامس" : "e.g. Cairo, New Cairo"}
          />
          <FormInput
            label={isRtl ? "عنوان العمل" : "Work Address"}
            value={workAddress}
            onChange={(e) => setWorkAddress(e.target.value)}
            placeholder={isRtl ? "مثال: القرية الذكية، الجيزة" : "e.g. Smart Village, Giza"}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-revix-dark">
            {isRtl ? "ملاحظات" : "Notes"}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isRtl ? "ملاحظات إضافية عن العميل..." : "Additional customer notes..."}
            className="w-full rounded-lg border border-revix-border p-2.5 text-xs focus:border-revix-primary focus:outline-hidden"
          />
        </div>
      </div>
    </>
  );

  if (variant === "page") {
    return (
      <form onSubmit={handleSubmit} className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-revix-border bg-white px-5 py-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 py-1.5 text-xs font-semibold text-revix-dark hover:bg-revix-surface"
            >
              <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={14} />
              <span>{isRtl ? "رجوع للعملاء" : "Back to Customers"}</span>
            </button>
            <h2 className="text-base font-bold text-revix-dark">
              {editingCustomer
                ? isRtl
                  ? `تعديل عميل: ${editingCustomer.fullName}`
                  : `Edit Customer: ${editingCustomer.fullName}`
                : isRtl
                  ? "إضافة عميل جديد"
                  : "New Customer"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isRtl ? "حفظ البيانات" : "Save Customer"}
            </Button>
          </div>
        </div>

        {formSections}
      </form>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-revix-border bg-revix-surface shadow-xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-revix-border bg-revix-white px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-revix-dark">
              {editingCustomer
                ? isRtl
                  ? "تعديل بيانات العميل"
                  : "Edit Customer"
                : isRtl
                  ? "إضافة عميل جديد"
                  : "Add New Customer"}
            </h3>
            <p className="text-[11px] text-revix-secondary mt-0.5">
              {isRtl
                ? "أدخل بيانات التواصل، الهوية، رخصة القيادة، والعناوين"
                : "Enter contact details, identity, driver license, and addresses"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface"
          >
            <RevixIcon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {formSections}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isRtl ? "حفظ العميل" : "Save Customer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
