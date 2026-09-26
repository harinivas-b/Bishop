"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/auth-store";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Package,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  X,
  ChevronLeft,
} from "lucide-react";
import { useLanguageStore } from "@/stores/language-store";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";

const navItems = [
  { label: "Dashboard", key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", key: "orders", href: "/dashboard/orders", icon: ShoppingBag },
  { label: "Menu", key: "menu", href: "/dashboard/menu", icon: UtensilsCrossed },
  { label: "Items", key: "inventory", href: "/dashboard/inventory", icon: Package },
  { label: "Employees", key: "employees", href: "/dashboard/employees", icon: Users },
  { label: "Tasks", key: "tasks", href: "/dashboard/tasks", icon: ClipboardList },
  { label: "Analytics", key: "analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", key: "settings", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { shop } = useAuthStore();
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-slate-100",
          isCollapsed ? "justify-center" : "gap-2.5"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 group overflow-hidden">
          <div style={{ perspective: 1000 }} className="shrink-0">
            <motion.div
              animate={{
                rotateY: [0, 360],
                filter: [
                  "brightness(1) drop-shadow(0 4px 6px rgba(16, 185, 129, 0.25))",
                  "brightness(0.92) drop-shadow(0 2px 4px rgba(16, 185, 129, 0.15))",
                  "brightness(1) drop-shadow(0 4px 6px rgba(16, 185, 129, 0.25))",
                  "brightness(0.92) drop-shadow(0 2px 4px rgba(16, 185, 129, 0.15))",
                  "brightness(1) drop-shadow(0 4px 6px rgba(16, 185, 129, 0.25))",
                ],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ transformStyle: "preserve-3d" }}
              className="motion-reduce:animate-none motion-reduce:transform-none shrink-0"
            >
              <Image
                src="/bishop-logo.webp"
                alt="BISHOP"
                width={36}
                height={36}
                className="h-9 w-auto object-contain shrink-0"
                priority
              />
            </motion.div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p
                className="text-lg font-black tracking-tight text-emerald-500 truncate leading-tight group-hover:text-emerald-400 transition-colors"
                style={{ fontFamily: "'Arial Black', sans-serif" }}
              >
                {shop?.name || "BISHOP"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,164,0.8)] animate-pulse" />
                <p className="text-[11px] font-extrabold text-emerald-600 truncate uppercase tracking-widest leading-none">
                  {t.common.shopkeeper}
                </p>
              </div>
            </div>
          )}
        </Link>
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-auto"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          
          const label = t.nav[item.key as keyof typeof t.nav] || item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3.5 px-3 py-3 rounded-2xl text-[16px] font-bold tracking-wide transition-all duration-300",
                isCollapsed && "justify-center px-2",
                isActive
                  ? "bg-gradient-to-r from-mint-500 to-mint-400 text-white shadow-lg shadow-mint-500/40 scale-[1.02]"
                  : "text-slate-700 hover:text-mint-700 hover:bg-mint-50/80 hover:scale-[1.02]"
              )}
              title={isCollapsed ? label : undefined}
            >
              <item.icon
                className={cn(
                  "h-[22px] w-[22px] shrink-0 transition-transform duration-300",
                  isActive ? "text-white scale-110 drop-shadow-md" : "text-slate-500 group-hover:text-mint-600 group-hover:scale-105"
                )}
                strokeWidth={2.5}
              />
              {!isCollapsed && <span>{label}</span>}
              {isActive && !isCollapsed && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="ml-auto h-2 w-2 rounded-full bg-white shadow-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle (Desktop only) */}
      <div className="hidden lg:block border-t border-slate-100 p-3">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-full gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              isCollapsed && "rotate-180"
            )}
          />
          {!isCollapsed && <span>{t.common.collapse}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-white border-r border-slate-100 h-dvh sticky top-0 transition-all duration-300",
          isCollapsed ? "w-[72px]" : "w-[250px]"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-[250px] bg-white border-r border-slate-100 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
