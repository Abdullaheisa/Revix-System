import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { WorkspaceStudioShell } from "@/components/workspace/WorkspaceStudioShell";
import { isAppLocale } from "@/i18n/routing";
import {
  WORKSPACE_NAVIGATION_SECTIONS,
  parseWorkspaceSlug,
} from "@/lib/workspace/navigationCatalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) {
    return { title: "Revix System" };
  }
  const { section, subPage } = parseWorkspaceSlug(slug);
  const sec = WORKSPACE_NAVIGATION_SECTIONS.find((s) => s.id === section);
  const item = sec?.groups
    .flatMap((g) => g.items)
    .find((it) => it.id === subPage);

  const pageTitle = item
    ? locale === "ar"
      ? item.titleAr
      : item.titleEn
    : locale === "ar"
      ? "مساحة العمل"
      : "Workspace";

  return {
    title:
      locale === "ar"
        ? `${pageTitle} — ريفيكس سيستم`
        : `${pageTitle} — Revix System`,
  };
}

export default async function WorkspaceSubPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const { section, subPage } = parseWorkspaceSlug(slug);

  return (
    <WorkspaceStudioShell
      isRtl={locale === "ar"}
      initialSection={section}
      initialSubPage={subPage}
    />
  );
}
