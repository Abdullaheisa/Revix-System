"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export interface LanguageSwitcherProps {
  label?: string;
  className?: string;
}

export function LanguageSwitcher({
  label,
  className = "",
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const isEnglish = locale === "en";
  const isArabic = locale === "ar";
  const groupLabel = label ?? (isArabic ? "تبديل اللغة" : "Language switcher");

  const switchLocale = (nextLocale: "en" | "ar") => {
    if (nextLocale === locale) return;

    // Persist locale in NEXT_LOCALE cookie so URL stays unified (no /en or /ar prefix)
    // and browser history never records language switches as separate pages.
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
    router.refresh();
  };

  return (
    <div
      dir="ltr"
      role="group"
      aria-label={groupLabel}
      className={`inline-flex min-h-[44px] items-center gap-1 ${className}`.trim()}
    >
      <button
        type="button"
        lang="en"
        onClick={() => switchLocale("en")}
        aria-current={isEnglish ? "true" : undefined}
        className={`inline-flex h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-control px-2.5 text-[14px] leading-[1.4] text-revix-primary transition-colors duration-[var(--duration-fast)] ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary ${
          isEnglish
            ? "bg-revix-tint font-bold"
            : "bg-revix-white font-normal hover:bg-revix-tint"
        }`}
      >
        EN
      </button>
      <span
        aria-hidden="true"
        className="text-[14px] leading-[1.4] text-revix-secondary select-none"
      >
        /
      </span>
      <button
        type="button"
        lang="ar"
        onClick={() => switchLocale("ar")}
        aria-current={isArabic ? "true" : undefined}
        className={`inline-flex h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-control px-2.5 text-[14px] leading-[1.4] text-revix-primary transition-colors duration-[var(--duration-fast)] ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary ${
          isArabic
            ? "bg-revix-tint font-bold"
            : "bg-revix-white font-normal hover:bg-revix-tint"
        }`}
      >
        AR
      </button>
    </div>
  );
}
