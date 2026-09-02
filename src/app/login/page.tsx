"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Languages } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useLanguageStore } from "@/stores/language-store";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";

export default function LoginPage() {
  const router = useRouter();
  const { lang, toggleLang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].authPages;
  const landT = DASHBOARD_TRANSLATIONS[lang || "en"].landingPage;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const message =
          error.code === "invalid_credentials" ||
          error.message.includes("Invalid login credentials")
            ? "Invalid email or password. If you just registered, please confirm your email first."
            : error.code === "email_not_confirmed"
              ? "Please confirm your email before signing in."
              : error.code === "user_not_found"
                ? "No account was found for this email. Please register first."
                : error.code === "too_many_requests"
                  ? "Too many attempts. Please wait a moment and try again."
                  : error.message;

        toast.error(message);
        return;
      }

      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-shell bg-white min-h-dvh flex items-center justify-center p-4 sm:p-6 relative pt-16 sm:pt-6">
      {/* Back Navigation & Language Switcher */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
        <Link 
          href="/" 
          className="inline-flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 bg-mint-50 hover:bg-mint-100 rounded-full text-mint-600 hover:text-mint-700 transition-all shadow-sm shadow-black/5 hover:shadow-md hover:shadow-mint-500/20 hover:scale-105 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleLang}
          className="border-mint-200 text-mint-700 hover:bg-mint-50 hover:text-mint-800 text-xs sm:text-sm px-2.5 sm:px-3"
          leftIcon={<Languages className="h-4 w-4" />}
        >
          {lang === "en" ? "தமிழ்" : "English"}
        </Button>
      </div>

      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-mint-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-mint-300/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <div className="h-14 w-14 rounded-2xl bg-mint-500 flex items-center justify-center shadow-lg shadow-mint-500/25">
              <span className="text-white font-extrabold text-2xl">B</span>
            </div>
            <span className="text-5xl font-extrabold text-slate-900 tracking-tight">
              BISHOP
            </span>
          </motion.div>
          <br />
          <div className="soft-pill inline-flex items-center rounded-full px-4 py-1.5 text-base font-semibold mb-5 mt-2">
            {t.secureAccess}
          </div>
          <p className="text-slate-600 text-base font-medium">
            {t.signInSubtitle}
          </p>
        </div>

        {/* Login Card */}
        <Card padding="lg" className="auth-card rounded-2xl bg-mint-50 border border-mint-100 shadow-lg shadow-mint-500/10">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <Input
              label={t.emailLabel}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              required
              autoComplete="email"
            />

            <Input
              label={t.passwordLabel}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="w-full mt-1"
            >
              {t.signInBtn}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-center text-sm font-medium text-slate-600">
              {t.noAccount}{" "}
              <Link
                href="/register"
                className="font-bold text-mint-600 hover:text-mint-700 transition-colors"
              >
                {t.registerLink}
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm font-medium text-slate-500 mt-8">
          {landT.footerDesc}
        </p>
      </motion.div>
    </div>
  );
}
