"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Boxes,
  CalendarDays,
  ShieldCheck,
  Cuboid,
  Phone,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SectionHeading } from "@/components/fx/section-heading";
import { Reveal } from "@/components/fx/reveal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Product, ProductCategory } from "@/lib/products-data";
import { CONTACT_INFO } from "@/lib/products-data";

type Filter = "all" | ProductCategory;

const FILTERS: { key: Filter; labelKey: keyof ProductFilters }[] = [
  { key: "all", labelKey: "all" },
  { key: "chairs", labelKey: "chairs" },
  { key: "tables", labelKey: "tables" },
  { key: "lighting", labelKey: "lighting" },
];

type ProductFilters = {
  all: string;
  chairs: string;
  tables: string;
  lighting: string;
};

/** Format price in KWD with 3 decimals, locale-aware digits */
function formatKWD(v: number, locale: "ar" | "en") {
  const n = new Intl.NumberFormat(
    locale === "ar" ? "ar-KW-u-nu-arab" : "en-US",
    { minimumFractionDigits: v % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 }
  ).format(v);
  return n;
}

function ProductCard({
  product,
  index,
  onQuickView,
}: {
  product: Product;
  index: number;
  onQuickView: (p: Product) => void;
}) {
  const { t, locale } = useLanguage();
  const name = locale === "ar" ? product.nameAr : product.nameEn;
  const out = product.stock === 0;

  return (
    <Reveal direction="up" delay={(index % 4) * 0.08} duration={0.85}>
      <motion.article
        layout
        whileHover={{ y: -8 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={cn(
          "card-lux group relative flex h-full flex-col rounded-2xl p-0",
          out && "opacity-70 saturate-50"
        )}
      >
        {/* image */}
        <div className="relative h-52 overflow-hidden rounded-t-2xl sm:h-56">
          <div className="absolute inset-0 bg-gradient-to-b from-ink-3/40 to-ink-2" />
          {/* museum spotlight */}
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,162,75,0.14),transparent_65%)] blur-md transition-all duration-700 group-hover:h-48 group-hover:w-48 group-hover:bg-[radial-gradient(circle,rgba(201,162,75,0.22),transparent_65%)]" />
          <Image
            src={product.image}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="img-zoom-hover object-contain p-5 drop-shadow-[0_18px_36px_rgba(0,0,0,0.65)]"
          />
          {/* category chip */}
          <span className="absolute start-3.5 top-3.5 z-10 rounded-full border border-gold/25 bg-ink/70 px-3 py-1 text-[10px] tracking-[0.14em] text-gold backdrop-blur-md">
            {t.products.categories[product.category]}
          </span>
          {product.is3d && (
            <span className="absolute end-3.5 top-3.5 z-10 flex items-center gap-1 rounded-full border border-gold/20 bg-ink/70 px-2.5 py-1 text-[10px] text-paper/70 backdrop-blur-md">
              <Cuboid className="h-3 w-3 text-gold" />
              3D
            </span>
          )}
          {out && (
            <span className="absolute inset-0 z-10 flex items-center justify-center bg-ink/55 backdrop-blur-[2px]">
              <span className="rounded-full border border-paper/25 px-4 py-1.5 text-xs text-paper/80">
                {t.products.outOfStock}
              </span>
            </span>
          )}

          {/* quick-view reveal */}
          <button
            onClick={() => onQuickView(product)}
            className="absolute inset-x-0 bottom-0 z-10 flex translate-y-full items-center justify-center gap-2 bg-gold/92 py-3 text-sm font-bold text-ink backdrop-blur transition-transform duration-500 group-hover:translate-y-0"
            aria-label={`${t.products.quickView} — ${name}`}
          >
            <Eye className="h-4 w-4" />
            {t.products.quickView}
          </button>
        </div>

        {/* body */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-lg leading-8 text-paper">{name}</h3>
          <div className="mt-auto pt-4">
            <div className="gold-seam opacity-60" />
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="font-display text-2xl text-gold-gradient leading-none">
                  {formatKWD(product.rentalPricePerDay, locale)}
                </p>
                <p className="mt-1.5 text-[11px] text-paper/45">
                  {t.products.perDay}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge
                  variant="outline"
                  className="rounded-full border-gold/20 px-2.5 py-0.5 text-[10px] font-normal text-paper/60"
                >
                  {t.products.deposit.replace(
                    "{amount}",
                    formatKWD(product.securityDeposit, locale)
                  )}
                </Badge>
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-[10px]",
                    out ? "text-paper/40" : "text-emerald-300/70"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      out ? "bg-paper/30" : "bg-emerald-400 animate-glow-dot"
                    )}
                  />
                  {out
                    ? t.products.outOfStock
                    : t.products.stock.replace(
                        "{count}",
                        new Intl.NumberFormat(
                          locale === "ar" ? "ar-KW-u-nu-arab" : "en-US"
                        ).format(product.stock)
                      )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </Reveal>
  );
}

/** Quick-view modal — couture spotlight on a single piece */
function QuickView({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, locale } = useLanguage();
  const name = product ? (locale === "ar" ? product.nameAr : product.nameEn) : "";
  const desc = product
    ? locale === "ar"
      ? product.descriptionAr
      : product.descriptionEn
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={locale === "ar" ? "rtl" : "ltr"}
        className="card-lux max-w-3xl gap-0 overflow-hidden rounded-3xl border-gold/20 bg-ink-2 p-0 sm:max-w-3xl [&>button]:z-20"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <div className="grid max-h-[85vh] overflow-y-auto lux-scroll sm:grid-cols-2 sm:overflow-hidden">
          {/* image side */}
          <div className="relative min-h-[280px] bg-gradient-to-b from-ink-3 to-ink sm:min-h-full">
            <div className="aura-gold absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 opacity-70" />
            {product && (
              <Image
                src={product.image}
                alt={name}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-contain p-8"
              />
            )}
            <span className="absolute start-4 top-4 rounded-full border border-gold/25 bg-ink/70 px-3 py-1 text-[10px] tracking-[0.14em] text-gold backdrop-blur-md">
              {product ? t.products.categories[product.category] : ""}
            </span>
          </div>

          {/* info side */}
          <div className="relative flex flex-col p-6 sm:p-8">
            <button
              onClick={() => onOpenChange(false)}
              className="absolute end-4 top-4 rounded-full border border-line-soft p-2 text-paper/70 transition-colors hover:border-gold/50 hover:text-gold"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display pe-10 text-2xl leading-snug text-paper">
              {name}
            </h3>
            <div className="gold-seam mt-5" />

            <p className="mt-5 text-sm leading-8 text-paper/60">{desc}</p>

            {/* price block */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gold/15 bg-ink-3/60 p-4">
                <p className="flex items-center gap-1.5 text-[10px] tracking-widest text-paper/45">
                  <CalendarDays className="h-3.5 w-3.5 text-gold/70" />
                  {t.products.perDay}
                </p>
                <p className="font-display mt-2 text-3xl text-gold-gradient">
                  {product ? formatKWD(product.rentalPricePerDay, locale) : ""}{" "}
                  <span className="text-sm">{locale === "ar" ? "د.ك" : "KWD"}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-gold/15 bg-ink-3/60 p-4">
                <p className="flex items-center gap-1.5 text-[10px] tracking-widest text-paper/45">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold/70" />
                  {locale === "ar" ? "التأمين (يُسترد)" : "Deposit (refundable)"}
                </p>
                <p className="font-display mt-2 text-3xl text-paper/90">
                  {product ? formatKWD(product.securityDeposit, locale) : ""}{" "}
                  <span className="text-sm">{locale === "ar" ? "د.ك" : "KWD"}</span>
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-col gap-3">
              <a
                href={`https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(
                  (locale === "ar" ? "أرغب بحجز: " : "I'd like to rent: ") + name
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-l from-gold-deep via-gold to-gold-light py-3.5 text-sm font-bold text-ink shadow-[0_12px_36px_-10px_rgba(201,162,75,0.6)] transition-transform hover:scale-[1.02] active:scale-95"
              >
                {t.products.rent}
                <Phone className="h-4 w-4" />
              </a>
              <p className="text-center text-[11px] text-paper/40">
                {locale === "ar"
                  ? "الرد خلال دقائق · ٩ص – ١٠م"
                  : "Reply within minutes · 9AM–10PM"}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Collection() {
  const { t, locale } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [qvOpen, setQvOpen] = useState(false);

  // Fetch the collection from our API
  useEffect(() => {
    let alive = true;
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (alive && Array.isArray(d.products)) setProducts(d.products);
      })
      .catch(() => {
        /* API offline — cards area shows skeletons indefinitely */
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? products : products.filter((p) => p.category === filter)),
    [products, filter]
  );

  const openQuickView = (p: Product) => {
    setSelected(p);
    setQvOpen(true);
  };

  return (
    <section
      id="collection"
      className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-28"
    >
      {/* ambient corner aura */}
      <div className="aura-gold absolute -top-10 end-0 h-72 w-72 opacity-40" aria-hidden />

      <SectionHeading
        eyebrow={t.products.eyebrow}
        title={t.products.title}
        subtitle={t.products.subtitle}
      />

      {/* Filter tabs */}
      <Reveal direction="up" delay={0.1}>
        <div
          className="mb-10 flex flex-wrap items-center justify-center gap-2"
          role="tablist"
          aria-label={locale === "ar" ? "تصفية الفئات" : "Filter categories"}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "relative rounded-full px-5 py-2.5 text-[13px] transition-colors duration-300",
                  active ? "text-ink" : "text-paper/65 hover:text-paper"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="filter-pill"
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-l from-gold-deep via-gold to-gold-light shadow-[0_8px_24px_-8px_rgba(201,162,75,0.6)]"
                  />
                )}
                <span className="relative z-10 font-semibold">
                  {t.products.categories[f.labelKey as keyof ProductFilters]}
                </span>
              </button>
            );
          })}
        </div>
      </Reveal>

      {/* Grid */}
      <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} onQuickView={openQuickView} />
          ))}
        </AnimatePresence>

        {/* skeletons while loading */}
        {products.length === 0 &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`sk-${i}`} className="card-lux h-96 animate-pulse">
              <div className="h-52 rounded-t-2xl bg-ink-3/70 sm:h-56" />
              <div className="space-y-4 p-5">
                <div className="h-5 w-3/5 rounded bg-ink-3/70" />
                <div className="h-px w-full bg-ink-3" />
                <div className="flex justify-between">
                  <div className="h-8 w-20 rounded bg-ink-3/70" />
                  <div className="h-5 w-24 rounded bg-ink-3/70" />
                </div>
              </div>
            </div>
          ))}
      </motion.div>

      {/* count note */}
      {products.length > 0 && (
        <Reveal direction="up" delay={0.2}>
          <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-paper/40">
            <Boxes className="h-3.5 w-3.5 text-gold/60" />
            {new Intl.NumberFormat(
              locale === "ar" ? "ar-KW-u-nu-arab" : "en-US"
            ).format(filtered.length)}{" "}
            /{" "}
            {new Intl.NumberFormat(
              locale === "ar" ? "ar-KW-u-nu-arab" : "en-US"
            ).format(products.length)}
          </p>
        </Reveal>
      )}

      <QuickView product={selected} open={qvOpen} onOpenChange={setQvOpen} />
    </section>
  );
}
