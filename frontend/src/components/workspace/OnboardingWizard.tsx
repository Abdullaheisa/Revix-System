"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  AutoBranchCurrencyField,
  CompanyLogoUploader,
  CountrySelectField,
  OperatingModeSelector,
  StudioBadge,
  WorkingSchedulePicker,
} from "@/components/shared/workspace";
import { deriveBranchCode, findCountryMetadata } from "@/lib/workspace/countryCatalog";
import {
  useCreateBranchMutation,
  useCreateCompanyMutation,
  useGetWorkspaceContextQuery,
  useUpdateCompanyMutation,
} from "@/store/api/workspaceApi";
import { extractApiErrorCode } from "@/store/api/baseApi";

export interface OnboardingWizardProps {
  isRtl: boolean;
}

export function OnboardingWizard({ isRtl }: OnboardingWizardProps) {
  const router = useRouter();
  const { data, isLoading, error } = useGetWorkspaceContextQuery();
  const [createCompany, { isLoading: isCreatingCompany }] =
    useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdatingCompany }] =
    useUpdateCompanyMutation();
  const [createBranch, { isLoading: isCreatingBranch }] =
    useCreateBranchMutation();

  const [activeStepOverride, setActiveStepOverride] = useState<number | null>(
    null,
  );

  const onboardingState = data?.data.onboardingState;
  const company = data?.data.company ?? null;

  useEffect(() => {
    if (error) {
      const code = extractApiErrorCode(error);
      if (code === "UNAUTHORIZED") {
        router.push("/login");
      } else if (code === "EMAIL_NOT_VERIFIED") {
        router.push("/verify-email");
      }
      return;
    }

    if (onboardingState === "ready") {
      router.push("/workspace");
    }
  }, [error, onboardingState, router]);

  // Step 1: Company Setup Form State
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [brandColor, setBrandColor] = useState("#14532D");
  const [logoUrl, setLogoUrl] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyCountry, setCompanyCountry] = useState("SA");
  const [companyCity, setCompanyCity] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("SAR");
  const [companyTimezone, setCompanyTimezone] = useState("Asia/Riyadh");
  const [businessRegNumber, setBusinessRegNumber] = useState("");
  const [taxRegNumber, setTaxRegNumber] = useState("");
  const [operatingMode, setOperatingMode] = useState<
    "independent" | "network_main"
  >("independent");

  // Pre-fill company state when company already exists (so user can freely edit)
  useEffect(() => {
    if (company) {
      setCompanyName(company.name);
      setLegalName(company.legalName);
      setBrandColor(company.brandColor || "#14532D");
      setLogoUrl(company.logoUrl || "");
      setCompanyPhone(company.phone);
      setCompanyEmail(company.email);
      setCompanyCountry(company.countryCode);
      setCompanyCity(company.city);
      setCompanyAddress(company.address);
      setPostalCode(company.postalCode || "");
      setBaseCurrency(company.baseCurrency);
      setCompanyTimezone(company.timezone);
      setBusinessRegNumber(company.businessRegNumber || "");
      setTaxRegNumber(company.taxRegNumber || "");
      setOperatingMode(
        company.operatingMode === "network_main" ? "network_main" : "independent",
      );
    }
  }, [company]);

  // Step 2: First Location Form State
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [isCodeTouched, setIsCodeTouched] = useState(false);
  const [branchCountry, setBranchCountry] = useState("SA");
  const [branchCity, setBranchCity] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchEmail, setBranchEmail] = useState("");
  const [branchTimezone, setBranchTimezone] = useState("Asia/Riyadh");
  const [workingDays, setWorkingDays] = useState(
    isRtl ? "الأحد - الخميس" : "Sun - Thu",
  );
  const [workingHours, setWorkingHours] = useState("08:00 - 22:00");

  const [formError, setFormError] = useState<string | undefined>();

  // Initialize or align first branch code when company loads
  useEffect(() => {
    if (company && !isCodeTouched) {
      if (!branchCountry || branchCountry === "SA") {
        setBranchCountry(company.countryCode);
      }
      if (!branchCity) {
        setBranchCity(company.city);
      }
      const initialCode = deriveBranchCode(company.city, company.countryCode, 1);
      setBranchCode(initialCode);
    }
  }, [company, isCodeTouched]);

  function handleCompanyCountryChange(nextCode: string) {
    setCompanyCountry(nextCode);
    const meta = findCountryMetadata(nextCode);
    if (meta) {
      setBaseCurrency(meta.currencyCode);
      setCompanyTimezone(meta.defaultTimezone);
    }
  }

  function handleBranchCountryChange(nextCode: string) {
    setBranchCountry(nextCode);
    const meta = findCountryMetadata(nextCode);
    if (meta) {
      setBranchTimezone(meta.defaultTimezone);
    }
    if (!isCodeTouched) {
      setBranchCode(deriveBranchCode(branchCity, nextCode, 1));
    }
  }

  function handleBranchCityChange(val: string) {
    setBranchCity(val);
    if (!isCodeTouched) {
      setBranchCode(deriveBranchCode(val, branchCountry, 1));
    }
  }

  function handleUseCompanyAddress() {
    if (!company) return;
    setBranchCountry(company.countryCode);
    setBranchCity(company.city);
    setBranchAddress(company.address);
    setBranchPhone(company.phone);
    setBranchEmail(company.email);
    const meta = findCountryMetadata(company.countryCode);
    setBranchTimezone(meta?.defaultTimezone ?? company.timezone);
    const code = deriveBranchCode(company.city, company.countryCode, 1);
    setBranchCode(code);
    setIsCodeTouched(false);
  }

  async function handleCompanySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);

    const payload = {
      name: companyName.trim(),
      legalName: legalName.trim() || companyName.trim(),
      logoUrl: logoUrl.trim() || null,
      brandColor,
      phone: companyPhone.trim(),
      email: companyEmail.trim(),
      countryCode: companyCountry,
      city: companyCity.trim(),
      address: companyAddress.trim(),
      postalCode: postalCode.trim(),
      baseCurrency,
      timezone: companyTimezone.trim(),
      businessRegNumber: businessRegNumber.trim(),
      taxRegNumber: taxRegNumber.trim(),
      operatingMode,
    };

    try {
      if (company) {
        await updateCompany(payload).unwrap();
      } else {
        await createCompany(payload).unwrap();
      }
      setActiveStepOverride(2);
    } catch (err) {
      const code = extractApiErrorCode(err);
      setFormError(
        code === "COMPANY_ALREADY_EXISTS"
          ? isRtl
            ? "هذا الحساب مرتبط بشركة بالفعل."
            : "This account already owns a company."
          : isRtl
            ? "يرجى التأكد من استكمال جميع بيانات الشركة المطلوبة بشكل صحيح."
            : "Please verify all required company details and try again.",
      );
    }
  }

  async function handleFirstBranchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(undefined);

    try {
      await createBranch({
        name: branchName.trim(),
        code: branchCode.trim(),
        countryCode: branchCountry,
        city: branchCity.trim(),
        address: branchAddress.trim(),
        phone: branchPhone.trim(),
        email: branchEmail.trim(),
        timezone: branchTimezone.trim(),
        workingDays: workingDays.trim(),
        workingHours: workingHours.trim(),
      }).unwrap();

      router.push("/workspace");
    } catch (err) {
      const code = extractApiErrorCode(err);
      setFormError(
        code === "BRANCH_CODE_EXISTS"
          ? isRtl
            ? "كود الفرع مستخدم بالفعل داخل شركتك."
            : "Branch code is already in use."
          : isRtl
            ? "يرجى استكمال جميع بيانات الفرع الأول بشكل صحيح."
            : "Please check all required location fields and try again.",
      );
    }
  }

  const defaultStep = onboardingState === "needs_first_branch" ? 2 : 1;
  const currentStep = activeStepOverride ?? defaultStep;

  return (
    <div className="min-h-screen bg-revix-surface text-revix-dark">
      {/* Slim Onboarding Header */}
      <header className="border-b border-revix-border bg-revix-white">
        <div className="mx-auto flex h-[56px] max-w-[920px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-revix-primary text-revix-white">
              <RevixIcon name="car-front" size={16} />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-revix-dark">
              Revix System
            </span>
            <StudioBadge variant="primary">
              {isRtl ? "إعداد مساحة العمل" : "Workspace Setup"}
            </StudioBadge>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-[920px] px-4 py-8 sm:px-6">
        {/* Progress Steps */}
        <div className="mb-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setActiveStepOverride(1)}
            className={`rounded-[10px] border p-3.5 text-start transition-all cursor-pointer ${
              currentStep === 1
                ? "border-revix-primary bg-revix-white ring-2 ring-revix-primary/20 shadow-xs"
                : "border-emerald-200 bg-revix-tint/60 hover:bg-revix-tint"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                    currentStep === 1
                      ? "bg-revix-primary text-revix-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {company ? "✓" : "1"}
                </span>
                <span className="text-[13.5px] font-semibold text-revix-dark">
                  {isRtl ? "بيانات الشركة والهوية" : "Company profile & structure"}
                </span>
              </div>
              {company && currentStep === 2 ? (
                <span className="text-[12px] font-medium text-revix-primary underline hover:text-revix-primary-hover">
                  {isRtl ? "تعديل" : "Edit"}
                </span>
              ) : null}
            </div>
          </button>

          <button
            type="button"
            disabled={!company}
            onClick={() => {
              if (company) setActiveStepOverride(2);
            }}
            className={`rounded-[10px] border p-3.5 text-start transition-all ${
              currentStep === 2
                ? "border-revix-primary bg-revix-white ring-2 ring-revix-primary/20 shadow-xs"
                : company
                  ? "border-revix-border bg-revix-white cursor-pointer hover:border-revix-primary/40"
                  : "border-revix-border bg-revix-white/60 opacity-60 cursor-not-allowed"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                  currentStep === 2
                    ? "bg-revix-primary text-revix-white"
                    : "bg-revix-border text-revix-secondary"
                }`}
              >
                2
              </span>
              <span className="text-[13.5px] font-semibold text-revix-dark">
                {isRtl ? "إنشاء أول فرع / لوكيشن" : "Create your first location"}
              </span>
            </div>
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-[12px] border border-revix-border bg-revix-white p-10 text-center text-[14px] text-revix-secondary">
            {isRtl ? "جاري تجهيز مساحة عملك..." : "Loading your workspace setup..."}
          </div>
        ) : currentStep === 1 ? (
          <div className="rounded-[12px] border border-revix-border bg-revix-white p-6 sm:p-8">
            <div className="border-b border-revix-border pb-4">
              <h1 className="text-[22px] font-bold text-revix-dark">
                {isRtl ? "إعداد بيانات شركتك" : "Set up your company"}
              </h1>
              <p className="mt-1 text-[13.5px] text-revix-secondary">
                {isRtl
                  ? "أدخل بيانات شركتك القانونية وهويتها التجارية. يمكنك تعديلها لاحقًا من إعدادات الشركة."
                  : "Enter your company profile, legal entity, and operating model. You can edit these later under Settings → Company."}
              </p>
            </div>

            {formError ? (
              <div className="mt-5">
                <Alert
                  variant="error"
                  title={isRtl ? "تعذّر حفظ الشركة" : "Unable to save company"}
                  message={formError}
                  onClose={() => setFormError(undefined)}
                />
              </div>
            ) : null}

            <form onSubmit={handleCompanySubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label={isRtl ? "اسم الشركة" : "Company name"}
                  placeholder={isRtl ? "مثال: شركة النور للتأجير" : "e.g., Al Noor Mobility"}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
                <FormInput
                  label={isRtl ? "الاسم القانوني للكيان" : "Legal entity name"}
                  placeholder={isRtl ? "مثال: شركة النور لتأجير السيارات ذ.م.م" : "e.g., Al Noor Car Rental LLC"}
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CompanyLogoUploader
                  isRtl={isRtl}
                  value={logoUrl}
                  brandColor={brandColor}
                  companyName={companyName}
                  onChange={setLogoUrl}
                />

                <div className="space-y-1.5">
                  <label className="block text-[13.5px] font-semibold text-revix-dark">
                    {isRtl ? "لون البراند" : "Brand color"}
                  </label>
                  <div className="flex h-[70px] items-center gap-3 rounded-control border border-revix-border bg-revix-white px-3.5">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-9 w-11 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <div className="min-w-0">
                      <span dir="ltr" className="block font-mono text-[13px] font-semibold text-revix-dark">
                        {brandColor}
                      </span>
                      <span className="text-[11.5px] text-revix-secondary">
                        {isRtl
                          ? "يُستخدم في شريط مساحة العمل وبطاقة الدعوات"
                          : "Used in your workspace header and team invites"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label={isRtl ? "هاتف الشركة" : "Company phone"}
                  dir="ltr"
                  placeholder="+966 50 000 0000"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  required
                />
                <FormInput
                  label={isRtl ? "البريد الإلكتروني للشركة" : "Company email"}
                  type="email"
                  dir="ltr"
                  placeholder="info@company.com"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <CountrySelectField
                  isRtl={isRtl}
                  label={isRtl ? "دولة المقر الرئيسي" : "Country"}
                  countryCode={companyCountry}
                  showCurrencyInOption={false}
                  onChange={handleCompanyCountryChange}
                />

                <FormInput
                  label={isRtl ? "المدينة" : "City"}
                  placeholder={isRtl ? "الرياض / الكويت / القاهرة" : "Riyadh / Kuwait City"}
                  value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  required
                />

                <FormInput
                  label={isRtl ? "الرمز البريدي" : "Postal code"}
                  dir="ltr"
                  placeholder="11564"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>

              <FormInput
                label={isRtl ? "العنوان الرئيسي للمقر القانوني" : "Main headquarters address"}
                placeholder={
                  isRtl
                    ? "الشارع، المبنى، الحي (ليس بالضرورة موقع تسليم السيارات)"
                    : "Street, building, district (separate from vehicle handover locations)"
                }
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label={isRtl ? "العملة المرجعية للشركة" : "Company reference currency"}
                  dir="ltr"
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value.toUpperCase())}
                  required
                />
                <FormInput
                  label={isRtl ? "المنطقة الزمنية" : "Time zone"}
                  dir="ltr"
                  value={companyTimezone}
                  onChange={(e) => setCompanyTimezone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label={isRtl ? "رقم السجل التجاري" : "Business registration number"}
                  dir="ltr"
                  placeholder="CR-1010..."
                  value={businessRegNumber}
                  onChange={(e) => setBusinessRegNumber(e.target.value)}
                  required
                />
                <FormInput
                  label={isRtl ? "رقم التسجيل الضريبي (اختياري)" : "Tax registration number (optional)"}
                  dir="ltr"
                  placeholder="VAT-3000..."
                  value={taxRegNumber}
                  onChange={(e) => setTaxRegNumber(e.target.value)}
                />
              </div>

              <OperatingModeSelector
                isRtl={isRtl}
                value={operatingMode}
                onChange={setOperatingMode}
                heading={
                  isRtl
                    ? "كيف تعمل شركتك على المنصة؟"
                    : "How does your company operate?"
                }
              />

              <div className="flex flex-col-reverse gap-3 border-t border-revix-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                {company ? (
                  <button
                    type="button"
                    onClick={() => setActiveStepOverride(2)}
                    className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-revix-border bg-revix-white px-4 py-2.5 text-[13.5px] font-medium text-revix-secondary hover:text-revix-dark hover:bg-revix-surface transition-colors"
                  >
                    {isRtl ? "المتابعة لإعداد الفرع الأول ←" : "Continue to first location →"}
                  </button>
                ) : <div />}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreatingCompany || isUpdatingCompany}
                  className="rounded-[8px]"
                >
                  {isCreatingCompany || isUpdatingCompany
                    ? isRtl
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : company
                      ? isRtl
                        ? "حفظ التعديلات ومتابعة إعداد الفرع"
                        : "Save changes & continue to location"
                      : isRtl
                        ? "حفظ ومتابعة لإعداد الفرع الأول"
                        : "Save & create first location"}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-[12px] border border-revix-border bg-revix-white p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-revix-border pb-4">
              <div>
                <h1 className="text-[22px] font-bold text-revix-dark">
                  {isRtl ? "أنشئ أول فرع / لوكيشن" : "Create your first location"}
                </h1>
                <p className="mt-1 text-[13.5px] text-revix-secondary">
                  {isRtl
                    ? "مكتب تسليم واستلام السيارات مستقل عن المقر القانوني، وتتحدد عملته تلقائيًا حسب دولته."
                    : "Your pickup/delivery location is separate from headquarters, and its currency is automatically set by its country."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleUseCompanyAddress}
                className="shrink-0 cursor-pointer rounded-[6px] border border-revix-primary/35 bg-revix-tint px-3.5 py-2 text-[12.5px] font-semibold text-revix-primary transition-colors hover:bg-revix-primary hover:text-revix-white"
              >
                {isRtl ? "استخدام عنوان الشركة" : "Use company address"}
              </button>
            </div>

            {formError ? (
              <div className="mt-5">
                <Alert
                  variant="error"
                  title={isRtl ? "تعذّر إنشاء الفرع" : "Unable to create location"}
                  message={formError}
                  onClose={() => setFormError(undefined)}
                />
              </div>
            ) : null}

            <form onSubmit={handleFirstBranchSubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label={isRtl ? "اسم الفرع / اللوكيشن" : "Branch / Location name"}
                  placeholder={isRtl ? "مثال: فرع المطار الرئيسي" : "e.g., Riyadh Airport Desk"}
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                />
                <FormInput
                  label={isRtl ? "كود الفرع" : "Branch code"}
                  dir="ltr"
                  placeholder="CAI-01"
                  value={branchCode}
                  onChange={(e) => {
                    setIsCodeTouched(true);
                    setBranchCode(e.target.value.toUpperCase());
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <CountrySelectField
                  isRtl={isRtl}
                  label={isRtl ? "دولة الفرع" : "Branch country"}
                  countryCode={branchCountry}
                  onChange={handleBranchCountryChange}
                />
                <AutoBranchCurrencyField
                  isRtl={isRtl}
                  countryCode={branchCountry}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label={isRtl ? "المدينة / المنطقة" : "City / Region"}
                  placeholder={
                    isRtl ? "مثال: القاهرة / التجمع الخامس" : "e.g., Cairo / Downtown"
                  }
                  value={branchCity}
                  onChange={(e) => handleBranchCityChange(e.target.value)}
                  required
                />
                <FormInput
                  label={isRtl ? "المنطقة الزمنية للفرع" : "Branch time zone"}
                  dir="ltr"
                  placeholder="Africa/Cairo"
                  value={branchTimezone}
                  onChange={(e) => setBranchTimezone(e.target.value)}
                  required
                />
              </div>

              <FormInput
                label={isRtl ? "عنوان الفرع" : "Branch address"}
                placeholder={
                  isRtl
                    ? "مثال: شارع التسعين الشمالي، مبنى 14"
                    : "e.g., 14 North 90th St, Building 2"
                }
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label={isRtl ? "هاتف الفرع" : "Branch phone"}
                  type="tel"
                  dir="ltr"
                  placeholder="+20 10 0000 0000"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  required
                />
                <FormInput
                  label={isRtl ? "البريد الإلكتروني للفرع" : "Branch email"}
                  type="email"
                  dir="ltr"
                  placeholder="branch@company.com"
                  value={branchEmail}
                  onChange={(e) => setBranchEmail(e.target.value)}
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

              <div className="flex flex-col-reverse gap-3 border-t border-revix-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setActiveStepOverride(1)}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-[8px] border border-revix-border bg-revix-white px-4 py-2.5 text-[13.5px] font-semibold text-revix-dark hover:border-revix-primary hover:bg-revix-surface transition-colors"
                >
                  <span className={isRtl ? "rotate-180" : ""}>←</span>
                  {isRtl ? "الرجوع لتعديل بيانات الشركة" : "Back to company details"}
                </button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isCreatingBranch}
                  className="rounded-[8px]"
                >
                  {isCreatingBranch
                    ? isRtl
                      ? "جاري الإنشاء..."
                      : "Creating..."
                    : isRtl
                      ? "إنشاء الفرع والدخول للوحة التحكم"
                      : "Create location & open dashboard"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
