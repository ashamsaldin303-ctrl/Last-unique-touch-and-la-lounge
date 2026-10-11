'use client'

/**
 * ProcessSteps — the maison's rental journey.
 *
 * Task 43 (prompt-motion round 2, ercankeskinx "scroll-based sections"):
 * with `pin` (home), DESKTOP becomes a PINNED HORIZONTAL FILM — the
 * section pins to the viewport and the steps glide past under the
 * reader's wheel, each igniting (scale + gold frame) at center, on a
 * continuous gold thread, with a jump-dot rail + counter. Mobile and
 * non-pinned usages keep the classic grid with the drawn connector.
 */

import type { LucideIcon } from 'lucide-react'
import { SectionHeading } from './section-heading'
import { HorizontalPin } from '@/components/fx/horizontal-panel'
import { Reveal } from '@/components/shared/reveal'
import { cn } from '@/lib/utils'

export interface ProcessStep {
  title: string
  desc: string
  icon: LucideIcon
}

interface ProcessStepsProps {
  eyebrow?: string
  title: string
  steps: ProcessStep[]
  light?: boolean
  className?: string
  /** Pin + horizontal film on desktop (scroll-driven). */
  pin?: boolean
}

export function ProcessSteps({
  eyebrow,
  title,
  steps,
  light = false,
  className,
  pin = false,
}: ProcessStepsProps) {
  const cards = steps.map((step, i) => {
    const Icon = step.icon
    return (
      <Reveal key={`${step.title}-${i}`} delay={i * 0.18} as="li" className="text-center relative">
        <div className="relative z-10 flex items-center justify-center mb-5">
          <span
            className={cn(
              'icon-ring w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-500 hover:scale-110 hover:rotate-6 cursor-default',
              light ? 'glass-panel' : 'bg-card border border-border'
            )}
            style={{ boxShadow: `0 0 0 1px color-mix(in srgb, var(--color-primary) 25%, transparent)` }}
          >
            <Icon className="w-7 h-7 text-primary" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span
            aria-hidden="true"
            className="absolute -top-1 -end-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center"
          >
            {i + 1}
          </span>
        </div>
        <h3
          className={cn(
            'font-display text-lg sm:text-xl mb-2',
            light ? 'text-paper' : 'text-foreground'
          )}
        >
          {step.title}
        </h3>
        <p
          className={cn(
            'text-sm leading-relaxed max-w-xs mx-auto',
            light ? 'text-paper/70' : 'text-muted-foreground'
          )}
        >
          {step.desc}
        </p>
      </Reveal>
    )
  })

  return (
    <section
      className={cn(
        'relative',
        pin ? 'px-0' : 'py-16 sm:py-24 px-4',
        light ? 'bg-transparent' : 'bg-background',
        className
      )}
    >
      <div className={cn('max-w-5xl', pin ? 'px-4 mx-auto' : 'mx-auto')}>
        <SectionHeading eyebrow={eyebrow} title={title} light={light} />
      </div>

      {pin ? (
        <>
          {/* DESKTOP — the pinned horizontal film */}
          <HorizontalPin
            panelCount={steps.length}
            label={title}
            trackClassName="relative py-10"
          >
            {/* one continuous thread behind all panels */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            />
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <article
                  key={`pin-${step.title}-${i}`}
                  data-pin-panel={i === 0 ? 'true' : 'false'}
                  className="pin-panel relative z-10 flex w-[min(28rem,36vw)] shrink-0 flex-col justify-between rounded-2xl border border-primary/15 bg-card/95 p-8 sm:p-10 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="icon-ring flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-card"
                      style={{ boxShadow: '0 0 24px color-mix(in srgb, var(--color-primary) 18%, transparent)' }}
                    >
                      <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className="font-display-en text-5xl italic leading-none text-transparent [background:linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_95%,transparent),color-mix(in_srgb,var(--color-primary)_25%,transparent))] [background-clip:text] [-webkit-background-clip:text]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="mt-10">
                    <h3 className="font-display text-2xl text-foreground">{step.title}</h3>
                    <p className="mt-4 text-sm leading-8 text-muted-foreground">{step.desc}</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="pin-panel-seam mt-8 block h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent"
                  />
                </article>
              )
            })}
          </HorizontalPin>

          {/* MOBILE — the classic grid (same markup as non-pinned) */}
          <div className="px-4 pb-16 md:hidden">
            <ol className="relative grid grid-cols-1 gap-10 list-none p-0 m-0">{cards}</ol>
          </div>
        </>
      ) : (
        <ol className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 list-none p-0 m-0">
          {/* Connector line — desktop only */}
          <div
            aria-hidden="true"
            className={cn(
              'hidden md:block absolute top-8 inset-x-[16%] h-px line-draw-start',
              light ? 'bg-paper/15' : 'bg-border'
            )}
            style={{ animationDuration: '1.6s' }}
          />
          {cards}
        </ol>
      )}
    </section>
  )
}
