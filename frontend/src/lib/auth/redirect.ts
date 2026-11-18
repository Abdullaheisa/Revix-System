export type RedirectLocale = "en" | "ar";

function isSupportedLocale(value: string | undefined): value is RedirectLocale {
  return value === "en" || value === "ar";
}

/**
 * Strictly validates an internal locale-aware post-login redirect target.
 * Rejects protocol-relative URLs (`//`), external schemes (`https:`),
 * backslashes, control characters, and login self-redirects to prevent open
 * redirects and redirect loops.
 */
export function sanitizeReturnUrl(
  rawNext: string | null | undefined,
  locale: RedirectLocale,
): string {
  const fallback = `/${locale}/workspace`;

  if (typeof rawNext !== "string") {
    return fallback;
  }

  const candidate = rawNext.trim();
  if (
    candidate.length === 0 ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes(":") ||
    /[\u0000-\u001F\u007F]/.test(candidate)
  ) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate, "https://revix.internal");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "https://revix.internal") {
    return fallback;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  let normalizedPath = parsed.pathname;

  if (segments.length > 0 && isSupportedLocale(segments[0])) {
    const rest = segments.slice(1).join("/");
    normalizedPath = rest ? `/${locale}/${rest}` : `/${locale}`;
  } else {
    normalizedPath =
      parsed.pathname === "/" ? `/${locale}` : `/${locale}${parsed.pathname}`;
  }

  if (
    normalizedPath === `/${locale}/login` ||
    normalizedPath === `/${locale}/signup` ||
    normalizedPath === `/${locale}/register` ||
    normalizedPath === `/${locale}/verify-email` ||
    normalizedPath === `/${locale}/forgot-password` ||
    normalizedPath === `/${locale}/auth/action` ||
    normalizedPath.startsWith(`/${locale}/api/`)
  ) {
    return fallback;
  }

  return `${normalizedPath}${parsed.search}`;
}
