"use client";

import { SectionCard } from "@/components/ui/SectionCard";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { MASTER_INPUT_CLASS, MASTER_LABEL_CLASS } from "@/components/shared/workspace";

interface VariantSpecsSectionProps {
  isRtl: boolean;
  seats: number;
  setSeats: (v: number) => void;
  doors: number;
  setDoors: (v: number) => void;
  transmission: string;
  setTransmission: (v: string) => void;
  fuelType: string;
  setFuelType: (v: string) => void;
  luggageCapacity: string;
  setLuggageCapacity: (v: string) => void;
  airConditioning: boolean;
  setAirConditioning: (v: boolean) => void;
  description: string;
  setDescription: (v: string) => void;
}

export function VariantSpecsSection({
  isRtl,
  seats,
  setSeats,
  doors,
  setDoors,
  transmission,
  setTransmission,
  fuelType,
  setFuelType,
  luggageCapacity,
  setLuggageCapacity,
  airConditioning,
  setAirConditioning,
  description,
  setDescription,
}: VariantSpecsSectionProps) {
  return (
    <SectionCard title={isRtl ? "١. المواصفات الأساسية (Specifications)" : "1. Core Specifications"}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-xs">
        <div>
          <label className={MASTER_LABEL_CLASS}>{isRtl ? "عدد المقاعد" : "Seats"}</label>
          <input
            type="number"
            min={1}
            max={60}
            value={seats === 0 ? "" : seats}
            placeholder="5"
            onChange={(e) => setSeats(Number(e.target.value) || 0)}
            className={`${MASTER_INPUT_CLASS} font-mono`}
          />
        </div>
        <div>
          <label className={MASTER_LABEL_CLASS}>{isRtl ? "عدد الأبواب" : "Doors"}</label>
          <input
            type="number"
            min={2}
            max={6}
            value={doors === 0 ? "" : doors}
            placeholder="4"
            onChange={(e) => setDoors(Number(e.target.value) || 0)}
            className={`${MASTER_INPUT_CLASS} font-mono`}
          />
        </div>
        <div>
          <label className={MASTER_LABEL_CLASS}>{isRtl ? "ناقل الحركة" : "Transmission"}</label>
          <RevixSelect
            size="sm"
            isRtl={isRtl}
            value={transmission}
            onChange={(e) => setTransmission(e.target.value)}
            buttonClassName="h-10 rounded-lg text-xs"
            options={[
              { value: "automatic", label: isRtl ? "أوتوماتيك" : "Automatic" },
              { value: "manual", label: isRtl ? "مانيوال" : "Manual" },
            ]}
          />
        </div>
        <div>
          <label className={MASTER_LABEL_CLASS}>{isRtl ? "نوع الوقود" : "Fuel Type"}</label>
          <RevixSelect
            size="sm"
            isRtl={isRtl}
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value)}
            buttonClassName="h-10 rounded-lg text-xs"
            options={[
              { value: "petrol", label: isRtl ? "بنزين" : "Petrol" },
              { value: "diesel", label: isRtl ? "ديزل" : "Diesel" },
              { value: "hybrid", label: isRtl ? "هايبرد" : "Hybrid" },
              { value: "electric", label: isRtl ? "كهرباء" : "Electric" },
            ]}
          />
        </div>
        <div>
          <label className={MASTER_LABEL_CLASS}>{isRtl ? "سعة الشنطة" : "Luggage"}</label>
          <input
            type="text"
            value={luggageCapacity}
            onChange={(e) => setLuggageCapacity(e.target.value)}
            placeholder={isRtl ? "مثال: 2 شنطة كبيرة" : "e.g. 2 Bags"}
            className={MASTER_INPUT_CLASS}
          />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-revix-border bg-revix-surface/50 px-3">
            <input
              type="checkbox"
              checked={airConditioning}
              onChange={(e) => setAirConditioning(e.target.checked)}
              className="h-4 w-4 accent-revix-primary"
            />
            <span className="font-semibold text-revix-dark">
              {isRtl ? "تكييف هواء (A/C)" : "Air Conditioning"}
            </span>
          </label>
        </div>
      </div>

      <div className="mt-4 text-xs">
        <label className={MASTER_LABEL_CLASS}>
          {isRtl ? "وصف الفئة للعملاء" : "Variant Description"}
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            isRtl
              ? "نبذة مختصرة عن السيارة وتجهيزاتها..."
              : "Brief overview of this vehicle model and features..."
          }
          className="w-full rounded-lg border border-revix-border p-3 text-xs focus:border-revix-primary focus:outline-hidden"
        />
      </div>
    </SectionCard>
  );
}
