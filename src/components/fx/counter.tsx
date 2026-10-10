"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

/**
 * Counter — animates a number from 0 to target when scrolled into view,
 * with a smooth ease-out curve. Formats with locale digits (Arabic-Indic
 * for ar, Latin for en) to stay typographically consistent.
 */
export function Counter({
  value,
  suffix = "",
  duration = 1800,
  className,
  locale = "ar",
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
  locale?: "ar" | "en";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  const formatted = new Intl.NumberFormat(
    locale === "ar" ? "ar-KW-u-nu-arab" : "en-US"
  ).format(display);

  return (
    <span ref={ref} className={className} dir={locale === "ar" ? "rtl" : "ltr"}>
      {formatted}
      {suffix}
    </span>
  );
}
