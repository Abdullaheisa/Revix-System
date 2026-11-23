"use client";

import { DataTable } from "@/components/ui/DataTable";
import { getApiErrorMessage } from "@/lib/api/errors";

import { useMemo, useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixPagination } from "@/components/ui/RevixPagination";
import {
  CitySelectField,
  CountrySelectField,
} from "@/components/shared/workspace";
import { getCitiesForCountry } from "@/lib/workspace/countryCatalog";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import {
  useCreateVendorMutation,
  useListVendorsQuery,
  useUpdateVendorMutation,
  type VendorCategory,
  type VendorDto,
  type PaymentTermsType,
} from "@/store/api/fleetApi";
import { PaymentTermsSelector } from "./PaymentTermsSelector";
import { formatVendorPaymentTerms } from "@/lib/fleet/paymentTerms";

interface VendorsDirectoryPanelProps {
  isRtl: boolean;
}

const VENDOR_CATEGORY_LABELS: Record<VendorCategory, { en: string; ar: string }> = {
  dealership: { en: "Dealership / Agency", ar: "وكيل / معرض سيارات" },
  leasing: { en: "Leasing Company", ar: "شركة تأجير تمويلي" },
  auction: { en: "Automotive Auction", ar: "مزاد سيارات" },
  maintenance_parts: { en: "Maintenance & Parts", ar: "صيانة وقطع غيار" },
};

export function VendorsDirectoryPanel({ isRtl }: VendorsDirectoryPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [page, setPage] = usePersistedPage("fleet/vendors");
  const pageSize = 15;
  const { data, isLoading, refetch, isFetching } = useListVendorsQuery({
    category: selectedCategory !== "all" ? (selectedCategory as VendorCategory) : undefined,
    search: search.trim() || undefined,
    page,
    pageSize,
  });
  const [createVendor, { isLoading: isCreating }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: isUpdating }] = useUpdateVendorMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorDto | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formLegalName, setFormLegalName] = useState("");
  const [formCategory, setFormCategory] = useState<VendorCategory>("dealership");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCountryCode, setFormCountryCode] = useState("EG");
  const [formCity, setFormCity] = useState("Cairo");
  const [formAddress, setFormAddress] = useState("");
  const [formTaxNumber, setFormTaxNumber] = useState("");
  const [formCommercialRegister, setFormCommercialRegister] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formIban, setFormIban] = useState("");
  const [formPaymentTerms, setFormPaymentTerms] = useState(30);
  const [formPaymentTermsType, setFormPaymentTermsType] = useState<PaymentTermsType>("net_terms");
  const [formPaymentTermsConfig, setFormPaymentTermsConfig] = useState<string | null>("Net 30");
  const [formError, setFormError] = useState<string | null>(null);

  const vendors = useMemo(() => data?.data ?? [], [data?.data]);
  const totalVendors = data?.pagination?.totalItems ?? vendors.length;
  const filteredVendors = vendors;
  const paginatedVendors = vendors;

  const stats = useMemo(() => {
    const total = vendors.length;
    const dealerships = vendors.filter((v) => v.category === "dealership").length;
    const leasing = vendors.filter((v) => v.category === "leasing").length;
    const maintenance = vendors.filter((v) => v.category === "maintenance_parts").length;
    return { total, dealerships, leasing, maintenance };
  }, [vendors]);

  function handleOpenCreateModal() {
    setEditingVendor(null);
    setFormName("");
    setFormLegalName("");
    setFormCategory("dealership");
    setFormContactPerson("");
    setFormPhone("");
    setFormEmail("");
    setFormCountryCode("EG");
    setFormCity("Cairo");
    setFormAddress("");
    setFormTaxNumber("");
    setFormCommercialRegister("");
    setFormBankName("");
    setFormIban("");
    setFormPaymentTerms(30);
    setFormPaymentTermsType("net_terms");
    setFormPaymentTermsConfig("Net 30");
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleOpenEditModal(v: VendorDto) {
    setEditingVendor(v);
    setFormName(v.name);
    setFormLegalName(v.legalName || "");
    setFormCategory(v.category);
    setFormContactPerson(v.contactPerson);
    setFormPhone(v.phone);
    setFormEmail(v.email || "");
    setFormCountryCode(v.countryCode);
    setFormCity(v.city);
    setFormAddress(v.address || "");
    setFormTaxNumber(v.taxNumber || "");
    setFormCommercialRegister(v.commercialRegister || "");
    setFormBankName(v.bankName || "");
    setFormIban(v.iban || "");
    setFormPaymentTerms(v.paymentTermsDays);
    setFormPaymentTermsType(
      (v.paymentTermsType as PaymentTermsType) ||
        (v.paymentTermsDays === 0 ? "cash" : "net_terms"),
    );
    setFormPaymentTermsConfig(v.paymentTermsConfig || null);
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formContactPerson.trim() || !formPhone.trim()) {
      setFormError(
        isRtl
          ? "برجاء كتابة اسم المورد، مسؤول التواصل، ورقم الهاتف."
          : "Please provide vendor name, contact person, and phone number.",
      );
      return;
    }

    try {
      if (editingVendor) {
        await updateVendor({
          id: editingVendor.id,
          data: {
            name: formName.trim(),
            legalName: formLegalName.trim() || null,
            category: formCategory,
            contactPerson: formContactPerson.trim(),
            phone: formPhone.trim(),
            email: formEmail.trim() || null,
            countryCode: formCountryCode.trim().toUpperCase(),
            city: formCity.trim(),
            address: formAddress.trim() || null,
            taxNumber: formTaxNumber.trim() || null,
            commercialRegister: formCommercialRegister.trim() || null,
            bankName: formBankName.trim() || null,
            iban: formIban.trim() || null,
            paymentTermsDays: Number(formPaymentTerms),
            paymentTermsType: formPaymentTermsType,
            paymentTermsConfig: formPaymentTermsConfig,
          },
        }).unwrap();
      } else {
        await createVendor({
          name: formName.trim(),
          legalName: formLegalName.trim() || null,
          category: formCategory,
          contactPerson: formContactPerson.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || null,
          countryCode: formCountryCode.trim().toUpperCase(),
          city: formCity.trim(),
          address: formAddress.trim() || null,
          taxNumber: formTaxNumber.trim() || null,
          commercialRegister: formCommercialRegister.trim() || null,
          bankName: formBankName.trim() || null,
          iban: formIban.trim() || null,
          paymentTermsDays: Number(formPaymentTerms),
          paymentTermsType: formPaymentTermsType,
          paymentTermsConfig: formPaymentTermsConfig,
        }).unwrap();
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(
        getApiErrorMessage(err) ||
          (isRtl ? "تعذر حفظ بيانات المورد." : "Failed to save vendor details."),
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
              {isRtl ? "دليل الموردين وشركات التوريد" : "Vendors Directory"}
            </h1>
          </div>
          <p className="mt-1 text-xs text-revix-secondary sm:text-sm">
            {isRtl
              ? "إدارة شبكة الموردين، وكلاء السيارات، شروط الدفع، والتفاصيل البنكية والضريبية."
              : "Manage car suppliers, dealerships, leasing agencies, payment terms, and banking details."}
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
            <span>{isRtl ? "إضافة مورد جديد" : "Add Vendor"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "إجمالي الموردين" : "Total Vendors"}
            </span>
            <div className="rounded-md bg-revix-surface p-1.5 text-revix-primary">
              <RevixIcon name="building-2" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "المعارض والوكلاء" : "Dealerships"}
            </span>
            <div className="rounded-md bg-revix-accent-soft p-1.5 text-revix-accent">
              <RevixIcon name="car-front" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.dealerships}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "التأجير التمويلي" : "Leasing Partners"}
            </span>
            <div className="rounded-md bg-revix-info-soft p-1.5 text-revix-info">
              <RevixIcon name="wallet" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.leasing}
          </p>
        </div>

        <div className="rounded-xl border border-revix-border bg-revix-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-revix-secondary">
              {isRtl ? "صيانة وقطع غيار" : "Parts & Service"}
            </span>
            <div className="rounded-md bg-revix-warning-soft p-1.5 text-revix-warning">
              <RevixIcon name="wrench" className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-revix-dark">
            {stats.maintenance}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-revix-border bg-revix-surface/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <RevixIcon
            name="search"
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-revix-muted ltr:left-3 rtl:right-3"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={
              isRtl
                ? "بحث باسم المورد، مسؤول التواصل، أو الهاتف..."
                : "Search by vendor, contact, phone..."
            }
            className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted transition focus:border-revix-primary focus:outline-hidden focus:ring-1 focus:ring-revix-primary ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setPage(1);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              selectedCategory === "all"
                ? "bg-revix-primary text-revix-white"
                : "border border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
            }`}
          >
            {isRtl ? "الكل" : "All"} ({vendors.length})
          </button>
          {(
            ["dealership", "leasing", "auction", "maintenance_parts"] as VendorCategory[]
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                selectedCategory === cat
                  ? "bg-revix-primary text-revix-white"
                  : "border border-revix-border bg-revix-white text-revix-secondary hover:bg-revix-surface"
              }`}
            >
              {isRtl ? VENDOR_CATEGORY_LABELS[cat].ar : VENDOR_CATEGORY_LABELS[cat].en}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors List */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-revix-border bg-revix-white text-xs text-revix-secondary">
          <RevixIcon name="refresh-cw" className="mr-2 h-4 w-4 animate-spin text-revix-primary" />
          {isRtl ? "جاري تحميل دليل الموردين..." : "Loading vendors directory..."}
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-revix-border bg-revix-white p-10 text-center">
          <div className="rounded-full bg-revix-surface p-3 text-revix-secondary">
            <RevixIcon name="building-2" className="h-8 w-8" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-revix-dark">
            {isRtl ? "لا يوجد موردون مسجلون" : "No vendors registered yet"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-revix-secondary">
            {isRtl
              ? "سجل موردي السيارات ومعارض الوكلاء لبدء إنشاء أوامر شراء السيارات ومتابعة الدفعات."
              : "Register car dealerships and suppliers to start creating POs and tracking invoices."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 py-1.5 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" className="h-3.5 w-3.5" />
            <span>{isRtl ? "إضافة مورد جديد" : "Add Vendor Now"}</span>
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-revix-border bg-revix-white">
            <DataTable className="w-full min-w-[1050px] text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/50 text-[10px] font-bold text-revix-muted">
                  <th className="px-4 py-3 text-start">{isRtl ? "المورد" : "Vendor"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "التصنيف" : "Category"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "مسؤول التواصل" : "Contact"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "الهاتف" : "Phone"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "البريد الإلكتروني" : "Email"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "الموقع" : "Location"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "السجل التجاري" : "Commercial Reg."}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "شروط الدفع" : "Payment Terms"}</th>
                  <th className="px-3 py-3 text-start">{isRtl ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3 text-end">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/70">
                {paginatedVendors.map((v) => {
                  const terms = formatVendorPaymentTerms(v, isRtl);
                  return (
                    <tr key={v.id} className="align-middle transition-colors hover:bg-revix-surface/35">
                      <td className="px-4 py-3">
                        <div className="font-bold text-revix-dark">{v.name}</div>
                        {v.legalName && <div className="mt-0.5 text-[11px] text-revix-secondary">{v.legalName}</div>}
                      </td>
                      <td className="px-3 py-3 text-revix-secondary">{VENDOR_CATEGORY_LABELS[v.category]?.[isRtl ? "ar" : "en"] ?? v.category}</td>
                      <td className="px-3 py-3 font-medium text-revix-dark">{v.contactPerson}</td>
                      <td className="px-3 py-3 font-mono"><a href={`tel:${v.phone}`} className="text-revix-primary hover:underline">{v.phone}</a></td>
                      <td className="max-w-48 truncate px-3 py-3 text-revix-secondary">{v.email ? <a href={`mailto:${v.email}`} className="hover:text-revix-primary hover:underline">{v.email}</a> : "—"}</td>
                      <td className="px-3 py-3 text-revix-secondary">{v.city}, {v.countryCode}</td>
                      <td className="px-3 py-3 font-mono text-revix-secondary">{v.commercialRegister || "—"}</td>
                      <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold ${terms.badgeClass}`} title={terms.details}><RevixIcon name={terms.icon} className="h-3 w-3" />{terms.label}</span></td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${v.status === "active" ? "bg-revix-accent-soft text-revix-accent" : "bg-revix-surface text-revix-muted"}`}>{v.status === "active" ? (isRtl ? "نشط" : "Active") : (isRtl ? "معطل" : "Inactive")}</span></td>
                      <td className="px-4 py-3 text-end"><button type="button" onClick={() => handleOpenEditModal(v)} className="rounded-md border border-revix-border bg-revix-white px-2.5 py-1.5 text-[11px] font-medium text-revix-dark transition hover:bg-revix-surface">{isRtl ? "تعديل" : "Edit"}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </div>

          {/* Unified Pagination */}
          <div className="overflow-hidden rounded-xl border border-revix-border bg-revix-white shadow-2xs">
            <RevixPagination
              currentPage={page}
              totalItems={totalVendors}
              pageSize={pageSize}
              onPageChange={setPage}
              lang={isRtl ? "ar" : "en"}
              itemLabel={isRtl ? "مورد" : "vendors"}
            />
          </div>
        </>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-revix-border bg-white shadow-dialog animate-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-revix-border px-6 py-4">
              <h2 className="text-base font-bold text-revix-dark">
                {editingVendor
                  ? isRtl
                    ? "تعديل بيانات المورد"
                    : "Edit Vendor Details"
                  : isRtl
                    ? "إضافة مورد جديد للأسطول"
                    : "Add New Fleet Vendor"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-revix-secondary hover:bg-revix-surface hover:text-revix-dark transition-colors"
              >
                <RevixIcon name="close" className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {formError && (
                  <div className="rounded-lg bg-revix-alert-soft p-3 text-xs text-revix-alert">
                    {formError}
                  </div>
                )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-revix-dark">
                    {isRtl ? "اسم المورد / الشركة" : "Vendor / Supplier Name"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Al-Futtaim, Al-Jazirah..."
                    className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark placeholder:text-revix-disabled/60 focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-revix-dark">
                    {isRtl ? "الاسم القانوني" : "Legal Entity Name"}
                  </label>
                  <input
                    type="text"
                    value={formLegalName}
                    onChange={(e) => setFormLegalName(e.target.value)}
                    placeholder="Automotive LLC..."
                    className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark placeholder:text-revix-disabled/60 focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-revix-dark mb-1">
                    {isRtl ? "تصنيف المورد" : "Category"}
                  </label>
                  <RevixSelect
                    size="sm"
                    isRtl={isRtl}
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as VendorCategory)}
                    buttonClassName="h-9 rounded-lg text-xs"
                    options={[
                      { value: "dealership", label: isRtl ? "معرض / وكيل سيارات" : "Dealership" },
                      { value: "leasing", label: isRtl ? "تأجير تمويلي" : "Leasing Company" },
                      { value: "auction", label: isRtl ? "مزاد سيارات" : "Auction" },
                      { value: "maintenance_parts", label: isRtl ? "صيانة وقطع غيار" : "Maintenance & Parts" },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-revix-dark">
                    {isRtl ? "مسؤول التواصل" : "Contact Person"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="Full name..."
                    className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark placeholder:text-revix-disabled/60 focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-revix-dark">
                    {isRtl ? "الهاتف" : "Phone Number"} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+201..."
                    className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-mono text-revix-dark placeholder:text-revix-disabled/60 focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-revix-dark">
                    {isRtl ? "البريد الإلكتروني" : "Email Address"}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="sales@vendor.com"
                    className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark placeholder:text-revix-disabled/60 focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CountrySelectField
                  isRtl={isRtl}
                  label={`${isRtl ? "الدولة" : "Country"} *`}
                  countryCode={formCountryCode}
                  showCurrencyInOption={false}
                  onChange={(nextCountry) => {
                    setFormCountryCode(nextCountry);
                    const cities = getCitiesForCountry(nextCountry);
                    if (cities.length > 0) {
                      setFormCity(cities[0].value);
                    } else {
                      setFormCity("");
                    }
                  }}
                />
                <CitySelectField
                  isRtl={isRtl}
                  label={`${isRtl ? "المدينة" : "City"} *`}
                  countryCode={formCountryCode}
                  city={formCity}
                  onChange={setFormCity}
                />
              </div>

              {/* Enterprise Payment Terms Selector */}
              <div className="rounded-xl border border-revix-border bg-white p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-revix-dark">
                    {isRtl ? "اتفاقية وشروط الدفع المعتمدة مع المورد" : "Commercial Payment Terms Standard"}
                  </label>
                  <span className="text-[10px] font-medium text-revix-muted">
                    {isRtl ? "المعيار العالمي ERP" : "Global ERP Standard"}
                  </span>
                </div>
                <PaymentTermsSelector
                  valueType={formPaymentTermsType}
                  valueDays={formPaymentTerms}
                  valueConfig={formPaymentTermsConfig}
                  isRtl={isRtl}
                  onChange={(res) => {
                    setFormPaymentTermsType(res.type);
                    setFormPaymentTerms(res.days);
                    setFormPaymentTermsConfig(res.config || null);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-revix-dark">
                    {isRtl ? "السجل التجاري (CR)" : "Commercial Reg (CR)"}
                  </label>
                  <input
                    type="text"
                    value={formCommercialRegister}
                    onChange={(e) => setFormCommercialRegister(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-revix-dark">
                    {isRtl ? "الرقم الضريبي (Tax ID)" : "Tax ID / VAT"}
                  </label>
                  <input
                    type="text"
                    value={formTaxNumber}
                    onChange={(e) => setFormTaxNumber(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              </div>

              {/* Fixed Sticky Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-revix-border bg-revix-surface/40 px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-revix-border bg-revix-white px-4 py-2 text-xs font-semibold text-revix-secondary hover:bg-revix-surface hover:text-revix-dark active:scale-95 transition-all"
                >
                  {isRtl ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-revix-primary px-4 py-2 text-xs font-semibold text-revix-white shadow-xs hover:bg-revix-primary-hover active:scale-95 disabled:opacity-50 transition-all"
                >
                  {(isCreating || isUpdating) && (
                    <RevixIcon name="refresh-cw" className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>
                    {editingVendor
                      ? isRtl
                        ? "حفظ التعديلات"
                        : "Save Changes"
                      : isRtl
                        ? "إضافة المورد"
                        : "Add Vendor"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
