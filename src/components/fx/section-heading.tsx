"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  KineticWords,
  KineticLine,
  HairlineDraw,
} from "@/components/fx/kinetic-heading";
import { easeExpoOut } from "@/lib/motion";

/**
 * SectionHeading — the editorial heading block reused across sections:
 * eyebrow with flanking hairlines → display title → subtitle,
 * with the signature gold diamond ornament.
 *
 * Task 43 (prompt-motion round 2): the whole block now speaks the
 * KINETIC language — eyebrow hairlines DRAW themselves, the title rises
 * word-by-word out of clip masks ("every shot enters already moving"),
 * the subtitle follows on a single mask line, and the gold seam
 * signature draws last. Same public API as before — every call site
 * across the site is upgraded by this one file.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  align?: "center" | "start";
}) {
  const centered = align === "center";
  return (
    <div
      className={`mb-12 sm:mb-16 ${centered ? "text-center" : "text-start"}`}
    >
      <div
        className={`flex items-center gap-3 ${centered ? "justify-center" : ""}`}
      >
        <HairlineDraw className="w-8 sm:w-12" />
        <motion.span
          className="eyebrow text-gold/90 inline-block"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.7, ease: easeExpoOut, delay: 0.05 }}
        >
          {eyebrow}
        </motion.span>
        <HairlineDraw className="w-8 sm:w-12" delay={0.05} />
      </div>

      <h2 className="font-display mt-4 text-3xl leading-[1.25] text-paper sm:text-4xl md:text-5xl">
        {typeof title === "string" ? (
          <KineticWords text={title} delay={0.14} stagger={0.075} />
        ) : (
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.9, ease: easeExpoOut, delay: 0.14 }}
          >
            {title}
          </motion.span>
        )}
      </h2>

      {subtitle && (
        <p
          className={`mt-4 text-sm text-paper/55 sm:text-base ${
            centered ? "mx-auto max-w-xl" : "max-w-xl"
          }`}
        >
          <KineticLine delay={0.34}>{subtitle}</KineticLine>
        </p>
      )}

      <motion.span
        aria-hidden
        className={`gold-seam mt-8 block h-px w-40 bg-gradient-to-r from-transparent via-gold/55 to-transparent ${
          centered ? "mx-auto" : ""
        }`}
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-8% 0px" }}
        transition={{ duration: 1.1, ease: easeExpoOut, delay: 0.42 }}
        style={{ transformOrigin: centered ? "center" : "inline-start" }}
      />
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
