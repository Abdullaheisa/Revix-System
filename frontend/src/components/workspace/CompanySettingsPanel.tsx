"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { SectionCard } from "@/components/ui/SectionCard";
import {
  CitySelectField,
  CompanyLogoUploader,
  CountrySelectField,
  OperatingModeSelector,
} from "@/components/shared/workspace";
import {
  findCountryMetadata,
  getCitiesForCountry,
} from "@/lib/workspace/countryCatalog";
import {
  useUpdateCompanyMutation,
  type CompanyDto,
} from "@/store/api/workspaceApi";

export interface CompanySettingsPanelProps {
  isRtl: boolean;
  company: CompanyDto;
}

export function CompanySettingsPanel({
  isRtl,
  company,
}: CompanySettingsPanelProps) {
  const [updateCompany, { isLoading: isSaving }] = useUpdateCompanyMutation();

  const [name, setName] = useState(company.name);
  const [legalName, setLegalName] = useState(company.legalName);
  const [brandColor, setBrandColor] = useState(company.brandColor);
  const [logoUrl, setLogoUrl] = useState(company.logoUrl ?? "");
  const [phone, setPhone] = useState(company.phone);
  const [email, setEmail] = useState(company.email);
  const [countryCode, setCountryCode] = useState(company.countryCode);
  const [city, setCity] = useState(company.city);
  const [address, setAddress] = useState(company.address);
  const [postalCode, setPostalCode] = useState(company.postalCode);
  const [baseCurrency, setBaseCurrency] = useState(company.baseCurrency);
  const [timezone, setTimezone] = useState(company.timezone);
  const [businessRegNumber, setBusinessRegNumber] = useState(
    company.businessRegNumber,
  );
  const [taxRegNumber, setTaxRegNumber] = useState(company.taxRegNumber);
  const [operatingMode, setOperatingMode] = useState<
    "independent" | "network_main"
  >(company.operatingMode === "network_main" ? "network_main" : "independent");

  const [savedNotice, setSavedNotice] = useState<string | undefined>();
  const [errorNotice, setErrorNotice] = useState<string | undefined>();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavedNotice(undefined);
    setErrorNotice(undefined);

    try {
      await updateCompany({
        name: name.trim(),
        legalName: legalName.trim(),
        logoUrl: logoUrl.trim() || null,
        brandColor,
        phone: phone.trim(),
        email: email.trim(),
        countryCode,
        city: city.trim(),
        address: address.trim(),
        postalCode: postalCode.trim(),
        baseCurrency,
        timezone: timezone.trim(),
        businessRegNumber: businessRegNumber.trim(),
        taxRegNumber: taxRegNumber.trim(),
        operatingMode,
      }).unwrap();

      setSavedNotice(
        isRtl
          ? "تم حفظ تحديثات بيانات الشركة بنجاح."
          : "Company profile updated successfully.",
      );
    } catch {
      setErrorNotice(
        isRtl
          ? "تعذّر حفظ بيانات الشركة. يرجى مراجعة الحقول المطلوبة."
          : "Unable to save company settings. Please check required fields.",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 pb-8"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-revix-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-revix-dark sm:text-2xl">
            {isRtl ? "بيانات وهوية الشركة" : "Company Profile & Brand"}
          </h1>
          <p className="mt-0.5 text-xs text-revix-secondary">
            {isRtl
              ? "إدارة الهوية التجارية، بيانات المقر القانوني، السجل التجاري والضريبي، ونموذج تشغيل الشركة."
              : "Manage your company identity, legal headquarters, registration details, and operating structure."}
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isSaving}
          className="rounded-xl px-5"
        >
          {isSaving
            ? isRtl
              ? "جاري الحفظ..."
              : "Saving..."
            : isRtl
              ? "حفظ التغييرات"
              : "Save Changes"}
        </Button>
      </div>

      {savedNotice ? (
        <Alert
          variant="success"
          title={isRtl ? "تم التحديث" : "Saved"}
          message={savedNotice}
          onClose={() => setSavedNotice(undefined)}
        />
      ) : null}

      {errorNotice ? (
        <Alert
          variant="error"
          title={isRtl ? "خطأ في الحفظ" : "Update failed"}
          message={errorNotice}
          onClose={() => setErrorNotice(undefined)}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-stretch">
        <SectionCard title={isRtl ? "١. الهوية والعلامة التجارية" : "1. Brand & Identity"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
            <FormInput
              label={isRtl ? "اسم الشركة" : "Company name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "الاسم القانوني للكيان" : "Legal entity name"}
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              required
            />
            <CompanyLogoUploader
              isRtl={isRtl}
              value={logoUrl}
              brandColor={brandColor}
              companyName={name}
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
                <span dir="ltr" className="font-mono text-[13px] font-semibold text-revix-dark">
                  {brandColor}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={isRtl ? "٢. بيانات التواصل والمقر" : "2. Contact & Headquarters"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label={isRtl ? "هاتف الشركة" : "Company phone"}
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "البريد الإلكتروني للشركة" : "Company email"}
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <CountrySelectField
              isRtl={isRtl}
              label={isRtl ? "الدولة" : "Country"}
              countryCode={countryCode}
              showCurrencyInOption={false}
              onChange={(next) => {
                setCountryCode(next);
                const meta = findCountryMetadata(next);
                if (meta) {
                  setBaseCurrency(meta.currencyCode);
                  setTimezone(meta.defaultTimezone);
                }
                const cities = getCitiesForCountry(next);
                if (cities.length > 0) {
                  setCity(cities[0].value);
                }
              }}
            />
            <CitySelectField
              isRtl={isRtl}
              label={isRtl ? "المدينة" : "City"}
              countryCode={countryCode}
              city={city}
              onChange={setCity}
            />
            <FormInput
              label={isRtl ? "العنوان الرئيسي (المقر القانوني)" : "Headquarters address"}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "الرمز البريدي" : "Postal code"}
              dir="ltr"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>
        </SectionCard>

        <SectionCard title={isRtl ? "٣. الإعدادات المالية والسجل القانوني" : "3. Financial & Legal"}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[14px] font-medium text-revix-dark">
                {isRtl ? "العملة المرجعية للشركة" : "Reference base currency"}
              </label>
              <RevixSelect
                isRtl={isRtl}
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                buttonClassName="h-[44px] sm:h-[46px] rounded-control text-sm font-mono"
                options={[
                  { value: "EGP", label: isRtl ? "EGP — جنيه مصري" : "EGP — Egyptian Pound" },
                  { value: "SAR", label: isRtl ? "SAR — ريال سعودي" : "SAR — Saudi Riyal" },
                  { value: "AED", label: isRtl ? "AED — درهم إماراتي" : "AED — UAE Dirham" },
                  { value: "KWD", label: isRtl ? "KWD — دينار كويتي" : "KWD — Kuwaiti Dinar" },
                  { value: "QAR", label: isRtl ? "QAR — ريال قطري" : "QAR — Qatari Riyal" },
                  { value: "BHD", label: isRtl ? "BHD — دينار بحريني" : "BHD — Bahraini Dinar" },
                  { value: "OMR", label: isRtl ? "OMR — ريال عماني" : "OMR — Omani Rial" },
                  { value: "JOD", label: isRtl ? "JOD — دينار أردني" : "JOD — Jordanian Dinar" },
                  { value: "USD", label: isRtl ? "USD — دولار أمريكي" : "USD — US Dollar" },
                  { value: "EUR", label: isRtl ? "EUR — يورو" : "EUR — Euro" },
                  { value: "GBP", label: isRtl ? "GBP — جنيه إسترليني" : "GBP — British Pound" },
                ]}
              />
            </div>
            <FormInput
              label={isRtl ? "المنطقة الزمنية" : "Time zone"}
              dir="ltr"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "رقم السجل التجاري" : "Business registration number"}
              dir="ltr"
              value={businessRegNumber}
              onChange={(e) => setBusinessRegNumber(e.target.value)}
              required
            />
            <FormInput
              label={isRtl ? "الرقم الضريبي (اختياري)" : "Tax registration number"}
              dir="ltr"
              value={taxRegNumber}
              onChange={(e) => setTaxRegNumber(e.target.value)}
            />
          </div>
        </SectionCard>

        <SectionCard title={isRtl ? "٤. نموذج تشغيل الشركة" : "4. Operating Mode"}>
          <OperatingModeSelector
            isRtl={isRtl}
            value={operatingMode}
            onChange={setOperatingMode}
          />
        </SectionCard>
      </div>
    </form>
  );
}
