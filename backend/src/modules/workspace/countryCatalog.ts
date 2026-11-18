export interface CountryMetadata {
  code: string;
  nameEn: string;
  nameAr: string;
  currencyCode: string;
  defaultTimezone: string;
}

export const SUPPORTED_COUNTRIES: readonly CountryMetadata[] = [
  {
    code: "SA",
    nameEn: "Saudi Arabia",
    nameAr: "المملكة العربية السعودية",
    currencyCode: "SAR",
    defaultTimezone: "Asia/Riyadh",
  },
  {
    code: "KW",
    nameEn: "Kuwait",
    nameAr: "الكويت",
    currencyCode: "KWD",
    defaultTimezone: "Asia/Kuwait",
  },
  {
    code: "AE",
    nameEn: "United Arab Emirates",
    nameAr: "الإمارات العربية المتحدة",
    currencyCode: "AED",
    defaultTimezone: "Asia/Dubai",
  },
  {
    code: "EG",
    nameEn: "Egypt",
    nameAr: "مصر",
    currencyCode: "EGP",
    defaultTimezone: "Africa/Cairo",
  },
  {
    code: "JO",
    nameEn: "Jordan",
    nameAr: "الأردن",
    currencyCode: "JOD",
    defaultTimezone: "Asia/Amman",
  },
  {
    code: "QA",
    nameEn: "Qatar",
    nameAr: "قطر",
    currencyCode: "QAR",
    defaultTimezone: "Asia/Qatar",
  },
  {
    code: "BH",
    nameEn: "Bahrain",
    nameAr: "البحرين",
    currencyCode: "BHD",
    defaultTimezone: "Asia/Bahrain",
  },
  {
    code: "OM",
    nameEn: "Oman",
    nameAr: "سلطنة عُمان",
    currencyCode: "OMR",
    defaultTimezone: "Asia/Muscat",
  },
  {
    code: "GB",
    nameEn: "United Kingdom",
    nameAr: "المملكة المتحدة",
    currencyCode: "GBP",
    defaultTimezone: "Europe/London",
  },
  {
    code: "US",
    nameEn: "United States",
    nameAr: "الولايات المتحدة",
    currencyCode: "USD",
    defaultTimezone: "America/New_York",
  },
  {
    code: "DE",
    nameEn: "Germany",
    nameAr: "ألمانيا",
    currencyCode: "EUR",
    defaultTimezone: "Europe/Berlin",
  },
  {
    code: "TR",
    nameEn: "Turkey",
    nameAr: "تركيا",
    currencyCode: "TRY",
    defaultTimezone: "Europe/Istanbul",
  },
] as const;

export function findCountryMetadata(
  countryCode: string,
): CountryMetadata | null {
  const upper = countryCode.trim().toUpperCase();
  return SUPPORTED_COUNTRIES.find((c) => c.code === upper) ?? null;
}

/**
 * Automatically determines the branch currency according to the branch's country.
 */
export function resolveCurrencyForCountry(countryCode: string): string | null {
  const country = findCountryMetadata(countryCode);
  return country ? country.currencyCode : null;
}
