"use client";

import { Link } from "@/i18n/navigation";
import { useSmartBack } from "@/lib/navigationHistory";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface SmartBackButtonProps {
  isRtl: boolean;
  /** Route to fall back to when no previous internal route is recorded. */
  fallbackHref?: string;
  /** Optional custom click handler (used by in-page detail views/modals). */
  onClick?: () => void;
  title?: string;
  size?: number;
  className?: string;
}

const DEFAULT_CLASSES =
  "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-white text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark focus-visible:outline-revix-primary";

/**
 * Reusable smart back button that automatically returns to the previous internal
 * route when navigating between pages, or invokes an optional `onClick` handler.
 */
export function SmartBackButton({
  isRtl,
  fallbackHref = "/workspace",
  onClick,
  title,
  size = 15,
  className,
}: SmartBackButtonProps) {
  const { backHref } = useSmartBack(fallbackHref);
  const label = title ?? (isRtl ? "رجوع" : "Back");
  const icon = <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={size} />;
  const classes = className ?? DEFAULT_CLASSES;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        className={classes}
      >
        {icon}
      </button>
    );
  }

  return (
    <Link href={backHref} title={label} aria-label={label} className={classes}>
      {icon}
    </Link>
  );
}
