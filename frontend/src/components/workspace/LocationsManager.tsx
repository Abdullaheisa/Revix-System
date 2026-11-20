"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { RevixPagination } from "@/components/ui/RevixPagination";
import { usePersistedPage } from "@/lib/workspace/usePersistedPage";
import {
  AutoBranchCurrencyField,
  CitySelectField,
  CountrySelectField,
  StudioBadge,
  StudioModal,
  WorkingSchedulePicker,
} from "@/components/shared/workspace";
import { deriveBranchCode, findCountryMetadata } from "@/lib/workspace/countryCatalog";
import {
  useCreateBranchMutation,
  useUpdateBranchMutation,
  type BranchDto,
  type CompanyDto,
} from "@/store/api/workspaceApi";
import { extractApiErrorCode } from "@/store/api/baseApi";

export interface LocationsManagerProps {
  isRtl: boolean;
  company: CompanyDto;
  branches: BranchDto[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function LocationsManager({
  isRtl,
  company,
  branches,
  onRefresh,
  isRefreshing,
}: LocationsManagerProps) {
  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [page, setPage] = usePersistedPage("settings/locations");
  const pageSize = 15;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchDto | null>(null);

  // Modal Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isCodeTouched, setIsCodeTouched] = useState(false);
  const [countryCode, setCountryCode] = useState(company.countryCode || "SA");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currencyCode, setCurrencyCode] = useState(
    company.baseCurrency || "SAR",
  );
  const [timezone, setTimezone] = useState(company.timezone || "Asia/Riyadh");
  const [workingDays, setWorkingDays] = useState("Sun - Thu");
  const [workingHours, setWorkingHours] = useState("08:00 - 22:00");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | undefined>();

  const distinctCurrencies = useMemo(() => {
    return Array.from(new Set(branches.map((b) => b.currencyCode))).sort();
  }, [branches]);

  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return branches.filter((branch) => {
      if (currencyFilter !== "ALL" && branch.currencyCode !== currencyFilter) {
        return false;
      }
      if (!q) return true;
      return (
        branch.name.toLowerCase().includes(q) ||
        branch.code.toLowerCase().includes(q) ||
        branch.city.toLowerCase().includes(q) ||
        branch.currencyCode.toLowerCase().includes(q)
      );
    });
  }, [branches, currencyFilter, searchQuery]);

  const paginatedBranches = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBranches.slice(start, start + pageSize);
  }, [filteredBranches, page, pageSize]);

  function openCreateModal() {
    setEditingBranch(null);
    setName("");
    const defaultCountry = company.countryCode || "SA";
    setCountryCode(defaultCountry);
    setCity("");
    setAddress("");
    setPhone(company.phone);
    setEmail(company.email);
    const meta = findCountryMetadata(defaultCountry);
    setCurrencyCode(meta?.currencyCode ?? company.baseCurrency ?? "SAR");
    setTimezone(meta?.defaultTimezone ?? company.timezone);
    setWorkingDays(isRtl ? "الأحد - الخميس" : "Sun - Thu");
    setWorkingHours("08:00 - 22:00");
    setIsActive(true);
    setFormError(undefined);
    setCode(deriveBranchCode(company.city, defaultCountry, branches.length + 1));
    setIsCodeTouched(false);
    setIsModalOpen(true);
  }

  function openEditModal(branch: BranchDto) {
    setEditingBranch(branch);
    setName(branch.name);
    setCode(branch.code);
    setIsCodeTouched(true);
    setCountryCode(branch.countryCode);
    setCity(branch.city);
    setAddress(branch.address);
    setPhone(branch.phone);
    setEmail(branch.email);
    setCurrencyCode(branch.currencyCode);
    setTimezone(branch.timezone);
    setWorkingDays(branch.workingDays);
    setWorkingHours(branch.workingHours);
    setIsActive(branch.isActive);
    setFormError(undefined);
    setIsModalOpen(true);
  }

  function applyCompanyAddress() {
    setCountryCode(company.countryCode);
    setCity(company.city);
    setAddress(company.address);
    setPhone(company.phone);
    setEmail(company.email);
    const meta = findCountryMetadata(company.countryCode);
    setCurrencyCode(company.baseCurrency || meta?.currencyCode || "SAR");
    setTimezone(meta?.defaultTimezone ?? company.timezone);
    const nextSeq = editingBranch ? 1 : branches.length + 1;
    setCode(deriveBranchCode(company.city, company.countryCode, nextSeq));
    setIsCodeTouched(false);
  }

  function handleCountryChange(nextCountry: string) {
    setCountryCode(nextCountry);
    const meta = findCountryMetadata(nextCountry);
    if (meta) {
      setCurrencyCode(meta.currencyCode);
      setTimezone(meta.defaultTimezone);
    }
    if (!isCodeTouched && !editingBranch) {
      setCode(deriveBranchCode(city, nextCountry, branches.length + 1));
    }
  }

  function handleCityChange(nextCity: string) {
    setCity(nextCity);
    if (!isCodeTouched && !editingBranch) {
      setCode(deriveBranchCode(nextCity, countryCode, branches.length + 1));
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);

    if (!name.trim() || !code.trim() || !city.trim() || !address.trim()) {
      setFormError(
        isRtl
          ? "يرجى استكمال اسم الفرع والكود والمدينة والعنوان."
          : "Please fill in branch name, code, city, and address.",
      );
      return;
    }

    try {
      if (editingBranch) {
        await updateBranch({
          branchId: editingBranch.id,
          name: name.trim(),
          code: code.trim(),
          countryCode,
          city: city.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          currencyCode,
          timezone: timezone.trim(),
          workingDays: workingDays.trim(),
          workingHours: workingHours.trim(),
          isActive,
        }).unwrap();
      } else {
        await createBranch({
          name: name.trim(),
          code: code.trim(),
          countryCode,
          city: city.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          currencyCode,
          timezone: timezone.trim(),
          workingDays: workingDays.trim(),
          workingHours: workingHours.trim(),
        }).unwrap();
      }
      setIsModalOpen(false);
    } catch (err) {
      const codeErr = extractApiErrorCode(err);
      if (codeErr === "BRANCH_CODE_EXISTS") {
        setFormError(
          isRtl
            ? "كود الفرع مستخدم بالفعل داخل شركتك. اختر كودًا مختلفًا."
            : "This branch code is already used in your company. Choose a unique code.",
        );
      } else {
        setFormError(
          isRtl
            ? "تعذّر حفظ بيانات الفرع. يرجى التحقق من المدخلات والمحاولة مرة أخرى."
            : "Could not save branch details. Please check your inputs and try again.",
        );
      }
    }
  }

  const isBusy = isCreating || isUpdating;

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-revix-dark">
            {isRtl ? "الفروع واللوكيشنات" : "Branches & Locations"}
          </h1>
          <p className="mt-0.5 text-[13px] text-revix-secondary">
            {isRtl
              ? "عملة كل فرع تُحدد تلقائيًا وفق دولته بشكل مستقل عن عملة المقر الرئيسي، ويمكن وجود أكثر من فرع في نفس العنوان."
              : "Each branch uses its country currency independently of the headquarters base currency. Multiple branches may share a physical address."}
          </p>
        </div>
      </div>

      {/* Supabase-Studio-Style Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center">
            <RevixIcon
              name="search"
              size={14}
              className="pointer-events-none absolute start-3 text-revix-secondary"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={
                isRtl
                  ? "بحث باسم الفرع أو الكود أو المدينة..."
                  : "Search by branch name, code, or city..."
              }
              className="h-[34px] w-[260px] rounded-[6px] border border-revix-border bg-revix-white ps-8 pe-3 text-[13px] text-revix-dark placeholder:text-revix-disabled focus:border-revix-primary focus:outline-none"
            />
          </div>

          <div className="w-[150px]">
            <RevixSelect
              size="sm"
              searchable={distinctCurrencies.length > 5}
              isRtl={isRtl}
              aria-label={isRtl ? "تصفية حسب العملة" : "Filter by currency"}
              value={currencyFilter}
              onChange={(e) => {
                setCurrencyFilter(e.target.value);
                setPage(1);
              }}
              options={[
                {
                  value: "ALL",
                  label: isRtl ? "كل العملات" : "All currencies",
                },
                ...distinctCurrencies.map((curr) => ({
                  value: curr,
                  label: curr,
                })),
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRtl ? "تحديث القائمة" : "Refresh locations"}
            className="inline-flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[6px] border border-revix-border bg-revix-white text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark disabled:opacity-50"
          >
            <RevixIcon
              name="refresh-cw"
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[6px] border border-revix-primary bg-revix-primary px-3 text-[13px] font-medium text-revix-white transition-colors hover:bg-revix-primary-hover"
          >
            <RevixIcon name="plus" size={14} />
            <span>{isRtl ? "إضافة فرع" : "Add branch"}</span>
          </button>
        </div>
      </div>

      {/* Studio Data Table */}
      <div className="overflow-hidden rounded-[8px] border border-revix-border bg-revix-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start text-[13px]">
            <thead>
              <tr className="border-b border-revix-border bg-revix-surface/75 text-[11.5px] font-semibold uppercase tracking-wide text-revix-secondary">
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "الدولة / اللوكيشن (المدينة)" : "Country & Location (City)"}
                </th>
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "الفرع" : "Branch"}
                </th>
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "عملة الفرع" : "Currency"}
                </th>
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "أيام وساعات العمل" : "Working hours"}
                </th>
                <th className="px-4 py-2.5 text-start">
                  {isRtl ? "الحالة" : "Status"}
                </th>
                <th className="px-4 py-2.5 text-end">
                  {isRtl ? "إجراء" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-revix-border/80">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[13.5px] text-revix-secondary"
                  >
                    {isRtl
                      ? "لا توجد فروع مطابقة حاليًا."
                      : "No matching locations found."}
                  </td>
                </tr>
              ) : (
                paginatedBranches.map((branch) => {
                  const countryMeta = findCountryMetadata(branch.countryCode);
                  return (
                    <tr
                      key={branch.id}
                      className="transition-colors hover:bg-revix-surface/60"
                    >
                      <td className="px-4 py-3 text-revix-dark">
                        <p className="font-semibold">
                          {countryMeta
                            ? isRtl
                              ? countryMeta.nameAr
                              : countryMeta.nameEn
                            : branch.countryCode}
                        </p>
                        <p className="text-[11.5px] text-revix-secondary">
                          {branch.city} · {branch.timezone}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-revix-dark">
                            {branch.name}
                          </p>
                          <span className="rounded bg-revix-surface px-1.5 py-0.5 font-mono text-[11px] font-semibold text-revix-secondary">
                            {branch.code}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-revix-secondary">
                          {branch.address}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StudioBadge variant="currency" dir="ltr">
                          {branch.currencyCode}
                        </StudioBadge>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-revix-secondary">
                        <p className="font-medium text-revix-dark">
                          {branch.workingDays}
                        </p>
                        <p dir="ltr" className="text-start">
                          {branch.workingHours}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StudioBadge
                          variant={branch.isActive ? "success" : "neutral"}
                        >
                          {branch.isActive
                            ? isRtl
                              ? "نشط"
                              : "Active"
                            : isRtl
                              ? "متوقف"
                              : "Inactive"}
                        </StudioBadge>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <button
                          type="button"
                          onClick={() => openEditModal(branch)}
                          className="cursor-pointer rounded-[6px] border border-revix-border bg-revix-white px-2.5 py-1 text-[12px] font-medium text-revix-dark transition-colors hover:border-revix-primary/40 hover:bg-revix-tint hover:text-revix-primary"
                        >
                          {isRtl ? "تعديل" : "Edit"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Unified Pagination */}
        <RevixPagination
          currentPage={page}
          totalItems={filteredBranches.length}
          pageSize={pageSize}
          onPageChange={setPage}
          lang={isRtl ? "ar" : "en"}
          itemLabel={isRtl ? "فرع" : "locations"}
        />
      </div>

      {/* Add / Edit Branch Modal (Shared StudioModal) */}
      <StudioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingBranch
            ? isRtl
              ? "تعديل بيانات الفرع"
              : "Edit branch"
            : isRtl
              ? "إضافة فرع جديد"
              : "Add new branch"
        }
        headerAction={
          !editingBranch ? (
            <button
              type="button"
              onClick={applyCompanyAddress}
              className="cursor-pointer rounded-[6px] border border-revix-primary/30 bg-revix-tint px-3 py-1.5 text-[12px] font-semibold text-revix-primary transition-colors hover:bg-revix-primary hover:text-revix-white"
            >
              {isRtl ? "استخدام عنوان الشركة" : "Use company address"}
            </button>
          ) : null
        }
      >
        {formError ? (
          <div className="mt-4">
            <Alert
              variant="error"
              title={isRtl ? "تعذّر الحفظ" : "Unable to save"}
              message={formError}
              onClose={() => setFormError(undefined)}
            />
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {company.operatingMode !== "local_partner" ? (
              <CountrySelectField
                isRtl={isRtl}
                label={isRtl ? "الدولة" : "Country"}
                countryCode={countryCode}
                onChange={handleCountryChange}
              />
            ) : null}
            <AutoBranchCurrencyField
              isRtl={isRtl}
              countryCode={countryCode}
              currencyCode={currencyCode}
              onChange={setCurrencyCode}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CitySelectField
              isRtl={isRtl}
              label={isRtl ? "اللوكيشن (المدينة)" : "Location (City)"}
              countryCode={countryCode}
              city={city}
              onChange={handleCityChange}
            />
            {company.operatingMode !== "local_partner" ? (
              <FormInput
                label={isRtl ? "المنطقة الزمنية" : "Time zone"}
                dir="ltr"
                placeholder="Africa/Cairo"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              />
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={isRtl ? "الفرع" : "Branch name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isRtl
                  ? "مثال: مطار القاهرة، المعادي"
                  : "e.g., Cairo Airport, Maadi"
              }
              required
            />
            <FormInput
              label={isRtl ? "كود الفرع" : "Branch code"}
              dir="ltr"
              value={code}
              onChange={(e) => {
                setIsCodeTouched(true);
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="CAI-01"
              required
            />
          </div>

          <FormInput
            label={isRtl ? "العنوان التفصيلي" : "Address"}
            placeholder={
              isRtl
                ? "مثال: شارع التسعين الشمالي، مبنى 14"
                : "e.g., 14 North 90th St, Building 2"
            }
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={isRtl ? "هاتف الفرع" : "Branch phone"}
              type="tel"
              dir="ltr"
              placeholder="+20 10 0000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "بريد الفرع الإلكتروني" : "Branch email"}
              type="email"
              dir="ltr"
              placeholder="branch@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <WorkingSchedulePicker
            isRtl={isRtl}
            workingDays={workingDays}
            workingHours={workingHours}
            onChange={({ workingDays: nextDays, workingHours: nextHours }) => {
              setWorkingDays(nextDays);
              setWorkingHours(nextHours);
            }}
          />

          {editingBranch ? (
            <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-[13.5px] font-medium text-revix-dark">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-revix-primary"
              />
              <span>
                {isRtl
                  ? "الفرع نشط ومتاح للتشغيل"
                  : "Location is active and open for operations"}
              </span>
            </label>
          ) : null}

          <div className="flex items-center justify-end gap-2.5 border-t border-revix-border pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="rounded-[8px]"
            >
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isBusy}
              className="rounded-[8px]"
            >
              {isBusy
                ? isRtl
                  ? "جاري الحفظ..."
                  : "Saving..."
                : editingBranch
                  ? isRtl
                    ? "حفظ التعديلات"
                    : "Save changes"
                  : isRtl
                    ? "إنشاء الفرع"
                    : "Create location"}
            </Button>
          </div>
        </form>
      </StudioModal>
    </div>
  );
}
