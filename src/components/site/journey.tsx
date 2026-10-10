"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Coffee, PenTool, Wrench, Wand2 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SectionHeading } from "@/components/fx/section-heading";
import { Reveal } from "@/components/fx/reveal";
import { cn } from "@/lib/utils";

const ICONS = [Coffee, PenTool, Wrench, Wand2];

/**
 * Journey — a vertical couture timeline. A gold thread draws itself
 * downward as you scroll (scaleY driven by scrollYProgress), with each
 * step's node igniting as it passes.
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

  return (
    <section className="relative mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow={t.journey.eyebrow}
        title={t.journey.title}
        subtitle={t.journey.subtitle}
      />

      <div ref={ref} className="relative ps-10 sm:ps-14">
        {/* rail base */}
        <div className="absolute inset-y-2 start-[15px] w-px bg-line-soft sm:start-[23px]" />
        {/* animated gold thread */}
        <motion.div
          style={{ scaleY: thread, top: glowY }}
          className="absolute inset-y-2 start-[15px] w-[2px] origin-top rounded-full bg-gradient-to-b from-gold-light via-gold to-gold-deep shadow-[0_0_16px_rgba(201,162,75,0.5)] sm:start-[23px]"
        />

        <div className="space-y-12 sm:space-y-16">
          {t.journey.steps.map((s, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal
                key={s.title}
                direction={locale === "ar" ? "end" : "start"}
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
                        {String(i + 1).padStart(2, "0")} / {String(t.journey.steps.length).padStart(2, "0")}
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
