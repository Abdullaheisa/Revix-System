"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RevixIcon } from "@/components/ui/RevixIcons";
import { getApiErrorMessage } from "@/lib/api/errors";

interface ResourceFeedbackProps {
  isRtl: boolean;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onBack?: () => void;
  loadingTitle?: string;
  loadingSubtitle?: string;
  backLabel?: string;
}

function FleetDocumentsScene({ isLoading, reduceMotion }: { isLoading: boolean; reduceMotion: boolean }) {
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
    <div className="relative mx-auto w-full max-w-[360px] select-none">
      {/* Subtle Ambient Glow */}
      <div
        className={`pointer-events-none absolute inset-x-10 top-6 h-28 rounded-full blur-2xl transition-colors duration-500 ${
          isLoading ? "bg-emerald-500/12" : "bg-rose-500/10"
        }`}
      />

      <svg
        viewBox="0 0 420 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-auto w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="revixCarBody" x1="60" y1="95" x2="340" y2="175" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="revixCarGlass" x1="120" y1="96" x2="265" y2="128" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F5132" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="revixScanBeam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="revixFloorShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0F172A" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground Shadow */}
        <ellipse cx="210" cy="186" rx="158" ry="12" fill="url(#revixFloorShadow)" />

        {/* Floating Document Card 1 (Left — Invoice / PO Sheet) */}
        <motion.g
          initial={{ y: 0 }}
          animate={reduceMotion ? undefined : { y: [-5, 4] }}
          transition={floatTransition(0, 3.0)}
        >
          <rect x="26" y="34" width="66" height="80" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
          <rect x="36" y="46" width="24" height="6" rx="3" fill={isLoading ? "#10B981" : "#F43F5E"} fillOpacity="0.85" />
          <rect x="36" y="59" width="46" height="4" rx="2" fill="#CBD5E1" />
          <rect x="36" y="69" width="38" height="4" rx="2" fill="#E2E8F0" />
          <rect x="36" y="79" width="42" height="4" rx="2" fill="#E2E8F0" />
          <rect x="36" y="92" width="28" height="10" rx="5" fill="#ECFDF5" />
          <circle cx="44" cy="97" r="2.5" fill="#059669" />
          <rect x="50" y="95.5" width="10" height="3" rx="1.5" fill="#059669" fillOpacity="0.7" />
        </motion.g>

        {/* Floating Document Card 2 (Right — Vehicle Folder / Checklist) */}
        <motion.g
          initial={{ y: 0 }}
          animate={reduceMotion ? undefined : { y: [4, -6] }}
          transition={floatTransition(0.45, 3.4)}
        >
          <path
            d="M326 30 H352 L360 38 H392 C396 38 399 41 399 45 V94 C399 98 396 101 392 101 H326 C322 101 319 98 319 94 V37 C319 33 322 30 326 30 Z"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />
          <rect x="331" y="51" width="54" height="5" rx="2.5" fill="#0F5132" fillOpacity="0.18" />
          <rect x="331" y="63" width="44" height="4" rx="2" fill="#CBD5E1" />
          <rect x="331" y="73" width="36" height="4" rx="2" fill="#E2E8F0" />
          <circle cx="381" cy="84" r="9" fill={isLoading ? "#ECFDF5" : "#FFF1F2"} stroke={isLoading ? "#10B981" : "#F43F5E"} strokeWidth="1.4" />
          {isLoading ? (
            <path d="M377.5 84 L380 86.5 L385 81.5" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M381 80 V85 M381 87.8 V88" stroke="#E11D48" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </motion.g>

        {/* Subtle Floating Spark Dots */}
        <motion.circle
          cx="118"
          cy="46"
          r="3.5"
          fill="#10B981"
          fillOpacity="0.45"
          animate={reduceMotion ? undefined : { opacity: [0.25, 0.85, 0.25], scale: [0.85, 1.15, 0.85] }}
          transition={floatTransition(0.2, 2.4)}
        />
        <motion.circle
          cx="298"
          cy="40"
          r="2.8"
          fill="#F59E0B"
          fillOpacity="0.55"
          animate={reduceMotion ? undefined : { opacity: [0.3, 0.9, 0.3], scale: [0.9, 1.2, 0.9] }}
          transition={floatTransition(0.7, 2.8)}
        />

        {/* Sleek Modern White Sedan */}
        <motion.g
          animate={isLoading && !reduceMotion ? { y: [0, -1.5, 0] } : undefined}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Main Car Silhouette */}
          <path
            d="M72 152 C72 138 79 130 92 126 L132 102 C146 93 166 89 194 89 H236 C258 89 276 96 292 110 L318 124 C336 127 348 136 348 150 V162 C348 167 344 171 339 171 H81 C76 171 72 167 72 162 Z"
            fill="url(#revixCarBody)"
            stroke="#CBD5E1"
            strokeWidth="1.6"
          />

          {/* Side Windows */}
          <path
            d="M138 124 L158 103 C166 97 178 95 196 95 H232 C249 95 264 100 278 111 L292 124 Z"
            fill="url(#revixCarGlass)"
          />
          {/* B-Pillar */}
          <path d="M214 95 L208 124" stroke="#F8FAFC" strokeWidth="3.5" />

          {/* Taillight & Headlight */}
          <path d="M74 137 L92 135 C95 135 97 138 96 141 L74 144 Z" fill="#F43F5E" />
          <path d="M326 135 L346 139 L346 146 L323 142 Z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1" />

          {/* Body Accent Line */}
          <path d="M98 144 H316" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />

          {/* Front & Rear Wheels */}
          <g>
            <circle cx="132" cy="170" r="20" fill="#1E293B" />
            <circle cx="132" cy="170" r="11.5" fill="#E2E8F0" />
            <circle cx="132" cy="170" r="4.5" fill="#64748B" />
          </g>
          <g>
            <circle cx="294" cy="170" r="20" fill="#1E293B" />
            <circle cx="294" cy="170" r="11.5" fill="#E2E8F0" />
            <circle cx="294" cy="170" r="4.5" fill="#64748B" />
          </g>
        </motion.g>

        {/* Technician with Digital Clipboard (Inspired by User Reference) */}
        <motion.g
          initial={{ y: 0 }}
          animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Legs / Boots */}
          <path d="M204 134 L201 180 H211 L214 146 L218 180 H228 L224 134 Z" fill="#0F5132" />
          <rect x="199" y="179" width="13" height="5" rx="2.5" fill="#064E3B" />
          <rect x="217" y="179" width="13" height="5" rx="2.5" fill="#064E3B" />

          {/* Torso / Uniform */}
          <path d="M199 97 C199 91 205 88 214 88 C223 88 229 91 229 97 L226 136 H202 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.2" />
          <path d="M204 94 H224 L225 136 H203 Z" fill="#10B981" />
          {/* Straps */}
          <rect x="206" y="88" width="4" height="14" rx="2" fill="#059669" />
          <rect x="218" y="88" width="4" height="14" rx="2" fill="#059669" />

          {/* Head & Cap */}
          <circle cx="215" cy="76" r="8.5" fill="#FDBA74" />
          <path d="M206 73 C206 66 213 63 220 65 L228 69 L207 73 Z" fill="#0F5132" />

          {/* Arm holding Tablet / Clipboard */}
          <path d="M224 102 L239 109 L236 116 L221 110 Z" fill="#FDBA74" />
          <rect x="234" y="102" width="18" height="13" rx="2.5" transform="rotate(-12 234 102)" fill="#F59E0B" />
          <rect x="237" y="105" width="11" height="2" rx="1" transform="rotate(-12 237 105)" fill="#FFFBEB" />
          <rect x="237.5" y="109" width="8" height="2" rx="1" transform="rotate(-12 237.5 109)" fill="#FFFBEB" />
        </motion.g>

        {/* Animated Scanning Beam while Loading */}
        {isLoading && !reduceMotion && (
          <motion.rect
            x="70"
            y="84"
            width="64"
            height="92"
            rx="10"
            fill="url(#revixScanBeam)"
            initial={{ x: 70 }}
            animate={{ x: [70, 286, 70] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </svg>
    </div>
  );
}

export function ResourceFeedback({
  isRtl,
  isLoading,
  error,
  onRetry,
  onBack,
  loadingTitle,
  loadingSubtitle,
  backLabel,
}: ResourceFeedbackProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const detailMsg = error ? getApiErrorMessage(error) : undefined;
  const fallbackMsg = isRtl
    ? "تعذر عرض البيانات. قد تكون غير متاحة أو لا تملك صلاحية الوصول إليها."
    : "Could not load these details. They may be unavailable or you may not have access.";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="flex min-h-[62vh] w-full items-center justify-center p-6"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg rounded-2xl border border-revix-border/80 bg-revix-white px-6 py-8 text-center shadow-xs"
      >
        <FleetDocumentsScene isLoading={Boolean(isLoading)} reduceMotion={reduceMotion} />

        {isLoading ? (
          <div role="status" className="mt-4 space-y-3">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-revix-dark">
                {loadingTitle ||
                  (isRtl ? "جارٍ تجهيز الملف والبيانات..." : "Preparing record & files...")}
              </h2>
              <p className="text-xs text-revix-secondary">
                {loadingSubtitle ||
                  (isRtl
                    ? "يتم تحميل تفاصيل السجل والمرفقات الآن"
                    : "Fetching vehicle documents and operational details")}
              </p>
            </div>

            {/* Smooth Animated Progress Track */}
            <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-revix-surface">
              <motion.div
                className="h-full w-1/2 rounded-full bg-revix-primary"
                initial={{ x: isRtl ? "100%" : "-100%" }}
                animate={
                  reduceMotion
                    ? { x: "0%" }
                    : { x: isRtl ? ["120%", "-120%"] : ["-120%", "120%"] }
                }
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        ) : (
          <div role="alert" className="mt-4 space-y-2">
            <h2 className="text-base font-bold text-revix-dark">
              {isRtl ? "تعذر تحميل البيانات" : "Unable to load details"}
            </h2>
            <p className="mx-auto max-w-md rounded-lg border border-rose-200/80 bg-rose-50/70 px-3.5 py-2 text-xs text-rose-700">
              {detailMsg ? `${fallbackMsg} (${detailMsg})` : fallbackMsg}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {!isLoading && onRetry ? (
            <motion.button
              type="button"
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={onRetry}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-revix-primary px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-revix-primary-hover"
            >
              <RevixIcon name="refresh-cw" size={13} />
              <span>{isRtl ? "إعادة المحاولة" : "Try again"}</span>
            </motion.button>
          ) : null}

          {onBack ? (
            <motion.button
              type="button"
              whileHover={reduceMotion ? undefined : { scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={onBack}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-revix-border bg-white px-4 text-xs font-semibold text-revix-dark transition-colors hover:bg-revix-surface"
            >
              <RevixIcon name={isRtl ? "arrow-right" : "arrow-left"} size={13} />
              <span>{backLabel || (isRtl ? "الرجوع للقائمة" : "Back to list")}</span>
            </motion.button>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
