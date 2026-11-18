import type { ReactNode } from "react";

export type StudioBadgeVariant =
  | "neutral"
  | "primary"
  | "currency"
  | "success"
  | "amber"
  | "kbd";

export interface StudioBadgeProps {
  variant?: StudioBadgeVariant;
  dir?: "ltr" | "rtl";
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<StudioBadgeVariant, string> = {
  neutral:
    "rounded-full border border-revix-border bg-revix-surface px-2 py-0.5 text-[10.5px] font-semibold text-revix-secondary",
  primary:
    "rounded-full border border-revix-primary/25 bg-revix-tint px-2.5 py-0.5 text-[11px] font-semibold text-revix-primary",
  currency:
    "rounded-full border border-revix-primary/25 bg-revix-tint px-2.5 py-0.5 font-mono text-[11.5px] font-bold text-revix-primary",
  success:
    "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700",
  amber:
    "rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800",
  kbd: "rounded border border-revix-border bg-revix-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-revix-secondary",
};

export function StudioBadge({
  variant = "neutral",
  dir,
  className = "",
  children,
}: StudioBadgeProps) {
  if (variant === "kbd") {
    return (
      <kbd
        dir={dir ?? "ltr"}
        className={`inline-flex shrink-0 items-center ${VARIANT_CLASSES.kbd} ${className}`}
      >
        {children}
      </kbd>
    );
  }

  return (
    <span
      dir={dir}
      className={`inline-flex shrink-0 items-center ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
