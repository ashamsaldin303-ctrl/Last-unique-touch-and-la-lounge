"use client";

import { motion } from "framer-motion";
import { Gem, CalendarClock, Truck, Cuboid } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SectionHeading } from "@/components/fx/section-heading";
import { Reveal } from "@/components/fx/reveal";

const ICONS = [Gem, CalendarClock, Truck, Cuboid];

/**
 * Features — "why us" quartet. Each card holds a floating icon medallion,
 * an index watermark and a hover aurora that follows no cursor (pure CSS
 * transitions keep this section calm & editorial).
 */
export function Features() {
  const { t } = useLanguage();

  return (
    <section
      id="experience"
      className="relative scroll-mt-24 overflow-hidden py-24 sm:py-28"
    >
      {/* backdrop band */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-2/50 to-transparent" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(201,162,75,0.6) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={t.features.eyebrow}
          title={t.features.title}
          subtitle={t.features.subtitle}
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.items.map((f, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={f.title} direction="up" delay={i * 0.12} className="h-full">
                <motion.div
                  whileHover={{ y: -10 }}
                  transition={{ type: "spring", stiffness: 240, damping: 20 }}
                  className="card-lux group relative h-full rounded-2xl p-6"
                >
                  {/* corner aurora on hover */}
                  <div className="aura-gold absolute -top-10 end-[-30px] h-36 w-36 opacity-0 transition-opacity duration-700 group-hover:opacity-60" />

                  {/* icon medallion */}
                  <div className="relative mb-6 flex h-14 w-14 items-center justify-center">
                    <span className="absolute inset-0 rotate-45 rounded-xl border border-gold/30 transition-all duration-500 group-hover:rotate-[135deg] group-hover:border-gold/70" />
                    <span className="absolute inset-2 rotate-45 rounded-lg bg-gradient-to-br from-gold/12 to-transparent" />
                    <Icon className="relative h-6 w-6 text-gold transition-transform duration-500 group-hover:scale-110" />
                  </div>

                  <span
                    aria-hidden
                    className="font-display-en absolute -top-2 start-4 text-6xl font-semibold opacity-[0.06] select-none"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <h3 className="font-display relative text-lg text-paper">{f.title}</h3>
                  <p className="relative mt-3 text-[13px] leading-7 text-paper/55">
                    {f.desc}
                  </p>

                  {/* bottom glow line */}
                  <span className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-l from-transparent via-gold/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
