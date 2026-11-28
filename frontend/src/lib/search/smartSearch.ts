export type SearchIntent = "phone" | "id" | "vin" | "plate" | "name" | "general";

export interface SmartSearchFields {
  id?: Array<string | null | undefined>;
  phone?: Array<string | null | undefined>;
  plate?: Array<string | null | undefined>;
  vin?: Array<string | null | undefined>;
  name?: Array<string | null | undefined>;
  extra?: Array<string | null | undefined>;
}

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;

export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhoneDigits(input: string): string {
  return input.replace(/[^\d]/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n]!;
}

function fuzzyTokenMatchesText(token: string, targetRaw: string): boolean {
  const normTarget = normalizeSearchText(targetRaw);
  if (!normTarget) return false;
  if (normTarget.includes(token)) return true;

  // Allow 1-character typo for words >= 4 chars, 2 chars for >= 7 chars
  const maxDist = token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
  if (maxDist === 0) return false;

  const words = normTarget.split(/[\s\-_/.,·]+/).filter(Boolean);
  for (const word of words) {
    if (Math.abs(word.length - token.length) > maxDist) continue;
    if (levenshtein(token, word) <= maxDist) return true;
    // Also check prefix of longer word (e.g. typing 5-char misspelled prefix)
    if (word.length > token.length) {
      const prefix = word.slice(0, token.length);
      if (levenshtein(token, prefix) <= maxDist) return true;
    }
  }
  return false;
}

export function detectSearchIntent(rawQuery: string): SearchIntent {
  const q = rawQuery.trim();
  if (!q) return "general";

  // 1. Explicit ID / Code prefix (e.g., CUS-001, VEH-012, RC-0023, PO-2026-0001, RSV-2026-0001)
  if (/^(CUS|VEH|PO|RC|RSV|VND|INS|DRV|MOV)[-_]?\d*/i.test(q) && /\d/.test(q)) {
    return "id";
  }

  // 2. Phone number (starts with + or 00, or digits/spaces/dashes with >= 6 digits)
  const digitsOnly = normalizePhoneDigits(q);
  if (
    /^[\d+\s()-]+$/.test(q) &&
    (q.startsWith("+") || q.startsWith("00") || digitsOnly.length >= 6)
  ) {
    return "phone";
  }

  // 3. VIN / Chassis (single alphanumeric token, 10-17 chars, contains both letters & digits)
  if (!/\s/.test(q) && /^[A-Za-z0-9]{10,17}$/.test(q) && /[A-Za-z]/.test(q) && /\d/.test(q)) {
    return "vin";
  }

  // 4. License Plate (short pattern mixing digits & letters, or slash/space like "90/4321" or "م ص ر 1001" or "ABC 1234")
  if (
    /^[\u0621-\u064AA-Za-z0-9\s/-]{2,14}$/.test(q) &&
    /\d/.test(q) &&
    (/[\u0621-\u064A]/.test(q) || /\//.test(q) || (/^[A-Za-z]{1,4}\s?\d{1,5}$/.test(q)))
  ) {
    return "plate";
  }

  // 5. Name / Model query (e.g. "toyota 2025", "ahmed", "عبدالله")
  return "name";
}

export function smartMatch(rawQuery: string, fields: SmartSearchFields): boolean {
  const q = rawQuery.trim();
  if (!q) return true;

  const intent = detectSearchIntent(q);

  if (intent === "phone") {
    const phonePool = (fields.phone ?? []).filter(Boolean) as string[];
    if (phonePool.length > 0) {
      const qDigits = normalizePhoneDigits(q);
      return phonePool.some((p) => normalizePhoneDigits(p).includes(qDigits));
    }
  }

  if (intent === "id") {
    const idPool = (fields.id ?? []).filter(Boolean) as string[];
    if (idPool.length > 0) {
      const normQ = normalizeSearchText(q);
      return idPool.some((id) => normalizeSearchText(id).includes(normQ));
    }
  }

  if (intent === "vin") {
    const vinPool = (fields.vin ?? []).filter(Boolean) as string[];
    if (vinPool.length > 0) {
      const normQ = normalizeSearchText(q);
      return vinPool.some((v) => normalizeSearchText(v).includes(normQ));
    }
  }

  if (intent === "plate") {
    const platePool = (fields.plate ?? []).filter(Boolean) as string[];
    if (platePool.length > 0) {
      const normQ = normalizeSearchText(q).replace(/\s+/g, "");
      const matchedPlate = platePool.some((p) =>
        normalizeSearchText(p).replace(/\s+/g, "").includes(normQ),
      );
      if (matchedPlate) return true;
      // Only fall back to general if platePool had no match AND user might be searching an ID
      return false;
    }
  }

  // Name / General: Every token must match (AND logic) with fuzzy typo tolerance
  const tokens = normalizeSearchText(q).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;

  const searchablePool = [
    ...(fields.name ?? []),
    ...(fields.id ?? []),
    ...(fields.plate ?? []),
    ...(fields.vin ?? []),
    ...(fields.phone ?? []),
    ...(fields.extra ?? []),
  ].filter(Boolean) as string[];

  const combinedText = searchablePool.join(" ");

  return tokens.every((token) => fuzzyTokenMatchesText(token, combinedText));
}
