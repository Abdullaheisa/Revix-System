"use client";

import { useMemo } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { detectSearchIntent, type SearchIntent } from "@/lib/search/smartSearch";

export interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isRtl?: boolean;
  placeholder?: string;
  className?: string;
  showIntentBadge?: boolean;
}

const INTENT_LABELS: Record<SearchIntent, { ar: string; en: string } | null> = {
  phone: { ar: "هاتف", en: "Phone" },
  id: { ar: "كود", en: "ID" },
  vin: { ar: "شاسيه", en: "VIN" },
  plate: { ar: "لوحة", en: "Plate" },
  name: null,
  general: null,
};

export function SmartSearchInput({
  value,
  onChange,
  isRtl = false,
  placeholder,
  className = "w-64",
  showIntentBadge = true,
}: SmartSearchInputProps) {
  const intent = useMemo(() => detectSearchIntent(value), [value]);
  const intentBadge = showIntentBadge && value.trim() ? INTENT_LABELS[intent] : null;

  return (
    <div className={`relative ${className}`} dir={isRtl ? "rtl" : "ltr"}>
      <RevixIcon
        name="search"
        size={14}
        className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-revix-muted"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          placeholder || (isRtl ? "بحث ذكي..." : "Smart search...")
        }
        className={`h-9 w-full rounded-lg border border-revix-border bg-revix-white text-xs text-revix-dark placeholder:text-revix-muted focus:border-revix-primary focus:outline-hidden ps-9 ${
          value ? (intentBadge ? "pe-20" : "pe-8") : "pe-3"
        }`}
      />
      <div className="absolute top-1/2 end-2 flex -translate-y-1/2 items-center gap-1">
        {intentBadge && (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-revix-primary">
            {isRtl ? intentBadge.ar : intentBadge.en}
          </span>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={isRtl ? "مسح البحث" : "Clear search"}
            className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-revix-muted hover:bg-revix-surface hover:text-revix-dark"
          >
            <RevixIcon name="x" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
