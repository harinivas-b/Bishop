"use client";

import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Menu, Bell, LogOut, User, Store, Languages } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useLanguageStore } from "@/stores/language-store";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";

interface TopBarProps {
  onMenuClick: () => void;
}

interface NotificationItem {
  id: string;
  message: string;
  created_at: string;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, shop } = useAuthStore();
  const router = useRouter();
  const { lang, toggleLang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"];
  const topBarT = t.topBar;
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!shop) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`orders-notifications-${shop.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shop.id}`,
        },
        (payload) => {
          const order = payload.new as any;
          const message = `New order ${order.order_number} received`;

          setNotifications((prev) => [
            {
              id: order.id,
              message,
              created_at: order.created_at,
            },
            ...prev,
          ].slice(0, 6));
          setUnreadCount((count) => count + 1);
          toast.success(message);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [shop]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm transition-all">
      <div className="flex items-center justify-between h-16 sm:h-20 px-3 sm:px-8">
        {/* Left: Menu + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors touch-target flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Language Switcher */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-2xl bg-white border-2 border-slate-100 text-mint-700 font-extrabold text-xs sm:text-sm shadow-sm hover:border-mint-300 hover:bg-mint-50/80 hover:shadow-md transition-all duration-300 touch-manipulation"
            aria-label="Toggle language"
            title="Switch Language / மொழியை மாற்றுக"
          >
            <Languages className="h-4 w-4 sm:h-5 sm:w-5 text-mint-600 shrink-0" />
            <span className="font-bold">{lang === "en" ? "தமிழ்" : "English"}</span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setShowNotifications((prev) => !prev);
                if (unreadCount > 0) setUnreadCount(0);
              }}
              className="relative p-2 sm:p-3.5 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 shadow-sm hover:text-mint-600 hover:border-mint-300 hover:bg-mint-50/80 hover:shadow-lg transition-all duration-300 touch-manipulation"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 sm:h-[26px] sm:w-[26px] drop-shadow-md" strokeWidth={2.5} />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] sm:text-xs shadow-[0_0_15px_rgba(34,197,94,0.8)] border-2 border-white">
                  {unreadCount}
                </Badge>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-100 shadow-lg py-2 z-50">
                <div className="px-4 pb-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">
                    {topBarT.notifications}
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500">
                      {topBarT.noNotifications}
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100"
                      >
                        <p>{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="group flex items-center gap-2 sm:gap-4 p-1 sm:p-2 pr-2.5 sm:pr-5 rounded-2xl sm:rounded-[20px] bg-white border-2 border-slate-50 hover:border-mint-200 shadow-sm hover:shadow-xl hover:shadow-mint-500/10 transition-all duration-300 touch-manipulation"
            >
              <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl sm:rounded-[14px] bg-gradient-to-br from-teal-500 via-mint-500 to-emerald-400 flex items-center justify-center text-white text-sm sm:text-[20px] font-black shadow-lg shadow-mint-500/40 ring-2 sm:ring-4 ring-white shrink-0">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="hidden sm:flex flex-col text-left justify-center">
                <p className="text-[17px] sm:text-[19px] font-black text-slate-900 uppercase tracking-widest leading-none drop-shadow-sm group-hover:text-mint-700 transition-colors">
                  {user?.full_name || "User"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)] animate-pulse" />
                  <p className="text-[12px] font-black text-emerald-600 uppercase tracking-[0.2em] leading-none">
                    {user?.role === "shopkeeper" ? t.common.shopkeeper : (user?.role || t.common.shopkeeper)}
                  </p>
                </div>
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 sm:w-52 bg-white rounded-xl border border-slate-100 shadow-lg py-1.5 z-50">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  {topBarT.profileAndSettings}
                </Link>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                >
                  <LogOut className="h-4 w-4" />
                  {topBarT.signOut}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
