'use client'

/**
 * ProcessSteps — a 3-step journey with numbered gold medallions connected by
 * an animated dashed line (draws in on scroll). Light variant for dark 3D
 * backgrounds. Icons rotate/scale on hover.
 */

import type { LucideIcon } from 'lucide-react'
import { SectionHeading } from './section-heading'
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
}

export function ProcessSteps({ eyebrow, title, steps, light = false, className }: ProcessStepsProps) {
  return (
    <section className={cn('py-16 sm:py-24 px-4', light ? 'bg-transparent' : 'bg-background', className)}>
      <div className="max-w-5xl mx-auto">
        <SectionHeading eyebrow={eyebrow} title={title} light={light} />

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
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <Reveal key={step.title} delay={i * 0.18} as="li" className="text-center relative">
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
          })}
        </ol>
      </div>
    </section>
  )
}
