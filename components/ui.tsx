"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

function ArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

type Variant = "primary" | "light";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  full?: boolean;
  arrow?: boolean;
}

/**
 * Ciklum-style pill button: fully rounded, with a circular arrow badge on the
 * right. `primary` is deep blue with a white badge; `light` is a blue-tinted
 * surface with a solid blue badge.
 */
export function PillButton({
  children,
  variant = "primary",
  full = false,
  arrow = true,
  className = "",
  ...props
}: PillButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      {...props}
      className={`group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-[15px] font-semibold transition-transform duration-150 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 ${
        full ? "w-full justify-between" : ""
      } ${className}`}
      style={{
        background: isPrimary ? "var(--blue)" : "var(--tint)",
        color: isPrimary ? "#ffffff" : "var(--blue)",
      }}
    >
      <span className="whitespace-nowrap">{children}</span>
      {arrow && (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            background: isPrimary ? "#ffffff" : "var(--blue)",
            color: isPrimary ? "var(--blue)" : "#ffffff",
          }}
        >
          <ArrowRight />
        </span>
      )}
    </button>
  );
}

/** Small blue→green gradient dot used in the wordmark lockup. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="brand-mark inline-block shrink-0 rounded-full"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
