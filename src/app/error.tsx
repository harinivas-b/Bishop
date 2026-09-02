"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useLanguageStore } from "@/stores/language-store";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].errorPage;

  useEffect(() => {
    console.error("Unhandled runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-500">
          <AlertCircle className="h-8 w-8" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-2">
            {t.desc}
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Button
            onClick={() => reset()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {t.tryAgain}
          </Button>
          <a href="/dashboard">
            <Button variant="outline">{t.goDashboard}</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
