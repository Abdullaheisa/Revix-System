"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function ResourceFeedback({ isRtl, isLoading, onRetry, onBack }: {
  isRtl: boolean;
  isLoading?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  return <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto max-w-2xl space-y-4 py-10">
    {isLoading ? <p role="status" className="text-sm text-revix-secondary">{isRtl ? "جارٍ تحميل البيانات..." : "Loading details..."}</p>
      : <Alert variant="error" message={isRtl ? "تعذر عرض البيانات. قد تكون غير متاحة أو لا تملك صلاحية الوصول إليها." : "Could not load these details. They may be unavailable or you may not have access."} />}
    <div className="flex gap-3">
      {!isLoading && onRetry ? <Button type="button" onClick={onRetry}>{isRtl ? "إعادة المحاولة" : "Try again"}</Button> : null}
      {onBack ? <Button type="button" variant="secondary" onClick={onBack}>{isRtl ? "الرجوع للقائمة" : "Back to list"}</Button> : null}
    </div>
  </div>;
}
