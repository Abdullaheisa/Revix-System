import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AuthActionView, type AuthActionCopy, } from "@/components/auth/AuthActionView";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/passwordPolicy";
import { isAppLocale } from "@/i18n/routing";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params, }: {
    params: Promise<{
        locale: string;
    }>;
}): Promise<Metadata> {
    const { locale } = await params;
    if (!isAppLocale(locale)) {
        return { title: "Revix System", referrer: "no-referrer" };
    }
    const t = await getTranslations({ locale, namespace: "auth.action" });
    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
        referrer: "no-referrer",
    };
}
export default async function AuthActionPage({ params, }: {
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
    const tAction = await getTranslations({ locale, namespace: "auth.action" });
    const tSignup = await getTranslations({ locale, namespace: "auth.signup" });
    const copy: AuthActionCopy = {
        brandName: tNav("brandName"),
        brandDescriptor: tNav("brandDescriptor"),
        loadingTitle: tAction("loadingTitle"),
        loadingDescription: tAction("loadingDescription"),
        invalidTitle: tAction("invalidTitle"),
        invalidDescription: tAction("invalidDescription"),
        expiredTitle: tAction("expiredTitle"),
        expiredDescription: tAction("expiredDescription"),
        verifySuccessTitle: tAction("verifySuccessTitle"),
        verifySuccessDescription: tAction("verifySuccessDescription"),
        goToLogin: tAction("goToLogin"),
        requestNewReset: tAction("requestNewReset"),
        resetTitle: tAction("resetTitle"),
        resetDescription: tAction("resetDescription"),
        newPasswordLabel: tAction("newPasswordLabel"),
        newPasswordPlaceholder: tAction("newPasswordPlaceholder"),
        confirmPasswordLabel: tAction("confirmPasswordLabel"),
        confirmPasswordPlaceholder: tAction("confirmPasswordPlaceholder"),
        passwordHelper: tSignup("passwordHelper", {
            minLength: MIN_PASSWORD_LENGTH,
        }),
        showPassword: tSignup("showPassword"),
        hidePassword: tSignup("hidePassword"),
        resetSubmit: tAction("resetSubmit"),
        resetSubmitting: tAction("resetSubmitting"),
        resetSuccessTitle: tAction("resetSuccessTitle"),
        resetSuccessDescription: tAction("resetSuccessDescription"),
        resetErrorTitle: tAction("resetErrorTitle"),
        backToHome: tAction("backToHome"),
        closeAlert: tSignup("errors.closeAlert"),
        validation: {
            passwordTooShort: tSignup("validation.passwordTooShort", {
                minLength: MIN_PASSWORD_LENGTH,
            }),
            passwordTooLong: tSignup("validation.passwordTooLong"),
            passwordMissingUppercase: tSignup("validation.passwordMissingUppercase"),
            passwordMissingLowercase: tSignup("validation.passwordMissingLowercase"),
            passwordMissingNumber: tSignup("validation.passwordMissingNumber"),
            confirmPasswordRequired: tSignup("validation.confirmPasswordRequired"),
            passwordsMismatch: tSignup("validation.passwordsMismatch"),
        },
        errors: {
            weakPassword: tSignup("errors.weakPassword"),
            serviceUnavailable: tSignup("errors.serviceUnavailable"),
        },
    };
    return (<AuthActionView locale={locale} isRtl={locale === "ar"} copy={copy}/>);
}
