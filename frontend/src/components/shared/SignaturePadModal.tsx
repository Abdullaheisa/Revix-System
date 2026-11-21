"use client";

import { useEffect, useRef, useState } from "react";
import { RevixIcon } from "@/components/ui/RevixIcons";

interface SignaturePadModalProps {
  isOpen: boolean;
  isRtl: boolean;
  title?: string;
  description?: string;
  initialSignatureUrl?: string | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => Promise<void> | void;
}

export function SignaturePadModal(props: SignaturePadModalProps) {
 if (!props.isOpen) return null;
 return <SignaturePad key={props.initialSignatureUrl ?? "new"} {...props} />;
}

function SignaturePad({
  isOpen,
  isRtl,
  title,
  description,
  initialSignatureUrl,
  isSaving = false,
  onClose,
  onSave,
}: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(initialSignatureUrl));

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (initialSignatureUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialSignatureUrl;
    }
  }, [isOpen, initialSignatureUrl]);

  if (!isOpen) return null;

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-revix-border bg-revix-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-revix-border bg-revix-surface/30 px-5 py-3.5">
          <h3 className="text-sm font-bold text-revix-dark">
            {title || (isRtl ? "التوقيع الإلكتروني" : "Electronic Signature")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-revix-muted hover:bg-revix-surface hover:text-revix-dark"
          >
            <RevixIcon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-revix-secondary">
            {description ||
              (isRtl
                ? "وقّع داخل المربع أدناه ليتم حفظ التوقيع وإظهاره في المستند:"
                : "Draw your signature below. It will be stored and printed on the document:")}
          </p>

          <div className="overflow-hidden rounded-xl border-2 border-dashed border-revix-border bg-white">
            <canvas
              ref={canvasRef}
              width={380}
              height={160}
              className="w-full h-40 cursor-crosshair touch-none"
              onPointerDown={(e) => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext("2d");
                if (!canvas || !ctx) return;
                const pt = getPoint(e);
                ctx.beginPath();
                ctx.moveTo(pt.x, pt.y);
                ctx.lineWidth = 2.2;
                ctx.lineCap = "round";
                ctx.strokeStyle = "#111827";
                setIsDrawing(true);
                setHasDrawn(true);
              }}
              onPointerMove={(e) => {
                if (!isDrawing) return;
                const ctx = canvasRef.current?.getContext("2d");
                if (!ctx) return;
                const pt = getPoint(e);
                ctx.lineTo(pt.x, pt.y);
                ctx.stroke();
              }}
              onPointerUp={() => setIsDrawing(false)}
              onPointerLeave={() => setIsDrawing(false)}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext("2d");
                if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                setHasDrawn(false);
              }}
              className="cursor-pointer rounded-lg border border-revix-border px-3 py-1.5 text-xs font-semibold text-revix-secondary hover:bg-revix-surface"
            >
              {isRtl ? "مسح" : "Clear"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-revix-border px-3 py-1.5 text-xs font-semibold text-revix-secondary hover:bg-revix-surface"
              >
                {isRtl ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={!hasDrawn || isSaving}
                onClick={async () => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  await onSave(canvas.toDataURL("image/png"));
                }}
                className="cursor-pointer rounded-lg bg-revix-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-revix-primary-hover disabled:opacity-50"
              >
                {isSaving
                  ? isRtl
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : isRtl
                    ? "حفظ التوقيع"
                    : "Save Signature"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
