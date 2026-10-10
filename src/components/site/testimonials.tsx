"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SectionHeading } from "@/components/fx/section-heading";
import { Reveal } from "@/components/fx/reveal";
import { cn } from "@/lib/utils";

/**
 * Testimonials — a rotating spotlight: one grand quote at a time with
 * side previews. Auto-advances every 6s, pauses on hover/interaction.
 */
export function Testimonials() {
  const { t, locale } = useLanguage();
  const items = t.testimonials.items;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((v) => (v + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [paused, items.length]);

  const next = () => setI((v) => (v + 1) % items.length);
  const prev = () => setI((v) => (v - 1 + items.length) % items.length);
  const PrevIcon = locale === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = locale === "ar" ? ChevronLeft : ChevronRight;
  const current = items[i];

  return (
    <section
      id="testimonials"
      className="relative scroll-mt-24 overflow-hidden py-24 sm:py-28"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-2/40 to-transparent" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t.testimonials.eyebrow}
          title={t.testimonials.title}
        />

        <Reveal direction="scale" duration={1}>
          <div
            className="card-lux relative rounded-3xl px-6 py-12 sm:px-14 sm:py-16"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* giant background quote */}
            <Quote
              aria-hidden
              className="absolute -top-4 start-8 h-24 w-24 rotate-180 text-gold/[0.07] sm:start-12"
            />
            <div className="aura-gold absolute -bottom-20 end-0 h-52 w-52 opacity-50" />

            <div className="relative min-h-[240px] sm:min-h-[190px]" dir={locale === "ar" ? "rtl" : "ltr"}>
              <AnimatePresence mode="wait">
                <motion.figure
                  key={i}
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -30, filter: "blur(10px)" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center"
                >
                  <div className="mb-6 flex items-center justify-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <motion.span
                        key={s}
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 + s * 0.09, type: "spring", stiffness: 300 }}
                      >
                        <Star className="h-4 w-4 fill-gold text-gold" />
                      </motion.span>
                    ))}
                  </div>

                  <blockquote className="font-display mx-auto max-w-2xl text-xl leading-[2.1] text-paper/85 sm:text-2xl sm:leading-[2.2]">
                    “{current.quote}”
                  </blockquote>

                  <figcaption className="mt-8">
                    <p className="text-sm font-bold text-gold">{current.name}</p>
                    <p className="mt-1 text-xs tracking-widest text-paper/40">
                      {current.role}
                    </p>
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </div>

            {/* controls */}
            <div className="relative mt-8 flex items-center justify-center gap-6">
              <button
                onClick={prev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 text-paper/70 transition-all duration-300 hover:border-gold/70 hover:text-gold"
                aria-label={locale === "ar" ? "السابق" : "Previous"}
              >
                <PrevIcon className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2.5">
                {items.map((_, d) => (
                  <button
                    key={d}
                    onClick={() => setI(d)}
                    aria-label={`Go to testimonial ${d + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500",
                      d === i
                        ? "w-8 bg-gold shadow-[0_0_10px_rgba(201,162,75,0.6)]"
                        : "w-1.5 bg-paper/20 hover:bg-paper/40"
                    )}
                  />
                ))}
              </div>

              <button
                onClick={next}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 text-paper/70 transition-all duration-300 hover:border-gold/70 hover:text-gold"
                aria-label={locale === "ar" ? "التالي" : "Next"}
              >
                <NextIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
