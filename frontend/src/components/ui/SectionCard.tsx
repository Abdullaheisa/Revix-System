"use client";

import type { ReactNode } from "react";

interface SectionCardProps {
  title?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function SectionCard({
  title,
  rightSlot,
  children,
  noPadding = false,
  className = "",
}: SectionCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xs ${className}`}
    >
      {(title || rightSlot) && (
        <div className="flex items-center justify-between gap-2 border-b border-revix-border/70 px-5 py-3.5">
          {title && <h3 className="text-sm font-bold text-revix-dark">{title}</h3>}
          {rightSlot}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}
