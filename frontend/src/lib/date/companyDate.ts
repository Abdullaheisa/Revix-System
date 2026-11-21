/**
 * Company-aware Date & Time formatting utilities using IANA timezones.
 * Ensures all dates, timestamps, and "today" defaults respect the company's
 * configured timezone & region (e.g. Africa/Cairo, Asia/Riyadh, Asia/Kuwait, Asia/Dubai).
 */

export function getCompanyTodayIso(timezone?: string | null): string {
  const tz = timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    // en-CA formats as YYYY-MM-DD reliably
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
}

export function formatCompanyDate(
  value: string | Date | null | undefined,
  options?: { timezone?: string | null; locale?: string },
): string {
  if (!value) return "—";
  const tz = options?.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const locale = options?.locale || "en-GB";

  // If it's a pure YYYY-MM-DD date string, parse as noon UTC to avoid any timezone day-shift
  let date: Date;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    date = new Date(`${value.trim()}T12:00:00Z`);
  } else {
    date = value instanceof Date ? value : new Date(value);
  }

  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString(locale);
  }
}

export function formatCompanyDateTime(
  value: string | Date | null | undefined,
  options?: { timezone?: string | null; locale?: string },
): string {
  if (!value) return "—";
  const tz = options?.timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const locale = options?.locale || "en-GB";
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString(locale);
  }
}
