"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { StudioTooltip } from "@/components/shared/workspace/StudioTooltip";

export interface CompanyLogoUploaderProps {
  isRtl: boolean;
  value: string;
  brandColor?: string;
  companyName?: string;
  onChange: (nextLogoDataUrl: string) => void;
}

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_RAW_BYTES = 5 * 1024 * 1024; // 5 MB before canvas optimization
const MAX_DIMENSION = 320;

async function optimizeLogoFile(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
      img.src = objectUrl;
    });

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(image.width || 1, image.height || 1),
    );
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("CANVAS_UNAVAILABLE");
    }

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const preferPng = file.type === "image/png";
    const outputType = preferPng ? "image/png" : "image/webp";
    const dataUrl = canvas.toDataURL(outputType, 0.88);
    if (dataUrl.length > 340_000) {
      return canvas.toDataURL("image/jpeg", 0.82);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function CompanyLogoUploader({
  isRtl,
  value,
  brandColor = "#14532D",
  companyName,
  onChange,
}: CompanyLogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  async function processFile(file: File) {
    setErrorMessage(undefined);

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setErrorMessage(
        isRtl
          ? "صيغة غير مدعومة. يرجى رفع صورة PNG أو JPG أو WebP."
          : "Unsupported format. Please upload a PNG, JPG, or WebP image.",
      );
      return;
    }

    if (file.size > MAX_RAW_BYTES) {
      setErrorMessage(
        isRtl
          ? "حجم الصورة كبير جدًا. الحد الأقصى 5 ميجابايت."
          : "Image is too large. Maximum file size is 5 MB.",
      );
      return;
    }

    setIsProcessing(true);
    try {
      const optimized = await optimizeLogoFile(file);
      onChange(optimized);
    } catch {
      setErrorMessage(
        isRtl
          ? "تعذّر قراءة الصورة. جرّب ملف صورة آخر."
          : "Could not read that image. Please try another file.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  }

  const infoHint = isRtl
    ? "يفضّل شعار أفقي بالعرض (مثل 3:1 أو 4:1) · PNG شفاف أو JPG (الحد الأقصى 5 ميجابايت)"
    : "Horizontal landscape logo (3:1 or 4:1) recommended · PNG or JPG (max 5 MB)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[13px] font-semibold text-revix-dark">
          {isRtl ? "شعار الشركة (Logo)" : "Company logo"}
          <span className="ms-1.5 text-[11.5px] font-normal text-revix-secondary">
            {isRtl ? "(اختياري)" : "(optional)"}
          </span>
        </label>
        <StudioTooltip label={infoHint} side="top" isRtl={isRtl}>
          <button
            type="button"
            aria-label={infoHint}
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-revix-secondary transition-colors hover:bg-revix-surface hover:text-revix-dark"
          >
            <RevixIcon name="info" size={13} />
          </button>
        </StudioTooltip>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex items-center justify-between gap-3 rounded-control border px-3 py-2 transition-colors ${
            isDragging
              ? "border-revix-primary bg-revix-tint/70"
              : "border-revix-border bg-revix-white"
          }`}
        >
          <div className="flex h-[36px] max-w-[140px] items-center justify-center overflow-hidden rounded-[6px] border border-revix-border bg-revix-surface px-2 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={companyName || (isRtl ? "شعار الشركة" : "Company logo")}
              className="h-full w-auto max-w-full object-contain"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-[30px] cursor-pointer items-center gap-1 rounded-[6px] border border-revix-border bg-revix-surface px-2.5 text-[12px] font-medium text-revix-dark transition-colors hover:border-revix-primary hover:bg-revix-tint hover:text-revix-primary disabled:opacity-60"
            >
              <RevixIcon name="plus" size={12} />
              <span>{isRtl ? "تغيير" : "Replace"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(undefined);
                onChange("");
              }}
              aria-label={isRtl ? "حذف الشعار" : "Remove logo"}
              className="inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[6px] border border-revix-border text-revix-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-revix-error"
            >
              <RevixIcon name="x" size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => handleDrop(e as unknown as DragEvent<HTMLDivElement>)}
          style={!isDragging ? { borderColor: `${brandColor}40` } : undefined}
          className={`flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed px-3 text-[12.5px] font-medium transition-colors disabled:opacity-60 ${
            isDragging
              ? "border-revix-primary bg-revix-tint/70 text-revix-primary"
              : "border-revix-border bg-revix-surface/50 text-revix-secondary hover:border-revix-primary hover:bg-revix-tint/40 hover:text-revix-primary"
          }`}
        >
          <RevixIcon
            name={isProcessing ? "refresh-cw" : "plus"}
            size={14}
            className={isProcessing ? "animate-spin" : ""}
          />
          <span>
            {isProcessing
              ? isRtl
                ? "جاري معالجة الشعار..."
                : "Processing logo..."
              : isRtl
                ? "اضغط لاختيار الشعار أو اسحبه هنا"
                : "Click to choose logo or drop image"}
          </span>
        </button>
      )}

      {errorMessage ? (
        <p className="text-[12px] font-medium text-revix-error">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
