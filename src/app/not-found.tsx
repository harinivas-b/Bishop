"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store, ArrowLeft } from "lucide-react";
import { useLanguageStore } from "@/stores/language-store";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";

export default function NotFoundPage() {
  const { lang } = useLanguageStore();
  const t = DASHBOARD_TRANSLATIONS[lang || "en"].notFoundPage;

  return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="h-16 w-16 bg-mint-50 rounded-2xl flex items-center justify-center mx-auto text-mint-600">
          <Store className="h-8 w-8" />
        </div>

        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-mint-700 bg-mint-50 px-3 py-1 rounded-full border border-mint-200">
            404 — {t.title}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-2">
            {t.desc}
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Link href="/">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {t.backHome}
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button>{t.goDashboard}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
