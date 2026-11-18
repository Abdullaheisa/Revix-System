import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SignupForm, type SignupCopy } from "@/components/auth/SignupForm";
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
        return { title: "Revix System" };
    }
    const t = await getTranslations({ locale, namespace: "auth.signup" });
    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
    };
}
export default async function SignupPage({ params, }: {
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
    const tSignup = await getTranslations({ locale, namespace: "auth.signup" });
    const copy: SignupCopy = {
        brandName: tNav("brandName"),
        brandDescriptor: tNav("brandDescriptor"),
        title: tSignup("title"),
        description: tSignup("description"),
        nameLabel: tSignup("nameLabel"),
        namePlaceholder: tSignup("namePlaceholder"),
        emailLabel: tSignup("emailLabel"),
        emailPlaceholder: tSignup("emailPlaceholder"),
        passwordLabel: tSignup("passwordLabel"),
        passwordPlaceholder: tSignup("passwordPlaceholder"),
        confirmPasswordLabel: tSignup("confirmPasswordLabel"),
        confirmPasswordPlaceholder: tSignup("confirmPasswordPlaceholder"),
        passwordHelper: tSignup("passwordHelper", {
            minLength: MIN_PASSWORD_LENGTH,
        }),
        showPassword: tSignup("showPassword"),
        hidePassword: tSignup("hidePassword"),
        submit: tSignup("submit"),
        submitting: tSignup("submitting"),
        haveAccountPrompt: tSignup("haveAccountPrompt"),
        signInLink: tSignup("signInLink"),
        backToHome: tSignup("backToHome"),
        retryDelivery: tSignup("retryDelivery"),
        retryingDelivery: tSignup("retryingDelivery"),
        validation: {
            nameRequired: tSignup("validation.nameRequired"),
            emailRequired: tSignup("validation.emailRequired"),
            emailInvalid: tSignup("validation.emailInvalid"),
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
            title: tSignup("errors.title"),
            closeAlert: tSignup("errors.closeAlert"),
            emailInUse: tSignup("errors.emailInUse"),
            weakPassword: tSignup("errors.weakPassword"),
            partialDelivery: tSignup("errors.partialDelivery"),
            sessionLost: tSignup("errors.sessionLost"),
            rateLimited: tSignup("errors.rateLimited"),
            serviceUnavailable: tSignup("errors.serviceUnavailable"),
            genericError: tSignup("errors.genericError"),
        },
    };
    return <SignupForm locale={locale} isRtl={locale === "ar"} copy={copy}/>;
}
