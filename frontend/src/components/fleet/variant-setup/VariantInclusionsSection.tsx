"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { RevixSelect } from "@/components/ui/RevixSelect";
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
  const unselectedOptions = useMemo(
    () =>
      availableInclusions
        .filter((inc) => !inclusions.includes(inc.name))
        .map((inc) => ({
          value: inc.name,
          label: inc.name,
        })),
    [availableInclusions, inclusions],
  );

  return (
    <SectionCard
      title={isRtl ? "٣. What's Included" : "3. What's Included"}
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
            ? "لا توجد مزايا مسجلة بعد. أضف مزايا من صفحة What's Included لتظهر هنا."
            : "No inclusions defined yet. Add inclusions in What's Included."}
        </div>
      ) : (
        <div className="space-y-3">
          <RevixSelect
            size="sm"
            searchable
            isRtl={isRtl}
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onToggle(e.target.value);
              }
            }}
            placeholder={
              unselectedOptions.length === 0
                ? isRtl
                  ? "تم اختيار جميع المزايا المتاحة"
                  : "All available inclusions selected"
                : isRtl
                  ? "اختر ميزة لإضافتها..."
                  : "Select an inclusion to add..."
            }
            disabled={unselectedOptions.length === 0}
            buttonClassName="h-9 rounded-lg text-xs"
            options={unselectedOptions}
          />

          {inclusions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {inclusions.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-revix-primary/30 bg-emerald-50 px-3 py-1 text-xs font-semibold text-revix-primary"
                >
                  <span>{name}</span>
                  <button
                    type="button"
                    onClick={() => onToggle(name)}
                    aria-label={isRtl ? `إزالة ${name}` : `Remove ${name}`}
                    className="cursor-pointer rounded-full px-1 text-revix-primary/70 hover:bg-revix-primary/15 hover:text-revix-primary"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
