"use client";

import { useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface CompanyBrandLogoProps {
  company: {
    name: string;
    logoUrl?: string | null;
    brandColor?: string;
  };
  heightClassName?: string;
  maxWidthClassName?: string;
  className?: string;
  isRtl?: boolean;
}

export function CompanyBrandLogo({ company, heightClassName = "h-[26px] sm:h-[28px]", maxWidthClassName = "max-w-[140px] sm:max-w-[180px]", className = "" }: CompanyBrandLogoProps) {
  const [imgError, setImgError] = useState(false);

  const hasValidLogo = Boolean(company.logoUrl && !imgError);

  if (hasValidLogo) {
    return (
      <div className={`inline-flex items-center shrink-0 ${heightClassName} ${className}`.trim()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={company.logoUrl!}
          alt={company.name}
          onError={() => setImgError(true)}
          className={`h-full w-auto ${maxWidthClassName} object-contain object-start rtl:object-right select-none transition-opacity`}
        />
      </div>
    );
  }

  // Fallback: Horizontal Brand Lockup (Icon Badge + Crisp Company Typography)
  return (
    <div
      className={`inline-flex min-w-0 items-center gap-2 select-none ${heightClassName} ${className}`.trim()}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-white shadow-2xs font-bold text-[12px]"
        style={{ backgroundColor: company.brandColor || "#14532D" }}
      >
        <RevixIcon name="car-front" size={15} />
      </span>
      <span className={`truncate text-[13.5px] sm:text-[14px] font-bold tracking-tight text-revix-dark ${maxWidthClassName}`}>
        {company.name}
      </span>
    </div>
  );
}
