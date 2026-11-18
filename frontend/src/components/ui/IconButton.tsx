import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  "aria-label": string;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({
  children,
  className = "",
  type = "button",
  ref,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-control border border-revix-border bg-revix-white text-revix-dark transition-colors duration-[var(--duration-fast)] ease-in-out hover:border-revix-primary/40 hover:bg-revix-tint active:bg-revix-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-revix-primary disabled:cursor-not-allowed disabled:border-revix-border disabled:bg-revix-surface disabled:text-revix-disabled cursor-pointer ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
