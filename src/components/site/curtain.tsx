"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Curtain — a one-time couture entrance: the monogram draws itself,
 * a gold seam sweeps, then the curtain lifts. Skipped on hydration
 * of subsequent client navigations (session-flagged).
 */
export function Curtain() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let skip = false;
    try {
      skip = sessionStorage.getItem("lut-entered") === "1";
    } catch {
      /* storage blocked — still show the curtain once */
    }

    if (skip) {
      // hide in the next frame (async, avoids sync setState in effect)
      const raf = requestAnimationFrame(() => setShow(false));
      return () => cancelAnimationFrame(raf);
    }

    const id = setTimeout(() => {
      setShow(false);
      try {
        sessionStorage.setItem("lut-entered", "1");
      } catch {
        /* ignore */
      }
    }, 2100);
    return () => clearTimeout(id);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="curtain"
          exit={{ y: "-100%" }}
          transition={{ duration: 1.05, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink"
          aria-hidden
        >
          {/* monogram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -14 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-8 flex h-20 w-20 items-center justify-center"
          >
            <motion.span
              initial={{ pathLength: 0 }}
              className="absolute inset-0 rotate-45 rounded-xl border border-gold/60"
            />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute inset-[6px] rotate-45 rounded-lg border border-gold/25"
            />
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
              className="font-display-en text-3xl font-semibold text-gold-gradient"
            >
              L
            </motion.span>
          </motion.div>

          {/* wordmark */}
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.8em" }}
            animate={{ opacity: 1, letterSpacing: "0.42em" }}
            transition={{ delay: 0.55, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display-en text-sm text-paper/70"
          >
            LAST UNIQUE TOUCH
          </motion.p>

          {/* progress seam */}
          <div className="mt-8 h-px w-44 overflow-hidden bg-gold/15">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 1.7, ease: [0.65, 0, 0.35, 1] }}
              className="h-full w-full bg-gradient-to-l from-gold-light via-gold to-gold-deep"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
