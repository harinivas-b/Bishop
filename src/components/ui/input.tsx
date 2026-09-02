"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { className, label, error, hint, leftIcon, rightIcon, id, ...props },
    ref
  ) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-base font-semibold text-slate-800"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-base font-medium text-slate-900",
              "placeholder:text-slate-400",
              "transition-all duration-200",
              "hover:border-slate-300",
              "focus:outline-none focus:ring-2 focus:ring-mint-500/20 focus:border-mint-500",
              "disabled:opacity-50 disabled:bg-slate-50",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-red-400 focus:ring-red-500/20 focus:border-red-500",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-slate-400">{hint}</p>
        )}
      </div>
    );
  }
);
