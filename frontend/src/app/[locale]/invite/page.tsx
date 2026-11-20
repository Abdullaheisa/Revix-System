import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AcceptInviteView } from "@/components/auth/AcceptInviteView";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isRtl = locale === "ar";

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-revix-surface text-[14px] text-revix-secondary">
          {isRtl ? "جاري تحميل الدعوة..." : "Loading invitation..."}
        </div>
      }
    >
      <AcceptInviteView isRtl={isRtl} />
    </Suspense>
  );
}
