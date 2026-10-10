"use client";

import { motion } from "framer-motion";
import { Reveal } from "./reveal";

/**
 * SectionHeading — the editorial heading block reused across sections:
 * eyebrow with flanking hairlines → display title → subtitle,
 * with the signature gold diamond ornament.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "start";
}) {
  const centered = align === "center";
  return (
    <div
      className={`mb-12 sm:mb-16 ${centered ? "text-center" : "text-start"}`}
    >
      <Reveal direction="up" duration={0.7}>
        <div
          className={`flex items-center gap-3 ${centered ? "justify-center" : ""}`}
        >
          <span className="h-px w-8 bg-gold/40 sm:w-12" aria-hidden />
          <span className="eyebrow text-gold/90">{eyebrow}</span>
          <span className="h-px w-8 bg-gold/40 sm:w-12" aria-hidden />
        </div>
      </Reveal>

      <Reveal direction="up" delay={0.12} duration={0.8}>
        <h2 className="font-display mt-4 text-3xl leading-[1.25] text-paper sm:text-4xl md:text-5xl">
          {title}
        </h2>
      </Reveal>

      {subtitle && (
        <Reveal direction="up" delay={0.22} duration={0.8}>
          <p
            className={`mt-4 text-sm text-paper/55 sm:text-base ${
              centered ? "mx-auto max-w-xl" : "max-w-xl"
            }`}
          >
            {subtitle}
          </p>
        </Reveal>
      )}

      <Reveal direction="scale" delay={0.3} duration={0.9}>
        <div className={`gold-seam mt-8 w-40 ${centered ? "mx-auto" : ""}`} />
      </Reveal>
    </div>
  );
}

/** Small gold diamond bullet used in lists */
export function Diamond({ className = "" }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 rotate-45 bg-gold ${className}`}
    />
  );
}
