import { useId } from "react";

export interface RevixSurfaceBackdropProps {
  variant?: "hero" | "cta";
}

/**
 * Restrained fleet-dispatch grid and subtle route-lane geometry
 * designed to frame Revix System content without competing with typography.
 */
export function RevixSurfaceBackdrop({
  variant = "hero",
}: RevixSurfaceBackdropProps) {
  const isHero = variant === "hero";
  const uid = useId().replace(/:/g, "");
  const leftGradId = `revixRouteFadeLeft-${uid}`;
  const rightGradId = `revixRouteFadeRight-${uid}`;
  const radarGradId = `revixRadarFade-${uid}`;

  return (
    <>
      <div className="revix-dispatch-grid absolute inset-0" />

      {isHero ? (
        <svg
          viewBox="0 0 1440 780"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full opacity-70"
        >
          <defs>
            <linearGradient
              id={leftGradId}
              x1="40"
              y1="95"
              x2="480"
              y2="685"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#14532D" stopOpacity="0.02" />
              <stop offset="32%" stopColor="#14532D" stopOpacity="0.16" />
              <stop offset="76%" stopColor="#14532D" stopOpacity="0.11" />
              <stop offset="100%" stopColor="#14532D" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id={rightGradId}
              x1="1400"
              y1="95"
              x2="960"
              y2="685"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#14532D" stopOpacity="0.02" />
              <stop offset="32%" stopColor="#14532D" stopOpacity="0.16" />
              <stop offset="76%" stopColor="#14532D" stopOpacity="0.11" />
              <stop offset="100%" stopColor="#14532D" stopOpacity="0" />
            </linearGradient>
            <radialGradient
              id={radarGradId}
              cx="50%"
              cy="86%"
              r="52%"
              fx="50%"
              fy="86%"
            >
              <stop offset="0%" stopColor="#14532D" stopOpacity="0.09" />
              <stop offset="65%" stopColor="#14532D" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#14532D" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle
            cx="720"
            cy="720"
            r="360"
            stroke={`url(#${radarGradId})`}
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <circle
            cx="720"
            cy="720"
            r="510"
            stroke={`url(#${radarGradId})`}
            strokeWidth="1"
          />

          {/* Left corridor */}
          <path
            d="M 30 120 C 175 165, 250 255, 236 378 C 222 495, 312 595, 452 660"
            stroke={`url(#${leftGradId})`}
            strokeWidth="1.25"
          />
          <path
            d="M 0 162 C 148 206, 220 286, 206 400 C 192 512, 282 614, 424 682"
            stroke={`url(#${leftGradId})`}
            strokeWidth="1.25"
            strokeDasharray="7 9"
          />

          {/* Right corridor */}
          <path
            d="M 1410 120 C 1265 165, 1190 255, 1204 378 C 1218 495, 1128 595, 988 660"
            stroke={`url(#${rightGradId})`}
            strokeWidth="1.25"
          />
          <path
            d="M 1440 162 C 1292 206, 1220 286, 1234 400 C 1248 512, 1158 614, 1016 682"
            stroke={`url(#${rightGradId})`}
            strokeWidth="1.25"
            strokeDasharray="7 9"
          />

          {/* Subtle outer waypoint nodes */}
          <g opacity="0.7">
            <circle cx="236" cy="312" r="10" fill="#14532D" fillOpacity="0.04" />
            <circle
              cx="236"
              cy="312"
              r="4"
              fill="#FFFFFF"
              fillOpacity="0.9"
              stroke="#14532D"
              strokeOpacity="0.25"
              strokeWidth="1.25"
            />
            <circle cx="1204" cy="312" r="10" fill="#14532D" fillOpacity="0.04" />
            <circle
              cx="1204"
              cy="312"
              r="4"
              fill="#FFFFFF"
              fillOpacity="0.9"
              stroke="#14532D"
              strokeOpacity="0.25"
              strokeWidth="1.25"
            />
          </g>
        </svg>
      ) : (
        <svg
          viewBox="0 0 1200 360"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full opacity-65"
        >
          <path
            d="M 10 48 C 135 76, 195 152, 175 238 C 160 302, 215 344, 305 368"
            stroke="#14532D"
            strokeOpacity="0.14"
            strokeWidth="1.25"
          />
          <path
            d="M -15 86 C 110 112, 166 178, 148 256 C 134 316, 186 352, 268 374"
            stroke="#14532D"
            strokeOpacity="0.16"
            strokeWidth="1.25"
            strokeDasharray="7 8"
          />
          <path
            d="M 1190 48 C 1065 76, 1005 152, 1025 238 C 1040 302, 985 344, 895 368"
            stroke="#14532D"
            strokeOpacity="0.14"
            strokeWidth="1.25"
          />
          <path
            d="M 1215 86 C 1090 112, 1034 178, 1052 256 C 1066 316, 1014 352, 932 374"
            stroke="#14532D"
            strokeOpacity="0.16"
            strokeWidth="1.25"
            strokeDasharray="7 8"
          />

          <circle cx="174" cy="176" r="10" fill="#14532D" fillOpacity="0.045" />
          <circle
            cx="174"
            cy="176"
            r="4"
            fill="#FFFFFF"
            stroke="#14532D"
            strokeOpacity="0.26"
            strokeWidth="1.25"
          />
          <circle cx="1026" cy="176" r="10" fill="#14532D" fillOpacity="0.045" />
          <circle
            cx="1026"
            cy="176"
            r="4"
            fill="#FFFFFF"
            stroke="#14532D"
            strokeOpacity="0.26"
            strokeWidth="1.25"
          />
        </svg>
      )}
    </>
  );
}
