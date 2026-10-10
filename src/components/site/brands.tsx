"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sofa, PartyPopper, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SectionHeading } from "@/components/fx/section-heading";
import { Tilt } from "@/components/fx/tilt";
import { Reveal } from "@/components/fx/reveal";
import { cn } from "@/lib/utils";

type BrandKey = "lut" | "lalounge" | "birthday";

const BRANDS: {
  key: BrandKey;
  image: string;
  icon: typeof Sofa;
  accent: string;   // css color
  accentSoft: string; // rgba glow
  ring: string;
}[] = [
  {
    key: "lut",
    image: "/products/lut_heritage.webp",
    icon: Sofa,
    accent: "#c9a24b",
    accentSoft: "rgba(201,162,75,0.16)",
    ring: "rgba(201,162,75,0.4)",
  },
  {
    key: "lalounge",
    image: "/products/lalounge_modern.webp",
    icon: Sparkles,
    accent: "#e6007e",
    accentSoft: "rgba(230,0,126,0.15)",
    ring: "rgba(230,0,126,0.42)",
  },
  {
    key: "birthday",
    image: "/products/birthday_atelier.webp",
    icon: PartyPopper,
    accent: "#f5b914",
    accentSoft: "rgba(245,185,20,0.15)",
    ring: "rgba(245,185,20,0.45)",
  },
];

function BrandCard({
  brand,
  index,
}: {
  brand: (typeof BRANDS)[number];
  index: number;
}) {
  const { t, locale } = useLanguage();
  const b = t.brands[brand.key];
  const Icon = brand.icon;
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;
  const isMiddle = index === 1;

  const go = () => {
    document
      .getElementById(brand.key === "lut" ? "collection" : "contact")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Reveal
      direction="up"
      delay={index * 0.14}
      duration={0.95}
      className={cn("group h-full", isMiddle && "lg:-mt-10")}
    >
      <Tilt max={7} scale={1.015} className="group/tilt h-full [perspective:900px]">
        <button
          onClick={go}
          className="card-lux relative flex h-full w-full flex-col overflow-hidden rounded-3xl p-0 text-start transition-shadow duration-700 hover:shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]"
          aria-label={`${b.category} — ${b.name}`}
        >
          {/* number watermark */}
          <span
            aria-hidden
            className="font-display-en pointer-events-none absolute -top-3 end-4 z-20 text-[92px] font-semibold leading-none opacity-[0.07] select-none"
            style={{ color: brand.accent }}
          >
            {b.index}
          </span>

          {/* image chamber */}
          <div className="relative h-56 overflow-hidden sm:h-64">
            <div className="absolute inset-0 bg-gradient-to-b from-ink-3 to-ink" />
            <div
              className="absolute inset-0 opacity-60 transition-opacity duration-700 group-hover/tilt:opacity-90"
              style={{
                background: `radial-gradient(ellipse 75% 85% at 50% 100%, ${brand.accentSoft}, transparent 70%)`,
              }}
            />
            <Image
              src={brand.image}
              alt={b.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="img-zoom-hover object-cover"
              style={{ mixBlendMode: "luminosity", opacity: 0.85 }}
              priority={index === 0}
            />
            {/* top & bottom veils */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink to-transparent" />

            {/* icon badge */}
            <div
              className="absolute bottom-4 start-4 z-10 flex h-11 w-11 items-center justify-center rounded-xl border backdrop-blur-md transition-transform duration-500 group-hover/tilt:scale-110"
              style={{
                borderColor: brand.ring,
                background: "rgba(11,10,8,0.55)",
                color: brand.accent,
              }}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* rotating ornament ring on hover */}
            <div
              aria-hidden
              className="animate-spin-slower absolute end-5 top-5 z-10 h-9 w-9 rounded-full border border-dashed opacity-0 transition-opacity duration-700 group-hover/tilt:opacity-100"
              style={{ borderColor: brand.ring }}
            />
          </div>

          {/* content */}
          <div className="relative z-10 flex flex-1 flex-col p-6 sm:p-7">
            <p
              className="eyebrow mb-2"
              style={{ color: brand.accent, letterSpacing: "0.28em" }}
            >
              {b.category}
            </p>
            <h3 className="font-display-en text-2xl font-semibold tracking-wide text-paper sm:text-[26px]">
              {b.name}
            </h3>
            {locale === "ar" && b.nameAr && (
              <p className="mt-1 text-sm text-gold/70">{b.nameAr}</p>
            )}
            <p className="mt-3.5 flex-1 text-[13px] leading-7 text-paper/55">
              {b.desc}
            </p>

            {/* CTA row */}
            <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-5">
              <span
                className="flex items-center gap-2 text-sm font-bold transition-all duration-500 group-hover/tilt:gap-3.5"
                style={{ color: brand.accent }}
              >
                {b.cta}
                <Arrow className="h-4 w-4" />
              </span>
              <span
                className="h-2 w-2 rotate-45 transition-transform duration-500 group-hover/tilt:rotate-[135deg] group-hover/tilt:scale-125"
                style={{ background: brand.accent, boxShadow: `0 0 10px ${brand.ring}` }}
              />
            </div>
          </div>

          {/* bottom accent hairline */}
          <span
            aria-hidden
            className="absolute inset-x-8 bottom-0 h-[2px] origin-center scale-x-0 transition-transform duration-700 group-hover/tilt:scale-x-100 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${brand.accent}, transparent)` }}
          />
        </button>
      </Tilt>
    </Reveal>
  );
}

export function Brands() {
  const { t } = useLanguage();
  return (
    <section
      id="brands"
      className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32"
    >
      <SectionHeading
        eyebrow={t.brands.eyebrow}
        title={t.brands.title}
        subtitle={t.brands.subtitle}
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-7">
        {BRANDS.map((b, i) => (
          <BrandCard key={b.key} brand={b} index={i} />
        ))}
      </div>
    </section>
  );
}
