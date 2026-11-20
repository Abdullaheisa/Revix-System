import { useState, useEffect } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import {
  type PaymentTermsType,
  PAYMENT_TERMS_INFO,
  NET_TERMS_PRESETS,
  INSTALLMENT_MONTHS_PRESETS,
  DOWN_PAYMENT_PERCENT_PRESETS,
  MILESTONE_PRESETS,
} from "@/lib/fleet/paymentTerms";

export interface PaymentTermsChangePayload {
  type: PaymentTermsType;
  days: number;
  config?: string | null;
  upfrontPaid?: number;
  installmentsCount?: number;
  scheduleSummary?: string;
}

interface PaymentTermsSelectorProps {
  valueType: PaymentTermsType;
  valueDays: number;
  valueConfig?: string | null;
  onChange: (payload: PaymentTermsChangePayload) => void;
  totalAmount?: number;
  currency?: string;
  upfrontPaid?: number;
  installmentsCount?: number;
  isRtl?: boolean;
  compact?: boolean;
}

export function PaymentTermsSelector({
  valueType,
  valueDays,
  valueConfig,
  onChange,
  totalAmount,
  currency = "JOD",
  upfrontPaid = 0,
  installmentsCount = 1,
  isRtl = true,
  compact = false,
}: PaymentTermsSelectorProps) {
  // Local states for sub-controls
  const [selectedType, setSelectedType] = useState<PaymentTermsType>(valueType || "net_terms");
  const [days, setDays] = useState<number>(valueDays ?? 30);
  const [selectedPresetDays, setSelectedPresetDays] = useState<number | "custom">(
    NET_TERMS_PRESETS.includes(valueDays as any) ? valueDays : "custom",
  );
  const [monthsCount, setMonthsCount] = useState<number>(
    installmentsCount > 1
      ? installmentsCount
      : Math.max(1, Math.round((valueDays || 360) / 30)),
  );
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(() => {
    if (totalAmount && totalAmount > 0 && upfrontPaid > 0) {
      const pct = Math.round((upfrontPaid / totalAmount) * 100);
      return DOWN_PAYMENT_PERCENT_PRESETS.includes(pct as any) ? pct : -1;
    }
    return 10;
  });
  const [customDownPayment, setCustomDownPayment] = useState<number>(upfrontPaid);
  const [selectedMilestoneKey, setSelectedMilestoneKey] = useState<string>(
    valueConfig || "50_50",
  );

  // Sync when prop value changes
  useEffect(() => {
    if (valueType && valueType !== selectedType) {
      setSelectedType(valueType);
    }
  }, [valueType]);

  const handleSelectType = (type: PaymentTermsType) => {
    setSelectedType(type);

    if (type === "cash") {
      onChange({
        type: "cash",
        days: 0,
        config: "cash",
        upfrontPaid: totalAmount || 0,
        installmentsCount: 1,
        scheduleSummary: isRtl
          ? "سداد كامل فوري (100%) عند التوريد والفحص"
          : "100% Immediate cash payment upon delivery",
      });
      return;
    }

    if (type === "net_terms") {
      const defaultDays = typeof selectedPresetDays === "number" ? selectedPresetDays : 30;
      setDays(defaultDays);
      onChange({
        type: "net_terms",
        days: defaultDays,
        config: `Net ${defaultDays}`,
        upfrontPaid: 0,
        installmentsCount: 1,
        scheduleSummary: isRtl
          ? `آجل تجاري: سداد كامل بعد ${defaultDays} يوماً من التوريد`
          : `Credit Terms: Net ${defaultDays} days from delivery`,
      });
      return;
    }

    if (type === "installments") {
      const effMonths = monthsCount || 12;
      const calculatedUpfront =
        totalAmount && totalAmount > 0
          ? downPaymentPercent >= 0
            ? Math.round((totalAmount * downPaymentPercent) / 100)
            : customDownPayment
          : 0;

      onChange({
        type: "installments",
        days: effMonths * 30,
        config: `${effMonths}m`,
        upfrontPaid: calculatedUpfront,
        installmentsCount: effMonths,
        scheduleSummary: isRtl
          ? `تقسيط مجدول: ${effMonths} شهراً (دفعة أولى: ${calculatedUpfront.toLocaleString()} ${currency})`
          : `Installment Plan: ${effMonths} months (Down payment: ${calculatedUpfront.toLocaleString()} ${currency})`,
      });
      return;
    }

    if (type === "milestones") {
      const preset = MILESTONE_PRESETS.find((m) => m.key === selectedMilestoneKey) || MILESTONE_PRESETS[0];
      const advanceStage = preset.stages[0];
      const advanceAmount =
        totalAmount && totalAmount > 0
          ? Math.round((totalAmount * advanceStage.percent) / 100)
          : 0;

      onChange({
        type: "milestones",
        days: 60,
        config: preset.key,
        upfrontPaid: advanceAmount,
        installmentsCount: preset.stages.length,
        scheduleSummary: isRtl
          ? `دفعات مرحلية (${preset.labelAr}): دفعة أولى ${advanceAmount.toLocaleString()} ${currency} (${advanceStage.percent}%)`
          : `Milestones (${preset.labelEn}): Initial deposit ${advanceAmount.toLocaleString()} ${currency} (${advanceStage.percent}%)`,
      });
    }
  };

  const handleNetDaysPreset = (preset: number) => {
    setSelectedPresetDays(preset);
    setDays(preset);
    onChange({
      type: "net_terms",
      days: preset,
      config: `Net ${preset}`,
      upfrontPaid: 0,
      installmentsCount: 1,
      scheduleSummary: isRtl
        ? `آجل تجاري: سداد كامل بعد ${preset} يوماً من التوريد`
        : `Credit Terms: Net ${preset} days from delivery`,
    });
  };

  const handleCustomDaysChange = (customVal: number) => {
    const valid = Math.max(0, Math.min(customVal, 1080));
    setDays(valid);
    setSelectedPresetDays("custom");
    onChange({
      type: "net_terms",
      days: valid,
      config: `Net ${valid}`,
      upfrontPaid: 0,
      installmentsCount: 1,
      scheduleSummary: isRtl
        ? `آجل تجاري: سداد كامل بعد ${valid} يوماً من التوريد`
        : `Credit Terms: Net ${valid} days from delivery`,
    });
  };

  const handleInstallmentMonthsChange = (months: number) => {
    setMonthsCount(months);
    const effUpfront =
      totalAmount && totalAmount > 0
        ? downPaymentPercent >= 0
          ? Math.round((totalAmount * downPaymentPercent) / 100)
          : customDownPayment
        : 0;

    onChange({
      type: "installments",
      days: months * 30,
      config: `${months}m`,
      upfrontPaid: effUpfront,
      installmentsCount: months,
      scheduleSummary: isRtl
        ? `تقسيط مجدول: ${months} شهراً (دفعة أولى: ${effUpfront.toLocaleString()} ${currency})`
        : `Installment Plan: ${months} months (Down payment: ${effUpfront.toLocaleString()} ${currency})`,
    });
  };

  const handleDownPaymentPercentChange = (pct: number) => {
    setDownPaymentPercent(pct);
    const newUpfront = totalAmount && totalAmount > 0 ? Math.round((totalAmount * pct) / 100) : 0;
    setCustomDownPayment(newUpfront);

    onChange({
      type: "installments",
      days: monthsCount * 30,
      config: `${monthsCount}m`,
      upfrontPaid: newUpfront,
      installmentsCount: monthsCount,
      scheduleSummary: isRtl
        ? `تقسيط مجدول: ${monthsCount} شهراً (دفعة أولى: ${newUpfront.toLocaleString()} ${currency} بنسبة ${pct}%)`
        : `Installment Plan: ${monthsCount} months (Down payment: ${newUpfront.toLocaleString()} ${currency} at ${pct}%)`,
    });
  };

  const handleCustomDownPaymentChange = (amt: number) => {
    const valid = Math.max(0, Math.min(amt, totalAmount || 9999999));
    setCustomDownPayment(valid);
    setDownPaymentPercent(-1);

    onChange({
      type: "installments",
      days: monthsCount * 30,
      config: `${monthsCount}m`,
      upfrontPaid: valid,
      installmentsCount: monthsCount,
      scheduleSummary: isRtl
        ? `تقسيط مجدول: ${monthsCount} شهراً (دفعة أولى: ${valid.toLocaleString()} ${currency})`
        : `Installment Plan: ${monthsCount} months (Down payment: ${valid.toLocaleString()} ${currency})`,
    });
  };

  const handleMilestonePresetChange = (presetKey: string) => {
    setSelectedMilestoneKey(presetKey);
    const preset = MILESTONE_PRESETS.find((m) => m.key === presetKey) || MILESTONE_PRESETS[0];
    const advanceStage = preset.stages[0];
    const advanceAmount =
      totalAmount && totalAmount > 0
        ? Math.round((totalAmount * advanceStage.percent) / 100)
        : 0;

    onChange({
      type: "milestones",
      days: 60,
      config: preset.key,
      upfrontPaid: advanceAmount,
      installmentsCount: preset.stages.length,
      scheduleSummary: isRtl
        ? `دفعات مرحلية (${preset.labelAr}): دفعة أولى ${advanceAmount.toLocaleString()} ${currency} (${advanceStage.percent}%)`
        : `Milestones (${preset.labelEn}): Initial deposit ${advanceAmount.toLocaleString()} ${currency} (${advanceStage.percent}%)`,
    });
  };

  const activeMilestone =
    MILESTONE_PRESETS.find((m) => m.key === selectedMilestoneKey) || MILESTONE_PRESETS[0];

  // Financial calculations when totalAmount is provided
  const hasTotal = typeof totalAmount === "number" && totalAmount > 0;
  const currentUpfront =
    selectedType === "cash"
      ? totalAmount || 0
      : selectedType === "installments"
        ? downPaymentPercent >= 0 && hasTotal
          ? Math.round((totalAmount * downPaymentPercent) / 100)
          : customDownPayment
        : selectedType === "milestones" && hasTotal
          ? Math.round((totalAmount * activeMilestone.stages[0].percent) / 100)
          : 0;

  const currentRemaining = hasTotal ? Math.max(0, totalAmount - currentUpfront) : 0;
  const monthlyInstallment =
    selectedType === "installments" && monthsCount > 0
      ? Math.round(currentRemaining / monthsCount)
      : 0;

  return (
    <div className="space-y-3.5">
      {/* 1. Standard Payment Term Mode Selector (4 Global ERP Types) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["cash", "net_terms", "installments", "milestones"] as PaymentTermsType[]).map((t) => {
          const item = PAYMENT_TERMS_INFO[t];
          const isSelected = selectedType === t;

          return (
            <button
              key={t}
              type="button"
              onClick={() => handleSelectType(t)}
              className={`flex flex-col items-start rounded-xl border p-2.5 text-start transition-all relative ${
                isSelected
                  ? "border-revix-primary bg-revix-accent-soft/30 shadow-xs ring-1 ring-revix-primary/40"
                  : "border-revix-border/70 bg-revix-white hover:border-revix-primary/50 hover:bg-revix-surface/50"
              }`}
            >
              {isSelected && (
                <span className="absolute top-2 end-2 flex h-2 w-2 rounded-full bg-revix-primary" />
              )}
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    isSelected ? "bg-revix-primary text-white" : "bg-revix-surface text-revix-secondary"
                  }`}
                >
                  <RevixIcon name={item.icon} className="h-4 w-4" />
                </div>
                <span
                  className={`text-xs font-bold leading-tight ${
                    isSelected ? "text-revix-dark" : "text-revix-secondary"
                  }`}
                >
                  {isRtl ? item.shortLabelAr : item.shortLabelEn}
                </span>
              </div>
              <p className="text-[10px] leading-snug text-revix-muted line-clamp-2">
                {isRtl ? item.descriptionAr : item.descriptionEn}
              </p>
            </button>
          );
        })}
      </div>

      {/* 2. Sub-configurations based on chosen mode */}
      <div className="rounded-xl border border-revix-border/80 bg-revix-surface/40 p-3 text-xs">
        {/* Mode 1: Cash / COD */}
        {selectedType === "cash" && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <RevixIcon name="check-circle-2" className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-revix-dark">
                {isRtl ? "دفع فوري كامل (Cash on Delivery / COD)" : "100% Immediate Full Cash Settlement"}
              </h4>
              <p className="mt-0.5 text-[11px] text-revix-secondary leading-relaxed">
                {isRtl
                  ? "لا توجد فترة سماح ائتمانية (0 أيام). يتم تسوية 100% من قيمة أمر التوريد فور اعتماد الفاتورة واستلام الأسطول."
                  : "Zero credit delay (0 days). Full 100% invoice settlement upon delivery confirmation."}
              </p>
            </div>
          </div>
        )}

        {/* Mode 2: Net Terms (Credit) */}
        {selectedType === "net_terms" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-revix-dark flex items-center gap-1.5">
                <RevixIcon name="clock" className="h-3.5 w-3.5 text-sky-600" />
                <span>{isRtl ? "فترة السماح التجاري المعتمدة (Net Days):" : "Credit Grace Period (Net Days):"}</span>
              </label>
              <span className="font-mono text-xs font-bold text-revix-primary">
                Net {days} {isRtl ? "يوم" : "Days"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {NET_TERMS_PRESETS.map((p) => {
                const isPresetActive = selectedPresetDays === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleNetDaysPreset(p)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      isPresetActive
                        ? "bg-sky-600 text-white shadow-xs"
                        : "border border-revix-border bg-revix-white text-revix-secondary hover:border-sky-300 hover:text-sky-700"
                    }`}
                  >
                    Net {p}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedPresetDays("custom")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  selectedPresetDays === "custom"
                    ? "bg-sky-600 text-white"
                    : "border border-revix-border bg-revix-white text-revix-secondary hover:text-revix-dark"
                }`}
              >
                {isRtl ? "مخصص..." : "Custom..."}
              </button>

              {selectedPresetDays === "custom" && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={days}
                    onChange={(e) => handleCustomDaysChange(Number(e.target.value))}
                    className="h-7 w-20 rounded-md border border-sky-400 bg-white px-2 font-mono text-xs font-semibold text-revix-dark focus:outline-hidden"
                  />
                  <span className="text-[11px] text-revix-secondary">{isRtl ? "يوم" : "days"}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-revix-muted">
              {isRtl
                ? `يتم سداد الفاتورة بالكامل بعد ${days} يوماً من تاريخ التوريد المعتمد للمركبات.`
                : `Full payment is due ${days} days following vehicle delivery and PO approval.`}
            </p>
          </div>
        )}

        {/* Mode 3: Installments (Scheduled Financing) */}
        {selectedType === "installments" && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-revix-dark flex items-center gap-1.5">
                  <RevixIcon name="calendar" className="h-3.5 w-3.5 text-purple-600" />
                  <span>{isRtl ? "مدة خطة التقسيط (عدد الأشهر):" : "Installment Schedule Duration:"}</span>
                </label>
                <span className="font-mono text-xs font-bold text-purple-700">
                  {monthsCount} {isRtl ? (monthsCount <= 10 ? "أشهر" : "شهراً") : "Months"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {INSTALLMENT_MONTHS_PRESETS.map((m) => {
                  const isMonthsActive = monthsCount === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleInstallmentMonthsChange(m)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                        isMonthsActive
                          ? "bg-purple-600 text-white shadow-xs"
                          : "border border-revix-border bg-revix-white text-revix-secondary hover:border-purple-300 hover:text-purple-700"
                      }`}
                    >
                      {m} {isRtl ? (m <= 10 ? "أشهر" : "شهراً") : "Mos"}
                    </button>
                  );
                })}

                <div className="flex items-center gap-1 ms-1">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={monthsCount}
                    onChange={(e) => handleInstallmentMonthsChange(Math.max(1, Number(e.target.value)))}
                    className="h-7 w-16 rounded-md border border-revix-border bg-white px-2 font-mono text-xs font-semibold text-revix-dark focus:border-purple-500 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-revix-secondary">{isRtl ? "شهر" : "mo"}</span>
                </div>
              </div>
            </div>

            {/* Financial Calculator when totalAmount is available */}
            {hasTotal && (
              <div className="rounded-lg border border-purple-200/80 bg-purple-50/50 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-950">
                    {isRtl ? "نسبة الدفعة الأولى (المقدم):" : "Down Payment (Upfront):"}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-purple-900">
                    <span>{currentUpfront.toLocaleString()}</span>
                    <span>{currency}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {DOWN_PAYMENT_PERCENT_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleDownPaymentPercentChange(pct)}
                      className={`rounded-md px-2.5 py-0.5 text-[11px] font-semibold transition ${
                        downPaymentPercent === pct
                          ? "bg-purple-700 text-white shadow-xs"
                          : "border border-purple-200 bg-white text-purple-800 hover:bg-purple-100"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}

                  <div className="flex items-center gap-1 ms-1">
                    <span className="text-[10px] text-purple-700">{isRtl ? "أو مخصص:" : "Custom:"}</span>
                    <input
                      type="number"
                      min={0}
                      max={totalAmount}
                      value={customDownPayment}
                      onChange={(e) => handleCustomDownPaymentChange(Number(e.target.value))}
                      className="h-6 w-24 rounded border border-purple-300 bg-white px-1.5 font-mono text-xs font-semibold text-purple-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Calculation breakdown row */}
                <div className="grid grid-cols-2 gap-2 border-t border-purple-200/70 pt-2 text-[11px]">
                  <div>
                    <span className="block text-purple-700/80">{isRtl ? "المتبقي للتقسيط:" : "Remaining Balance:"}</span>
                    <span className="font-mono font-bold text-purple-950">
                      {currentRemaining.toLocaleString()} {currency}
                    </span>
                  </div>
                  <div>
                    <span className="block text-purple-700/80">
                      {isRtl ? "القسط الشهري المتوقع:" : "Estimated Monthly Installment:"}
                    </span>
                    <span className="font-mono font-bold text-purple-950">
                      {monthlyInstallment.toLocaleString()} {currency} / {isRtl ? "شهر" : "mo"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode 4: Milestones (Staged Payments) */}
        {selectedType === "milestones" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-revix-dark flex items-center gap-1.5">
                <RevixIcon name="layers" className="h-3.5 w-3.5 text-amber-600" />
                <span>{isRtl ? "توزيع نسب الدفعات المرحلية المعياري:" : "Milestone Payment Schedule Template:"}</span>
              </label>
              <span className="font-mono text-xs font-bold text-amber-800">
                {isRtl ? activeMilestone.labelAr : activeMilestone.labelEn}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {MILESTONE_PRESETS.map((preset) => {
                const isActive = selectedMilestoneKey === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleMilestonePresetChange(preset.key)}
                    className={`rounded-lg p-2 text-start transition border ${
                      isActive
                        ? "border-amber-500 bg-amber-100/70 text-amber-950 font-bold shadow-xs"
                        : "border-revix-border bg-revix-white text-revix-secondary hover:border-amber-300"
                    }`}
                  >
                    <span className="block text-xs">{isRtl ? preset.labelAr : preset.labelEn}</span>
                    <span className="block text-[10px] text-revix-muted font-normal mt-0.5">
                      {preset.stages.length} {isRtl ? "مراحل توريد" : "Stages"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stages visualization list */}
            <div className="space-y-1.5 border-t border-revix-border/70 pt-2">
              {activeMilestone.stages.map((stage, idx) => {
                const stageAmount = hasTotal ? Math.round((totalAmount * stage.percent) / 100) : 0;
                return (
                  <div
                    key={stage.id}
                    className="flex items-center justify-between rounded-lg bg-white p-2 border border-revix-border/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-revix-dark">
                          {isRtl ? stage.nameAr : stage.nameEn}
                        </span>
                        <span className="block text-[10px] text-revix-muted">
                          {isRtl ? stage.descriptionAr : stage.descriptionEn}
                        </span>
                      </div>
                    </div>

                    <div className="text-end">
                      <span className="inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                        {stage.percent}%
                      </span>
                      {hasTotal && (
                        <span className="block font-mono text-xs font-bold text-revix-dark mt-0.5">
                          {stageAmount.toLocaleString()} {currency}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
