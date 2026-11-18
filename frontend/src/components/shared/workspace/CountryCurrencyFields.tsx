"use client";

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
  return (
    <div className="space-y-1.5">
      <label className="block text-[13.5px] font-semibold text-revix-dark">
        {label}
      </label>
      <select
        value={countryCode}
        onChange={(e) => onChange(e.target.value)}
        className="h-[46px] w-full cursor-pointer rounded-control border border-revix-border bg-revix-white px-3 text-[14px] text-revix-dark focus:border-revix-primary focus:outline-none"
      >
        {SUPPORTED_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {showCurrencyInOption
              ? isRtl
                ? `${c.nameAr} (${c.currencyCode})`
                : `${c.nameEn} (${c.currencyCode})`
              : isRtl
                ? c.nameAr
                : c.nameEn}
          </option>
        ))}
      </select>
    </div>
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
