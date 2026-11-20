import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { VerifyEmailView, type VerifyEmailCopy, } from "@/components/auth/VerifyEmailView";
import { isAppLocale } from "@/i18n/routing";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params, }: {
    params: Promise<{
        locale: string;
    }>;
}): Promise<Metadata> {
    const { locale } = await params;
    if (!isAppLocale(locale)) {
        return { title: "Revix System" };
    }
    const t = await getTranslations({ locale, namespace: "auth.verifyEmail" });
    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
    };
}
export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    token?: string;
  }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  if (!isAppLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const tNav = await getTranslations({ locale, namespace: "home.nav" });
  const tVerify = await getTranslations({
    locale,
    namespace: "auth.verifyEmail",
  });
  const tSignup = await getTranslations({ locale, namespace: "auth.signup" });
  const copy: VerifyEmailCopy = {
    brandName: tNav("brandName"),
    brandDescriptor: tNav("brandDescriptor"),
    title: tVerify("title"),
    description: tVerify("description"),
    sentToLabel: tVerify("sentToLabel"),
    resendButton: tVerify("resendButton"),
    resending: tVerify("resending"),
    cooldownLabel: tVerify("cooldownLabel", { seconds: "{seconds}" }),
    resentSuccess: tVerify("resentSuccess"),
    alreadyVerified: tVerify("alreadyVerified"),
    sessionLostMessage: tVerify("sessionLostMessage"),
    goToLogin: tVerify("goToLogin"),
    useAnotherAccount: tVerify("useAnotherAccount"),
    backToHome: tVerify("backToHome"),
    closeAlert: tSignup("errors.closeAlert"),
    verifyingTitle: tVerify("verifyingTitle"),
    verifyingDescription: tVerify("verifyingDescription"),
    verifiedSuccessTitle: tVerify("verifiedSuccessTitle"),
    verifiedSuccessDescription: tVerify("verifiedSuccessDescription"),
    verifiedFailedTitle: tVerify("verifiedFailedTitle"),
    invalidTokenMessage: tVerify("invalidTokenMessage"),
    expiredTokenMessage: tVerify("expiredTokenMessage"),
    continueToWorkspace: tVerify("continueToWorkspace"),
    errors: {
      title: tVerify("errors.title"),
      rateLimited: tVerify("errors.rateLimited"),
      serviceUnavailable: tVerify("errors.serviceUnavailable"),
    },
  };
  return (
    <VerifyEmailView
      locale={locale}
      isRtl={locale === "ar"}
      copy={copy}
      initialToken={token}
    />
  );
}
