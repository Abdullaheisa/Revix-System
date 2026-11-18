import type { HTMLAttributes, ReactNode } from "react";

export interface ResponsiveContainerProps
  extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: "default" | "wide" | "full";
}

/**
 * Responsive container aligned with Revix layout breakpoints:
 * - default: 1440px max width with standard page gutters
 * - wide: 1536px max width with compact desktop gutters
 * - full: full-bleed width with minimum safe padding
 */
export function ResponsiveContainer({
  children,
  size = "default",
  className = "",
  ...props
}: ResponsiveContainerProps) {
  const containerClasses =
    size === "wide"
      ? "mx-auto w-full max-w-[1536px] px-4 sm:px-6 md:px-8 xl:px-10"
      : size === "full"
      ? "w-full px-4 sm:px-6"
      : "mx-auto w-full max-w-[1440px] px-5 md:px-8 xl:px-20";

  return (
    <div className={`${containerClasses} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
