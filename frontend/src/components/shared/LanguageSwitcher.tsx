"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface LanguageSwitcherProps {
  label?: string;
  className?: string;
}

export function LanguageSwitcher({ label, className = "" }: LanguageSwitcherProps) {
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isArabic = locale === "ar";
  const groupLabel = label ?? (isArabic ? "تبديل اللغة" : "Language switcher");

  useEffect(() => {
    if (!isOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const switchLocale = (nextLocale: "en" | "ar") => {
    setIsOpen(false);
    if (nextLocale === locale) return;

    // Persist locale in NEXT_LOCALE cookie so URL stays unified (no /en or /ar prefix)
    // and browser history never records language switches as separate pages.
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className={`relative inline-block ${className}`.trim()}
    >
      <button
        type="button"
        aria-label={groupLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-[32px] cursor-pointer items-center gap-1.5 rounded-[6px] border border-revix-border bg-revix-white px-2.5 text-[12.5px] font-semibold text-revix-dark transition-colors hover:border-revix-primary/40 hover:bg-revix-tint/40"
      >
        <span>{isArabic ? "AR" : "EN"}</span>
        <RevixIcon
          name="chevron-down"
          size={12}
          className={`text-revix-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={groupLabel}
          className={`absolute z-50 mt-1.5 w-36 overflow-hidden rounded-[8px] border border-revix-border bg-revix-white py-1 shadow-lg ${
            isArabic ? "left-0" : "right-0"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            lang="en"
            onClick={() => switchLocale("en")}
            className={`flex w-full cursor-pointer items-center px-3 py-2 text-[12.5px] transition-colors ${
              !isArabic
                ? "bg-revix-tint/60 font-semibold text-revix-primary"
                : "text-revix-dark hover:bg-revix-surface"
            }`}
          >
            <span>English</span>
          </button>
          <button
            type="button"
            role="menuitem"
            lang="ar"
            onClick={() => switchLocale("ar")}
            className={`flex w-full cursor-pointer items-center px-3 py-2 text-[12.5px] transition-colors ${
              isArabic
                ? "bg-revix-tint/60 font-semibold text-revix-primary"
                : "text-revix-dark hover:bg-revix-surface"
            }`}
          >
            <span>العربية</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
