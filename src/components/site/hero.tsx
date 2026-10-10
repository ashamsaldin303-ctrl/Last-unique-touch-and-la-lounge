"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import { ArrowDown, Sparkles, Crown, Gem } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { GoldDust } from "@/components/fx/gold-dust";
import { Magnetic } from "@/components/fx/magnetic";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Word-by-word reveal — Arabic script must never be split per-letter
 *  (it would break ligatures), so choreography is word-granular. */
function StaggeredWords({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <motion.span
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.14, delayChildren: delay } },
      }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-nowrap"
          variants={{
            hidden: { opacity: 0, y: 34, filter: "blur(12px)" },
            show: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 1, ease: EASE },
            },
          }}
        >
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** Rotating adjective with mask wipe */
function RotatingWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % words.length), 2600);
    return () => clearInterval(id);
  }, [words.length]);

  return (
    <span className="relative inline-grid overflow-hidden align-baseline">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          initial={{ y: "105%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-105%", opacity: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="text-gold-gradient"
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Hero() {
  const { t, locale } = useLanguage();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yTitle = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const yArt = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const scaleArt = useSpring(useTransform(scrollYProgress, [0, 1], [1, 1.12]), {
    stiffness: 60,
    damping: 20,
  });

  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      id="hero"
      ref={ref}
      className="vignette relative flex min-h-[100svh] flex-col overflow-hidden"
      aria-label={locale === "ar" ? "المقدمة" : "Introduction"}
    >
      {/* === Atmosphere layers === */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,#161209_0%,#0b0a08_60%)]" />
      <GoldDust density={80} />

      {/* Parallax orbs */}
      <motion.div style={{ y: yArt }} className="absolute inset-0" aria-hidden>
        <div className="aura-gold animate-drift absolute -top-32 start-[8%] h-[420px] w-[420px] opacity-70" />
        <div
          className="aura-gold animate-drift absolute bottom-0 end-[4%] h-[380px] w-[380px] opacity-50"
          style={{ animationDelay: "-7s" }}
        />
        <div
          className="aura-gold animate-drift absolute top-1/3 end-[38%] h-[260px] w-[260px] opacity-30"
          style={{ animationDelay: "-3s" }}
        />
      </motion.div>

      {/* Faint architectural grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,162,75,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,75,0.5) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, black, transparent)",
        }}
      />

      {/* Floating furniture art — parallax layer (clean cutouts) */}
      <motion.div
        style={{ y: yArt, scale: scaleArt }}
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
      >
        <motion.div
          initial={{ opacity: 0, x: 60, rotate: 8 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 1.6, delay: 1, ease: EASE }}
          className="absolute end-[6%] top-[22%] hidden w-44 sm:block lg:w-56"
        >
          <div className="animate-drift opacity-55 drop-shadow-[0_30px_70px_rgba(201,162,75,0.25)]">
            <Image
              src="/products/crystal-chandelier.png"
              alt=""
              width={380}
              height={506}
              priority
              className="[filter:brightness(1.05)_saturate(1.15)]"
            />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -60, rotate: -8 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 1.6, delay: 1.2, ease: EASE }}
          className="absolute start-[5%] bottom-[18%] hidden w-36 sm:block lg:w-44"
        >
          <div
            className="animate-drift opacity-50 drop-shadow-[0_30px_70px_rgba(201,162,75,0.2)]"
            style={{ animationDelay: "-5s" }}
          >
            <Image
              src="/products/brass-lantern.png"
              alt=""
              width={300}
              height={400}
              priority
              className="[filter:brightness(1.05)_saturate(1.1)]"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* === Content === */}
      <motion.div
        style={{ y: yTitle, opacity }}
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 pt-32 pb-24 text-center sm:pt-36"
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
          className="mb-6 flex items-center gap-3 sm:gap-4"
        >
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold/60 sm:w-16" />
          <Crown className="h-4 w-4 text-gold" />
          <span className="eyebrow text-gold/90">{t.hero.eyebrow}</span>
          <Crown className="h-4 w-4 text-gold" />
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold/60 sm:w-16" />
        </motion.div>

        {/* Display title */}
        <h1 className="font-display text-[2.6rem] leading-[1.3] text-paper sm:text-6xl md:text-7xl">
          <StaggeredWords text={t.hero.titleA} delay={0.65} />
          <br />
          <StaggeredWords text={t.hero.titleB} delay={1.05} />{" "}
          <RotatingWord words={[...t.hero.rotating]} />
          <br />
          <span className="text-gold-gradient">
            <StaggeredWords text={t.hero.titleC} delay={1.5} />
          </span>
        </h1>

        {/* Latin couture mark */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 2 }}
          className="font-display-en mt-6 text-sm italic tracking-[0.28em] text-paper/35 sm:text-base"
        >
          {t.hero.latinMark}
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 1.9, ease: EASE }}
          className="mt-7 max-w-xl text-sm leading-8 text-paper/60 sm:text-base sm:leading-9"
        >
          {t.hero.subtitle}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2.15, ease: EASE }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
        >
          <Magnetic strength={0.3}>
            <button
              onClick={() => go("collection")}
              className="group relative flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-l from-gold-deep via-gold to-gold-light px-8 py-4 text-sm font-bold text-ink shadow-[0_14px_44px_-10px_rgba(201,162,75,0.65)] transition-transform duration-300 hover:scale-[1.045] active:scale-95"
            >
              <Gem className="h-4 w-4" />
              {t.hero.ctaPrimary}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
          </Magnetic>
          <Magnetic strength={0.22}>
            <button
              onClick={() => go("brands")}
              className="rounded-full border border-gold/30 px-8 py-4 text-sm font-semibold text-paper/85 transition-all duration-300 hover:border-gold/70 hover:bg-gold/5 hover:text-gold"
            >
              {t.hero.ctaSecondary}
            </button>
          </Magnetic>
        </motion.div>
      </motion.div>

      {/* === Scroll cue === */}
      <motion.button
        style={{ opacity }}
        onClick={() => go("brands")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8, duration: 1 }}
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
        aria-label={t.hero.scroll}
      >
        <span className="text-[10px] tracking-[0.35em] text-paper/45">
          {t.hero.scroll}
        </span>
        <span className="flex h-11 w-7 items-start justify-center rounded-full border border-gold/35 p-1.5">
          <span className="animate-scroll-bob h-2 w-1 rounded-full bg-gold" />
        </span>
        <ArrowDown className="h-3 w-3 text-gold/50" />
      </motion.button>

      {/* bottom hairline glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-gold/25 to-transparent" />
    </section>
  );
}
