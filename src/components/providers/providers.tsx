"use client";

import { Toaster } from "sonner";
import { useEffect } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { useLanguageStore } from "@/stores/language-store";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Root providers wrapper.
 * Add any global providers (auth, theme, toast, etc.) here.
 */
export function Providers({ children }: ProvidersProps) {
  const { lang } = useLanguageStore();

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === "ta") {
      document.body.classList.add("lang-ta");
    } else {
      document.body.classList.remove("lang-ta");
    }
  }, [lang]);

  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "1rem",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
            fontSize: "0.875rem",
          },
        }}
      />
    </AuthProvider>
  );
}
