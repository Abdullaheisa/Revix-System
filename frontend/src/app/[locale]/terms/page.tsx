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
    title:
      locale === "ar"
        ? "الشروط والأحكام — ريفيكس سيستم"
        : "Terms of Service — Revix System",
    description: "Terms of Service for Revix System by Revix Mobility.",
    alternates: { canonical: "https://system.revixmobility.com/terms" },
  };
}

export default async function TermsPage({
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
      title={isRtl ? "الشروط والأحكام" : "Terms of Service"}
      subtitle={
        isRtl
          ? "شروط استخدام منصة Revix System."
          : "Terms governing access and use of Revix System."
      }
    >
      <p>
        {isRtl
          ? "باستخدامك لمنصة Revix System، فإنك توافق على استخدام النظام للأغراض التجارية المصرح بها لإدارة أسطول شركتك وعقود التأجير مع الحفاظ على سرية بيانات الدخول."
          : "By accessing Revix System, you agree to use the platform solely for authorized fleet, rental, and financial operations of your organization and to safeguard account credentials."}
      </p>
      <p>
        {isRtl
          ? "للاستفسارات القانونية أو التعاقدية، تواصل معنا عبر support@revixmobility.com."
          : "For legal or commercial inquiries, please contact support@revixmobility.com."}
      </p>
    </PublicInfoPage>
  );
}
