/**
 * MOTION SYSTEM — the house motion language, distilled from the
 * prompt-motion.com catalogue (Task 42).
 *
 * Philosophy (verbatim from the strongest prompts in the gallery):
 *  - "Springs everywhere, a tiny overshoot at most."
 *  - "Every shot enters already moving (exponential ease-out) and
 *    leaves on an accelerating move." Blur follows speed.
 *  - "No dead time." Nothing waits around; nothing bounces.
 *
 * Banned by the same catalogue (enforced here by tuning, not policing):
 *  bouncy easing, glows-for-decoration, particle bursts, crossfades,
 *  dead holds, anything that looks like a template.
 *
 * All presets are framer-motion `Transition` objects, safe to spread.
 * They compose with MotionConfig reducedMotion="user" at the root:
 * framer converts transforms to opacity-only for reduced-motion users.
 */

import type { Transition, Variants } from 'framer-motion'

/* ------------------------------------------------------------------ */
/* Springs — the core of the system                                    */
/* ------------------------------------------------------------------ */

/**
 * Soft spring — content settling into place (cards, panels, drawers).
 * Critical damping ratio ≈ 1.05 → a *tiny* overshoot at most (≤2%),
 * exactly the prompt-motion doctrine: never cartoonish.
 */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 210,
  damping: 26,
  mass: 1,
}

/**
 * Snappy spring — controls the user just actuated (tabs, pills, toggles).
 * Faster settle with ~4% overshoot: perceptible life, zero bounce.
 */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.9,
}

/**
 * Gentle spring — large surfaces and full-view transitions.
 * Slightly under-damped for a graceful settle of big mass.
 */
export const springGentle: Transition = {
  type: 'spring',
  stiffness: 160,
  damping: 24,
  mass: 1.1,
}

/**
 * Edge spring pair for LIQUID indicators (prompt-motion's signature
 * technique from the "Shape morphing through UI states" prompt):
 * "The tab indicator's two edges ride different springs, so the leading
 * edge stretches ahead of the trailing one."
 *
 * Leading  — stiffer: races ahead, stretching the indicator.
 * Trailing — softer: catches up, so the pill squashes then equalizes.
 */
export const liquidLeading: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 38,
  mass: 0.8,
}
export const liquidTrailing: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 34,
  mass: 0.9,
}

/* ------------------------------------------------------------------ */
/* Curves — for the few places springs can't go (CSS-style eases)      */
/* ------------------------------------------------------------------ */

/**
 * Exponential ease-out — "enter already moving": 12–19% of the
 * remaining distance per frame. Use for enters that must land quickly
 * but cannot use a spring (e.g. filter/blur swaps).
 */
export const easeExpoOut: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** House standard ease (matches the CSS --ease-out tokens). */
export const easeHouse: [number, number, number, number] = [0.22, 1, 0.36, 1]

/**
 * Accelerating exit curve — "leaves on an accelerating move".
 * Mirror of expo-in; short by design (see viewExit).
 */
export const easeAccelerate: [number, number, number, number] = [0.7, 0, 0.84, 0]

/* ------------------------------------------------------------------ */
/* Choreography — shared variants                                      */
/* ------------------------------------------------------------------ */

/**
 * Route/view transition (T17) — one composable variants object.
 * ENTER ALREADY MOVING: the view arrives mid-descent and settles on
 * springGentle — never fades in still. EXIT ACCELERATES: pulls
 * up-and-out fast, like a curtain snatched away. No `filter` here — a
 * lingering blur(0px) creates a containing block that breaks
 * `position: fixed` for the 3D brand backgrounds (see page.tsx).
 * Transforms settle to identity → framer emits `transform: none`, so
 * no lingering containing block after the swap.
 */
export const routeVariants: Variants = {
  initial: { opacity: 0, y: 26 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springGentle,
  },
  exit: {
    opacity: 0,
    y: -14,
    scale: 0.995,
    transition: { duration: 0.26, ease: easeAccelerate },
  },
}

/**
 * Content swap with a short blur (T3, twoclipping): "its content swaps
 * with a short blur". Used when a grid/list re-filters — the outgoing
 * set blurs out fast, the incoming set de-blurs already moving.
 * Safe on wrappers WITHOUT fixed-position 3D children only.
 */
export const swapEnter: Variants = {
  initial: { opacity: 0, filter: 'blur(6px)', scale: 0.985 },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    transition: { duration: 0.4, ease: easeExpoOut },
  },
}

export const swapExit: Variants = {
  exit: {
    opacity: 0,
    filter: 'blur(8px)',
    scale: 0.99,
    transition: { duration: 0.18, ease: easeAccelerate },
  },
}

/**
 * Pop from zero on a spring (T5): icons/seals appearing under the
 * cursor's intent — "icons pop from zero on a spring".
 */
export const popSpring: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 22,
  mass: 0.7,
}
