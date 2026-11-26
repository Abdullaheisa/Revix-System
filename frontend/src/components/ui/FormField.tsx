"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";

import { RevixSelect, type SelectOption } from "@/components/ui/RevixSelect";

export type { SelectOption };

const baseControlClasses =
  "w-full min-w-0 appearance-none rounded-control border text-[16px] sm:text-[15px] text-revix-dark placeholder:text-revix-secondary/75 transition-colors duration-[var(--duration-fast)] ease-in-out focus:bg-revix-white focus:outline-none disabled:cursor-not-allowed disabled:bg-revix-surface disabled:text-revix-disabled tabular-nums";

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

function FieldShell({ fieldId, label, labelEnd, helperText, error, className = "", children }: FieldShellProps) {
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

export function FormInput({ label, labelEnd, helperText, error, rightElement, id, className = "", ref, ...props }: FormInputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hasError = Boolean(error);
  const normalizedProps =
    props.type === "number" && props.value === 0
      ? { ...props, value: "", placeholder: props.placeholder ?? "0" }
      : props;

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
          {...normalizedProps}
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

export interface FormSelectProps {
  label: string;
  placeholder?: string;
  options: readonly SelectOption[] | SelectOption[];
  helperText?: string;
  error?: string;
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  className?: string;
  menuClassName?: string;
  isRtl?: boolean;
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  onBlur?: () => void;
}

export function FormSelect({ label, placeholder, options, helperText, error, id, name, className = "", menuClassName = "", value, defaultValue, disabled = false, required = false, searchable, isRtl, onChange, onBlur }: FormSelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell
      fieldId={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      className={className}
    >
      <RevixSelect
        id={fieldId}
        name={name}
        value={value}
        defaultValue={defaultValue}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        error={Boolean(error)}
        helperText={helperText}
        searchable={searchable}
        isRtl={isRtl}
        menuClassName={menuClassName}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
      />
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

export function FormTextarea({ label, helperText, error, id, className = "", ref, ...props }: FormTextareaProps) {
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
