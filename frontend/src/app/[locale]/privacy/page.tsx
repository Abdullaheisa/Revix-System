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
        ? "سياسة الخصوصية — ريفيكس سيستم"
        : "Privacy Policy — Revix System",
    description: "Privacy Policy and tenant data protection for Revix System.",
    alternates: { canonical: "https://system.revixmobility.com/privacy" },
  };
}

export default async function PrivacyPage({
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
      title={isRtl ? "سياسة الخصوصية" : "Privacy Policy"}
      subtitle={
        isRtl
          ? "حماية وعزل بيانات الشركات والعملاء في Revix System."
          : "Data protection and multi-tenant isolation practices."
      }
    >
      <p>
        {isRtl
          ? "تُعزل بيانات كل شركة ومستندات عملائها وأسطولها بشكل كامل داخل النظام، ولا تتم مشاركتها مع أي طرف ثالث إلا في نطاق الربط المصرح به ضمن شبكة الشركاء."
          : "Each company's fleet, financial, and customer records are strictly isolated per tenant and are never shared externally except where explicitly authorized in a partner network."}
      </p>
      <p>
        {isRtl
          ? "لأي طلبات متعلقة بالخصوصية، يرجى مراسلتنا على support@revixmobility.com."
          : "For privacy requests or questions, contact support@revixmobility.com."}
      </p>
    </PublicInfoPage>
  );
}
