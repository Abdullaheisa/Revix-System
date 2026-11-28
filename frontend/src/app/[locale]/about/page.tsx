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
    title: locale === "ar" ? "عن الشركة — ريفيكس سيستم" : "About — Revix System",
    description:
      "Learn about Revix Mobility and the Revix System multi-branch car rental and fleet operations platform.",
    alternates: { canonical: "https://system.revixmobility.com/about" },
  };
}

export default async function AboutPage({
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
      title={isRtl ? "عن Revix Mobility" : "About Revix Mobility"}
      subtitle={
        isRtl
          ? "منصة متكاملة لإدارة تأجير السيارات وأصول الأسطول والفروع المتعددة."
          : "Unified multi-branch car rental, fleet asset, and operations ERP."
      }
    >
      <p>
        {isRtl
          ? "تم تصميم Revix System لتوحيد عمليات شركات تأجير السيارات وإدارة الأساطيل في مساحة عمل واحدة تشمل علاقات العملاء (CRM)، التشغيل، المالية، الأصول، والمبيعات."
          : "Revix System is built by Revix Mobility to unify car rental operations, vehicle asset tracking, purchasing, multi-currency branch finance, and customer contracts in a single workspace."}
      </p>
      <p>
        {isRtl
          ? "يدعم النظام التشغيل المستقل أو شبكات الشركات الشريكة مع عزل كامل لبيانات كل شركة وصلاحيات دقيقة لكل دور وظيفي."
          : "The platform supports both independent rental operators and connected local partner networks with strict tenant isolation and role-based access control."}
      </p>
    </PublicInfoPage>
  );
}
