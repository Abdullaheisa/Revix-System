import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LoginForm, type LoginCopy } from "@/components/auth/LoginForm";
import { sanitizeReturnUrl } from "@/lib/auth/redirect";
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
    const t = await getTranslations({ locale, namespace: "auth.login" });
    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
    };
}
export default async function LoginPage({ params, searchParams, }: {
    params: Promise<{
        locale: string;
    }>;
    searchParams: Promise<{
        next?: string | string[];
    }>;
}) {
    const { locale } = await params;
    if (!isAppLocale(locale)) {
        notFound();
    }
    setRequestLocale(locale);
    const resolvedSearchParams = await searchParams;
    const rawNext = Array.isArray(resolvedSearchParams.next)
        ? resolvedSearchParams.next[0]
        : resolvedSearchParams.next;
    const safeRedirectUrl = sanitizeReturnUrl(rawNext, locale);
    const tNav = await getTranslations({ locale, namespace: "home.nav" });
    const tLogin = await getTranslations({ locale, namespace: "auth.login" });
    const copy: LoginCopy = {
        brandName: tNav("brandName"),
        brandDescriptor: tNav("brandDescriptor"),
        title: tLogin("title"),
        description: tLogin("description"),
        emailLabel: tLogin("emailLabel"),
        emailPlaceholder: tLogin("emailPlaceholder"),
        passwordLabel: tLogin("passwordLabel"),
        passwordPlaceholder: tLogin("passwordPlaceholder"),
        showPassword: tLogin("showPassword"),
        hidePassword: tLogin("hidePassword"),
        submit: tLogin("submit"),
        submitting: tLogin("submitting"),
        forgotPasswordLink: tLogin("forgotPasswordLink"),
        noAccountPrompt: tLogin("noAccountPrompt"),
        createAccountLink: tLogin("createAccountLink"),
        backToHome: tLogin("backToHome"),
        validation: {
            emailRequired: tLogin("validation.emailRequired"),
            emailInvalid: tLogin("validation.emailInvalid"),
            passwordRequired: tLogin("validation.passwordRequired"),
        },
        errors: {
            title: tLogin("errors.title"),
            closeAlert: tLogin("errors.closeAlert"),
            invalidCredentials: tLogin("errors.invalidCredentials"),
            emailNotVerified: tLogin("errors.emailNotVerified"),
            userDisabled: tLogin("errors.userDisabled"),
            rateLimited: tLogin("errors.rateLimited"),
            serviceUnavailable: tLogin("errors.serviceUnavailable"),
            sessionError: tLogin("errors.sessionError"),
        },
    };
    return (<LoginForm locale={locale} isRtl={locale === "ar"} safeRedirectUrl={safeRedirectUrl} copy={copy}/>);
}
