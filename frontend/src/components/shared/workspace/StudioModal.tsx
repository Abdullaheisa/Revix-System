"use client";

import { useEffect, type ReactNode } from "react";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidthClass} overflow-y-auto rounded-[12px] border border-revix-border bg-revix-white p-6 shadow-dialog`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-revix-border pb-4">
          <div>
            <h2 className="text-[18px] font-bold text-revix-dark">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-[12.5px] text-revix-secondary">
                {subtitle}
              </p>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
