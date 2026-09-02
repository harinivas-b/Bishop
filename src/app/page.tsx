"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguageStore } from "@/stores/language-store";
import {
  ChefHat,
  BarChart3,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Languages,
} from "lucide-react";
import Link from "next/link";
import { DASHBOARD_TRANSLATIONS } from "@/lib/translations";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function HomePage() {
  const { lang, toggleLang } = useLanguageStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const landT = DASHBOARD_TRANSLATIONS[mounted ? (lang || "en") : "en"].landingPage;
  const t = {
    ...landT,
    features: [
      {
        icon: ChefHat,
        title: (mounted ? lang : "en") === "ta" ? "ஸ்மார்ட் மெனு மேலாண்மை" : "Smart Menu Management",
        description: (mounted ? lang : "en") === "ta" ? "வகைகள், விலைகள் மற்றும் நேரடி இருப்புத் தரவுகளுடன் உங்கள் மெனுவை எளிதாக உருவாக்கி நிர்வகியுங்கள்." : "Build and manage your menu with categories, pricing, and real-time availability.",
      },
      {
        icon: BarChart3,
        title: (mounted ? lang : "en") === "ta" ? "நேரடி பகுப்பாய்வு (Analytics)" : "Live Analytics",
        description: (mounted ? lang : "en") === "ta" ? "விற்பனையை கண்காணிக்கவும், இருப்பை பார்க்கவும், ஸ்மார்ட் வரைபடங்கள் மூலம் உங்கள் வியாபாரத்தைப் புரிந்து கொள்ளவும்." : "Track sales, monitor inventory, and understand your business with intelligent charts.",
      },
      {
        icon: QrCode,
        title: (mounted ? lang : "en") === "ta" ? "QR ஆர்டரிங் முறை" : "QR Ordering",
        description: (mounted ? lang : "en") === "ta" ? "வாடிக்கையாளர்கள் தங்கள் போனிலேயே QR குறியீட்டை ஸ்கேன் செய்து மெனுவைக் காணவும் எளிதாக ஆர்டர் செய்யவும் முடியும்." : "Customers scan a QR code to view the menu and place orders — no app needed.",
      },
      {
        icon: ShieldCheck,
        title: (mounted ? lang : "en") === "ta" ? "ஆஃப்லைன் வசதி" : "Offline Capable",
        description: (mounted ? lang : "en") === "ta" ? "இணையம் இல்லாமலும் தொடர்ந்து வேலை செய்யலாம். இணையம் வந்ததும் தானாகவே தரவுகள் புதுப்பிக்கப்படும்." : "Keep working even without internet. Data syncs automatically when you're back online.",
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-mint-50 via-white to-mint-50 transition-colors duration-500">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-mint-500 flex items-center justify-center shadow-md shadow-mint-500/20">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-2xl text-slate-950 tracking-tighter drop-shadow-sm transition-all hover:text-black" style={{ fontFamily: "'Arial Black', sans-serif" }}>
              BISHOP
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Language Toggle */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleLang}
              className="mr-1 sm:mr-2 border-mint-200 text-mint-700 hover:bg-mint-50 hover:text-mint-800"
              leftIcon={<Languages className="h-4 w-4" />}
            >
              {(mounted ? lang : "en") === "en" ? "தமிழ்" : "English"}
            </Button>

            <Link href="/login" prefetch={true} className="hidden sm:inline-block">
              <Button variant="ghost" size="sm" className="font-bold">
                {t.signIn}
              </Button>
            </Link>
            <Link href="/register" prefetch={true}>
              <Button size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                {t.getStarted}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-mint-100/80 text-mint-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-mint-200/50">
              <Sparkles className="h-3.5 w-3.5" />
              {t.smartBusiness}
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-[Georgia,Times_New_Roman,serif] font-extrabold text-slate-900 tracking-[-0.02em] leading-[1.08] mb-6">
              {t.manageYour}{" "}
              <span className="gradient-text">{t.bakeryAndHotel}</span>
              <br />
              {t.likeAPro}
            </h1>
            <p className="text-xl sm:text-2xl text-slate-600 max-w-2xl mb-10 leading-relaxed font-[Georgia,Times_New_Roman,serif] font-semibold">
              {t.heroDesc}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-start gap-4 sm:gap-3">
              <Link href="/register" prefetch={true} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="shadow-lg shadow-mint-500/20 px-8 w-full"
                >
                  {t.startFree}
                </Button>
              </Link>
              <Link href="/login" prefetch={true} className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="px-8 font-bold w-full">
                  {t.signIn}
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Scrolling Images Reel */}
          <div className="relative h-[600px] hidden lg:flex gap-6 justify-center overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] -my-20">
            {/* Column 1 - Scroll Down */}
            <div className="flex flex-col gap-6 w-72 animate-scroll-down">
              <img src="/hero/biriyani.png" alt="Biriyani" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/parotta.png" alt="Parotta" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/filtercoffee.png" alt="Filter Coffee" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/noodles.png" alt="Noodles" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              {/* Duplicate for seamless loop */}
              <img src="/hero/biriyani.png" alt="Biriyani" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/parotta.png" alt="Parotta" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/filtercoffee.png" alt="Filter Coffee" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/noodles.png" alt="Noodles" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
            </div>
            
            {/* Column 2 - Scroll Up */}
            <div className="flex flex-col gap-6 w-72 pt-12 animate-scroll-up">
              <img src="/hero/friedrice.png" alt="Fried Rice" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/meals.png" alt="Meals" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/tea.png" alt="Tea" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/puff.png" alt="Puff" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              {/* Duplicate for seamless loop */}
              <img src="/hero/friedrice.png" alt="Fried Rice" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/meals.png" alt="Meals" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/tea.png" alt="Tea" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
              <img src="/hero/puff.png" alt="Puff" className="w-full h-80 object-cover rounded-3xl shadow-xl shadow-black/5" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-5xl sm:text-6xl font-[Georgia,Times_New_Roman,serif] font-extrabold text-slate-900 mb-4">
              {t.everythingYouNeed}
            </h2>
            <p className="text-xl sm:text-2xl text-slate-600 max-w-2xl mx-auto font-[Georgia,Times_New_Roman,serif] font-semibold">
              {t.everythingDesc}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {t.features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-xs hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <div className="h-11 w-11 rounded-xl bg-mint-50 flex items-center justify-center mb-4 group-hover:bg-mint-100 transition-colors">
                  <feature.icon className="h-5 w-5 text-mint-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-mint-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="text-slate-950 tracking-tight" style={{ fontFamily: "'Arial Black', sans-serif" }}>BISHOP</span>
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            © {new Date().getFullYear()} BISHOP. {t.footerDesc}
          </p>
        </div>
      </footer>
    </div>
  );
}
