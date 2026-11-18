import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { OnboardingWizard } from "@/components/workspace/OnboardingWizard";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    return { title: "Revix System" };
  }
  return {
    title:
      locale === "ar"
        ? "إعداد الشركة وأول فرع — ريفيكس سيستم"
        : "Company & First Location Setup — Revix System",
  };
}

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return <OnboardingWizard isRtl={locale === "ar"} />;
}
