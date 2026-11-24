"use client";

import { useEffect, type FormEvent, type ReactNode } from "react";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";

export const MASTER_LABEL_CLASS =
  "mb-1.5 block text-xs font-semibold text-revix-dark";

export const MASTER_INPUT_CLASS =
  "h-10 w-full rounded-lg border border-revix-border bg-revix-white px-3 text-[13px] text-revix-dark placeholder:text-revix-muted transition-colors focus:border-revix-primary focus:ring-2 focus:ring-revix-primary/15 focus:outline-none";

export interface MasterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  isRtl: boolean;
  title: string;
  icon?: RevixIconName;
  errorMsg?: string | null;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  maxWidthClass?: string;
  children: ReactNode;
}

/**
 * Unified, consistent popup form modal used across all Master & catalog screens.
 */
export function MasterFormModal({
  isOpen,
  onClose,
  onSubmit,
  isRtl,
  title,
  icon = "plus",
  errorMsg,
  isSubmitting = false,
  submitLabel,
  cancelLabel,
  maxWidthClass = "max-w-lg",
  children,
}: MasterFormModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      dir={isRtl ? "rtl" : "ltr"}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-dialog animate-in zoom-in-95 duration-150 flex flex-col`}
      >
        {/* Clean Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-revix-border/80 bg-revix-surface/40 px-6 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-revix-accent-soft text-revix-primary">
              <RevixIcon name={icon} size={16} />
            </span>
            <h2 className="truncate text-[16px] font-bold text-revix-dark">{title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isRtl ? "إغلاق" : "Close"}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-revix-white text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark"
          >
            <RevixIcon name="x" size={15} />
          </button>
        </div>

        {/* Form Body & Footer */}
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {errorMsg ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                <RevixIcon name="info" size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : null}

            {children}
          </div>

          {/* Sticky Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-revix-border/80 bg-revix-surface/35 px-6 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-revix-border bg-revix-white px-4 text-xs font-semibold text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark"
            >
              {cancelLabel || (isRtl ? "إلغاء" : "Cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg bg-revix-primary px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-revix-primary-hover disabled:opacity-50"
            >
              {isSubmitting
                ? isRtl
                  ? "جارٍ الحفظ..."
                  : "Saving..."
                : submitLabel || (isRtl ? "حفظ" : "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
