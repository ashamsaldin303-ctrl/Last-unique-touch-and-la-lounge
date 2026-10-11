"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Coffee, PenTool, Wrench, Wand2 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SectionHeading } from "@/components/fx/section-heading";
import { Reveal } from "@/components/fx/reveal";
import { HorizontalPin } from "@/components/fx/horizontal-panel";
import { cn } from "@/lib/utils";

const ICONS = [Coffee, PenTool, Wrench, Wand2];

/**
 * Journey — the maison experience, told two ways (Task 43 upgrade):
 *
 *  · MOBILE — the couture vertical timeline: a gold thread draws itself
 *    downward as you scroll, each step's node igniting as it passes
 *    (unchanged, it already speaks the language).
 *
 *  · DESKTOP — a PINNED HORIZONTAL film (ercankeskinx "scroll-based
 *    sections"): the section pins to the viewport and four large panels
 *    glide past under the reader's wheel — each igniting (scale + gold
 *    frame) exactly at center. A gold hairline runs behind the whole
 *    track so the panels read as beads on one thread. A rail of jump
 *    dots (44px targets) + counter lets the reader skip beats.
 */
export function Journey() {
  const { t, locale } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 60%"],
  });
  const thread = useSpring(scrollYProgress, { stiffness: 90, damping: 26 });
  const glowY = useTransform(thread, [0, 1], ["0%", "100%"]);
  const steps = t.journey.steps;
  const isRTL = locale === "ar";

  return (
    <section className="relative py-24 sm:py-28">
      <SectionHeading
        eyebrow={t.journey.eyebrow}
        title={t.journey.title}
        subtitle={t.journey.subtitle}
      />

      {/* ================= DESKTOP — pinned horizontal film ================= */}
      <HorizontalPin
        panelCount={steps.length}
        label={t.journey.title}
        trackClassName="relative py-10"
      >
        {/* one continuous thread behind all panels */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 h-px w-full bg-gradient-to-r from-transparent via-gold/20 to-transparent"
        />
        {steps.map((s, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <article
              key={s.title}
              data-pin-panel={i === 0 ? "true" : "false"}
              className="pin-panel relative z-10 flex w-[min(30rem,38vw)] shrink-0 flex-col justify-between rounded-2xl border border-gold/15 bg-ink-2/80 p-8 backdrop-blur-sm sm:p-10"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-ink shadow-[0_0_24px_rgba(201,162,75,0.18)]">
                  <Icon className="h-6 w-6 text-gold" />
                </span>
                <span className="font-display-en text-5xl italic leading-none text-transparent [background:linear-gradient(180deg,rgba(201,162,75,0.95),rgba(201,162,75,0.25))] [background-clip:text] [-webkit-background-clip:text]">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="mt-10">
                <h3 className="font-display text-2xl text-paper">{s.title}</h3>
                <p className="mt-4 text-sm leading-8 text-paper/60">{s.desc}</p>
              </div>

              {/* gold hairline — ignites with the panel */}
              <span
                aria-hidden
                className="pin-panel-seam mt-8 block h-px w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent"
              />
            </article>
          );
        })}
      </HorizontalPin>

      {/* ================= MOBILE — the couture vertical timeline ================= */}
      <div
        ref={ref}
        className="relative mx-auto max-w-3xl px-4 ps-10 sm:px-6 sm:ps-14 md:hidden"
      >
        {/* rail base */}
        <div className="absolute inset-y-2 start-[15px] w-px bg-line-soft sm:start-[23px]" />
        {/* animated gold thread */}
        <motion.div
          style={{ scaleY: thread, top: glowY }}
          className="absolute inset-y-2 start-[15px] w-[2px] origin-top rounded-full bg-gradient-to-b from-gold-light via-gold to-gold-deep shadow-[0_0_16px_rgba(201,162,75,0.5)] sm:start-[23px]"
        />

        <div className="space-y-12 sm:space-y-16">
          {steps.map((s, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <Reveal
                key={s.title}
                direction={isRTL ? "end" : "start"}
                delay={0.08 * i}
              >
                <div className="group relative">
                  {/* node */}
                  <span
                    className={cn(
                      "absolute -start-10 top-1 flex h-8 w-8 items-center justify-center sm:-start-14",
                      "rounded-full border border-gold/35 bg-ink shadow-[0_0_0_6px_rgba(11,10,8,1)]",
                      "transition-all duration-500 group-hover:border-gold/80 group-hover:shadow-[0_0_20px_rgba(201,162,75,0.4)]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 text-gold" />
                  </span>

                  <div className="card-lux rounded-2xl p-6 transition-transform duration-500 group-hover:-translate-y-1 sm:p-7">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-xl text-paper">{s.title}</h3>
                      <span className="font-display-en text-sm italic text-gold/50">
                        {String(i + 1).padStart(2, "0")} /{" "}
                        {String(steps.length).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-3 text-[13px] leading-7 text-paper/55">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
