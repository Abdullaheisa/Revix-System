"use client";

import { DataTable } from "@/components/ui/DataTable";
import { getApiErrorMessage } from "@/lib/api/errors";

import { useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { SectionCard } from "@/components/ui/SectionCard";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFleetText } from "@/lib/i18n/fleetText";
import {
  useCreateInsuranceCompanyMutation,
  useDeleteInsuranceCompanyMutation,
  useListInsuranceCompaniesQuery,
} from "@/store/api/fleetApi";

interface InsuranceCompaniesPanelProps {
  isRtl: boolean;
}

export function InsuranceCompaniesPanel({ isRtl }: InsuranceCompaniesPanelProps) {
  const { data, isLoading } = useListInsuranceCompaniesQuery();
  const [createCompany, { isLoading: isCreating }] = useCreateInsuranceCompanyMutation();
  const [deleteCompany] = useDeleteInsuranceCompanyMutation();

  const companies = data?.data ?? [];
  const t = getFleetText(isRtl).insuranceCompanies;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg(t.nameRequiredError);
      return;
    }
    try {
      await createCompany({
        name: name.trim(),
        contactPerson: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      }).unwrap();
      setIsModalOpen(false);
      setName("");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setAddress("");
    } catch (err: unknown) {
      setErrorMsg(getApiErrorMessage(err) || t.createFailedError);
    }
  }

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">{t.title}</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
        >
          <RevixIcon name="plus" size={14} />
          <span>{t.addBtn}</span>
        </button>
      </div>

      {isLoading ? (
        <SectionCard>
          <EmptyState message={isRtl ? "جاري التحميل..." : "Loading insurance companies..."} />
        </SectionCard>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-revix-border bg-revix-white p-12 text-center">
          <div className="rounded-full bg-revix-surface p-3 text-revix-primary">
            <RevixIcon name="shield-check" size={26} />
          </div>
          <h3 className="mt-3 text-sm font-bold text-revix-dark">{t.empty}</h3>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-4 py-2 text-xs font-semibold text-white hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" size={14} />
            <span>{t.addBtn}</span>
          </button>
        </div>
      ) : (
        <SectionCard noPadding>
          <div className="overflow-x-auto">
            <DataTable className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold uppercase tracking-wide text-revix-muted">
                  <th className="px-4 py-3 text-start">{t.colCompany}</th>
                  <th className="px-4 py-3 text-start">{t.colContact}</th>
                  <th className="px-4 py-3 text-start">{t.colPhone}</th>
                  <th className="px-4 py-3 text-start">{t.colEmail}</th>
                  <th className="px-4 py-3 text-start">{t.colAddress}</th>
                  <th className="px-4 py-3 text-end">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/70">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-revix-surface/40">
                    <td className="px-4 py-3 font-bold text-revix-dark">{c.name}</td>
                    <td className="px-4 py-3 text-revix-secondary">{c.contactPerson || "—"}</td>
                    <td className="px-4 py-3 font-mono text-revix-dark">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-revix-secondary">{c.email || "—"}</td>
                    <td className="px-4 py-3 text-revix-secondary">{c.address || "—"}</td>
                    <td className="px-4 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => deleteCompany(c.id)}
                        className="rounded-lg p-1.5 text-revix-muted hover:bg-revix-alert-soft hover:text-revix-alert transition-colors"
                      >
                        <RevixIcon name="trash-2" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </SectionCard>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-revix-border bg-revix-surface/30 px-5 py-4">
              <h3 className="text-sm font-bold text-revix-dark">{t.modalTitle}</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-revix-muted hover:bg-revix-surface hover:text-revix-dark"
              >
                <RevixIcon name="x" size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              {errorMsg && (
                <div className="rounded-lg border border-revix-alert/30 bg-revix-alert-soft p-2.5 text-revix-alert">
                  {errorMsg}
                </div>
              )}
              <LabeledInput
                label={t.nameLabel}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
              />
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput
                  label={t.contactLabel}
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder={t.contactPlaceholder}
                />
                <LabeledInput
                  label={t.phoneLabel}
                  type="text"
                  mono
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.phonePlaceholder}
                />
              </div>
              <LabeledInput
                label={t.emailLabel}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
              />
              <LabeledInput
                label={t.addressLabel}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.addressPlaceholder}
              />
              <div className="flex justify-end gap-2 border-t border-revix-border pt-3.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-revix-border px-4 py-2 font-semibold text-revix-secondary hover:bg-revix-surface"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-lg bg-revix-primary px-5 py-2 font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
                >
                  {isCreating ? t.saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
