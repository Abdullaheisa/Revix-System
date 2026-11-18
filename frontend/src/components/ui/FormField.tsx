"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";

const baseControlClasses =
  "w-full min-w-0 appearance-none rounded-control border text-[16px] sm:text-[15px] text-revix-dark placeholder:text-revix-secondary/75 transition-colors duration-[var(--duration-fast)] ease-in-out focus:bg-revix-white focus:outline-none disabled:cursor-not-allowed disabled:bg-revix-surface disabled:text-revix-disabled";

function getControlStateClasses(hasError: boolean): string {
  return hasError
    ? "border-revix-error bg-revix-white focus:border-revix-error focus:ring-3 focus:ring-revix-error/15"
    : "border-revix-border bg-revix-white hover:border-revix-secondary/45 focus:bg-revix-white focus:border-revix-primary focus:ring-3 focus:ring-revix-primary/15";
}

interface FieldShellProps {
  fieldId: string;
  label: string;
  labelEnd?: ReactNode;
  helperText?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

function FieldShell({
  fieldId,
  label,
  labelEnd,
  helperText,
  error,
  className = "",
  children,
}: FieldShellProps) {
  const hasError = Boolean(error);
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label
          htmlFor={fieldId}
          className="text-[14px] font-medium leading-[1.4] text-revix-dark"
        >
          {label}
        </label>
        {labelEnd}
      </div>
      {children}
      {hasError ? (
        <p
          id={errorId}
          className="revix-body-sm break-words text-revix-error"
          role="alert"
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          id={helperId}
          className="text-[13px] leading-[1.5] break-words text-revix-secondary"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

function getDescribedBy(
  fieldId: string,
  error?: string,
  helperText?: string,
): string | undefined {
  if (error) return `${fieldId}-error`;
  if (helperText) return `${fieldId}-helper`;
  return undefined;
}

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelEnd?: ReactNode;
  helperText?: string;
  error?: string;
  rightElement?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function FormInput({
  label,
  labelEnd,
  helperText,
  error,
  rightElement,
  id,
  className = "",
  ref,
  ...props
}: FormInputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hasError = Boolean(error);

  return (
    <FieldShell
      fieldId={fieldId}
      label={label}
      labelEnd={labelEnd}
      helperText={helperText}
      error={error}
      className={className}
    >
      <div className="relative flex w-full items-center">
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={hasError}
          aria-describedby={getDescribedBy(fieldId, error, helperText)}
          className={`h-[44px] sm:h-[46px] px-3.5 py-2.5 leading-[1.45] ${baseControlClasses} ${
            rightElement ? "pe-12" : ""
          } ${getControlStateClasses(hasError)}`}
          {...props}
        />
        {rightElement ? (
          <div className="absolute end-1 flex items-center justify-center">
            {rightElement}
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  placeholder?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  ref?: Ref<HTMLSelectElement>;
}

export function FormSelect({
  label,
  placeholder,
  options,
  helperText,
  error,
  id,
  className = "",
  value,
  defaultValue,
  ref,
  ...props
}: FormSelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hasError = Boolean(error);
  const resolvedDefaultValue =
    value === undefined && defaultValue === undefined && placeholder
      ? ""
      : defaultValue;
  const placeholderToneClass =
    value !== undefined
      ? value === ""
        ? "text-revix-secondary"
        : "text-revix-dark"
      : 'has-[option[value=""]:checked]:text-revix-secondary text-revix-dark';

  return (
    <FieldShell
      fieldId={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      className={className}
    >
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          value={value}
          defaultValue={resolvedDefaultValue}
          aria-invalid={hasError}
          aria-describedby={getDescribedBy(fieldId, error, helperText)}
          className={`revix-select h-[48px] cursor-pointer appearance-none ps-4 pe-10 py-0 leading-[1.5] ${baseControlClasses} ${placeholderToneClass} ${getControlStateClasses(
            hasError,
          )}`}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className="text-revix-dark"
            >
              {opt.label}
            </option>
          ))}
        </select>
        <span
          className={`pointer-events-none absolute inset-y-0 end-3 flex items-center ${
            props.disabled ? "text-revix-disabled" : "text-revix-dark"
          }`}
        >
          <RevixIcon
            name="chevron-down"
            size={16}
            className="text-current"
          />
        </span>
      </div>
    </FieldShell>
  );
}

export interface FormTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function FormTextarea({
  label,
  helperText,
  error,
  id,
  className = "",
  ref,
  ...props
}: FormTextareaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hasError = Boolean(error);

  return (
    <FieldShell
      fieldId={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      className={className}
    >
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={hasError}
        aria-describedby={getDescribedBy(fieldId, error, helperText)}
        className={`min-h-[112px] resize-y p-4 leading-[1.55] ${baseControlClasses} ${getControlStateClasses(
          hasError,
        )}`}
        {...props}
      />
    </FieldShell>
  );
}
