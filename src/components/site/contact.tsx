"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, CheckCircle2, Phone, Mail, Instagram, MapPin, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { SectionHeading } from "@/components/fx/section-heading";
import { Reveal } from "@/components/fx/reveal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CONTACT_INFO } from "@/lib/products-data";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "done";

/**
 * Contact — closing act. Split layout: an atmospheric brand panel on one
 * side, and the request form on the other. Submits to /api/contact which
 * persists the lead via Prisma.
 */
export function Contact() {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    eventType: "",
    brand: "",
    message: "",
  });

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      toast({
        title: t.cta.success,
        description: locale === "ar" ? "بريدك وصل إلى فريقنا" : "Your note reached our team",
      });
    } catch {
      setStatus("idle");
      toast({
        title: t.cta.error,
        variant: "destructive",
      });
    }
  };

  const isAr = locale === "ar";

  return (
    <section
      id="contact"
      className="relative scroll-mt-24 px-4 py-24 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          eyebrow={t.cta.eyebrow}
          title={t.cta.title}
          subtitle={t.cta.subtitle}
        />

        <Reveal direction="scale" duration={1}>
          <div className="card-lux grid overflow-hidden rounded-3xl lg:grid-cols-5">
            {/* === Brand atmosphere panel === */}
            <div className="relative flex flex-col justify-between overflow-hidden p-8 sm:p-10 lg:col-span-2">
              <div className="absolute inset-0 bg-gradient-to-b from-ink-3/80 to-ink" />
              <div className="aura-gold absolute -bottom-16 -start-16 h-56 w-56 opacity-70" />
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(201,162,75,0.8) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />

              <div className="relative">
                <Sparkles className="mb-6 h-7 w-7 text-gold" />
                <p className="font-display-en text-lg italic leading-relaxed text-paper/70">
                  {isAr
                    ? "«التفاصيل ليست التفاصيل؛ هي التصميم كله.»"
                    : "\u201CDetails are not the details. They make the design.\u201D"}
                </p>
                <p className="font-display-en mt-2 text-xs tracking-[0.25em] text-gold/50">
                  — CHARLES EAMES
                </p>
              </div>

              {/* contact channels */}
              <ul className="relative mt-12 space-y-5">
                {[
                  { icon: Phone, label: CONTACT_INFO.phone, href: `tel:+${CONTACT_INFO.whatsapp}` },
                  { icon: Mail, label: CONTACT_INFO.email, href: `mailto:${CONTACT_INFO.email}` },
                  { icon: Instagram, label: "@last.unique.touch", href: CONTACT_INFO.instagram },
                  { icon: MapPin, label: isAr ? "الكويت — جميع المناطق" : "Kuwait — all areas", href: undefined },
                ].map(({ icon: Icon, label, href }) => (
                  <li key={label}>
                    {href ? (
                      <a
                        href={href}
                        target={href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3.5 text-sm text-paper/60 transition-colors hover:text-gold"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/20 bg-ink/50 transition-all duration-300 group-hover:border-gold/60">
                          <Icon className="h-4 w-4 text-gold/80" />
                        </span>
                        <span dir="ltr">{label}</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-3.5 text-sm text-paper/60">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/20 bg-ink/50">
                          <Icon className="h-4 w-4 text-gold/80" />
                        </span>
                        {label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* === Form panel === */}
            <div className="relative p-8 sm:p-10 lg:col-span-3">
              <AnimatePresence mode="wait">
                {status === "done" ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex min-h-[420px] flex-col items-center justify-center text-center"
                  >
                    <motion.span
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.2 }}
                      className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 bg-gold/10"
                    >
                      <CheckCircle2 className="h-10 w-10 text-gold" />
                    </motion.span>
                    <h3 className="font-display text-2xl text-paper">{t.cta.success}</h3>
                    <button
                      onClick={() => {
                        setStatus("idle");
                        setForm({ name: "", phone: "", eventType: "", brand: "", message: "" });
                      }}
                      className="mt-8 rounded-full border border-gold/30 px-6 py-2.5 text-sm text-paper/70 transition-all hover:border-gold/70 hover:text-gold"
                    >
                      {isAr ? "إرسال طلب آخر" : "Send another request"}
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={submit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid gap-6 sm:grid-cols-2"
                  >
                    {/* name */}
                    <div className="space-y-2.5 sm:col-span-1">
                      <Label htmlFor="name" className="text-xs tracking-widest text-paper/60">
                        {t.cta.name}
                      </Label>
                      <Input
                        id="name"
                        required
                        value={form.name}
                        onChange={(e) => set("name")(e.target.value)}
                        placeholder={t.cta.namePh}
                        className="h-12 rounded-xl border-gold/20 bg-ink-3/50 text-paper placeholder:text-paper/25 focus-visible:ring-gold/50"
                      />
                    </div>

                    {/* phone */}
                    <div className="space-y-2.5 sm:col-span-1">
                      <Label htmlFor="phone" className="text-xs tracking-widest text-paper/60">
                        {t.cta.phone}
                      </Label>
                      <Input
                        id="phone"
                        required
                        dir="ltr"
                        inputMode="tel"
                        value={form.phone}
                        onChange={(e) => set("phone")(e.target.value)}
                        placeholder={t.cta.phonePh}
                        className="h-12 rounded-xl border-gold/20 bg-ink-3/50 text-start text-paper placeholder:text-paper/25 focus-visible:ring-gold/50"
                      />
                    </div>

                    {/* event type */}
                    <div className="space-y-2.5">
                      <Label className="text-xs tracking-widest text-paper/60">
                        {t.cta.eventType}
                      </Label>
                      <Select value={form.eventType} onValueChange={set("eventType")} required>
                        <SelectTrigger className="h-12 rounded-xl border-gold/20 bg-ink-3/50 text-paper">
                          <SelectValue placeholder={t.cta.eventType} />
                        </SelectTrigger>
                        <SelectContent className="border-gold/20 bg-ink-2 text-paper">
                          {t.cta.eventTypes.map((e) => (
                            <SelectItem
                              key={e}
                              value={e}
                              className="rounded-lg focus:bg-gold/15 focus:text-gold"
                            >
                              {e}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* brand */}
                    <div className="space-y-2.5">
                      <Label className="text-xs tracking-widest text-paper/60">
                        {t.cta.brand}
                      </Label>
                      <Select value={form.brand} onValueChange={set("brand")}>
                        <SelectTrigger className="h-12 rounded-xl border-gold/20 bg-ink-3/50 text-paper">
                          <SelectValue placeholder={t.cta.brand} />
                        </SelectTrigger>
                        <SelectContent className="border-gold/20 bg-ink-2 text-paper">
                          {t.cta.brands.map((b) => (
                            <SelectItem
                              key={b}
                              value={b}
                              className="rounded-lg focus:bg-gold/15 focus:text-gold"
                            >
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* message */}
                    <div className="space-y-2.5 sm:col-span-2">
                      <Label htmlFor="message" className="text-xs tracking-widest text-paper/60">
                        {t.cta.message}
                      </Label>
                      <Textarea
                        id="message"
                        required
                        rows={4}
                        value={form.message}
                        onChange={(e) => set("message")(e.target.value)}
                        placeholder={t.cta.messagePh}
                        className="rounded-xl border-gold/20 bg-ink-3/50 text-paper placeholder:text-paper/25 focus-visible:ring-gold/50"
                      />
                    </div>

                    {/* submit */}
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        disabled={status === "sending"}
                        className={cn(
                          "group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full py-4 text-sm font-bold text-ink",
                          "bg-gradient-to-l from-gold-deep via-gold to-gold-light shadow-[0_14px_40px_-10px_rgba(201,162,75,0.6)]",
                          "transition-all duration-300 hover:scale-[1.015] active:scale-95 disabled:opacity-70"
                        )}
                      >
                        {status === "sending" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t.cta.submitting}
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 rtl:-scale-x-100" />
                            {t.cta.submit}
                          </>
                        )}
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
