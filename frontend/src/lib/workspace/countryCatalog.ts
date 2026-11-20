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

export function resolveCurrencyForCountry(countryCode: string): string {
  const country = findCountryMetadata(countryCode);
  return country ? country.currencyCode : "SAR";
}

const CITY_CODE_MAP: Record<string, string> = {
  // Egypt
  cairo: "CAI",
  "al qahirah": "CAI",
  "el qahirah": "CAI",
  "القاهرة": "CAI",
  "قاهرة": "CAI",
  alexandria: "ALY",
  alex: "ALY",
  "الإسكندرية": "ALY",
  "الاسكندرية": "ALY",
  giza: "GIZ",
  "الجيزة": "GIZ",
  "sharm el sheikh": "SSH",
  sharm: "SSH",
  "شرم الشيخ": "SSH",
  hurghada: "HRG",
  "الغردقة": "HRG",
  luxor: "LXR",
  "الأقصر": "LXR",
  aswan: "ASW",
  "أسوان": "ASW",
  mansoura: "MNS",
  "المنصورة": "MNS",
  tanta: "TAN",
  "طنطا": "TAN",

  // Jordan
  amman: "AMM",
  "عمان": "AMM",
  "عمّان": "AMM",
  aqaba: "AQJ",
  "العقبة": "AQJ",
  "عقبة": "AQJ",
  irbid: "IRB",
  "إربد": "IRB",
  "اربد": "IRB",
  zarqa: "ZAR",
  "الزرقاء": "ZAR",

  // Saudi Arabia
  riyadh: "RUH",
  "الرياض": "RUH",
  "رياض": "RUH",
  jeddah: "JED",
  "جدة": "JED",
  dammam: "DMM",
  "الدمام": "DMM",
  khobar: "KHB",
  "الخبر": "KHB",
  mecca: "MAK",
  makkah: "MAK",
  "مكة": "MAK",
  "مكة المكرمة": "MAK",
  medina: "MED",
  madinah: "MED",
  "المدينة": "MED",
  "المدينة المنورة": "MED",
  tabuk: "TUU",
  "تبوك": "TUU",
  abha: "AHB",
  "أبها": "AHB",
  taif: "TIF",
  "الطائف": "TIF",

  // UAE
  dubai: "DXB",
  "دبي": "DXB",
  "abu dhabi": "AUH",
  abudhabi: "AUH",
  "أبوظبي": "AUH",
  "ابوظبي": "AUH",
  sharjah: "SHJ",
  "الشارقة": "SHJ",
  ajman: "AJM",
  "عجمان": "AJM",
  "ras al khaimah": "RKT",
  "رأس الخيمة": "RKT",
  fujairah: "FUJ",
  "الفجيرة": "FUJ",

  // Kuwait
  kuwait: "KWI",
  "kuwait city": "KWI",
  "الكويت": "KWI",

  // Qatar
  doha: "DOH",
  "الدوحة": "DOH",
  alrayyan: "RAY",
  "الريان": "RAY",

  // Bahrain
  manama: "BAH",
  "المنامة": "BAH",

  // Oman
  muscat: "MCT",
  "مسقط": "MCT",
  salalah: "SLL",
  "صلالة": "SLL",

  // UK / US / DE / TR
  london: "LON",
  "new york": "NYC",
  berlin: "BER",
  istanbul: "IST",
};

/**
 * Derives a clean standard 3-letter city/country code for branches (e.g. CAI-01, AMM-01, RUH-01, DXB-01).
 * Never hardcodes HQ-01.
 */
export function deriveBranchCode(
  city: string | undefined,
  countryCode: string | undefined,
  seq: number = 1,
): string {
  const num = String(Math.max(1, seq)).padStart(2, "0");
  const normalizedCity = city?.trim().toLowerCase() ?? "";

  if (normalizedCity && CITY_CODE_MAP[normalizedCity]) {
    return `${CITY_CODE_MAP[normalizedCity]}-${num}`;
  }

  // Check substring match (e.g., "Cairo Airport" -> "CAI")
  if (normalizedCity) {
    for (const [key, code] of Object.entries(CITY_CODE_MAP)) {
      if (normalizedCity.includes(key)) {
        return `${code}-${num}`;
      }
    }

    // Try first 3 Latin letters
    const latinLetters = normalizedCity.replace(/[^a-z]/g, "");
    if (latinLetters.length >= 3) {
      return `${latinLetters.slice(0, 3).toUpperCase()}-${num}`;
    }
  }

  // Fallback to Country Code (e.g. EG-01, JO-01, SA-01, AE-01)
  const cc = countryCode?.trim().toUpperCase() || "BR";
  return `${cc}-${num}`;
}
