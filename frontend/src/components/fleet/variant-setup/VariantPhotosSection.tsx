"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { RevixSelect } from "@/components/ui/RevixSelect";
import type { VehiclePhotoDto } from "@/store/api/fleetApi";

interface VariantPhotosSectionProps {
  isRtl: boolean;
  photos: VehiclePhotoDto[];
  photoUrl: string;
  setPhotoUrl: (url: string) => void;
}

export function VariantPhotosSection({
  isRtl,
  photos,
  photoUrl,
  setPhotoUrl,
}: VariantPhotosSectionProps) {
  const options = useMemo(
    () =>
      photos.map((p) => ({
        value: p.photoUrl,
        label: p.vehicleName,
      })),
    [photos],
  );

  return (
    <SectionCard
      title={isRtl ? "٢. صور الفريانت" : "2. Variant Photos"}
      rightSlot={
        <Link
          href="/workspace/fleet/vehicle-photos"
          className="text-xs font-semibold text-revix-primary hover:underline"
        >
          {isRtl ? "إدارة مكتبة الصور" : "Manage Photo Library"}
        </Link>
      }
    >
      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-revix-border p-5 text-center text-xs text-revix-secondary">
          {isRtl
            ? "لا توجد صور مرفوعة في مكتبة الصور بعد. يمكنك رفع الصور من مكتبة الصور ثم اختيارها هنا."
            : "No photos in library yet. Upload photos in Photo Library to select them here."}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <RevixSelect
              size="sm"
              searchable
              isRtl={isRtl}
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder={isRtl ? "اختر صورة من المكتبة..." : "Select photo from library..."}
              buttonClassName="h-9 rounded-lg text-xs"
              options={options}
            />
          </div>
          {photoUrl ? (
            <button
              type="button"
              onClick={() => setPhotoUrl("")}
              className="h-9 shrink-0 cursor-pointer rounded-lg border border-revix-border px-3 text-xs font-semibold text-revix-secondary hover:bg-revix-surface hover:text-rose-600 transition-colors"
            >
              {isRtl ? "مسح" : "Clear"}
            </button>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
