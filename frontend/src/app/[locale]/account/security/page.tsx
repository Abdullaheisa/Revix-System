import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ChangePasswordForm, type ChangePasswordCopy, } from "@/components/auth/ChangePasswordForm";
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
    const t = await getTranslations({ locale, namespace: "auth.security" });
    return {
        title: t("metaTitle"),
        description: t("metaDescription"),
    };
}
export default async function AccountSecurityPage({ params, }: {
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
    const tSecurity = await getTranslations({
        locale,
        namespace: "auth.security",
    });
    const tSignup = await getTranslations({ locale, namespace: "auth.signup" });
    const copy: ChangePasswordCopy = {
        brandName: tNav("brandName"),
        brandDescriptor: tNav("brandDescriptor"),
        title: tSecurity("title"),
        description: tSecurity("description"),
        accountEmailLabel: tSecurity("accountEmailLabel"),
        currentPasswordLabel: tSecurity("currentPasswordLabel"),
        currentPasswordPlaceholder: tSecurity("currentPasswordPlaceholder"),
        newPasswordLabel: tSecurity("newPasswordLabel"),
        newPasswordPlaceholder: tSecurity("newPasswordPlaceholder"),
        confirmPasswordLabel: tSecurity("confirmPasswordLabel"),
        confirmPasswordPlaceholder: tSecurity("confirmPasswordPlaceholder"),
        passwordHelper: tSignup("passwordHelper", {
            minLength: MIN_PASSWORD_LENGTH,
        }),
        showPassword: tSignup("showPassword"),
        hidePassword: tSignup("hidePassword"),
        submit: tSecurity("submit"),
        submitting: tSecurity("submitting"),
        backToAccount: tSecurity("backToAccount"),
        backToHome: tSecurity("backToHome"),
        successTitle: tSecurity("successTitle"),
        successDescription: tSecurity("successDescription"),
        goToLogin: tSecurity("goToLogin"),
        closeAlert: tSignup("errors.closeAlert"),
        validation: {
            currentPasswordRequired: tSecurity("validation.currentPasswordRequired"),
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
            title: tSecurity("errors.title"),
            wrongCurrentPassword: tSecurity("errors.wrongCurrentPassword"),
            uidMismatch: tSecurity("errors.uidMismatch"),
            weakPassword: tSecurity("errors.weakPassword"),
            rateLimited: tSecurity("errors.rateLimited"),
            serviceUnavailable: tSecurity("errors.serviceUnavailable"),
            genericError: tSecurity("errors.genericError"),
        },
    };
    return (<ChangePasswordForm isRtl={locale === "ar"} displayEmail="—" copy={copy}/>);
}
