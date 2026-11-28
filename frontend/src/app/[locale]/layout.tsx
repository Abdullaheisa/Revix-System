import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { arabic, inter, jakarta } from "@/lib/fonts";
import {
  SUPPORTED_LOCALES,
  getLocaleDirection,
  isAppLocale,
} from "@/i18n/routing";
import { StoreProvider } from "@/store/StoreProvider";
import "../globals.css";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    metadataBase: new URL("https://system.revixmobility.com"),
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const dir = getLocaleDirection(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${jakarta.variable} ${inter.variable} ${arabic.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-revix-white text-revix-dark antialiased">
        <StoreProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
