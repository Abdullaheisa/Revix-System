"use client";

export interface OperatingModeSelectorProps {
  isRtl: boolean;
  value: "independent" | "network_main";
  onChange: (nextMode: "independent" | "network_main") => void;
  heading?: string;
}

export function OperatingModeSelector({
  isRtl,
  value,
  onChange,
  heading,
}: OperatingModeSelectorProps) {
  return (
    <div className="space-y-2 border-t border-revix-border pt-4">
      <p className="text-[13.5px] font-semibold text-revix-dark">
        {heading ??
          (isRtl ? "نموذج تشغيل الشركة" : "Company operating structure")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("independent")}
          className={`cursor-pointer rounded-[8px] border p-3.5 text-start transition-colors ${
            value === "independent"
              ? "border-revix-primary bg-revix-tint/65"
              : "border-revix-border bg-revix-white hover:bg-revix-surface"
          }`}
        >
          <p className="text-[13.5px] font-bold text-revix-dark">
            {isRtl ? "شركة مستقلة (فروعها فقط)" : "Independent company"}
          </p>
          <p className="mt-1 text-[12px] text-revix-secondary">
            {isRtl
              ? "تدير فروعها وأسطولها وموظفيها فقط بدون شركات محلية تابعة."
              : "Manages its own branches, fleet, staff, and finances only."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChange("network_main")}
          className={`cursor-pointer rounded-[8px] border p-3.5 text-start transition-colors ${
            value === "network_main"
              ? "border-revix-primary bg-revix-tint/65"
              : "border-revix-border bg-revix-white hover:bg-revix-surface"
          }`}
        >
          <p className="text-[13.5px] font-bold text-revix-dark">
            {isRtl
              ? "شركة رئيسية تضم شركات محلية"
              : "Main company with local partner network"}
          </p>
          <p className="mt-1 text-[12px] text-revix-secondary">
            {isRtl
              ? "تدير فروعها وتربط معها شركات تأجير محلية مستقلة لعرض سياراتها."
              : "Coordinates connected local rental companies alongside its own branches."}
          </p>
        </button>
      </div>
    </div>
  );
}
