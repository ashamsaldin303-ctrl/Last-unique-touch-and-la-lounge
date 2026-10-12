'use client'

import type { ReactNode } from 'react'

/**
 * ElasticLink — the underline that DRAWS itself on hover (a hairline
 * grows from the reading edge — right edge in RTL, left in LTR —
 * on the house's expo-out curve). For navbar links, footer lists,
 * inline text CTAs.
 *
 * `active` keeps the underline drawn (current page in nav).
 */
export function ElasticLink({
  href,
  onClick,
  children,
  className,
  active = false,
  ariaLabel,
}: {
  href: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  children: ReactNode
  className?: string
  active?: boolean
  ariaLabel?: string
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={`lux-underline ${active ? 'lux-underline-active' : ''} ${className ?? ''}`}
    >
      {children}
    </a>
  )
}
