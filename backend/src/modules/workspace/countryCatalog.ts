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
  {
    code: "MA",
    nameEn: "Morocco",
    nameAr: "المغرب",
    currencyCode: "MAD",
    defaultTimezone: "Africa/Casablanca",
  },
  {
    code: "TN",
    nameEn: "Tunisia",
    nameAr: "تونس",
    currencyCode: "TND",
    defaultTimezone: "Africa/Tunis",
  },
  {
    code: "DZ",
    nameEn: "Algeria",
    nameAr: "الجزائر",
    currencyCode: "DZD",
    defaultTimezone: "Africa/Algiers",
  },
  {
    code: "IQ",
    nameEn: "Iraq",
    nameAr: "العراق",
    currencyCode: "IQD",
    defaultTimezone: "Asia/Baghdad",
  },
  {
    code: "LB",
    nameEn: "Lebanon",
    nameAr: "لبنان",
    currencyCode: "LBP",
    defaultTimezone: "Asia/Beirut",
  },
  {
    code: "LY",
    nameEn: "Libya",
    nameAr: "ليبيا",
    currencyCode: "LYD",
    defaultTimezone: "Africa/Tripoli",
  },
  {
    code: "SD",
    nameEn: "Sudan",
    nameAr: "السودان",
    currencyCode: "SDG",
    defaultTimezone: "Africa/Khartoum",
  },
  {
    code: "FR",
    nameEn: "France",
    nameAr: "فرنسا",
    currencyCode: "EUR",
    defaultTimezone: "Europe/Paris",
  },
  {
    code: "IT",
    nameEn: "Italy",
    nameAr: "إيطاليا",
    currencyCode: "EUR",
    defaultTimezone: "Europe/Rome",
  },
  {
    code: "ES",
    nameEn: "Spain",
    nameAr: "إسبانيا",
    currencyCode: "EUR",
    defaultTimezone: "Europe/Madrid",
  },
  {
    code: "CA",
    nameEn: "Canada",
    nameAr: "كندا",
    currencyCode: "CAD",
    defaultTimezone: "America/Toronto",
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
