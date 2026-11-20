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

export function getCountryFlag(countryCode?: string): string {
  const clean = countryCode?.trim().toUpperCase();
  if (!clean || clean.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...clean.split("").map((char) => 127397 + char.charCodeAt(0)),
  );
}

export interface CityMetadata {
  value: string;
  nameEn: string;
  nameAr: string;
}

export const CITIES_BY_COUNTRY: Record<string, readonly CityMetadata[]> = {
  EG: [
    { value: "Cairo", nameEn: "Cairo", nameAr: "القاهرة" },
    { value: "Giza", nameEn: "Giza", nameAr: "الجيزة" },
    { value: "Alexandria", nameEn: "Alexandria", nameAr: "الإسكندرية" },
    { value: "Gharbia", nameEn: "Gharbia (Tanta)", nameAr: "الغربية (طنطا)" },
    { value: "Dakahlia", nameEn: "Dakahlia (Mansoura)", nameAr: "الدقهلية (المنصورة)" },
    { value: "Sharqia", nameEn: "Sharqia (Zagazig)", nameAr: "الشرقية (الزقازيق)" },
    { value: "Qalyubia", nameEn: "Qalyubia (Banha)", nameAr: "القليوبية (بنها)" },
    { value: "Monufia", nameEn: "Monufia (Shibin El Kom)", nameAr: "المنوفية (شبين الكوم)" },
    { value: "Beheira", nameEn: "Beheira (Damanhour)", nameAr: "البحيرة (دمنهور)" },
    { value: "Kafr El Sheikh", nameEn: "Kafr El Sheikh", nameAr: "كفر الشيخ" },
    { value: "Damietta", nameEn: "Damietta", nameAr: "دمياط" },
    { value: "Port Said", nameEn: "Port Said", nameAr: "بورسعيد" },
    { value: "Ismailia", nameEn: "Ismailia", nameAr: "الإسماعيلية" },
    { value: "Suez", nameEn: "Suez", nameAr: "السويس" },
    { value: "Fayoum", nameEn: "Fayoum", nameAr: "الفيوم" },
    { value: "Beni Suef", nameEn: "Beni Suef", nameAr: "بني سويف" },
    { value: "Minya", nameEn: "Minya", nameAr: "المنيا" },
    { value: "Asyut", nameEn: "Asyut", nameAr: "أسيوط" },
    { value: "Sohag", nameEn: "Sohag", nameAr: "سوهاج" },
    { value: "Qena", nameEn: "Qena", nameAr: "قنا" },
    { value: "Luxor", nameEn: "Luxor", nameAr: "الأقصر" },
    { value: "Aswan", nameEn: "Aswan", nameAr: "أسوان" },
    { value: "Hurghada", nameEn: "Red Sea (Hurghada)", nameAr: "البحر الأحمر (الغردقة)" },
    { value: "Sharm El Sheikh", nameEn: "South Sinai (Sharm El Sheikh)", nameAr: "جنوب سيناء (شرم الشيخ)" },
    { value: "Matrouh", nameEn: "Matrouh", nameAr: "مطروح" },
    { value: "North Sinai", nameEn: "North Sinai (Arish)", nameAr: "شمال سيناء (العريش)" },
    { value: "New Valley", nameEn: "New Valley", nameAr: "الوادي الجديد" },
  ],
  SA: [
    { value: "Riyadh", nameEn: "Riyadh", nameAr: "الرياض" },
    { value: "Jeddah", nameEn: "Jeddah", nameAr: "جدة" },
    { value: "Dammam", nameEn: "Dammam", nameAr: "الدمام" },
    { value: "Khobar", nameEn: "Khobar", nameAr: "الخبر" },
    { value: "Mecca", nameEn: "Mecca", nameAr: "مكة المكرمة" },
    { value: "Medina", nameEn: "Medina", nameAr: "المدينة المنورة" },
    { value: "Tabuk", nameEn: "Tabuk", nameAr: "تبوك" },
    { value: "Abha", nameEn: "Abha", nameAr: "أبها" },
    { value: "Taif", nameEn: "Taif", nameAr: "الطائف" },
    { value: "Jubail", nameEn: "Jubail", nameAr: "الجبيل" },
    { value: "Yanbu", nameEn: "Yanbu", nameAr: "ينبع" },
    { value: "Hail", nameEn: "Hail", nameAr: "حائل" },
    { value: "Buraidah", nameEn: "Buraidah", nameAr: "بريدة" },
    { value: "Najran", nameEn: "Najran", nameAr: "نجران" },
    { value: "Jazan", nameEn: "Jazan", nameAr: "جازان" },
  ],
  AE: [
    { value: "Dubai", nameEn: "Dubai", nameAr: "دبي" },
    { value: "Abu Dhabi", nameEn: "Abu Dhabi", nameAr: "أبوظبي" },
    { value: "Sharjah", nameEn: "Sharjah", nameAr: "الشارقة" },
    { value: "Ajman", nameEn: "Ajman", nameAr: "عجمان" },
    { value: "Ras Al Khaimah", nameEn: "Ras Al Khaimah", nameAr: "رأس الخيمة" },
    { value: "Fujairah", nameEn: "Fujairah", nameAr: "الفجيرة" },
    { value: "Al Ain", nameEn: "Al Ain", nameAr: "العين" },
    { value: "Umm Al Quwain", nameEn: "Umm Al Quwain", nameAr: "أم القيوين" },
  ],
  KW: [
    { value: "Kuwait City", nameEn: "Kuwait City", nameAr: "مدينة الكويت" },
    { value: "Hawalli", nameEn: "Hawalli", nameAr: "حولي" },
    { value: "Salmiya", nameEn: "Salmiya", nameAr: "السالمية" },
    { value: "Farwaniya", nameEn: "Farwaniya", nameAr: "الفروانية" },
    { value: "Ahmadi", nameEn: "Ahmadi", nameAr: "الأحمدي" },
    { value: "Jahra", nameEn: "Jahra", nameAr: "الجهراء" },
  ],
  JO: [
    { value: "Amman", nameEn: "Amman", nameAr: "عمّان" },
    { value: "Irbid", nameEn: "Irbid", nameAr: "إربد" },
    { value: "Zarqa", nameEn: "Zarqa", nameAr: "الزرقاء" },
    { value: "Aqaba", nameEn: "Aqaba", nameAr: "العقبة" },
    { value: "Salt", nameEn: "Salt", nameAr: "السلط" },
    { value: "Madaba", nameEn: "Madaba", nameAr: "مأدبا" },
    { value: "Karak", nameEn: "Karak", nameAr: "الكرك" },
  ],
  QA: [
    { value: "Doha", nameEn: "Doha", nameAr: "الدوحة" },
    { value: "Al Rayyan", nameEn: "Al Rayyan", nameAr: "الريان" },
    { value: "Al Wakrah", nameEn: "Al Wakrah", nameAr: "الوكرة" },
    { value: "Al Khor", nameEn: "Al Khor", nameAr: "الخور" },
    { value: "Lusail", nameEn: "Lusail", nameAr: "لوسيل" },
  ],
  BH: [
    { value: "Manama", nameEn: "Manama", nameAr: "المنامة" },
    { value: "Muharraq", nameEn: "Muharraq", nameAr: "المحرق" },
    { value: "Riffa", nameEn: "Riffa", nameAr: "الرفاع" },
    { value: "Isa Town", nameEn: "Isa Town", nameAr: "مدينة عيسى" },
  ],
  OM: [
    { value: "Muscat", nameEn: "Muscat", nameAr: "مسقط" },
    { value: "Salalah", nameEn: "Salalah", nameAr: "صلالة" },
    { value: "Sohar", nameEn: "Sohar", nameAr: "صحار" },
    { value: "Nizwa", nameEn: "Nizwa", nameAr: "نزوى" },
    { value: "Sur", nameEn: "Sur", nameAr: "صور" },
  ],
  GB: [
    { value: "London", nameEn: "London", nameAr: "لندن" },
    { value: "Manchester", nameEn: "Manchester", nameAr: "مانشستر" },
    { value: "Birmingham", nameEn: "Birmingham", nameAr: "برمنغهام" },
    { value: "Edinburgh", nameEn: "Edinburgh", nameAr: "إدنبرة" },
    { value: "Liverpool", nameEn: "Liverpool", nameAr: "ليفربول" },
  ],
  US: [
    { value: "New York", nameEn: "New York", nameAr: "نيويورك" },
    { value: "Los Angeles", nameEn: "Los Angeles", nameAr: "لوس أنجلوس" },
    { value: "Chicago", nameEn: "Chicago", nameAr: "شيكاغو" },
    { value: "Miami", nameEn: "Miami", nameAr: "ميامي" },
    { value: "Houston", nameEn: "Houston", nameAr: "هيوستن" },
  ],
  DE: [
    { value: "Berlin", nameEn: "Berlin", nameAr: "برلين" },
    { value: "Munich", nameEn: "Munich", nameAr: "ميونخ" },
    { value: "Frankfurt", nameEn: "Frankfurt", nameAr: "فرانكفورت" },
    { value: "Hamburg", nameEn: "Hamburg", nameAr: "هامبورغ" },
  ],
  TR: [
    { value: "Istanbul", nameEn: "Istanbul", nameAr: "إسطنبول" },
    { value: "Ankara", nameEn: "Ankara", nameAr: "أنقرة" },
    { value: "Izmir", nameEn: "Izmir", nameAr: "إزمير" },
    { value: "Antalya", nameEn: "Antalya", nameAr: "أنطاليا" },
  ],
  MA: [
    { value: "Casablanca", nameEn: "Casablanca", nameAr: "الدار البيضاء" },
    { value: "Rabat", nameEn: "Rabat", nameAr: "الرباط" },
    { value: "Marrakesh", nameEn: "Marrakesh", nameAr: "مراكش" },
    { value: "Tangier", nameEn: "Tangier", nameAr: "طنجة" },
    { value: "Agadir", nameEn: "Agadir", nameAr: "أكادير" },
  ],
  TN: [
    { value: "Tunis", nameEn: "Tunis", nameAr: "تونس" },
    { value: "Sfax", nameEn: "Sfax", nameAr: "صفاقس" },
    { value: "Sousse", nameEn: "Sousse", nameAr: "سوسة" },
  ],
  DZ: [
    { value: "Algiers", nameEn: "Algiers", nameAr: "الجزائر" },
    { value: "Oran", nameEn: "Oran", nameAr: "وهران" },
    { value: "Constantine", nameEn: "Constantine", nameAr: "قسنطينة" },
  ],
  IQ: [
    { value: "Baghdad", nameEn: "Baghdad", nameAr: "بغداد" },
    { value: "Basra", nameEn: "Basra", nameAr: "البصرة" },
    { value: "Erbil", nameEn: "Erbil", nameAr: "أربيل" },
  ],
  LB: [
    { value: "Beirut", nameEn: "Beirut", nameAr: "بيروت" },
    { value: "Tripoli", nameEn: "Tripoli", nameAr: "طرابلس" },
    { value: "Sidon", nameEn: "Sidon", nameAr: "صيدا" },
  ],
  LY: [
    { value: "Tripoli", nameEn: "Tripoli", nameAr: "طرابلس" },
    { value: "Benghazi", nameEn: "Benghazi", nameAr: "بنغازي" },
    { value: "Misrata", nameEn: "Misrata", nameAr: "مصراتة" },
  ],
  SD: [
    { value: "Khartoum", nameEn: "Khartoum", nameAr: "الخرطوم" },
    { value: "Port Sudan", nameEn: "Port Sudan", nameAr: "بورتسودان" },
  ],
  FR: [
    { value: "Paris", nameEn: "Paris", nameAr: "باريس" },
    { value: "Lyon", nameEn: "Lyon", nameAr: "ليون" },
    { value: "Marseille", nameEn: "Marseille", nameAr: "مرسيليا" },
    { value: "Nice", nameEn: "Nice", nameAr: "نيس" },
  ],
  IT: [
    { value: "Rome", nameEn: "Rome", nameAr: "روما" },
    { value: "Milan", nameEn: "Milan", nameAr: "ميلانو" },
    { value: "Naples", nameEn: "Naples", nameAr: "نابولي" },
  ],
  ES: [
    { value: "Madrid", nameEn: "Madrid", nameAr: "مدريد" },
    { value: "Barcelona", nameEn: "Barcelona", nameAr: "برشلونة" },
    { value: "Valencia", nameEn: "Valencia", nameAr: "فالنسيا" },
  ],
  CA: [
    { value: "Toronto", nameEn: "Toronto", nameAr: "تورونتو" },
    { value: "Vancouver", nameEn: "Vancouver", nameAr: "فانكوفر" },
    { value: "Montreal", nameEn: "Montreal", nameAr: "مونتريال" },
  ],
};

export function getCitiesForCountry(countryCode: string): readonly CityMetadata[] {
  const upper = countryCode.trim().toUpperCase();
  return CITIES_BY_COUNTRY[upper] ?? [];
}

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
