'use client'

/**
 * StaggerGroup — grid/row container whose children rise in sequence when the
 * group scrolls into view. Each child is wrapped in a cell carrying the
 * `.stagger-item` class with an auto-assigned `--stagger-idx`, so the CSS
 * layer handles the cascade (70ms steps). The group itself is observed via
 * the shared Reveal logic (class `revealed` on the ancestor).
 *
 * Use as the layout container: <StaggerGroup className="grid ...">.
 */

import { Children, isValidElement, type ReactNode, type ElementType } from 'react'
import { Reveal } from '@/components/shared/reveal'
import { cn } from '@/lib/utils'

interface StaggerGroupProps {
  children: ReactNode
  className?: string
  /** Base delay (seconds) before the first item starts */
  delay?: number
  as?: ElementType
  /** Wrap children in h-full cells (grid contexts, default true) */
  fullCells?: boolean
}

export function StaggerGroup({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
  fullCells = true,
}: StaggerGroupProps) {
  const items = Children.toArray(children).filter(isValidElement)

  return (
    <Reveal as={Tag} direction="none" delay={delay} className={className}>
      {items.map((child, idx) => (
        <div
          key={child.key ?? idx}
          className={cn('stagger-item', fullCells && 'h-full')}
          style={{ ['--stagger-idx' as string]: idx }}
        >
          {child}
        </div>
      ))}
    </Reveal>
  )
}
