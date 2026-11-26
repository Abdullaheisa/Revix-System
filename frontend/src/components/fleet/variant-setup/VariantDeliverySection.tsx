"use client";

import { SectionCard } from "@/components/ui/SectionCard";
import { RevixSelect } from "@/components/ui/RevixSelect";
import { MASTER_INPUT_CLASS, MASTER_LABEL_CLASS } from "@/components/shared/workspace";

interface VariantDeliverySectionProps {
  isRtl: boolean;
  locationType: string;
  setLocationType: (v: string) => void;
  fuelPolicy: string;
  setFuelPolicy: (v: string) => void;
  mileagePolicy: "unlimited" | "limited";
  setMileagePolicy: (v: "unlimited" | "limited") => void;
  dailyKmLimit: number;
  setDailyKmLimit: (v: number) => void;
  extraKmRate: number;
  setExtraKmRate: (v: number) => void;
  deliveryPolicy: string;
  setDeliveryPolicy: (v: string) => void;
  instantConfirmation: boolean;
  setInstantConfirmation: (v: boolean) => void;
}

export function VariantDeliverySection({
  isRtl,
  locationType,
  setLocationType,
  fuelPolicy,
  setFuelPolicy,
  mileagePolicy,
  setMileagePolicy,
  dailyKmLimit,
  setDailyKmLimit,
  extraKmRate,
  setExtraKmRate,
  deliveryPolicy,
  setDeliveryPolicy,
  instantConfirmation,
  setInstantConfirmation,
}: VariantDeliverySectionProps) {
  return (
    <SectionCard title={isRtl ? "٤. التسليم والسياسات (Delivery & Policies)" : "4. Delivery & Policies"}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
        <div>
          <label className={MASTER_LABEL_CLASS}>
            {isRtl ? "مكان / طريقة التسليم" : "Pickup / Delivery"}
          </label>
          <RevixSelect
            size="sm"
            isRtl={isRtl}
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            buttonClassName="h-10 rounded-lg text-xs"
            options={[
              { value: "branch_pickup", label: isRtl ? "استلام من الفرع" : "Branch Pickup" },
              { value: "airport_terminal", label: isRtl ? "استلام من المطار" : "Airport Terminal" },
              { value: "meet_and_greet", label: isRtl ? "استقبال وتسليم" : "Meet & Greet" },
              { value: "delivery", label: isRtl ? "توصيل لموقع العميل" : "Customer Delivery" },
            ]}
          />
        </div>
        <div>
          <label className={MASTER_LABEL_CLASS}>{isRtl ? "سياسة الوقود" : "Fuel Policy"}</label>
          <RevixSelect
            size="sm"
            isRtl={isRtl}
            value={fuelPolicy}
            onChange={(e) => setFuelPolicy(e.target.value)}
            buttonClassName="h-10 rounded-lg text-xs"
            options={[
              { value: "full_to_full", label: isRtl ? "ممتلئ لممتلئ (Full to Full)" : "Full to Full" },
              { value: "same_to_same", label: isRtl ? "بنفس مستوى الاستلام" : "Same to Same" },
              { value: "prepaid", label: isRtl ? "مدفوع مسبقاً" : "Prepaid" },
            ]}
          />
        </div>
        <div>
          <label className={MASTER_LABEL_CLASS}>
            {isRtl ? "سياسة الكيلومترات" : "Mileage Policy"}
          </label>
          <RevixSelect
            size="sm"
            isRtl={isRtl}
            value={mileagePolicy}
            onChange={(e) => setMileagePolicy(e.target.value as "unlimited" | "limited")}
            buttonClassName="h-10 rounded-lg text-xs"
            options={[
              { value: "unlimited", label: isRtl ? "كيلومترات مفتوحة" : "Unlimited" },
              { value: "limited", label: isRtl ? "حد يومي محدد" : "Daily Limit" },
            ]}
          />
        </div>
      </div>

      {mileagePolicy === "limited" && (
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
          <div>
            <label className={MASTER_LABEL_CLASS}>
              {isRtl ? "الحد اليومي (كم)" : "Daily KM Limit"}
            </label>
            <input
              type="number"
              min={0}
              value={dailyKmLimit === 0 ? "" : dailyKmLimit}
              placeholder="250"
              onChange={(e) => setDailyKmLimit(Number(e.target.value) || 0)}
              className={`${MASTER_INPUT_CLASS} font-mono`}
            />
          </div>
          <div>
            <label className={MASTER_LABEL_CLASS}>
              {isRtl ? "سعر الكيلومتر الإضافي" : "Extra KM Rate"}
            </label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={extraKmRate === 0 ? "" : extraKmRate}
              placeholder="0"
              onChange={(e) => setExtraKmRate(Number(e.target.value) || 0)}
              className={`${MASTER_INPUT_CLASS} font-mono`}
            />
          </div>
        </div>
      )}

      <div className="mt-4 text-xs">
        <label className={MASTER_LABEL_CLASS}>
          {isRtl ? "تفاصيل سياسة التسليم والاستلام" : "Delivery Policy Details"}
        </label>
        <textarea
          rows={2}
          value={deliveryPolicy}
          onChange={(e) => setDeliveryPolicy(e.target.value)}
          placeholder={
            isRtl
              ? "مثال: يتم تسليم السيارة من الفرع أو التوصيل داخل المدينة خلال ساعتين..."
              : "e.g. Free pickup from branch or city delivery within 2 hours..."
          }
          className="w-full rounded-lg border border-revix-border p-3 text-xs focus:border-revix-primary focus:outline-hidden"
        />
      </div>

      <div className="mt-3 text-xs">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={instantConfirmation}
            onChange={(e) => setInstantConfirmation(e.target.checked)}
            className="h-4 w-4 accent-revix-primary"
          />
          <span className="font-semibold text-revix-dark">
            {isRtl ? "تأكيد فوري للحجوزات (Instant Confirmation)" : "Instant Booking Confirmation"}
          </span>
        </label>
      </div>
    </SectionCard>
  );
}
