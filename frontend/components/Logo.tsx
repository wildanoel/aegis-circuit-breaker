/**
 * Aegis Logo
 *
 * Mark: angular shield with a lightning-bolt cutout (negative space),
 * single-color via currentColor so it adapts to light/dark automatically.
 * Wordmark: "Aegis" in Space Grotesk.
 *
 * Variants:
 * - "full":  Mark + Wordmark
 * - "mark":  Mark only (navbar, compact spaces)
 * - "wordmark": text only
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
  sm: { mark: "w-5 h-5", text: "text-base" },
  md: { mark: "w-6 h-6", text: "text-lg" },
  lg: { mark: "w-8 h-8", text: "text-2xl" },
};

// Shield outline + bolt cutout, fill-rule evenodd punches the bolt out.
export const MARK_PATH =
  "M16 3 L28 8 L28 19 L16 29.5 L4 19 L4 8 Z " +
  "M18.6 7.6 L10.8 18.2 L15.2 18.2 L13.4 24.6 L21.2 13.9 L16.7 13.9 Z";

export function AegisMark({
  size = "md",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`${sizeMap[size].mark} ${className}`}
      fill="currentColor"
      fillRule="evenodd"
    >
      <path d={MARK_PATH} fillRule="evenodd" />
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
  const { mark: markSize, text: textSize } = sizeMap[size];

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
        className={`inline-flex items-center text-accent ${className}`}
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
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <AegisMark size={size} className="text-accent" />
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
