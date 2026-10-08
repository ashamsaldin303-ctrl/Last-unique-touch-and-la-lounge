'use client'

/**
 * DurationSelector — the redesigned rental-period picker (Task 26).
 *
 * «عقد الأيام» — the days-strand: ready duration preset chips (day /
 * 3 days / week / 2 weeks / month / custom) + framed native date
 * fields + a jeweler's strand visualization whose gems mark the
 * rented days, with a tweened day counter and locale-formatted
 * endpoint dates.
 *
 * The component is fully brand-adaptive: every color flows from
 * --color-primary / --color-gold, so it reads champagne on the
 * neutral house, bronze-gold on LUT, magenta on La Lounge and
 * birthday gold on Your Birthday — one component, four identities.
 *
 * Controlled component: parents own the date state (RentalPicker's
 * availability flow, the birthday mini-form). The end >= start
 * invariant is enforced here (clearing the end date when the start
 * moves past it).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CalendarRange, Sparkles } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { formatDate, parseDateParts, rentalDays } from '@/components/shop/format'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Shared tween hook (re-exported for RentalPicker)                     */
/* ------------------------------------------------------------------ */

/** Tween a number between changes (cubic ease-out; reduced-motion safe). */
export function useTweenedNumber(value: number, duration = 520): number {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return
    prevRef.current = to

    // Reduced motion: jump straight to the target (rAF so no sync setState).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = requestAnimationFrame(() => setDisplay(to))
      return () => cancelAnimationFrame(id)
    }

    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return display
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PRESET_DIFFS = [1, 3, 7, 14, 30] as const
type PresetDiff = (typeof PRESET_DIFFS)[number]

const PRESET_LABEL_KEY: Record<PresetDiff, string> = {
  1: 'product.rental.presets.day',
  3: 'product.rental.presets.days3',
  7: 'product.rental.presets.week',
  14: 'product.rental.presets.weeks2',
  30: 'product.rental.presets.month',
}

/** Add days to a 'YYYY-MM-DD' string (local-timezone safe). */
function addDaysIso(iso: string, days: number): string {
  const date = parseDateParts(iso)
  if (!date) return iso
  date.setDate(date.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Arabic plural-aware day unit (one / two / few / many). */
function dayUnit(t: ReturnType<typeof useI18n>['t'], locale: string, n: number): string {
  if (locale === 'ar') {
    if (n === 1) return t('product.rental.daysUnit.one')
    if (n === 2) return t('product.rental.daysUnit.two')
    return n <= 10 ? t('product.rental.daysUnit.few') : t('product.rental.daysUnit.many')
  }
  return n === 1 ? t('product.rental.daysUnit.one') : t('product.rental.daysUnit.few')
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface DurationSelectorProps {
  /** Unique prefix for input ids (two forms may coexist on a page). */
  idPrefix: string
  startDate: string
  endDate: string
  onStartDateChange: (iso: string) => void
  onEndDateChange: (iso: string) => void
  /** Minimum bookable date — 'today' or later. */
  minIso: string
  disabled?: boolean
  /** Compact variant for inline card mini-forms (birthday storefront). */
  compact?: boolean
}

export function DurationSelector({
  idPrefix,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minIso,
  disabled = false,
  compact = false,
}: DurationSelectorProps) {
  const { t, locale } = useI18n()
  const reduceMotion = useReducedMotion()
  const startInputRef = useRef<HTMLInputElement | null>(null)

  const days = startDate && endDate ? rentalDays(startDate, endDate) : 0
  const datesValid = days >= 1
  const activePreset = (PRESET_DIFFS as readonly number[]).includes(days) ? (days as PresetDiff) : null
  const isCustom = datesValid && activePreset === null

  /* Tweened day counter */
  const tweenedDays = useTweenedNumber(datesValid ? days : 0, 420)

  /* Gems — one per rented day, capped with an overflow chip */
  const gemCap = compact ? 10 : 14
  const gemCount = datesValid ? Math.min(days, gemCap) : 0
  const gemOverflow = datesValid ? Math.max(0, days - gemCap) : 0

  /* Symbolic fill width: 22% (1 day) → 100% (30+ days) */
  const fillPct = datesValid ? Math.min(100, 22 + (Math.min(days, 30) / 30) * 78) : 0

  const handlePreset = (diff: PresetDiff) => {
    if (disabled) return
    const base = startDate || minIso
    onStartDateChange(base)
    onEndDateChange(addDaysIso(base, diff))
  }

  const handleStartChange = (value: string) => {
    onStartDateChange(value)
    // Keep the end >= start invariant (clear a now-invalid end).
    if (endDate && value > endDate) onEndDateChange('')
  }

  const handleCustomClick = () => {
    startInputRef.current?.focus()
    /* Reveal the native picker where supported */
    try {
      startInputRef.current?.showPicker?.()
    } catch {
      /* showPicker unsupported — focusing is enough */
    }
  }

  const dateInputCls =
    'h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-foreground [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100'

  /* Counter content: Arabic renders "يوم واحد" / "يومان" word-only for
     grammatical correctness; larger counts show the tweened digits. */
  let counterMain: ReactNode = null
  let counterUnit = ''
  if (datesValid) {
    if (locale === 'ar' && days === 1) {
      counterUnit = t('product.rental.daysUnit.one')
    } else if (locale === 'ar' && days === 2) {
      counterUnit = t('product.rental.daysUnit.two')
    } else {
      counterMain = Math.round(tweenedDays)
      counterUnit = dayUnit(t, locale, days)
    }
  }

  const chipLayoutId = compact ? 'duration-pill-active-compact' : 'duration-pill-active'

  return (
    <div
      className={cn(
        compact ? 'rounded-xl border border-border/70 bg-background/40 p-3' : 'duration-panel p-4 sm:p-5'
      )}
    >
      {/* ---- Preset chips ---- */}
      <div
        className={cn('flex flex-wrap items-center gap-2', compact ? 'mb-3' : 'mb-4')}
        role="group"
        aria-label={t('product.rental.durationLabel')}
      >
        {!compact && (
          <span
            /* fix-2: spaced-caps label is Latin-only — Arabic gets
               word-spacing so the joined letters stay connected. */
            style={
              locale === 'ar'
                ? { wordSpacing: '0.25em' }
                : { letterSpacing: '0.05em', textTransform: 'uppercase' }
            }
            className="me-1 hidden items-center gap-1.5 text-[0.6875rem] font-semibold text-muted-foreground sm:inline-flex"
          >
            <CalendarRange className="size-3.5 text-primary/70" aria-hidden="true" />
            {t('product.rental.durationLabel')}
          </span>
        )}
        {PRESET_DIFFS.map((diff) => {
          const active = activePreset === diff
          return (
            <button
              key={diff}
              type="button"
              onClick={() => handlePreset(diff)}
              disabled={disabled}
              aria-pressed={active}
              className={cn(
                'pill-lux rounded-full px-3.5 py-1.5 text-xs font-semibold',
                compact ? 'duration-chip-compact' : 'duration-chip',
                disabled && 'cursor-not-allowed opacity-50'
              )}
              style={active ? { color: 'var(--color-primary-foreground)' } : undefined}
            >
              {active && (
                <motion.span
                  layoutId={chipLayoutId}
                  className="pill-lux-active absolute inset-0 -z-10 rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 whitespace-nowrap">{t(PRESET_LABEL_KEY[diff])}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={handleCustomClick}
          disabled={disabled}
          aria-pressed={isCustom}
          className={cn(
            'pill-lux rounded-full px-3.5 py-1.5 text-xs font-semibold',
            compact ? 'duration-chip-compact' : 'duration-chip',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          style={isCustom ? { color: 'var(--color-primary-foreground)' } : undefined}
        >
          {isCustom && (
            <motion.span
              layoutId={chipLayoutId}
              className="pill-lux-active absolute inset-0 -z-10 rounded-full"
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              aria-hidden="true"
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
            {isCustom && <Sparkles className="size-3" aria-hidden="true" />}
            {t('product.rental.presets.custom')}
          </span>
        </button>
      </div>

      {/* ---- Date fields ---- */}
      <div className={cn('grid grid-cols-2 gap-2.5', compact && 'gap-2')}>
        <div className="duration-field px-3 py-2" data-filled={Boolean(startDate)}>
          <label
            htmlFor={`${idPrefix}-start`}
            className="mb-0.5 block text-[0.6875rem] font-medium text-muted-foreground"
          >
            {t('product.rental.startDate')}
          </label>
          <Input
            id={`${idPrefix}-start`}
            ref={startInputRef}
            type="date"
            value={startDate}
            min={minIso}
            max="2100-12-31"
            disabled={disabled}
            onChange={(e) => handleStartChange(e.target.value)}
            className={dateInputCls}
            aria-label={t('product.rental.startDate')}
          />
        </div>
        <div className="duration-field px-3 py-2" data-filled={Boolean(endDate)}>
          <label
            htmlFor={`${idPrefix}-end`}
            className="mb-0.5 block text-[0.6875rem] font-medium text-muted-foreground"
          >
            {t('product.rental.endDate')}
          </label>
          <Input
            id={`${idPrefix}-end`}
            type="date"
            value={endDate}
            min={startDate || minIso}
            max="2100-12-31"
            disabled={disabled}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={dateInputCls}
            aria-label={t('product.rental.endDate')}
          />
        </div>
      </div>

      {/* ---- The days-strand (decorative visualization) ---- */}
      <div className={cn(compact ? 'mt-3' : 'mt-5')} aria-hidden="true">
        <div className="duration-strand">
          {/* Start node */}
          <div className="duration-node">
            <span className="duration-node-dot" data-dormant={!datesValid} />
            <span className="max-w-[5.5rem] truncate text-[0.625rem] leading-tight text-muted-foreground">
              {startDate && datesValid ? formatDate(startDate, locale) : '—'}
            </span>
          </div>

          {/* Rail: ruler ticks + flowing fill + day gems */}
          <div className="duration-rail">
            <div
              className="duration-flow"
              data-live={datesValid && !reduceMotion}
              style={{ width: `${fillPct}%` }}
            />
            <div className="relative flex w-full items-center justify-center gap-1.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {Array.from({ length: gemCount }).map((_, i) => (
                  <motion.span
                    key={i}
                    layout
                    className={cn('duration-gem', compact && 'scale-[0.82]')}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      delay: reduceMotion ? 0 : i * 0.03,
                      type: 'spring',
                      stiffness: 520,
                      damping: 22,
                    }}
                  />
                ))}
              </AnimatePresence>
              {gemOverflow > 0 && (
                <motion.span
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="ms-0.5 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[0.5625rem] font-bold tabular-nums text-primary"
                >
                  +{gemOverflow}
                </motion.span>
              )}
            </div>
          </div>

          {/* End node */}
          <div className="duration-node">
            <span className="duration-node-dot" data-dormant={!datesValid} />
            <span className="max-w-[5.5rem] truncate text-[0.625rem] leading-tight text-muted-foreground">
              {endDate && datesValid ? formatDate(endDate, locale) : '—'}
            </span>
          </div>
        </div>

        {/* Counter / hint */}
        <p
          className={cn(
            'mt-1.5 text-center',
            compact ? 'text-xs' : 'text-sm',
            datesValid ? 'text-foreground' : 'text-muted-foreground/80'
          )}
          aria-live="polite"
        >
          {datesValid ? (
            <span className="inline-flex items-baseline gap-1.5">
              {counterMain !== null && (
                <span
                  className={cn(
                    'duration-count font-display font-bold',
                    compact ? 'text-lg' : 'text-3xl'
                  )}
                >
                  {counterMain}
                </span>
              )}
              <span className={cn('font-semibold text-primary', compact ? 'text-xs' : 'text-base')}>
                {counterUnit}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary/60" />
              {t('product.rental.timelineHint')}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
