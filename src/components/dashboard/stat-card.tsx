"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number; // percentage change
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  href?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  iconColor = "bg-mint-50 text-mint-600",
  href,
  className,
}: StatCardProps) {
  const content = (
    <Card hover={!!href} padding="md" className={cn("group", className)}>
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            iconColor
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md",
              change > 0
                ? "text-emerald-700 bg-emerald-50"
                : change < 0
                  ? "text-red-600 bg-red-50"
                  : "text-slate-500 bg-slate-50"
            )}
          >
            {change > 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : change < 0 ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
      {changeLabel && (
        <p className="text-sm text-slate-500 mt-2.5">{changeLabel}</p>
      )}
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
