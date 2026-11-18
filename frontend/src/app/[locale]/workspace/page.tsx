import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { WorkspaceStudioShell } from "@/components/workspace/WorkspaceStudioShell";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    return { title: "Revix System" };
  }
  return {
    title:
      locale === "ar"
        ? "مساحة العمل — ريفيكس سيستم"
        : "Workspace — Revix System",
  };
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return <WorkspaceStudioShell isRtl={locale === "ar"} />;
}
