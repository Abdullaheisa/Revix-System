"use client";

import { DataTable } from "@/components/ui/DataTable";
import { TableEmptyRow } from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/lib/api/errors";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { parseFleetResourceRoute, vendorHref } from "@/lib/workspace/resourceRoutes";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixPagination } from "@/components/ui/RevixPagination";
import {
  CitySelectField,
  CountrySelectField,
} from "@/components/shared/workspace";
import { getCitiesForCountry } from "@/lib/workspace/countryCatalog";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import {
  useCreateVendorMutation,
  useLazyListVendorsQuery,
  useListVendorsQuery,
  useUpdateVendorMutation,
  type VendorCategory,
  type VendorDto,
  type PaymentTermsType,
} from "@/store/api/fleetApi";
import { VendorDetailPage } from "./VendorDetailPage";
import { ResourceFeedback } from "@/components/shared/ResourceFeedback";
import { exportStyledExcel } from "@/lib/export/excelExport";
import { useGetWorkspaceContextQuery } from "@/store/api/workspaceApi";

interface VendorsDirectoryPanelProps {
  isRtl: boolean;
}

export function VendorsDirectoryPanel({ isRtl }: VendorsDirectoryPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const resourceRoute = parseFleetResourceRoute(pathname);
  const selectedVendorId =
    resourceRoute?.resource === "vendors" ? resourceRoute.id : null;

  const { data: wsCtx } = useGetWorkspaceContextQuery();
  const companyName = wsCtx?.data?.company?.name || "Revix";
  const [search, setSearch] = useState("");
  const [page, setPage] = usePersistedPage("fleet/vendors");
  const pageSize = 15;
  const { data, isLoading, refetch, isFetching } = useListVendorsQuery({
    search: search.trim() || undefined,
    page: selectedVendorId ? 1 : page,
    pageSize: selectedVendorId ? 100 : pageSize,
  });
  const [createVendor, { isLoading: isCreating }] = useCreateVendorMutation();
  const [updateVendor, { isLoading: isUpdating }] = useUpdateVendorMutation();
  const [triggerExportVendors, { isFetching: isExporting }] = useLazyListVendorsQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorDto | null>(null);

  const openVendorDetails = (vendorId: string) => {
    router.push(vendorHref(vendorId));
  };

  const closeVendorDetails = () => {
    router.push(vendorHref());
  };

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

  const selectedVendor = useMemo(
    () => (selectedVendorId ? paginatedVendors.find((v) => v.id === selectedVendorId) ?? null : null),
    [selectedVendorId, paginatedVendors],
  );

  async function handleExportExcel() {
    try {
      const res = await triggerExportVendors({
        search: search.trim() || undefined,
        page: 1,
        pageSize: 1000,
      }).unwrap();
      const rows = res?.data ?? paginatedVendors;
      const dateStr = new Date().toISOString().slice(0, 10);
      await exportStyledExcel({
        fileName: `vendors-${dateStr}.xlsx`,
        sheetName: isRtl ? "الموردين" : "Vendors",
        title: isRtl ? `${companyName} — دليل الموردين` : `${companyName} — Vendors Directory`,
        subtitle: isRtl
          ? `تاريخ التصدير: ${dateStr}  |  إجمالي الموردين: ${rows.length}`
          : `Exported on: ${dateStr}  |  Total vendors: ${rows.length}`,
        isRtl,
        rows,
        columns: [
          {
            key: "index",
            header: "#",
            minWidth: 6,
            align: "center",
            value: (_v, idx) => idx + 1,
          },
          {
            key: "name",
            header: isRtl ? "اسم المورد" : "Vendor Name",
            minWidth: 20,
            value: (v) => v.name,
          },
          {
            key: "legalName",
            header: isRtl ? "الاسم القانوني" : "Legal Name",
            minWidth: 20,
            value: (v) => v.legalName,
          },
          {
            key: "contactPerson",
            header: isRtl ? "مسؤول التواصل" : "Contact Person",
            minWidth: 20,
            value: (v) => v.contactPerson,
          },
          {
            key: "phone",
            header: isRtl ? "رقم الهاتف" : "Phone",
            minWidth: 18,
            isTextCode: true,
            value: (v) => v.phone,
          },
          {
            key: "email",
            header: isRtl ? "البريد الإلكتروني" : "Email",
            minWidth: 24,
            value: (v) => v.email,
          },
          {
            key: "location",
            header: isRtl ? "الموقع" : "Location",
            minWidth: 18,
            value: (v) => `${v.city}, ${v.countryCode}`,
          },
          {
            key: "commercialRegister",
            header: isRtl ? "السجل التجاري" : "Commercial Reg",
            minWidth: 18,
            isTextCode: true,
            value: (v) => v.commercialRegister,
          },
          {
            key: "taxNumber",
            header: isRtl ? "الرقم الضريبي" : "Tax ID",
            minWidth: 18,
            isTextCode: true,
            value: (v) => v.taxNumber,
          },
        ],
      });
    } catch {
      // ignore export error
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {selectedVendorId ? (
        selectedVendor ? (
          <VendorDetailPage
            vendor={selectedVendor}
            isRtl={isRtl}
            onBack={closeVendorDetails}
            onEdit={handleOpenEditModal}
          />
        ) : (
          <ResourceFeedback
            isRtl={isRtl}
            isLoading={isLoading}
            onRetry={() => refetch()}
            onBack={closeVendorDetails}
            loadingTitle={isRtl ? "جارٍ تحميل ملف المورد..." : "Loading vendor file..."}
            backLabel={isRtl ? "العودة لدليل الموردين" : "Back to Vendors"}
          />
        )
      ) : (
      <>
      {/* Clean Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "دليل الموردين" : "Vendors Directory"}
          </h1>
          <span className="rounded-md bg-revix-surface px-2 py-0.5 font-mono text-xs font-semibold text-revix-secondary">
            {totalVendors}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
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
              placeholder={isRtl ? "بحث بالمورد، الهاتف..." : "Search vendor, phone..."}
              className="h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder-revix-muted focus:border-revix-primary focus:outline-hidden ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
            />
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || totalVendors === 0}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-revix-white px-3 text-xs font-semibold text-revix-dark shadow-xs transition hover:bg-revix-surface disabled:opacity-50"
          >
            <RevixIcon name="file-text" className="h-3.5 w-3.5 text-revix-primary" />
            <span>{isRtl ? "تصدير إكسل" : "Export Excel"}</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={isRtl ? "تحديث" : "Refresh"}
            title={isRtl ? "تحديث" : "Refresh"}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark shadow-xs transition hover:bg-revix-surface disabled:opacity-50"
          >
            <RevixIcon
              name="refresh-cw"
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-revix-primary" : "text-revix-secondary"}`}
            />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-revix-white shadow-xs transition hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" className="h-4 w-4" />
            <span>{isRtl ? "إضافة مورد" : "Add Vendor"}</span>
          </button>
        </div>
      </div>

      {/* Vendors List */}
      {isLoading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-revix-border bg-revix-white text-xs text-revix-secondary">
          <RevixIcon name="refresh-cw" className="mr-2 h-4 w-4 animate-spin text-revix-primary" />
          {isRtl ? "جاري التحميل..." : "Loading..."}
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-initial flex-col overflow-hidden rounded-xl border border-revix-border bg-revix-white">
            <DataTable fitAvailableHeight className="text-xs">
              <thead>
                <tr className="border-b border-revix-border bg-revix-surface/70 text-revix-secondary font-semibold">
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "المورد" : "Vendor"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "مسؤول التواصل" : "Contact"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "الهاتف" : "Phone"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "البريد الإلكتروني" : "Email"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-start font-semibold">{isRtl ? "الموقع" : "Location"}</th>
                  <th scope="col" className="sticky top-0 z-10 select-none overflow-hidden whitespace-nowrap bg-revix-surface px-3.5 py-2.5 text-end font-semibold">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-revix-border/60">
                {paginatedVendors.length === 0 ? (
                  <TableEmptyRow
                    colSpan={6}
                    title={isRtl ? "لا يوجد موردون مسجلون" : "No vendors registered"}
                  />
                ) : paginatedVendors.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => openVendorDetails(v.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openVendorDetails(v.id);
                      }}
                      className="cursor-pointer align-middle transition-colors hover:bg-revix-surface/60 focus:bg-revix-surface/60 focus:outline-none"
                    >
                      <td className="py-2.5 px-3.5 font-semibold text-revix-dark whitespace-nowrap">
                        {v.name}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-revix-dark whitespace-nowrap">{v.contactPerson}</td>
                      <td className="py-2.5 px-3.5 font-mono text-revix-dark whitespace-nowrap" dir="ltr">
                        {v.phone}
                      </td>
                      <td className="max-w-48 truncate py-2.5 px-3.5 text-revix-secondary">
                        {v.email || "—"}
                      </td>
                      <td className="py-2.5 px-3.5 text-revix-secondary whitespace-nowrap">{v.city}, {v.countryCode}</td>
                      <td className="py-2.5 px-3.5 text-end whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(v)}
                            className="h-7 cursor-pointer rounded-md border border-revix-border bg-revix-white px-2.5 text-[11px] font-medium text-revix-dark transition hover:bg-revix-surface"
                          >
                            {isRtl ? "تعديل" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openVendorDetails(v.id)}
                            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-revix-border bg-revix-white px-2.5 text-[11px] font-medium text-revix-secondary transition hover:bg-revix-surface hover:text-revix-dark"
                          >
                            <RevixIcon name="eye" size={12} />
                            <span>{isRtl ? "عرض" : "View"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          {/* Unified Compact Pagination */}
          <div className="shrink-0 overflow-hidden rounded-lg border border-revix-border bg-revix-white empty:hidden">
            <RevixPagination compact
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
