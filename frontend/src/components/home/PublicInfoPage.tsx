import Link from "next/link";
import type { ReactNode } from "react";

export interface PublicInfoPageProps {
  isRtl: boolean;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function PublicInfoPage({
  isRtl,
  title,
  subtitle,
  children,
}: PublicInfoPageProps) {
  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-revix-white text-revix-dark"
    >
      <header className="border-b border-revix-border bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-sm font-bold tracking-tight text-revix-primary hover:underline"
          >
            {isRtl ? "← الرئيسية | Revix System" : "← Home | Revix System"}
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-xs font-medium text-revix-secondary">
            <Link href="/about" className="hover:text-revix-primary">
              {isRtl ? "عن الشركة" : "About"}
            </Link>
            <Link href="/contact" className="hover:text-revix-primary">
              {isRtl ? "تواصل معنا" : "Contact"}
            </Link>
            <Link href="/terms" className="hover:text-revix-primary">
              {isRtl ? "الشروط" : "Terms"}
            </Link>
            <Link href="/privacy" className="hover:text-revix-primary">
              {isRtl ? "الخصوصية" : "Privacy"}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-2 border-b border-revix-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-revix-dark">
            {title}
          </h1>
          <p className="text-sm text-revix-secondary">{subtitle}</p>
        </div>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-revix-dark/90">
          {children}
        </div>
      </main>
    </div>
  );
}
