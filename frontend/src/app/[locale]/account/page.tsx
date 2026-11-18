import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  AccountOverview,
  type AccountOverviewCopy,
} from "@/components/auth/AccountOverview";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    return { title: "Revix System" };
  }
  const t = await getTranslations({ locale, namespace: "auth.account" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const tNav = await getTranslations({ locale, namespace: "home.nav" });
  const tAccount = await getTranslations({ locale, namespace: "auth.account" });
  const tSignup = await getTranslations({ locale, namespace: "auth.signup" });

  const copy: AccountOverviewCopy = {
    brandName: tNav("brandName"),
    brandDescriptor: tNav("brandDescriptor"),
    title: tAccount("title"),
    signedInStatus: tAccount("signedInStatus"),
    signedInDescription: tAccount("signedInDescription"),
    emailLabel: tAccount("emailLabel"),
    securityLink: tAccount("securityLink"),
    logoutButton: tAccount("logoutButton"),
    loggingOut: tAccount("loggingOut"),
    logoutError: tAccount("logoutError"),
    backToHome: tAccount("backToHome"),
    unavailableTitle: tAccount("unavailableTitle"),
    unavailableDescription: tAccount("unavailableDescription"),
    retry: tAccount("retry"),
    closeAlert: tSignup("errors.closeAlert"),
    signInLink: tSignup("signInLink"),
  };

  return <AccountOverview isRtl={locale === "ar"} copy={copy} />;
}
