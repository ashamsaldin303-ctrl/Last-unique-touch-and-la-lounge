"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/components/providers/language-provider";
import { CONTACT_INFO } from "@/lib/products-data";

/**
 * WhatsAppFloat — pulsing concierge bubble, bottom-start corner so it
 * never fights the scroll cue or the RTL reading edge on mobile.
 */
export function WhatsAppFloat() {
  const { t, locale } = useLanguage();
  return (
    <motion.a
      href={`https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(
        locale === "ar"
          ? "مرحباً! أرغب بالاستفسار عن تأجير الأثاث للفعاليات"
          : "Hello! I'd like to ask about event furniture rental"
      )}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.whatsapp}
      initial={{ opacity: 0, scale: 0, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 3.2, type: "spring", stiffness: 260, damping: 16 }}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.92 }}
      className="group fixed bottom-5 start-5 z-50 sm:bottom-7 sm:start-7"
    >
      <span className="animate-halo flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] p-3.5 shadow-[0_12px_32px_-8px_rgba(37,211,102,0.55)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-6 w-6 text-white"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M12.04 2a9.9 9.9 0 0 0-8.51 14.94L2 22l5.18-1.5A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.13 15.06l-.3-.17-3.11.9.9-3.02-.19-.31A8.1 8.1 0 0 1 12.04 3.8Zm-3.2 4.23c-.19 0-.5.07-.76.35-.26.28-1 .97-1 2.36s1.02 2.74 1.16 2.93c.14.19 1.96 3.14 4.9 4.24 2.43.9 2.93.72 3.46.67.53-.05 1.71-.7 1.95-1.37.24-.68.24-1.25.17-1.37-.07-.12-.26-.19-.55-.33-.28-.14-1.71-.84-1.98-.94-.26-.09-.45-.14-.64.14-.19.28-.74.93-.9 1.13-.17.19-.33.21-.61.07-.28-.14-1.2-.44-2.3-1.42-.85-.75-1.42-1.68-1.59-1.96-.16-.28-.02-.43.12-.57.13-.13.28-.33.43-.5.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49h-.02Z"
          />
        </svg>
      </span>

      {/* tooltip */}
      <span className="pointer-events-none absolute start-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-gold/25 bg-ink/85 px-4 py-2 text-xs text-paper/80 opacity-0 backdrop-blur transition-all duration-300 group-hover:opacity-100 group-hover:-translate-y-1/2">
        {t.whatsapp}
      </span>
    </motion.a>
  );
}
