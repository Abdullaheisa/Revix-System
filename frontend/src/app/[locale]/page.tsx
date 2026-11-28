import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { HomePage } from "@/components/home/HomePage";
import { isAppLocale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return { title: "Revix System" };
  }

  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical:
        locale === "ar"
          ? "https://system.revixmobility.com/ar"
          : "https://system.revixmobility.com/",
    },
  };
}

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://system.revixmobility.com/#organization",
      name: "Revix Mobility",
      alternateName: "Revix System",
      url: "https://system.revixmobility.com",
      logo: "https://system.revixmobility.com/revix-wordmark.png",
      description:
        "Multi-branch car rental and fleet operations ERP platform.",
      email: "support@revixmobility.com",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@revixmobility.com",
        availableLanguage: ["English", "Arabic"],
      },
      sameAs: [
        "https://revixmobility.com",
        "https://github.com/Abdullaheisa/Revix-System",
        "https://www.linkedin.com/company/revixmobility",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://system.revixmobility.com/#website",
      name: "Revix System",
      url: "https://system.revixmobility.com",
      publisher: { "@id": "https://system.revixmobility.com/#organization" },
      inLanguage: ["en", "ar"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://system.revixmobility.com/#app",
      name: "Revix System",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://system.revixmobility.com",
      provider: { "@id": "https://system.revixmobility.com/#organization" },
      description:
        "Enterprise car rental, fleet management, purchasing, contracts, and multi-branch operations platform.",
    },
  ],
};

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }}
      />
      <HomePage />
    </>
  );
}
