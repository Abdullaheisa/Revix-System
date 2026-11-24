"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RevixIcon } from "@/components/ui/RevixIcons";

export interface EmptyStateProps {
  message?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

function EmptyTableIllustration({ reduceMotion, compact }: { reduceMotion: boolean; compact: boolean }) {
  const floatTransition = (delay = 0, duration = 3.2) =>
    reduceMotion
      ? { duration: 0 }
      : {
          duration,
          delay,
          repeat: Infinity,
          repeatType: "reverse" as const,
          ease: "easeInOut" as const,
        };

  return (
    <div className={`relative mx-auto select-none ${compact ? "w-44" : "w-56"}`}>
      <div className="pointer-events-none absolute inset-x-8 top-4 h-20 rounded-full bg-emerald-500/10 blur-2xl" />

      <svg
        viewBox="0 0 280 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-auto w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="revixEmptyShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0F172A" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="revixEmptyCard" x1="56" y1="26" x2="224" y2="128" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>
        </defs>

        {/* Ground Shadow */}
        <ellipse cx="140" cy="140" rx="96" ry="8" fill="url(#revixEmptyShadow)" />

        {/* Back Floating Sheet */}
        <motion.g
          initial={{ y: 0 }}
          animate={reduceMotion ? undefined : { y: [-3, 3] }}
          transition={floatTransition(0.2, 3.6)}
        >
          <rect
            x="44"
            y="24"
            width="136"
            height="86"
            rx="12"
            transform="rotate(-4 44 24)"
            fill="#F1F5F9"
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />
        </motion.g>

        {/* Main Table Card */}
        <motion.g
          initial={{ y: 0 }}
          animate={reduceMotion ? undefined : { y: [2, -3] }}
          transition={floatTransition(0, 3.1)}
        >
          <rect
            x="60"
            y="24"
            width="160"
            height="102"
            rx="12"
            fill="url(#revixEmptyCard)"
            stroke="#CBD5E1"
            strokeWidth="1.4"
          />
          {/* Table Header Bar */}
          <path
            d="M60 36C60 29.3726 65.3726 24 72 24H208C214.627 24 220 29.3726 220 36V44H60V36Z"
            fill="#ECFDF5"
          />
          <line x1="60" y1="44" x2="220" y2="44" stroke="#D1FAE5" strokeWidth="1.2" />
          <rect x="74" y="31.5" width="32" height="5" rx="2.5" fill="#0F5132" fillOpacity="0.35" />
          <rect x="116" y="31.5" width="38" height="5" rx="2.5" fill="#10B981" fillOpacity="0.35" />
          <rect x="164" y="31.5" width="24" height="5" rx="2.5" fill="#0F5132" fillOpacity="0.22" />

          {/* Placeholder Table Rows */}
          <rect x="74" y="56" width="132" height="12" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
          <rect x="80" y="60" width="26" height="4" rx="2" fill="#CBD5E1" />
          <rect x="116" y="60" width="44" height="4" rx="2" fill="#E2E8F0" />

          <rect x="74" y="75" width="132" height="12" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
          <rect x="80" y="79" width="32" height="4" rx="2" fill="#CBD5E1" />
          <rect x="122" y="79" width="34" height="4" rx="2" fill="#E2E8F0" />

          <rect x="74" y="94" width="132" height="12" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="3 3" />
          <rect x="80" y="98" width="20" height="4" rx="2" fill="#E2E8F0" />
          <rect x="110" y="98" width="38" height="4" rx="2" fill="#E2E8F0" />
        </motion.g>

        {/* Floating Search / Empty Badge */}
        <motion.g
          initial={{ y: 0 }}
          animate={reduceMotion ? undefined : { y: [-4, 4] }}
          transition={floatTransition(0.45, 2.8)}
        >
          <circle cx="206" cy="96" r="20" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.6" />
          <circle cx="206" cy="96" r="14" fill="#ECFDF5" />
          <circle cx="204.5" cy="94.5" r="5.5" stroke="#0F5132" strokeWidth="1.8" />
          <path d="M208.5 98.5L213 103" stroke="#0F5132" strokeWidth="1.8" strokeLinecap="round" />
        </motion.g>

        {/* Subtle Floating Spark Dots */}
        <motion.circle
          cx="44"
          cy="86"
          r="3.2"
          fill="#10B981"
          fillOpacity="0.45"
          animate={reduceMotion ? undefined : { opacity: [0.25, 0.9, 0.25], scale: [0.85, 1.2, 0.85] }}
          transition={floatTransition(0.15, 2.5)}
        />
        <motion.circle
          cx="236"
          cy="42"
          r="2.8"
          fill="#F59E0B"
          fillOpacity="0.55"
          animate={reduceMotion ? undefined : { opacity: [0.3, 0.9, 0.3], scale: [0.9, 1.2, 0.9] }}
          transition={floatTransition(0.6, 2.7)}
        />
      </svg>
    </div>
  );
}

export function EmptyState({
  message,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  className = "",
}: EmptyStateProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const heading = title || message;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "px-4 py-6" : "px-6 py-10"
      } ${className}`}
    >
      <EmptyTableIllustration reduceMotion={reduceMotion} compact={compact} />

      {heading ? (
        <p className={`mt-2 font-bold text-revix-dark ${compact ? "text-xs" : "text-sm"}`}>
          {heading}
        </p>
      ) : null}

      {description ? (
        <p className="mt-1 max-w-md text-xs text-revix-secondary leading-relaxed">
          {description}
        </p>
      ) : null}

      {actionLabel && onAction ? (
        <motion.button
          type="button"
          whileHover={reduceMotion ? undefined : { scale: 1.02 }}
          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          onClick={onAction}
          className="mt-4 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-revix-primary-hover"
        >
          <RevixIcon name="plus" size={13} />
          <span>{actionLabel}</span>
        </motion.button>
      ) : null}
    </motion.div>
  );
}

export function TableEmptyRow({
  colSpan,
  ...props
}: EmptyStateProps & { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <EmptyState {...props} />
      </td>
    </tr>
  );
}
