import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixWordmark } from "@/components/home/HomeNavbar";
export interface AuthShellProps {
    isRtl: boolean;
    brandName: string;
    brandDescriptor: string;
    backToHome: string;
    headerExtraLink?: {
        href: string;
        label: string;
    };
    maxWidthClassName?: string;
    children: ReactNode;
}
export function AuthShell({ isRtl, brandName, brandDescriptor, backToHome, headerExtraLink, maxWidthClassName = "max-w-[460px]", children, }: AuthShellProps) {
    return (<div className="flex min-h-dvh flex-col bg-revix-surface text-revix-dark">
      <header className="border-b border-revix-border/75 bg-revix-white/95">
        <ResponsiveContainer className="flex min-h-[56px] items-center justify-between gap-2 py-2 sm:min-h-[60px]">
          <Link href="/" aria-label={backToHome} className="inline-flex min-h-[44px] shrink-0 items-center rounded-full px-1.5 transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary">
            <RevixWordmark alt={brandName} descriptor={brandDescriptor} className="h-[18px] sm:h-[20px]"/>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {headerExtraLink ? (<Link href={headerExtraLink.href} className="inline-flex min-h-[40px] items-center rounded-full px-3 text-[13.5px] font-medium text-revix-secondary transition-colors hover:bg-revix-tint hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary">
                <span>{headerExtraLink.label}</span>
              </Link>) : null}

            <Link href="/" className="hidden sm:inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[13.5px] font-medium text-revix-secondary transition-colors hover:bg-revix-tint hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary">
              <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={15}/>
              <span>{backToHome}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </ResponsiveContainer>
      </header>

      <main className="flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-7 lg:py-8">
        <div className={`mx-auto my-auto w-full ${maxWidthClassName} rounded-[20px] border border-revix-border/90 bg-revix-white px-5 py-6 shadow-[0_12px_32px_-16px_rgba(12,57,32,0.1)] sm:px-8 sm:py-7`}>
          <div className="mx-auto w-full max-w-[400px]">{children}</div>
        </div>
      </main>
    </div>);
}
