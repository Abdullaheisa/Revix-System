"use client";

import { DataTable } from "@/components/ui/DataTable";
import { getApiErrorMessage } from "@/lib/api/errors";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { insuranceCompanyHref, parseFleetResourceRoute } from "@/lib/workspace/resourceRoutes";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { LabeledInput } from "@/components/ui/LabeledInput";
import { getFleetText } from "@/lib/i18n/fleetText";
import {
  useCreateInsuranceCompanyMutation,
  useDeleteInsuranceCompanyMutation,
  useListInsuranceCompaniesQuery,
} from "@/store/api/fleetApi";
import { InsuranceCompanyDetailPage } from "./InsuranceCompanyDetailPage";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import { exportStyledExcel } from "@/lib/export/excelExport";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";

interface InsuranceCompaniesPanelProps {
  isRtl: boolean;
}

export function InsuranceCompaniesPanel({ isRtl }: InsuranceCompaniesPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const resourceRoute = parseFleetResourceRoute(pathname);
  const selectedCompanyId =
    resourceRoute?.resource === "insurance-companies" ? resourceRoute.id : null;

  const { data: wsCtx } = useGetWorkspaceContextQuery();
  const workspaceCompanyName = wsCtx?.data?.company?.name || "Revix";
  const { data, isLoading } = useListInsuranceCompaniesQuery();
  const [createCompany, { isLoading: isCreating }] = useCreateInsuranceCompanyMutation();
  const [deleteCompany] = useDeleteInsuranceCompanyMutation();

  const companies = useMemo(() => data?.data ?? [], [data?.data]);
  const selectedCompany = useMemo(
    () => (selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId) ?? null : null),
    [selectedCompanyId, companies],
  );
  const t = getFleetText(isRtl).insuranceCompanies;
  const [isExporting, setIsExporting] = useState(false);

  async function handleExportExcel() {
    if (companies.length === 0) return;
    setIsExporting(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      await exportStyledExcel({
        fileName: `insurance-companies-${dateStr}.xlsx`,
        sheetName: isRtl ? "شركات التأمين" : "Insurance Companies",
        title: isRtl
          ? `${workspaceCompanyName} — شركات التأمين`
          : `${workspaceCompanyName} — Insurance Companies`,
        subtitle: isRtl
          ? `تاريخ التصدير: ${dateStr}  |  إجمالي الشركات: ${companies.length}`
          : `Exported on: ${dateStr}  |  Total companies: ${companies.length}`,
        isRtl,
        rows: companies,
        columns: [
          {
            key: "index",
            header: "#",
            minWidth: 6,
            align: "center",
            value: (_c, idx) => idx + 1,
          },
          {
            key: "name",
            header: isRtl ? "اسم الشركة" : "Company Name",
            minWidth: 24,
            value: (c) => c.name,
          },
          {
            key: "contactPerson",
            header: isRtl ? "مسؤول التواصل" : "Contact Person",
            minWidth: 20,
            value: (c) => c.contactPerson,
          },
          {
            key: "phone",
            header: isRtl ? "رقم الهاتف" : "Phone",
            minWidth: 18,
            isTextCode: true,
            value: (c) => c.phone,
          },
          {
            key: "email",
            header: isRtl ? "البريد الإلكتروني" : "Email",
            minWidth: 24,
            value: (c) => c.email,
          },
          {
            key: "address",
            header: isRtl ? "العنوان" : "Address",
            minWidth: 26,
            value: (c) => c.address,
          },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  }

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
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {selectedCompanyId ? (
        selectedCompany ? (
          <InsuranceCompanyDetailPage
            company={selectedCompany}
            isRtl={isRtl}
            onBack={() => router.push(insuranceCompanyHref())}
          />
        ) : (
          <ResourceFeedback
            isRtl={isRtl}
            isLoading={isLoading}
            onBack={() => router.push(insuranceCompanyHref())}
            loadingTitle={isRtl ? "جارٍ تحميل ملف شركة التأمين..." : "Loading insurance company..."}
            backLabel={isRtl ? "العودة لشركات التأمين" : "Back to Insurance Companies"}
          />
        )
      ) : (
      <>
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">{t.title}</h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {companies.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || companies.length === 0}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-semibold text-revix-dark shadow-xs transition hover:bg-revix-surface disabled:opacity-50"
          >
            <RevixIcon name="file-text" className="h-3.5 w-3.5 text-revix-primary" />
            <span>{isRtl ? "تصدير إكسل" : "Export Excel"}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-revix-primary-hover transition-colors"
          >
            <RevixIcon name="plus" size={14} />
            <span>{t.addBtn}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-revix-border bg-revix-white text-xs text-revix-secondary">
          <RevixIcon name="refresh-cw" className="mr-2 h-4 w-4 animate-spin text-revix-primary" />
          {isRtl ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : (
        <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
          <DataTable fitAvailableHeight className="text-xs">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{t.colCompany}</th>
                <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{t.colContact}</th>
                <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{t.colPhone}</th>
                <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{t.colEmail}</th>
                <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{t.colAddress}</th>
                <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-end font-semibold">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/60">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-48 text-center text-sm text-revix-secondary">
                    {t.empty}
                  </td>
                </tr>
              ) : companies.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(insuranceCompanyHref(c.id))}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(insuranceCompanyHref(c.id));
                  }}
                  className="cursor-pointer transition-colors hover:bg-revix-surface/60 focus:bg-revix-surface/60 focus:outline-none"
                >
                  <td className="py-2.5 px-3.5 font-semibold text-revix-dark whitespace-nowrap">{c.name}</td>
                  <td className="py-2.5 px-3.5 text-revix-secondary whitespace-nowrap">{c.contactPerson || "—"}</td>
                  <td className="py-2.5 px-3.5 font-mono text-revix-dark whitespace-nowrap" dir="ltr">{c.phone || "—"}</td>
                  <td className="py-2.5 px-3.5 text-revix-secondary whitespace-nowrap">{c.email || "—"}</td>
                  <td className="py-2.5 px-3.5 text-revix-secondary whitespace-nowrap">{c.address || "—"}</td>
                  <td className="py-2.5 px-3.5 text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => router.push(insuranceCompanyHref(c.id))}
                        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-revix-border bg-white px-2.5 text-[11px] font-medium text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-colors"
                      >
                        <RevixIcon name="eye" size={12} />
                        <span>{isRtl ? "عرض" : "View"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCompany(c.id)}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <RevixIcon name="trash-2" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}
      </>
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
