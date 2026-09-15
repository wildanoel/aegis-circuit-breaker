/**
 * Aegis Logo
 *
 * Mark: the "A" monogram with a cyan vertical bar, vector-traced from the
 * approved brand artwork. The monogram uses currentColor so it inverts with
 * the theme; the accent bar stays cyan in both modes.
 */

import React from "react";

export type LogoVariant = "full" | "mark" | "wordmark";
export type LogoSize = "sm" | "md" | "lg";
export type LogoTheme = "light" | "dark";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  theme?: LogoTheme;
  className?: string;
}

const sizeMap = {
  sm: { mark: "w-6 h-6", text: "text-base" },
  md: { mark: "w-7 h-7", text: "text-lg" },
  lg: { mark: "w-10 h-10", text: "text-2xl" },
};

export const MARK_NAVY_PATH =
  "M810 1779 c-140 -78 -299 -165 -352 -195 l-98 -55 0 -397 0 -398 213 -121 c116 -67 220 -125 230 -129 15 -5 17 0 16 37 -3 92 -5 94 -129 168 l-115 68 -3 166 -2 167 165 0 165 0 0 -332 0 -333 89 -47 88 -46 6 171 c4 98 2 202 -3 242 -6 39 -13 95 -17 125 -7 65 -18 90 -39 90 -19 0 -14 18 32 114 l34 70 0 252 c0 268 -9 524 -19 523 -3 0 -121 -63 -261 -140z m88 -326 l-3 -148 -168 -3 -167 -2 -11 27 c-5 15 -9 41 -7 57 3 29 14 37 173 123 94 51 173 92 178 93 4 0 6 -66 5 -147z M1289 1648 l36 -213 3 83 c2 45 6 82 10 82 4 -1 77 -38 162 -83 135 -71 155 -85 155 -106 0 -20 -13 -32 -73 -64 -40 -22 -110 -49 -155 -62 l-81 -22 -78 -137 -78 -137 -8 -317 c-5 -174 -8 -319 -6 -321 1 -2 101 53 221 122 120 68 275 157 346 196 l127 72 0 179 0 179 -80 47 -79 47 77 47 77 46 3 121 c2 88 -1 123 -10 130 -15 12 -593 323 -600 323 -2 0 12 -96 31 -212z m301 -594 l70 -36 0 -88 0 -87 -117 -66 c-65 -36 -139 -77 -165 -92 l-48 -27 0 216 0 216 95 0 c89 0 99 -2 165 -36z";

export const MARK_ACCENT_PATH =
  "M1126 1923 c-4 -4 -6 -178 -6 -388 l1 -380 -35 -77 c-41 -88 -41 -88 -21 -88 8 0 17 -10 19 -22 6 -27 32 -304 42 -433 12 -176 22 -125 29 166 l7 296 78 138 77 138 -19 101 c-20 114 -35 176 -83 356 -18 69 -36 137 -39 152 -6 28 -38 53 -50 41z";

export const MARK_ACCENT_COLOR = "#0BCAF3";

export function AegisMark({
  size = "md",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 225 222"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`${sizeMap[size].mark} ${className}`}
    >
      <g transform="translate(0,222) scale(0.1,-0.1)">
        <path fill="currentColor" d={MARK_NAVY_PATH} />
        <path fill={MARK_ACCENT_COLOR} d={MARK_ACCENT_PATH} />
      </g>
    </svg>
  );
}

export function Logo({
  variant = "full",
  size = "md",
  theme = "dark",
  className = "",
}: LogoProps) {
  const colorClass = theme === "dark" ? "text-foreground" : "text-background";
  const { text: textSize } = sizeMap[size];

  const Wordmark = () => (
    <span
      className={`${textSize} font-bold ${colorClass} font-[family-name:var(--font-display)] transition-colors`}
      style={{ letterSpacing: "-0.02em" }}
    >
      Aegis
    </span>
  );

  if (variant === "mark") {
    return (
      <div
        className={`inline-flex items-center ${colorClass} ${className}`}
        role="img"
        aria-label="Aegis logo"
      >
        <AegisMark size={size} />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Wordmark />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${colorClass} ${className}`}>
      <AegisMark size={size} />
      <Wordmark />
    </div>
  );
}

export function LogoFull(props: Omit<LogoProps, "variant">) {
  return <Logo {...props} variant="full" />;
}

export function LogoMark(props: Omit<LogoProps, "variant">) {
  return <Logo {...props} variant="mark" />;
}

export function LogoWordmark(props: Omit<LogoProps, "variant">) {
  return <Logo {...props} variant="wordmark" />;
}
