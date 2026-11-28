"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ResponsiveContainer } from "@/components/shared/ResponsiveContainer";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { RevixWordmark } from "@/components/home/HomeNavbar";
import { RevixSurfaceBackdrop } from "@/components/home/RevixSurfaceBackdrop";
import type {
  HomeCtaBannerCopy,
  HomeFaqCopy,
  HomeFooterCopy,
} from "@/components/home/types";

export interface HomeFaqSectionProps {
  isRtl: boolean;
  faq: HomeFaqCopy;
  ctaBanner: HomeCtaBannerCopy;
  footer: HomeFooterCopy;
}

export function HomeFaqSection({
  isRtl,
  faq,
  ctaBanner,
  footer,
}: HomeFaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number>(0);
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { label: footer.links.platform, href: "#platform" },
    { label: footer.links.networks, href: "#networks" },
    { label: footer.links.integrations, href: "#integrations" },
    { label: footer.links.plans, href: "#plans" },
    { label: footer.links.faq, href: "#faq" },
  ];

  return (
    <>
      <section
        id="faq"
        className="border-t border-revix-border/75 bg-revix-white py-9 sm:py-11 lg:py-12 scroll-mt-24"
      >
        <ResponsiveContainer>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
            <ScrollReveal
              direction="start"
              distance={46}
              duration={840}
              className="lg:col-span-5"
            >
              <h2 className="revix-heading-h2 text-[clamp(1.65rem,3vw,2.35rem)] leading-[1.16] text-revix-dark">
                {faq.headline}
              </h2>
              <p className="revix-body-md mt-3.5 text-revix-secondary">
                {faq.subtitle}
              </p>
            </ScrollReveal>

            <div className="lg:col-span-7">
              <div className="divide-y divide-revix-border border-y border-revix-border">
                {faq.items.map((item, index) => {
                  const isOpen = openIndex === index;
                  const panelId = `${item.id}-panel`;
                  const buttonId = `${item.id}-button`;

                  return (
                    <ScrollReveal
                      key={item.id}
                      direction="up"
                      delay={index * 75}
                      distance={28}
                      duration={740}
                      threshold={0.05}
                      rootMargin="0px 0px -10px 0px"
                    >
                      <h3>
                        <button
                          id={buttonId}
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() =>
                            setOpenIndex((current) =>
                              current === index ? -1 : index,
                            )
                          }
                          className="flex min-h-[60px] w-full cursor-pointer items-center justify-between gap-4 py-4.5 text-start text-[16px] font-bold text-revix-dark transition-colors hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary sm:text-[17px]"
                        >
                          <span>{item.q}</span>
                          <span
                            aria-hidden="true"
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[16px] font-semibold transition-all duration-300 ${
                              isOpen
                                ? "border-revix-primary bg-revix-primary text-revix-white rotate-180"
                                : "border-revix-border bg-revix-white text-revix-dark"
                            }`}
                          >
                            {isOpen ? "−" : "+"}
                          </span>
                        </button>
                      </h3>

                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        aria-hidden={!isOpen}
                        className={`grid transition-[grid-template-rows,opacity] duration-350 ease-out motion-reduce:transition-none ${
                          isOpen
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p className="pb-5 pe-8 text-[15px] leading-[1.65] text-revix-secondary">
                            {item.a}
                          </p>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      {/* Final Call-to-Action Banner */}
      <section className="bg-revix-white py-6 sm:py-9">
        <ResponsiveContainer>
          <ScrollReveal
            direction="none"
            distance={24}
            duration={860}
            threshold={0.08}
            rootMargin="0px 0px -12px 0px"
          >
            <div className="revix-hero-surface relative overflow-hidden rounded-[26px] border border-revix-primary/15 px-6 py-8 text-center shadow-2xs sm:rounded-[32px] sm:px-12 sm:py-10">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <RevixSurfaceBackdrop variant="cta" />
            </div>

            <div className="relative z-10">
              <h2 className="revix-heading-h2 mx-auto max-w-[640px] text-[clamp(1.65rem,3.4vw,2.45rem)] leading-[1.16] text-revix-dark">
                {ctaBanner.headline}
              </h2>

              <p className="revix-body-lg mx-auto mt-3.5 max-w-[560px] text-revix-secondary">
                {ctaBanner.description}
              </p>

              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/signup"
                  className="group inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-revix-primary bg-revix-primary px-6 py-2.5 text-[14.5px] font-semibold text-revix-white shadow-xs transition-[background-color,border-color,box-shadow,transform] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:bg-revix-primary-hover hover:border-revix-primary-hover hover:shadow-md hover:shadow-revix-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary motion-reduce:transform-none"
                >
                  <span>{ctaBanner.primaryCta}</span>
                  <RevixIcon
                    name={isRtl ? "arrow-left" : "arrow-right"}
                    size={17}
                    className="transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                  />
                </Link>

                <a
                  href="#platform"
                  className="inline-flex min-h-[42px] items-center justify-center rounded-full px-3 text-[14.5px] font-semibold text-revix-dark underline decoration-revix-primary/45 decoration-2 underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-revix-primary hover:decoration-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
                >
                  {ctaBanner.secondaryCta}
                </a>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </ResponsiveContainer>
      </section>

      {/* Clean Brand Footer */}
      <footer className="border-t border-revix-border bg-revix-white py-7 sm:py-8">
        <ResponsiveContainer>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center">
                <RevixWordmark
                  alt={footer.brandName}
                  descriptor={footer.brandDescriptor}
                  className="h-[20px]"
                />
              </div>
              <p className="max-w-[440px] text-[13px] leading-[1.55] text-revix-secondary">
                {footer.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {footerLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[13.5px] font-medium text-revix-secondary transition-colors hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
                >
                  {link.label}
                </a>
              ))}
              <LanguageSwitcher />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-revix-border/75 pt-5 text-[12.5px] text-revix-secondary">
            <span>© {currentYear} {footer.copyrightName}</span>
            <nav aria-label={isRtl ? "روابط الشركة والقانونية" : "Company and legal links"} className="flex flex-wrap items-center gap-4 sm:gap-5">
              <Link href="/about" className="transition-colors hover:text-revix-primary">
                {isRtl ? "عن الشركة" : "About"}
              </Link>
              <Link href="/contact" className="transition-colors hover:text-revix-primary">
                {isRtl ? "تواصل معنا" : "Contact"}
              </Link>
              <Link href="/terms" className="transition-colors hover:text-revix-primary">
                {isRtl ? "الشروط والأحكام" : "Terms"}
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-revix-primary">
                {isRtl ? "سياسة الخصوصية" : "Privacy"}
              </Link>
              <a
                href="mailto:support@revixmobility.com"
                className="font-mono text-[12px] transition-colors hover:text-revix-primary"
              >
                support@revixmobility.com
              </a>
            </nav>
          </div>
        </ResponsiveContainer>
      </footer>
    </>
  );
}
