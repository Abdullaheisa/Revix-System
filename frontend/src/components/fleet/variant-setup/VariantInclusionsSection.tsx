"use client";

import { Link } from "@/i18n/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import type { RentalInclusionDto } from "@/store/api/fleetApi";

interface VariantInclusionsSectionProps {
  isRtl: boolean;
  availableInclusions: RentalInclusionDto[];
  inclusions: string[];
  onToggle: (name: string) => void;
}

export function VariantInclusionsSection({
  isRtl,
  availableInclusions,
  inclusions,
  onToggle,
}: VariantInclusionsSectionProps) {
  return (
    <SectionCard
      title={isRtl ? "٣. ما يشمله الإيجار (What's Included)" : "3. What's Included"}
      rightSlot={
        <Link
          href="/workspace/fleet/rental-inclusions"
          className="text-xs font-semibold text-revix-primary hover:underline"
        >
          {isRtl ? "إدارة المزايا" : "Manage Inclusions"}
        </Link>
      }
    >
      {availableInclusions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-revix-border p-5 text-center text-xs text-revix-secondary">
          {isRtl
            ? "لا توجد مزايا مسجلة بعد. أضف مزايا من صفحة (مزايا وتغطيات العقود) لتظهر هنا."
            : "No inclusions defined yet. Add inclusions in Rental Inclusions."}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableInclusions.map((inc) => {
            const active = inclusions.includes(inc.name);
            return (
              <button
                key={inc.id}
                type="button"
                onClick={() => onToggle(inc.name)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-revix-primary bg-revix-primary text-white"
                    : "border-revix-border bg-revix-white text-revix-dark hover:bg-revix-surface"
                }`}
              >
                {active ? "✓ " : "+ "}
                {inc.name}
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
