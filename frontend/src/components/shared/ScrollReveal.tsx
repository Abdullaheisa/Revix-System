"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "start" | "end" | "none";
  distance?: number;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Smooth IntersectionObserver reveal wrapper tuned for deliberate,
 * video-like section entrances with RTL-aware logical horizontal directions.
 */
export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 880,
  direction = "up",
  distance = 46,
  threshold = 0.16,
  rootMargin = "0px 0px -64px 0px",
  once = true,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(el);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  const style = {
    "--reveal-distance": `${distance}px`,
    transitionDuration: `${duration}ms`,
    transitionDelay: `${delay}ms`,
  } as CSSProperties;

  return (
    <div
      ref={elementRef}
      data-direction={direction}
      data-visible={isVisible ? "true" : "false"}
      style={style}
      className={`revix-scroll-reveal ${className}`.trim()}
    >
      {children}
    </div>
  );
}
