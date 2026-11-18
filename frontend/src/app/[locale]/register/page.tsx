import { notFound, redirect } from "next/navigation";
import { isAppLocale } from "@/i18n/routing";

export default async function LegacyRegisterRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  redirect(`/${locale}/signup`);
}
