"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { IconButton } from "@/components/ui/IconButton";
import { RevixIcon } from "@/components/ui/RevixIcons";
import type { HomeNavCopy } from "@/components/home/types";

export interface HomeNavbarProps {
  nav: HomeNavCopy;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => !element.hasAttribute("hidden") && element.offsetParent !== null,
  );
}

export function RevixWordmark({
  alt = "Revix System",
  descriptor = "System",
  className = "",
  descriptorClassName = "",
  inverted = false,
}: {
  alt?: string;
  descriptor?: string;
  className?: string;
  descriptorClassName?: string;
  inverted?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5 select-none">
      <Image
        src="/revix-wordmark.png"
        alt={alt}
        width={250}
        height={53}
        priority={!inverted}
        className={`h-[22px] w-auto object-contain ${
          inverted ? "brightness-0 invert" : ""
        } ${className}`.trim()}
      />
      {descriptor ? (
        <span
          aria-hidden="true"
          className={`text-[12px] font-semibold tracking-tight ${
            inverted ? "text-white/80" : "text-revix-primary/85"
          } ${descriptorClassName}`.trim()}
        >
          {descriptor}
        </span>
      ) : null}
    </span>
  );
}

export function HomeNavbar({ nav }: HomeNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const drawerId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const navItems = [
    { key: "platform", label: nav.platform, href: "#platform" },
    { key: "networks", label: nav.networks, href: "#networks" },
    { key: "integrations", label: nav.integrations, href: "#integrations" },
    { key: "plans", label: nav.plans, href: "#plans" },
    { key: "faq", label: nav.faq, href: "#faq" },
  ] as const;

  useEffect(() => {
    if (isMobileMenuOpen) {
      wasOpenRef.current = true;
      closeButtonRef.current?.focus();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setIsMobileMenuOpen(false);
          return;
        }

        if (event.key === "Tab" && drawerRef.current) {
          const focusable = getFocusableElements(drawerRef.current);
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;

          if (
            event.shiftKey &&
            (active === first || !drawerRef.current.contains(active))
          ) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (active === last || !drawerRef.current.contains(active))
          ) {
            event.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      menuButtonRef.current?.focus();
    }
  }, [isMobileMenuOpen]);

  return (
    <header className="revix-anim-nav pointer-events-auto relative mx-auto w-full max-w-[1160px]">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-revix-border/80 bg-revix-white/95 px-3 py-1.5 shadow-[0_6px_22px_-6px_rgba(12,57,32,0.08)] backdrop-blur-md sm:px-5 lg:gap-4 lg:rounded-full">
        <div className="flex min-w-0 shrink-0 items-center justify-start">
          <a
            href="#top"
            aria-label={nav.brandAriaLabel}
            className="inline-flex min-h-[42px] items-center rounded-full px-1.5 transition-opacity duration-[var(--duration-fast)] hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary whitespace-nowrap"
          >
            <RevixWordmark
              alt={nav.brandName}
              descriptor={nav.brandDescriptor}
              className="h-[20px] sm:h-[22px]"
            />
          </a>
        </div>

        <nav
          aria-label={nav.primaryNavLabel}
          className="hidden lg:flex items-center justify-center gap-0.5"
        >
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="inline-flex min-h-[38px] items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-medium text-revix-secondary transition-colors duration-[var(--duration-fast)] hover:bg-revix-tint/85 hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <LanguageSwitcher className="shrink-0" />

          <div className="hidden lg:flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="mx-0.5 h-4 w-px bg-revix-border"
            />
            <Link
              href="/login"
              className="inline-flex min-h-[38px] items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-revix-dark transition-colors duration-[var(--duration-fast)] hover:bg-revix-tint hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
            >
              {nav.login}
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-[38px] items-center justify-center whitespace-nowrap rounded-full border border-revix-primary bg-revix-primary px-4 py-1.5 text-[13.5px] font-semibold text-revix-white shadow-xs transition-[background-color,border-color,box-shadow,transform] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:bg-revix-primary-hover hover:border-revix-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary motion-reduce:transform-none"
            >
              {nav.createAccount}
            </Link>
          </div>

          <IconButton
            ref={menuButtonRef}
            aria-label={isMobileMenuOpen ? nav.closeMenu : nav.openMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls={drawerId}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="lg:hidden rounded-full"
          >
            <RevixIcon
              name={isMobileMenuOpen ? "close" : "menu"}
              size={20}
            />
          </IconButton>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <>
          <div
            aria-hidden="true"
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-revix-dark/25 backdrop-blur-[1px] lg:hidden"
          />

          <div
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label={nav.mobileDrawerLabel}
            className="fixed inset-x-3 top-4 z-50 mx-auto max-w-[460px] rounded-card border border-revix-border bg-revix-white p-4 shadow-dialog sm:inset-x-6 lg:hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-revix-border pb-3">
              <div className="flex items-center min-w-0">
                <RevixWordmark
                  alt={nav.brandName}
                  descriptor={nav.brandDescriptor}
                  className="h-[20px]"
                />
              </div>

              <IconButton
                ref={closeButtonRef}
                aria-label={nav.closeMenu}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <RevixIcon name="close" size={20} />
              </IconButton>
            </div>

            <nav aria-label={nav.primaryNavLabel} className="mt-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-[44px] w-full items-center justify-between rounded-control px-3 py-2.5 text-start text-[15px] font-medium text-revix-dark transition-colors duration-[var(--duration-fast)] hover:bg-revix-tint hover:text-revix-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
                >
                  <span>{item.label}</span>
                  <RevixIcon
                    name="chevron-down"
                    size={16}
                    className="-rotate-90 rtl:rotate-90 text-revix-secondary"
                  />
                </a>
              ))}
            </nav>

            <div className="mt-4 flex flex-col gap-2.5 border-t border-revix-border pt-4">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-[44px] w-full items-center justify-center rounded-full border border-revix-border bg-revix-white px-4 py-2.5 text-[14px] font-semibold text-revix-primary transition-colors duration-[var(--duration-fast)] hover:bg-revix-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
              >
                {nav.login}
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex min-h-[44px] w-full items-center justify-center rounded-full border border-revix-primary bg-revix-primary px-4 py-2.5 text-[14px] font-semibold text-revix-white transition-colors duration-[var(--duration-fast)] hover:bg-revix-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
              >
                {nav.createAccount}
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
