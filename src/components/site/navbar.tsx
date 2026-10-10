"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { Globe, Menu, X, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "hero", key: "home" },
  { id: "brands", key: "brands" },
  { id: "collection", key: "products" },
  { id: "experience", key: "experience" },
  { id: "testimonials", key: "testimonials" },
  { id: "contact", key: "contact" },
] as const;

/** Brand monogram — rotated gold diamond frame with LUT letterform */
function Monogram() {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      <span className="absolute inset-0 rotate-45 rounded-[6px] border border-gold/50" />
      <span className="absolute inset-[4px] rotate-45 rounded-[4px] border border-gold/25" />
      <span className="font-display-en text-lg font-semibold text-gold-gradient leading-none pt-0.5">
        L
      </span>
    </div>
  );
}

export function Navbar() {
  const { t, locale, toggle } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("hero");
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  // Track the section in view for the active nav state
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Lock body scroll when the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled ? "py-2" : "py-4"
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 transition-all duration-500 sm:px-6",
            scrolled
              ? "glass rounded-2xl py-2 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]"
              : "py-1"
          )}
        >
          {/* Brand */}
          <button
            onClick={() => go("hero")}
            className="group flex items-center gap-3"
            aria-label="Last Unique Touch — home"
          >
            <Monogram />
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="font-display-en text-[15px] font-semibold tracking-wide text-paper">
                LAST UNIQUE TOUCH
              </span>
              <span className="text-[10px] tracking-[0.3em] text-gold/70">
                {locale === "ar" ? "اللمسة الأخيرة الفريدة" : "COUTURE RENTAL"}
              </span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            {SECTIONS.map(({ id, key }) => (
              <button
                key={id}
                onClick={() => go(id)}
                data-active={active === id}
                className={cn(
                  "nav-underline text-[13px] transition-colors duration-300",
                  active === id ? "text-gold" : "text-paper/70 hover:text-paper"
                )}
              >
                {t.nav[key]}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language toggle */}
            <button
              onClick={toggle}
              className="flex items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1.5 text-xs text-paper/80 transition-all duration-300 hover:border-gold/60 hover:text-gold"
              aria-label="Toggle language"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="font-medium">{locale === "ar" ? "EN" : "ع"}</span>
            </button>

            {/* CTA */}
            <button
              onClick={() => go("contact")}
              className="group relative hidden items-center gap-2 overflow-hidden rounded-full bg-gradient-to-l from-gold-deep via-gold to-gold-light px-5 py-2 text-[13px] font-bold text-ink shadow-[0_8px_28px_-8px_rgba(201,162,75,0.55)] transition-transform duration-300 hover:scale-[1.04] active:scale-95 sm:flex"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t.nav.cta}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setOpen(true)}
              className="rounded-full border border-gold/25 p-2 text-paper lg:hidden"
              aria-label={locale === "ar" ? "افتح القائمة" : "Open menu"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-ink/80 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: locale === "ar" ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: locale === "ar" ? "-100%" : "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass fixed inset-y-0 z-[70] flex w-[78%] max-w-xs flex-col justify-between rounded-none p-6 lg:hidden"
              style={{ [locale === "ar" ? "left" : "right"]: 0 }}
            >
              <div>
                <div className="mb-10 flex items-center justify-between">
                  <Monogram />
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-gold/25 p-2 text-paper"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex flex-col gap-1" aria-label="Mobile">
                  {SECTIONS.map(({ id, key }, i) => (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.06 }}
                      onClick={() => go(id)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-4 py-3.5 text-start text-base transition-colors",
                        active === id
                          ? "bg-gold/10 text-gold"
                          : "text-paper/75 hover:bg-paper/5 hover:text-paper"
                      )}
                    >
                      {t.nav[key]}
                      <span className="h-1.5 w-1.5 rotate-45 bg-gold/50" />
                    </motion.button>
                  ))}
                </nav>
              </div>
              <div className="gold-seam mb-6" />
              <p className="font-display-en text-center text-xs tracking-[0.35em] text-gold/60">
                LAST UNIQUE TOUCH
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
