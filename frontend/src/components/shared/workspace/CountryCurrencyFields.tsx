"use client";

import { FormSelect } from "@/components/ui/FormField";
import {
  SUPPORTED_COUNTRIES,
  getCitiesForCountry,
  getCountryFlag,
  resolveCurrencyForCountry,
} from "@/lib/workspace/countryCatalog";

export interface CountrySelectFieldProps {
  isRtl: boolean;
  label: string;
  countryCode: string;
  onChange: (nextCountryCode: string) => void;
  showCurrencyInOption?: boolean;
}

export function CountrySelectField({
  isRtl,
  label,
  countryCode,
  onChange,
  showCurrencyInOption = true,
}: CountrySelectFieldProps) {
  const options = SUPPORTED_COUNTRIES.map((c) => {
    const flag = getCountryFlag(c.code);
    const name = isRtl ? c.nameAr : c.nameEn;
    return {
      value: c.code,
      label: showCurrencyInOption
        ? `${name} (${c.currencyCode})`
        : name,
    };
  });

  return (
    <FormSelect
      label={label}
      value={countryCode}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      isRtl={isRtl}
    />
  );
}

export interface CitySelectFieldProps {
  isRtl: boolean;
  label: string;
  countryCode: string;
  city: string;
  onChange: (nextCity: string) => void;
  placeholder?: string;
}

export function CitySelectField({
  isRtl,
  label,
  countryCode,
  city,
  onChange,
  placeholder,
}: CitySelectFieldProps) {
  const cities = getCitiesForCountry(countryCode);
  const trimmedCity = city.trim();
  const hasMatch = cities.some(
    (c) =>
      c.value.toLowerCase() === trimmedCity.toLowerCase() ||
      c.nameAr === trimmedCity ||
      c.nameEn.toLowerCase() === trimmedCity.toLowerCase(),
  );

  const matchedValue =
    cities.find(
      (c) =>
        c.value.toLowerCase() === trimmedCity.toLowerCase() ||
        c.nameAr === trimmedCity ||
        c.nameEn.toLowerCase() === trimmedCity.toLowerCase(),
    )?.value ?? trimmedCity;

  const options = [
    ...(trimmedCity && !hasMatch
      ? [{ value: trimmedCity, label: trimmedCity }]
      : []),
    ...cities.map((c) => ({
      value: c.value,
      label: isRtl ? c.nameAr : c.nameEn,
    })),
  ];

  return (
    <FormSelect
      label={label}
      value={matchedValue}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      placeholder={
        placeholder ?? (isRtl ? "اختر المدينة" : "Select city")
      }
      isRtl={isRtl}
    />
  );
}

const COMMON_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "EGP",
  "SAR",
  "AED",
  "KWD",
  "QAR",
  "BHD",
  "OMR",
  "JOD",
  "MAD",
  "TND",
  "TRY",
];

export interface AutoBranchCurrencyFieldProps {
  isRtl: boolean;
  countryCode: string;
  currencyCode?: string;
  onChange?: (currencyCode: string) => void;
  helperTag?: string;
}

export function AutoBranchCurrencyField({
  isRtl,
  countryCode,
  currencyCode,
  onChange,
  helperTag,
}: AutoBranchCurrencyFieldProps) {
  const autoCurrency = resolveCurrencyForCountry(countryCode);
  const currentCurrency = (currencyCode || autoCurrency).toUpperCase();

  if (onChange) {
    const optionsList = Array.from(
      new Set([autoCurrency, currentCurrency, ...COMMON_CURRENCIES]),
    );
    return (
      <FormSelect
        label={isRtl ? "عملة الفرع" : "Branch currency"}
        value={currentCurrency}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        options={optionsList.map((code) => ({
          value: code,
          label:
            code === autoCurrency
              ? `${code} — ${isRtl ? "عملة الدولة" : "Country default"}`
              : code,
        }))}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-[13.5px] font-semibold text-revix-dark">
        {isRtl ? "عملة الفرع" : "Branch currency"}
      </label>
      <div className="flex h-[46px] items-center justify-between rounded-control border border-revix-primary/25 bg-revix-tint/65 px-3.5">
        <span dir="ltr" className="font-mono text-[14px] font-bold text-revix-primary">
          {autoCurrency}
        </span>
        <span className="text-[11.5px] font-medium text-revix-secondary">
          {helperTag ?? (isRtl ? "تلقائي" : "Automatic")}
        </span>
      </div>
    </div>
  );
}
