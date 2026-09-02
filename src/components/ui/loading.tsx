"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

/**
 * Full-screen premium loading indicator with the BISHOP branding.
 */
export function LoadingScreen({
  message = "Loading...",
  className,
}: LoadingScreenProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 flex flex-col items-center justify-center gap-4",
          "bg-gradient-to-br from-mint-50 via-white to-mint-50",
          className
        )}
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex items-center gap-2"
        >
          <div className="h-10 w-10 rounded-xl bg-mint-500 flex items-center justify-center shadow-lg shadow-mint-500/25">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">
            BISHOP
          </span>
        </motion.div>

        {/* Spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-6 w-6 text-mint-500 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">{message}</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Inline loading spinner for smaller areas.
 */
export function LoadingSpinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeMap = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
  return (
    <Loader2
      className={cn("text-mint-500 animate-spin", sizeMap[size], className)}
    />
  );
}
