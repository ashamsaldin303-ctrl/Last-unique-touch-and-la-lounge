"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { VelocityMarquee } from "@/components/fx/velocity-marquee";

/**
 * Marquee — infinite couture keyword ribbon between hero and brands.
 * Duplicated track, direction-aware (RTL/LTR).
 *
 * Task 43: now driven by VelocityMarquee — the ribbon ACCELERATES with
 * the reader's scroll, leans (skews) into the direction of travel, and
 * never fully rests ("a rhythm that speeds up and slows down with the
 * story"). Hover slows it to a courteous drift instead of freezing it.
 */
export function Marquee() {
  const { t } = useLanguage();
  const items = [...t.marquee, ...t.marquee, ...t.marquee];

  return (
    <div
      className="relative overflow-hidden border-y border-gold/12 bg-ink-2/70 py-4"
      aria-hidden
    >
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-20 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-20 bg-gradient-to-l from-ink to-transparent" />

      <VelocityMarquee className="[direction:ltr]">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {items.map((item, i) => (
              <span
                key={`${half}-${i}`}
                className="flex items-center gap-6 px-6 text-sm tracking-[0.18em] text-paper/45"
              >
                <span className="whitespace-nowrap font-display-en italic">
                  {item}
                </span>
                <span className="inline-block h-1.5 w-1.5 rotate-45 bg-gold/50" />
              </span>
            ))}
          </div>
        ))}
      </VelocityMarquee>
    </div>
  );
}
