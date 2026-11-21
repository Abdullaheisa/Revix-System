"use client";

import { useState } from "react";
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  type CustomerDto,
} from "@/store/api/fleetApi";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { Alert } from "@/components/ui/Alert";

interface CustomerFormModalProps {
  isOpen: boolean;
  isRtl: boolean;
  editingCustomer: CustomerDto | null;
  onClose: () => void;
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
}: CustomerFormModalProps) {
  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();

  const [fullName, setFullName] = useState(editingCustomer?.fullName ?? "");
  const [phone, setPhone] = useState(editingCustomer?.phone ?? "");
  const [email, setEmail] = useState(editingCustomer?.email ?? "");
  const [nationalId, setNationalId] = useState(editingCustomer?.nationalId ?? "");
  const [driverLicenseNo, setDriverLicenseNo] = useState(editingCustomer?.driverLicenseNo ?? "");
  const [licenseExpiry, setLicenseExpiry] = useState(editingCustomer?.licenseExpiry ?? "");
  const [nationality, setNationality] = useState(editingCustomer?.nationality ?? "");
  const [address, setAddress] = useState(editingCustomer?.address ?? "");
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
        email: email.trim() || null,
        nationalId: nationalId.trim() || null,
        driverLicenseNo: driverLicenseNo.trim() || null,
        licenseExpiry: licenseExpiry || null,
        nationality: nationality.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      };
      if (editingCustomer) {
        await updateCustomer({ id: editingCustomer.id, ...payload }).unwrap();
      } else {
        await createCustomer(payload).unwrap();
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { data?: { error?: { message?: string } } })?.data?.error?.message ||
        (isRtl ? "تعذر حفظ بيانات العميل" : "Failed to save customer.");
      setErrorMsg(msg);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-lg rounded-2xl border border-revix-border bg-revix-white shadow-xl"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between border-b border-revix-border px-5 py-4">
          <h3 className="text-sm font-bold text-revix-dark">
            {editingCustomer
              ? isRtl
                ? "تعديل بيانات العميل"
                : "Edit Customer"
              : isRtl
                ? "إضافة عميل جديد"
                : "Add New Customer"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface"
          >
            <RevixIcon name="x" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {errorMsg && <Alert variant="error" message={errorMsg} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "الاسم بالكامل *" : "Full Name *"}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isRtl ? "مثال: أحمد محمد علي" : "e.g. Ahmed Mohamed Ali"}
                className="h-9 w-full rounded-lg border border-revix-border px-3 focus:border-revix-primary focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "رقم الهاتف *" : "Phone *"}
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isRtl ? "مثال: +20 100 000 0000" : "e.g. +20 100 000 0000"}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono focus:border-revix-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "الرقم القومي / الجواز" : "National ID / Passport"}
              </label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder={isRtl ? "مثال: 29501011234567" : "e.g. 29501011234567"}
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono focus:border-revix-primary focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "البريد الإلكتروني" : "Email"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="h-9 w-full rounded-lg border border-revix-border px-3 focus:border-revix-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "رقم رخصة القيادة" : "Driver License"}
              </label>
              <input
                type="text"
                value={driverLicenseNo}
                onChange={(e) => setDriverLicenseNo(e.target.value)}
                placeholder="DL-849201"
                className="h-9 w-full rounded-lg border border-revix-border px-3 font-mono focus:border-revix-primary focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "انتهاء الرخصة" : "License Expiry"}
              </label>
              <input
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                className="h-9 w-full rounded-lg border border-revix-border px-2.5 font-mono focus:border-revix-primary focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-revix-dark mb-1">
                {isRtl ? "الجنسية" : "Nationality"}
              </label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder={isRtl ? "مثال: مصري" : "e.g. Egyptian"}
                className="h-9 w-full rounded-lg border border-revix-border px-3 focus:border-revix-primary focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-revix-dark mb-1">
              {isRtl ? "العنوان" : "Address"}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isRtl ? "مثال: القاهرة، التجمع الخامس" : "e.g. Cairo, New Cairo"}
              className="h-9 w-full rounded-lg border border-revix-border px-3 focus:border-revix-primary focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-revix-dark mb-1">
              {isRtl ? "ملاحظات" : "Notes"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRtl ? "ملاحظات إضافية عن العميل..." : "Additional customer notes..."}
              className="w-full rounded-lg border border-revix-border p-2.5 focus:border-revix-primary focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-revix-border pt-3.5">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-revix-border px-4 py-2 font-semibold text-revix-secondary hover:bg-revix-surface"
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="cursor-pointer rounded-lg bg-revix-primary px-5 py-2 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
            >
              {isSaving ? (isRtl ? "جاري الحفظ..." : "Saving...") : isRtl ? "حفظ" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
