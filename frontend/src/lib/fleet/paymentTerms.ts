import type { RevixIconName } from "@/components/ui/RevixIcons";
import type { PaymentTermsType } from "@/store/api/fleetApi";

export { PaymentTermsType };

export interface PaymentTermsConfig {
  type: PaymentTermsType;
  days: number;
  config?: string | null;
}

export interface MilestoneStage {
  id: string;
  nameAr: string;
  nameEn: string;
  percent: number;
  descriptionAr: string;
  descriptionEn: string;
}

export interface MilestonePreset {
  key: string;
  labelAr: string;
  labelEn: string;
  stages: MilestoneStage[];
}

export const NET_TERMS_PRESETS = [15, 30, 45, 60, 90] as const;
export const INSTALLMENT_MONTHS_PRESETS = [3, 6, 12, 24, 36] as const;
export const DOWN_PAYMENT_PERCENT_PRESETS = [0, 10, 20, 30, 50] as const;

export const MILESTONE_PRESETS: MilestonePreset[] = [
  {
    key: "50_50",
    labelAr: "50% / 50% (مناصفة)",
    labelEn: "50% / 50% (Equal Split)",
    stages: [
      {
        id: "advance",
        nameAr: "دفعة التعاقد والحجز",
        nameEn: "Advance Contract Deposit",
        percent: 50,
        descriptionAr: "عند توقيع أمر الشراء وتثبيت حجز المركبات",
        descriptionEn: "Upon PO confirmation and vehicle allocation",
      },
      {
        id: "final",
        nameAr: "دفعة الاستلام والترخيص",
        nameEn: "Final Handover & Delivery",
        percent: 50,
        descriptionAr: "عند استلام الأسطول والفحص الفني المعتمد",
        descriptionEn: "Upon fleet delivery and technical inspection",
      },
    ],
  },
  {
    key: "30_40_30",
    labelAr: "30% / 40% / 30% (مرحلية ثلاثية)",
    labelEn: "30% / 40% / 30% (3-Stage Milestone)",
    stages: [
      {
        id: "deposit",
        nameAr: "دفعة أولى (مقدم حجز)",
        nameEn: "Initial Advance Deposit",
        percent: 30,
        descriptionAr: "عند توقيع أمر التوريد والبدء في التجهيز",
        descriptionEn: "Upon contract signing and order mobilization",
      },
      {
        id: "transit",
        nameAr: "دفعة شحن وتجهيز",
        nameEn: "Mobilization & Shipping",
        percent: 40,
        descriptionAr: "عند شحن المركبات وتركيب تجهيزات الأسطول",
        descriptionEn: "Upon vehicle dispatch and outfitting completion",
      },
      {
        id: "handover",
        nameAr: "دفعة الاستلام النهائي",
        nameEn: "Final Acceptance & Title",
        percent: 30,
        descriptionAr: "عند مطابقة الفحص الفني وإصدار استمارات السير",
        descriptionEn: "Upon technical inspection and plate registration",
      },
    ],
  },
  {
    key: "20_80",
    labelAr: "20% / 80% (مقدم واستلام)",
    labelEn: "20% / 80% (Advance & Delivery)",
    stages: [
      {
        id: "deposit",
        nameAr: "مقدم جدية تعاقد",
        nameEn: "Contract Commitment Deposit",
        percent: 20,
        descriptionAr: "عند تأكيد توفر الكميات لدى الوكيل / المعرض",
        descriptionEn: "Upon confirming inventory stock with vendor",
      },
      {
        id: "delivery",
        nameAr: "سداد الرصيد عند الاستلام",
        nameEn: "Balance Upon Delivery",
        percent: 80,
        descriptionAr: "سداد المتبقي كاملاً عند استلام المركبات بالفرع",
        descriptionEn: "Full remaining settlement upon branch delivery",
      },
    ],
  },
  {
    key: "10_90",
    labelAr: "10% / 90% (عربون وتوريد)",
    labelEn: "10% / 90% (Token & Full Receipt)",
    stages: [
      {
        id: "token",
        nameAr: "عربون حجز وتثبيت السعر",
        nameEn: "Price Lock Deposit",
        percent: 10,
        descriptionAr: "لتثبيت الأسعار والخصم التجاري الممنوح",
        descriptionEn: "Securing commercial fleet discount terms",
      },
      {
        id: "final",
        nameAr: "سداد الرصيد بعد الفحص",
        nameEn: "Post-Inspection Settlement",
        percent: 90,
        descriptionAr: "خلال 5 أيام من استلام وفحص الأسطول",
        descriptionEn: "Within 5 days after physical inspection",
      },
    ],
  },
];

/**
 * Metadata definition for each of the 4 standard payment terms structures
 */
export const PAYMENT_TERMS_INFO: Record<
  PaymentTermsType,
  {
    type: PaymentTermsType;
    labelAr: string;
    labelEn: string;
    shortLabelAr: string;
    shortLabelEn: string;
    descriptionAr: string;
    descriptionEn: string;
    icon: RevixIconName;
    badgeStyle: string;
    borderStyle: string;
  }
> = {
  cash: {
    type: "cash",
    labelAr: "كاش / دفع فوري (Cash / COD)",
    labelEn: "Immediate Cash (Cash / COD)",
    shortLabelAr: "كاش فوري",
    shortLabelEn: "Cash / COD",
    descriptionAr: "سداد كامل فوري بنسبة 100% فور استلام الفاتورة أو شحنة المركبات (0 أيام سماح)",
    descriptionEn: "100% immediate full payment upon delivery or invoice (0 credit days)",
    icon: "wallet",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    borderStyle: "border-emerald-500 bg-emerald-50/40 text-emerald-900",
  },
  net_terms: {
    type: "net_terms",
    labelAr: "آجل تجاري / فترة سماح (Net Credit Terms)",
    labelEn: "Commercial Credit (Net Terms)",
    shortLabelAr: "آجل تجاري",
    shortLabelEn: "Net Terms",
    descriptionAr: "سداد كامل الفاتورة بعد فترة سماح معتمدة تبدأ من تاريخ التوريد (Net 15 / 30 / 60)",
    descriptionEn: "Full invoice settlement within an agreed credit grace period (Net 15 / 30 / 60)",
    icon: "clock",
    badgeStyle: "bg-sky-50 text-sky-700 border-sky-200/80",
    borderStyle: "border-sky-500 bg-sky-50/40 text-sky-900",
  },
  installments: {
    type: "installments",
    labelAr: "تقسيط مجدول / تمويل دوري (Installments)",
    labelEn: "Scheduled Installments (Financing)",
    shortLabelAr: "تقسيط مجدول",
    shortLabelEn: "Installments",
    descriptionAr: "سداد دفعة أولى (مقدم) وتوزيع المتبقي على أقساط شهرية متساوية مجدولة",
    descriptionEn: "Down payment with remaining balance split over scheduled equal monthly installments",
    icon: "calendar",
    badgeStyle: "bg-purple-50 text-purple-700 border-purple-200/80",
    borderStyle: "border-purple-500 bg-purple-50/40 text-purple-900",
  },
  milestones: {
    type: "milestones",
    labelAr: "دفعات مرحلية / إنجاز (Milestones / Staged)",
    labelEn: "Staged Milestone Payments",
    shortLabelAr: "دفعات مرحلية",
    shortLabelEn: "Milestones",
    descriptionAr: "توزيع السداد على دفعات مالية مرتبطة بمراحل الإنجاز والتسليم الفعلي للمركبات",
    descriptionEn: "Release payments in tranches tied to contractual delivery milestones",
    icon: "layers",
    badgeStyle: "bg-amber-50 text-amber-700 border-amber-200/80",
    borderStyle: "border-amber-500 bg-amber-50/40 text-amber-900",
  },
};

/**
 * Intelligent detector for payment terms from vendor record
 */
export function detectPaymentTermsType(
  days: number,
  explicitType?: PaymentTermsType | string | null,
): PaymentTermsType {
  if (
    explicitType === "cash" ||
    explicitType === "net_terms" ||
    explicitType === "installments" ||
    explicitType === "milestones"
  ) {
    return explicitType;
  }
  if (days === 0) return "cash";
  if (days >= 180) return "installments";
  return "net_terms";
}

/**
 * Rich badge formatting for vendor directory & PO headers
 */
export function formatVendorPaymentTerms(
  vendor: {
    paymentTermsDays?: number;
    paymentTermsType?: PaymentTermsType | string | null;
    paymentTermsConfig?: string | null;
  },
  isRtl: boolean,
): {
  type: PaymentTermsType;
  label: string;
  details: string;
  badgeClass: string;
  icon: RevixIconName;
} {
  const days = Number(vendor?.paymentTermsDays ?? 30);
  const type = detectPaymentTermsType(days, vendor?.paymentTermsType);
  const info = PAYMENT_TERMS_INFO[type];
  const config = vendor?.paymentTermsConfig;

  if (type === "cash") {
    return {
      type,
      label: isRtl ? "كاش فوري (Cash / COD)" : "Cash / Immediate",
      details: isRtl
        ? "سداد كامل 100% عند التوريد"
        : "100% Immediate payment upon receipt",
      badgeClass: info.badgeStyle,
      icon: info.icon,
    };
  }

  if (type === "milestones") {
    const preset = MILESTONE_PRESETS.find((m) => m.key === config);
    const splitLabel = preset ? (isRtl ? preset.labelAr : preset.labelEn) : config || "50% / 50%";
    return {
      type,
      label: isRtl ? `دفعات مرحلية (${splitLabel})` : `Milestones (${splitLabel})`,
      details: isRtl
        ? "دفعات مرحلية حسب استلام وإنجاز الأسطول"
        : "Staged payments tied to delivery milestones",
      badgeClass: info.badgeStyle,
      icon: info.icon,
    };
  }

  if (type === "installments") {
    const months = Math.max(1, Math.round(days / 30));
    return {
      type,
      label: isRtl
        ? `تقسيط مجدول (${months} ${months <= 10 ? "أشهر" : "شهراً"})`
        : `Installments (${months} Months)`,
      details: isRtl
        ? `سداد مجدول على ${months} قسطاً شهرياً`
        : `Scheduled monthly plan over ${months} months`,
      badgeClass: info.badgeStyle,
      icon: info.icon,
    };
  }

  // Net Terms
  return {
    type,
    label: isRtl ? `آجل تجاري (Net ${days} يوم)` : `Credit (Net ${days} Days)`,
    details: isRtl
      ? `فترة سماح معتمدة ${days} يوماً من تاريخ التوريد`
      : `Full settlement due within ${days} days from delivery`,
    badgeClass: info.badgeStyle,
    icon: info.icon,
  };
}
