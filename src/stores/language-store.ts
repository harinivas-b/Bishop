import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LanguageState {
  lang: "en" | "ta";
  setLang: (lang: "en" | "ta") => void;
  toggleLang: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((state) => ({ lang: state.lang === "en" ? "ta" : "en" })),
    }),
    {
      name: "bishop-language-storage",
    }
  )
);
