export function getInspectionTypeOptions(isRtl: boolean) {
  return [
    { value: "checkin", label: isRtl ? "رجوع من حجز" : "Booking Check-in" },
    { value: "checkout", label: isRtl ? "خروج لحجز" : "Booking Check-out" },
    { value: "maintenance", label: isRtl ? "دخول صيانة" : "Maintenance" },
    { value: "accident", label: isRtl ? "حادث" : "Accident" },
  ];
}

export function getDamageSeverityOptions(isRtl: boolean) {
  return [
    { value: "minor_scratch", label: isRtl ? "خدش بسيط" : "Minor Scratch" },
    { value: "dent", label: isRtl ? "خبطة / انبعاج" : "Dent" },
    { value: "major_damage", label: isRtl ? "ضرر كبير" : "Major Damage" },
  ];
}

export function getExpiryMeta(dateStr: string | null | undefined, isRtl: boolean) {
  if (!dateStr) {
    return {
      label: isRtl ? "غير مسجل" : "Missing",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      barClass: "bg-amber-400",
      pct: 15,
      valid: false,
    };
  }
  const diffDays = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return {
      label: isRtl ? "منتهي" : "Expired",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
      barClass: "bg-red-500",
      pct: 100,
      valid: false,
    };
  }
  if (diffDays <= 30) {
    return {
      label: isRtl ? `${diffDays} يوم` : `${diffDays}d left`,
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      barClass: "bg-amber-500",
      pct: 65,
      valid: true,
    };
  }
  return {
    label: isRtl ? "ساري" : "Valid",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    barClass: "bg-emerald-500",
    pct: 100,
    valid: true,
  };
}
