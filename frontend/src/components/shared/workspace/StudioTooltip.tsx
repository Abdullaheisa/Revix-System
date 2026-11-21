"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface StudioTooltipProps {
  label?: string;
  shortcut?: string;
  side?: "top" | "bottom" | "end";
  isRtl?: boolean;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

interface Coords {
  top: number;
  left: number;
  transform: string;
}

export function StudioTooltip({
  label,
  shortcut,
  side = "end",
  isRtl = false,
  className = "",
  disabled = false,
  children,
}: StudioTooltipProps) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const isHoveredRef = useRef(false);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 10;

    if (side === "bottom") {
      setCoords({
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      });
    } else if (side === "top") {
      setCoords({
        top: rect.top - gap,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
      });
    } else {
      // "end" respects RTL/LTR direction
      if (isRtl) {
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.left - gap,
          transform: "translate(-100%, -50%)",
        });
      } else {
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.right + gap,
          transform: "translateY(-50%)",
        });
      }
    }
  }, [isRtl, side]);

  // When disabled changes: if becoming enabled while cursor is already hovering, open immediately
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
    if (disabled) {
      setOpen(false);
    } else if (isHoveredRef.current && (label || shortcut)) {
      updatePosition();
      setOpen(true);
    }
    });
    return () => cancelAnimationFrame(frame);
  }, [disabled, label, shortcut, updatePosition]);

  // Close tooltip on window scroll or resize
  useEffect(() => {
    if (!open) return;
    const handleScrollOrResize = () => setOpen(false);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  // If there's no content to show, render children directly
  if (!label && !shortcut) {
    return <>{children}</>;
  }

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    if (disabled) return;
    updatePosition();
    setOpen(true);
  };

  const handleMouseMove = () => {
    isHoveredRef.current = true;
    if (disabled) return;
    if (!open) {
      updatePosition();
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    setOpen(false);
  };

  const handleFocus = () => {
    isHoveredRef.current = true;
    if (disabled) return;
    updatePosition();
    setOpen(true);
  };

  const handleBlur = () => {
    isHoveredRef.current = false;
    setOpen(false);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
    >
      {children}

      {open && !disabled && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                transform: coords.transform,
              }}
              className="pointer-events-none z-[100] flex items-center gap-2 whitespace-nowrap rounded-[7px] bg-[#111827] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
            >
              {label ? <span>{label}</span> : null}
              {shortcut ? (
                <kbd
                  dir="ltr"
                  className="inline-flex items-center rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-white shadow-xs"
                >
                  {shortcut}
                </kbd>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
