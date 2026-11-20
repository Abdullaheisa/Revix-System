"use client";

import { StudioModal } from "./StudioModal";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface RevixConfirmModalProps {
  isOpen: boolean;
  isRtl: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function RevixConfirmModal({
  isOpen,
  isRtl,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  isLoading = false,
  errorMessage,
  onConfirm,
  onCancel,
}: RevixConfirmModalProps) {
  const isDanger = variant === "danger";

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidthClass="max-w-[440px]"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border ${
              isDanger
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-emerald-200 bg-emerald-50 text-revix-primary"
            }`}
          >
            <RevixIcon name={isDanger ? "trash-2" : "info"} size={18} />
          </div>
          <p className="pt-0.5 text-[13.5px] leading-relaxed text-revix-dark">
            {message}
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-revix-border pt-3.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="inline-flex h-[34px] cursor-pointer items-center rounded-[6px] border border-revix-border bg-revix-white px-3.5 text-[12.5px] font-medium text-revix-dark transition-colors hover:bg-revix-surface disabled:opacity-50"
          >
            {cancelLabel ?? (isRtl ? "إلغاء" : "Cancel")}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className={`inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-[6px] px-4 text-[12.5px] font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-revix-primary hover:bg-revix-primary-hover"
            }`}
          >
            {isLoading ? (
              <RevixIcon name="refresh-cw" size={13} className="animate-spin" />
            ) : null}
            <span>
              {confirmLabel ??
                (isDanger
                  ? isRtl
                    ? "تأكيد الحذف"
                    : "Confirm Delete"
                  : isRtl
                    ? "تأكيد"
                    : "Confirm")}
            </span>
          </button>
        </div>
      </div>
    </StudioModal>
  );
}
