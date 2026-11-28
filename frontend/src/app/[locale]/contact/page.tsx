import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PublicInfoPage } from "@/components/home/PublicInfoPage";
import { isAppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "تواصل معنا — ريفيكس سيستم" : "Contact — Revix System",
    description:
      "Contact Revix Mobility support and sales for Revix System fleet and car rental ERP.",
    alternates: { canonical: "https://system.revixmobility.com/contact" },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);
  const isRtl = locale === "ar";

  return (
    <PublicInfoPage
      isRtl={isRtl}
      title={isRtl ? "تواصل معنا" : "Contact Revix Mobility"}
      subtitle={
        isRtl
          ? "فريق الدعم والمبيعات متاح لمساعدتك في تشغيل وإعداد النظام."
          : "Reach our support and onboarding team for Revix System."
      }
    >
      <div className="rounded-xl border border-revix-border bg-revix-surface/50 p-6 space-y-3">
        <div>
          <span className="font-semibold">
            {isRtl ? "البريد الإلكتروني للدعم: " : "Support Email: "}
          </span>
          <a
            href="mailto:support@revixmobility.com"
            className="font-mono text-revix-primary underline"
          >
            support@revixmobility.com
          </a>
        </div>
        <div>
          <span className="font-semibold">
            {isRtl ? "الموقع الرسمي: " : "Platform URL: "}
          </span>
          <a
            href="https://system.revixmobility.com"
            className="font-mono text-revix-primary underline"
          >
            https://system.revixmobility.com
          </a>
        </div>
      </div>
    </PublicInfoPage>
  );
}
