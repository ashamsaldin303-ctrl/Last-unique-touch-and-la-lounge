'use client'

import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { springGentle } from '@/lib/motion'

/**
 * SpringAccordion — rows that open with a real spring (height: auto
 * on a gentle spring — the "weighted drawer" feel), chevron rotating
 * 180° on the snappy spring. Accessible by construction:
 * button headers, aria-expanded, aria-controls.
 *
 * Single-open by default (a concertina, not a mess).
 */
export function SpringAccordion({
  items,
  className,
  single = true,
  defaultOpen = null,
}: {
  items: { id: string; title: ReactNode; content: ReactNode }[]
  className?: string
  /** only one row open at a time */
  single?: boolean
  defaultOpen?: string | null
}) {
  const [open, setOpen] = useState<Set<string>>(
    defaultOpen ? new Set([defaultOpen]) : new Set(),
  )

  const toggle = (id: string) => {
    setOpen((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev)
        next.delete(id)
        return next
      }
      if (single) return new Set([id])
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  return (
    <div className={className}>
      {items.map((item) => {
        const isOpen = open.has(item.id)
        return (
          <div key={item.id} className="border-b border-border/60 last:border-b-0">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={`acc-${item.id}`}
              className="group/acc flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
            >
              <span className="flex-1">{item.title}</span>
              <motion.span
                aria-hidden
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.9 }}
                className="shrink-0 text-muted-foreground transition-colors group-hover/acc:text-foreground"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`acc-${item.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ height: springGentle, opacity: { duration: 0.25 } }}
                  className="overflow-hidden"
                >
                  <div className="pb-5">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
