"use client";

import React, { useMemo } from "react";
import { RevixIcon } from "./RevixIcons";

export interface RevixPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  lang?: "ar" | "en";
  itemLabel?: string;
  className?: string;
  compact?: boolean;
}

export const RevixPagination: React.FC<RevixPaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 8,
  onPageChange,
  lang = "en",
  itemLabel,
  className = "",
  compact = false,
}) => {
  const isAr = lang === "ar";
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  const label = itemLabel || (isAr ? "عنصر" : "items");

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [1];

    if (safePage <= 3) {
      pages.push(2, 3, 4, "...", totalPages);
    } else if (safePage >= totalPages - 2) {
      pages.push("...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push("...", safePage - 1, safePage, safePage + 1, "...", totalPages);
    }

    return pages;
  }, [totalPages, safePage]);

  if (totalItems === 0) {
    if (compact) return null;
    return (
      <div
        className={`flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs sm:text-sm text-gray-500 bg-white ${className}`}
      >
        <span>{isAr ? "لا توجد عناصر لعرضها" : "Showing 0 items"}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center ${compact ? "justify-center" : "flex-col sm:flex-row justify-between"} gap-3 px-4 ${compact ? "py-1.5" : "py-4"} border-t border-gray-100 bg-white text-xs sm:text-sm select-none ${className}`}
    >
      {/* Left text: Showing 1-8 of 12 items */}
      {!compact && <div className="text-gray-500">
        {isAr ? (
          <span>
            عرض <b className="font-semibold text-gray-900">{startItem}–{endItem}</b> من أصل{" "}
            <b className="font-semibold text-gray-900">{totalItems}</b> {label}
          </span>
        ) : (
          <span>
            Showing <b className="font-semibold text-gray-900">{startItem}–{endItem}</b> of{" "}
            <b className="font-semibold text-gray-900">{totalItems}</b> {label}
          </span>
        )}
      </div>}

      {/* Right controls: < Previous  1  2  Next > */}
      <div className="flex items-center gap-1.5">
        {!compact && <button
          type="button"
          onClick={() => safePage > 1 && onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label={isAr ? "الصفحة السابقة" : "Previous page"}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition"
        >
          <RevixIcon name={isAr ? "chevron-right" : "chevron-left"} className="w-3.5 h-3.5" />
          <span>{isAr ? "السابق" : "Previous"}</span>
        </button>}

        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-gray-400 font-medium select-none"
                >
                  ...
                </span>
              );
            }

            const isActive = p === safePage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={isActive ? "page" : undefined}
                className={`${compact ? "min-w-7 h-7 text-xs rounded-md" : "min-w-[34px] h-[34px] text-xs sm:text-sm rounded-lg"} flex items-center justify-center font-semibold transition ${
                  isActive
                    ? "bg-[#0b4d3b] text-white shadow-sm"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {!compact && <button
          type="button"
          onClick={() => safePage < totalPages && onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label={isAr ? "الصفحة التالية" : "Next page"}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-lg transition"
        >
          <span>{isAr ? "التالي" : "Next"}</span>
          <RevixIcon name={isAr ? "chevron-left" : "chevron-right"} className="w-3.5 h-3.5" />
        </button>}
      </div>
    </div>
  );
};
