import type {
  ButtonHTMLAttributes,
  ComponentProps,
  ReactNode,
  Ref,
} from "react";
import { Link } from "@/i18n/navigation";

export type ButtonVariant = "primary" | "secondary" | "outline" | "tertiary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  isLoading?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-revix-primary text-revix-white border border-revix-primary shadow-xs hover:bg-revix-primary-hover hover:border-revix-primary-hover hover:shadow-md hover:shadow-revix-primary/20 active:bg-revix-primary-pressed active:border-revix-primary-pressed disabled:bg-revix-border disabled:border-revix-border disabled:text-revix-disabled disabled:shadow-none disabled:transform-none",
  secondary:
    "bg-revix-white text-revix-primary border border-revix-border shadow-xs hover:bg-revix-tint hover:border-revix-primary/40 hover:shadow-sm active:bg-revix-tint disabled:bg-revix-surface disabled:border-revix-border disabled:text-revix-disabled disabled:shadow-none disabled:transform-none",
  outline:
    "bg-transparent text-revix-dark border border-revix-border shadow-2xs hover:bg-revix-surface hover:border-revix-secondary/60 active:bg-revix-border/40 disabled:bg-revix-surface disabled:border-revix-border disabled:text-revix-disabled disabled:shadow-none disabled:transform-none",
  tertiary:
    "bg-transparent text-revix-primary border border-transparent hover:bg-revix-tint active:bg-revix-tint disabled:bg-transparent disabled:text-revix-disabled disabled:transform-none",
};

const baseClasses =
  "relative inline-flex min-h-[48px] items-center justify-center gap-2 rounded-control px-4 py-2.5 text-center text-[14px] font-semibold leading-[1.4] transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary disabled:cursor-not-allowed disabled:opacity-90 cursor-pointer select-none";

function getButtonClasses(
  variant: ButtonVariant,
  fullWidth: boolean,
  className: string,
): string {
  return `${baseClasses} ${variantClasses[variant]} ${
    fullWidth ? "w-full" : ""
  } ${className}`.trim();
}

export function Button({
  variant = "primary",
  fullWidth = false,
  isLoading = false,
  className = "",
  type = "button",
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={getButtonClasses(variant, fullWidth, className)}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="h-4 w-4 shrink-0 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

export function ButtonLink({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ref,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      ref={ref}
      className={getButtonClasses(variant, fullWidth, className)}
      {...props}
    >
      {children}
    </Link>
  );
}
