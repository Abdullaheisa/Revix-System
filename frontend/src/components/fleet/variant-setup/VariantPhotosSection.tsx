"use client";

import { Link } from "@/i18n/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { resolveAssetUrl } from "@/store/api/baseApi";
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
        <div className="rounded-xl border border-dashed border-revix-border p-6 text-center text-xs text-revix-secondary">
          {isRtl
            ? "لا توجد صور مرفوعة في مكتبة الصور بعد. يمكنك رفع الصور من مكتبة الصور ثم اختيارها هنا."
            : "No photos in library yet. Upload photos in Photo Library to select them here."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p) => {
            const isSelected = photoUrl === p.photoUrl;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhotoUrl(isSelected ? "" : p.photoUrl)}
                className={`group relative cursor-pointer overflow-hidden rounded-xl border text-start transition-all ${
                  isSelected
                    ? "border-revix-primary ring-2 ring-revix-primary/25"
                    : "border-revix-border hover:border-revix-primary/50"
                }`}
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-revix-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveAssetUrl(p.photoUrl)}
                    alt={p.vehicleName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="truncate bg-white px-2 py-1.5 text-[11px] font-medium text-revix-dark">
                  {p.vehicleName}
                </div>
                {isSelected && (
                  <span className="absolute top-1.5 end-1.5 rounded-full bg-revix-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {isRtl ? "محددة" : "Selected"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
