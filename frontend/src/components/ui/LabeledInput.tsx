"use client";

import type { InputHTMLAttributes } from "react";

interface LabeledInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  mono?: boolean;
  inputSize?: "sm" | "md";
}

export function LabeledInput({
  label,
  mono = false,
  inputSize = "md",
  className = "",
  ...rest
}: LabeledInputProps) {
  const heightCls = inputSize === "sm" ? "h-8 rounded-md px-2" : "h-9 rounded-lg px-3";
  const fontCls = mono ? "font-mono" : "";

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-revix-dark">{label}</label>
      <input
        {...rest}
        className={`w-full border border-revix-border bg-white text-xs text-revix-dark focus:border-revix-primary focus:ring-1 focus:ring-revix-primary focus:outline-hidden ${heightCls} ${fontCls} ${className}`}
      />
    </div>
  );
}
