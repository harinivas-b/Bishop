"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-mint-500 text-white shadow-sm hover:bg-mint-600 hover:shadow-[0_10px_25px_-10px_rgba(34,197,96,0.45)] hover:-translate-y-0.5 active:bg-mint-700",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-[0_10px_20px_-12px_rgba(15,23,42,0.2)] hover:-translate-y-0.5 active:bg-slate-300",
  outline:
    "border border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-[0_8px_18px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 active:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 hover:shadow-[0_8px_18px_-12px_rgba(15,23,42,0.16)] hover:-translate-y-0.5 active:bg-slate-200",
  danger: "bg-red-500 text-white hover:bg-red-600 hover:shadow-[0_10px_24px_-12px_rgba(239,68,68,0.45)] hover:-translate-y-0.5 active:bg-red-700",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

const LoadingSpinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:pointer-events-none",
          "select-none cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? <LoadingSpinner /> : leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  }
);

/**
 * Animated button using Framer Motion for premium micro-interactions.
 */
export function MotionButton({
  className,
  children,
  ...props
}: HTMLMotionProps<"button"> & { className?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}
