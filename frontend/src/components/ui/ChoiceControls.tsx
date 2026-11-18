"use client";

import { useId, type InputHTMLAttributes, type Ref } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Checkbox({
  label,
  description,
  error,
  id,
  className = "",
  disabled,
  ref,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;
  const hasError = Boolean(error);

  const describedBy =
    [description ? descriptionId : null, hasError ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <label
        htmlFor={fieldId}
        className={`group inline-flex min-h-[44px] items-start gap-3 py-2 select-none ${
          disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer"
        }`}
      >
        <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            className="peer sr-only"
            {...props}
          />
          <span
            aria-hidden="true"
            className={`flex h-4 w-4 items-center justify-center rounded-[4px] border bg-revix-white transition-colors duration-[var(--duration-fast)] peer-checked:border-revix-primary peer-checked:bg-revix-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-revix-primary peer-disabled:border-revix-border peer-disabled:bg-revix-surface peer-checked:peer-disabled:border-revix-disabled peer-checked:peer-disabled:bg-revix-disabled peer-checked:[&>svg]:opacity-100 ${
              hasError
                ? "border-revix-error"
                : "border-revix-border group-hover:border-revix-primary"
            }`}
          >
            <RevixIcon
              name="check"
              size={12}
              className="text-revix-white opacity-0 transition-opacity duration-[var(--duration-fast)]"
            />
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span
            className={`text-[16px] leading-[1.45] ${
              disabled ? "text-revix-disabled" : "text-revix-dark"
            }`}
          >
            {label}
          </span>
          {description ? (
            <span
              id={descriptionId}
              className="revix-body-sm break-words text-revix-secondary"
            >
              {description}
            </span>
          ) : null}
        </span>
      </label>
      {hasError ? (
        <p
          id={errorId}
          className="revix-body-sm ps-8 break-words text-revix-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
