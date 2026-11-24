"use client";

import { useEffect, type ReactNode } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  maxWidthClass?: string;
  children: ReactNode;
}

export function StudioModal({
  isOpen,
  onClose,
  title,
  subtitle,
  headerAction,
  maxWidthClass = "max-w-[620px]",
  children,
}: StudioModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto rounded-[12px] border border-revix-border bg-white p-6 shadow-dialog animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-revix-border pb-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-revix-dark">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-[12.5px] text-revix-secondary">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction ? <div>{headerAction}</div> : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-revix-border bg-revix-white text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark"
            >
              <RevixIcon name="x" size={15} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
