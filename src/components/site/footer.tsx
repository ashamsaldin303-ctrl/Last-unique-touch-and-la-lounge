"use client";

import { Crown, Instagram, Mail, Phone, Heart } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { CONTACT_INFO } from "@/lib/products-data";

/**
 * Footer — editorial close. Sticks to viewport bottom on short content
 * (page wrapper is min-h-screen flex-col; footer carries mt-auto).
 */
export function Footer() {
  const { t, locale } = useLanguage();
  const year = new Intl.NumberFormat("en-US").format(new Date().getFullYear());
  const isAr = locale === "ar";

  const explore = [
    { label: t.nav.brands, href: "#brands" },
    { label: t.nav.products, href: "#collection" },
    { label: t.nav.experience, href: "#experience" },
    { label: t.nav.testimonials, href: "#testimonials" },
  ];
  const brands = [t.brands.lut.name, t.brands.lalounge.name, t.brands.birthday.name];

  const go = (href: string) =>
    document
      .getElementById(href.replace("#", ""))
      ?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="relative overflow-hidden border-t border-gold/12 bg-ink-2/60">
      {/* top aura */}
      <div className="aura-gold absolute -top-24 left-1/2 h-40 w-[640px] -translate-x-1/2 opacity-50" />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 md:grid-cols-4">
          {/* brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center">
                <span className="absolute inset-0 rotate-45 rounded-[7px] border border-gold/50" />
                <span className="absolute inset-[5px] rotate-45 rounded-[5px] border border-gold/25" />
                <Crown className="h-5 w-5 text-gold" />
              </div>
              <div className="flex flex-col">
                <span className="font-display-en text-base font-semibold tracking-wider text-paper">
                  LAST UNIQUE TOUCH
                </span>
                <span className="text-[10px] tracking-[0.3em] text-gold/60">
                  {isAr ? "اللمسة الأخيرة الفريدة" : "COUTURE RENTAL ATELIER"}
                </span>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-[13px] leading-7 text-paper/45">
              {t.footer.tagline}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { icon: Instagram, href: CONTACT_INFO.instagram, label: "Instagram" },
                { icon: Phone, href: `tel:+${CONTACT_INFO.whatsapp}`, label: "Phone" },
                { icon: Mail, href: `mailto:${CONTACT_INFO.email}`, label: "Email" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/20 text-paper/60 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:text-gold"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* explore */}
          <nav aria-label={t.footer.explore}>
            <h3 className="eyebrow mb-5 text-gold/80">{t.footer.explore}</h3>
            <ul className="space-y-3.5">
              {explore.map((l) => (
                <li key={l.href}>
                  <button
                    onClick={() => go(l.href)}
                    className="group flex items-center gap-2.5 text-sm text-paper/55 transition-colors hover:text-gold"
                  >
                    <span className="h-1 w-1 rotate-45 bg-gold/40 transition-all group-hover:bg-gold" />
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* brands */}
          <div>
            <h3 className="eyebrow mb-5 text-gold/80">{t.footer.brands}</h3>
            <ul className="space-y-3.5">
              {brands.map((b) => (
                <li
                  key={b}
                  className="flex items-center gap-2.5 text-sm text-paper/55"
                >
                  <span className="h-1 w-1 rotate-45 bg-gold/40" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* seam */}
        <div className="gold-seam my-10 opacity-70" />

        {/* legal row */}
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-start">
          <p className="text-xs text-paper/40">
            {t.footer.rights.replace("{year}", year)}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-paper/40">
            {t.footer.crafted}
            <Heart className="h-3 w-3 fill-gold/60 text-gold/60" />
          </p>
        </div>
      </div>
    </footer>
  );
}
