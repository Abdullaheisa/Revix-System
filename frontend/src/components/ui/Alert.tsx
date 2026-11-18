import type { ReactNode } from "react";
import { RevixIcon, type RevixIconName } from "@/components/ui/RevixIcons";

export type AlertVariant = "success" | "error" | "warning" | "info";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string | ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  action?: ReactNode;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  {
    container: string;
    iconBg: string;
    iconColor: string;
    iconName: RevixIconName;
    titleColor: string;
    messageColor: string;
  }
> = {
  success: {
    container: "bg-revix-tint border-revix-primary/25 text-revix-dark",
    iconBg: "bg-revix-primary/10 text-revix-primary",
    iconColor: "text-revix-primary",
    iconName: "check-circle-2",
    titleColor: "text-revix-primary",
    messageColor: "text-revix-dark",
  },
  error: {
    container: "bg-rose-50/90 border-revix-error/30 text-revix-dark",
    iconBg: "bg-revix-error/10 text-revix-error",
    iconColor: "text-revix-error",
    iconName: "close",
    titleColor: "text-revix-error",
    messageColor: "text-revix-dark",
  },
  warning: {
    container: "bg-amber-50/90 border-amber-300 text-amber-950",
    iconBg: "bg-amber-100 text-amber-900",
    iconColor: "text-amber-800",
    iconName: "zap",
    titleColor: "text-amber-950",
    messageColor: "text-amber-900",
  },
  info: {
    container: "bg-sky-50/90 border-sky-200 text-sky-950",
    iconBg: "bg-sky-100 text-sky-800",
    iconColor: "text-sky-700",
    iconName: "info",
    titleColor: "text-sky-950",
    messageColor: "text-sky-900",
  },
};

export function Alert({
  variant = "info",
  title,
  message,
  onClose,
  closeLabel = "Close alert",
  action,
  className = "",
}: AlertProps) {
  const current = variantStyles[variant];

  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      className={`relative flex w-full items-start gap-3.5 rounded-card border p-4 shadow-2xs transition-colors duration-[var(--duration-fast)] ${current.container} ${className}`.trim()}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-award ${current.iconBg}`}
      >
        <RevixIcon
          name={current.iconName}
          size={18}
          className={current.iconColor}
        />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        {title ? (
          <h3
            className={`mb-1 text-[15px] font-bold leading-snug break-words ${current.titleColor}`}
          >
            {title}
          </h3>
        ) : null}
        <div
          className={`text-[14px] leading-relaxed break-words ${current.messageColor}`}
        >
          {message}
        </div>
      </div>

      {action || onClose ? (
        <div className="ms-2 flex shrink-0 items-center gap-2">
          {action ? <div>{action}</div> : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-m-2 inline-flex h-[44px] w-[44px] cursor-pointer items-center justify-center rounded-control text-revix-secondary transition-colors duration-[var(--duration-fast)] hover:bg-black/5 hover:text-revix-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary"
            >
              <RevixIcon name="close" size={14} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
