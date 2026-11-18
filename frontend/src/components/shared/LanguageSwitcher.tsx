"use client";

import { useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

export interface LanguageSwitcherProps {
  label?: string;
  className?: string;
}

export function LanguageSwitcher({
  label,
  className = "",
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isEnglish = locale === "en";
  const isArabic = locale === "ar";
  const groupLabel = label ?? (isArabic ? "تبديل اللغة" : "Language switcher");

  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const switchLocale = (nextLocale: "en" | "ar") => {
    if (nextLocale === locale) return;
    const suffix = `${window.location.search}${window.location.hash}`;
    router.replace(`${normalizedPath}${suffix}`, {
      locale: nextLocale,
      scroll: false,
    });
  };

  return (
    <div
      dir="ltr"
      role="group"
      aria-label={groupLabel}
      className={`inline-flex min-h-[44px] items-center gap-1 ${className}`.trim()}
    >
      <Link
        href={normalizedPath}
        locale="en"
        lang="en"
        hrefLang="en"
        prefetch={false}
        onClick={(event) => {
          event.preventDefault();
          switchLocale("en");
        }}
        aria-current={isEnglish ? "true" : undefined}
        className={`inline-flex h-[44px] min-w-[44px] items-center justify-center rounded-control px-2.5 text-[14px] leading-[1.4] text-revix-primary transition-colors duration-[var(--duration-fast)] ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary ${
          isEnglish
            ? "bg-revix-tint font-bold"
            : "bg-revix-white font-normal hover:bg-revix-tint"
        }`}
      >
        EN
      </Link>
      <span
        aria-hidden="true"
        className="text-[14px] leading-[1.4] text-revix-secondary select-none"
      >
        /
      </span>
      <Link
        href={normalizedPath}
        locale="ar"
        lang="ar"
        hrefLang="ar"
        prefetch={false}
        onClick={(event) => {
          event.preventDefault();
          switchLocale("ar");
        }}
        aria-current={isArabic ? "true" : undefined}
        className={`inline-flex h-[44px] min-w-[44px] items-center justify-center rounded-control px-2.5 text-[14px] leading-[1.4] text-revix-primary transition-colors duration-[var(--duration-fast)] ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary ${
          isArabic
            ? "bg-revix-tint font-bold"
            : "bg-revix-white font-normal hover:bg-revix-tint"
        }`}
      >
        AR
      </Link>
    </div>
  );
}
