import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ForgotPasswordForm, type ForgotPasswordCopy, } from "@/components/auth/ForgotPasswordForm";
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
    const t = await getTranslations({ locale, namespace: "auth.forgotPassword" });
    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
    };
}
export default async function ForgotPasswordPage({ params, }: {
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
    const tForgot = await getTranslations({
        locale,
        namespace: "auth.forgotPassword",
    });
    const tSignup = await getTranslations({ locale, namespace: "auth.signup" });
    const copy: ForgotPasswordCopy = {
        brandName: tNav("brandName"),
        brandDescriptor: tNav("brandDescriptor"),
        title: tForgot("title"),
        description: tForgot("description"),
        emailLabel: tForgot("emailLabel"),
        emailPlaceholder: tForgot("emailPlaceholder"),
        submit: tForgot("submit"),
        submitting: tForgot("submitting"),
        cooldownLabel: tForgot("cooldownLabel", { seconds: "{seconds}" }),
        confirmationTitle: tForgot("confirmationTitle"),
        confirmationMessage: tForgot("confirmationMessage"),
        backToLogin: tForgot("backToLogin"),
        backToHome: tForgot("backToHome"),
        closeAlert: tSignup("errors.closeAlert"),
        validation: {
            emailRequired: tForgot("validation.emailRequired"),
            emailInvalid: tForgot("validation.emailInvalid"),
        },
        errors: {
            title: tForgot("errors.title"),
            rateLimited: tForgot("errors.rateLimited"),
            serviceUnavailable: tForgot("errors.serviceUnavailable"),
        },
    };
    return (<ForgotPasswordForm locale={locale} isRtl={locale === "ar"} copy={copy}/>);
}
