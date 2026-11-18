"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormField";
import {
  CountrySelectField,
  OperatingModeSelector,
} from "@/components/shared/workspace";
import { findCountryMetadata } from "@/lib/workspace/countryCatalog";
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
    <div className="max-w-[820px] space-y-5">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-revix-dark">
          {isRtl ? "بيانات وهوية الشركة" : "Company Profile & Brand"}
        </h1>
        <p className="mt-0.5 text-[13px] text-revix-secondary">
          {isRtl
            ? "إدارة الهوية التجارية، بيانات المقر القانوني، السجل التجاري والضريبي، ونموذج تشغيل الشركة."
            : "Manage your company identity, legal headquarters, registration details, and operating structure."}
        </p>
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

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-[8px] border border-revix-border bg-revix-white p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-[13.5px] font-semibold text-revix-dark">
              {isRtl ? "لون البراند" : "Brand color"}
            </label>
            <div className="flex h-[46px] items-center gap-3 rounded-control border border-revix-border bg-revix-white px-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent"
              />
              <span dir="ltr" className="font-mono text-[13px] text-revix-dark">
                {brandColor}
              </span>
            </div>
          </div>

          <FormInput
            label={isRtl ? "رابط الشعار (اختياري)" : "Logo URL (optional)"}
            dir="ltr"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            }}
          />

          <FormInput
            label={isRtl ? "المدينة" : "City"}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />

          <FormInput
            label={isRtl ? "الرمز البريدي" : "Postal code"}
            dir="ltr"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
          />
        </div>

        <FormInput
          label={isRtl ? "العنوان الرئيسي (المقر القانوني)" : "Headquarters address"}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label={isRtl ? "العملة المرجعية للشركة" : "Reference base currency"}
            dir="ltr"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value.toUpperCase())}
            required
          />
          <FormInput
            label={isRtl ? "المنطقة الزمنية" : "Time zone"}
            dir="ltr"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <OperatingModeSelector
          isRtl={isRtl}
          value={operatingMode}
          onChange={setOperatingMode}
        />

        <div className="flex justify-end border-t border-revix-border pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={isSaving}
            className="rounded-[8px]"
          >
            {isSaving
              ? isRtl
                ? "جاري الحفظ..."
                : "Saving..."
              : isRtl
                ? "حفظ التغييرات"
                : "Save company settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
