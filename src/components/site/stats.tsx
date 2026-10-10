"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { Counter } from "@/components/fx/counter";
import { Reveal } from "@/components/fx/reveal";

/**
 * Stats — cinematic counter strip on a raised ink band.
 * Numbers animate with locale-native digits (Arabic-Indic for ar).
 */
export function Stats() {
  const { t, locale } = useLanguage();
  return (
    <section className="relative px-4 py-10 sm:py-14" aria-label="Achievements">
      <div className="mx-auto max-w-5xl">
        <Reveal direction="scale" duration={1}>
          <div className="glass relative overflow-hidden rounded-3xl px-6 py-10 sm:px-12">
            {/* inner aura */}
            <div className="aura-gold absolute -top-24 left-1/2 h-56 w-[560px] -translate-x-1/2 opacity-60" />
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(201,162,75,0.7) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />

            <dl className="relative grid grid-cols-2 gap-x-6 gap-y-10 text-center md:grid-cols-4">
              {t.stats.map((s, i) => (
                <Reveal key={s.label} direction="up" delay={0.15 + i * 0.1}>
                  <div className="group">
                    <dt className="order-2 mt-2 text-[11px] tracking-[0.2em] text-paper/50 sm:text-xs">
                      {s.label}
                    </dt>
                    <dd className="font-display order-1 text-4xl text-gold-gradient sm:text-5xl">
                      <Counter
                        value={s.value}
                        suffix={s.suffix}
                        locale={locale}
                        className="tabular-nums"
                      />
                    </dd>
                    <div className="mx-auto mt-4 h-px w-10 bg-gold/25 transition-all duration-500 group-hover:w-16 group-hover:bg-gold/60" />
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
