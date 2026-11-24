"use client";

import type { ReactNode } from "react";

export interface DetailTileItem {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}

export interface DetailTileGridProps {
  items: DetailTileItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const GRID_COLUMNS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function DetailTileGrid({
  items,
  columns = 2,
  className = "",
}: DetailTileGridProps) {
  return (
    <dl className={`grid gap-2 ${GRID_COLUMNS[columns]} ${className}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-lg border border-emerald-900/[0.08] bg-emerald-50/75 px-4 py-3 text-start transition-colors hover:bg-emerald-50"
        >
          <dt className="truncate text-[11.5px] font-medium text-slate-500">
            {item.label}
          </dt>
          <dd
            className={`mt-1 truncate text-sm font-semibold tabular-nums ${
              item.valueClassName || "text-[#0F2417]"
            }`}
          >
            {item.value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface DetailTileCardProps {
  title: string;
  headerAction?: ReactNode;
  items: DetailTileItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function DetailTileCard({
  title,
  headerAction,
  items,
  columns = 2,
  className = "",
}: DetailTileCardProps) {
  return (
    <section className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs font-bold tracking-wide text-revix-secondary">
          {title}
        </h3>
        {headerAction}
      </div>
      <DetailTileGrid items={items} columns={columns} />
    </section>
  );
}
