"use client";

import { FormSelect } from "@/components/ui/FormField";
import {
  SUPPORTED_COUNTRIES,
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
  const options = SUPPORTED_COUNTRIES.map((c) => ({
    value: c.code,
    label: showCurrencyInOption
      ? isRtl
        ? `${c.nameAr} (${c.currencyCode})`
        : `${c.nameEn} (${c.currencyCode})`
      : isRtl
        ? c.nameAr
        : c.nameEn,
  }));

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

export interface AutoBranchCurrencyFieldProps {
  isRtl: boolean;
  countryCode: string;
  helperTag?: string;
}

export function AutoBranchCurrencyField({
  isRtl,
  countryCode,
  helperTag,
}: AutoBranchCurrencyFieldProps) {
  const autoCurrency = resolveCurrencyForCountry(countryCode);
  return (
    <div className="space-y-1.5">
      <label className="block text-[13.5px] font-semibold text-revix-dark">
        {isRtl
          ? "عملة الفرع (تلقائية حسب الدولة)"
          : "Branch currency (auto by country)"}
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
