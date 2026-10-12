'use client'

import { useEffect, useState } from 'react'

/**
 * LiveClock — the maison's Kuwait City time, ticking live in the
 * footer (a quiet "we are here, now" — luxury retail's classic touch).
 *
 * Hydration-safe: renders a placeholder until mounted (the server
 * cannot know the client's "now").
 */
export function LiveClock({
  locale = 'ar',
  className,
  label,
}: {
  locale?: 'ar' | 'en'
  className?: string
  label?: string
}) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setNow(new Date())
    // async first paint of the time (never synchronous in the effect body)
    const first = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [])

  const time = now
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : 'en-GB', {
        timeZone: 'Asia/Kuwait',
        hour: '2-digit',
        minute: '2-digit',
        hour12: locale === 'en',
      }).format(now)
    : '––:––'

  return (
    <span className={className} suppressHydrationWarning>
      {label ? `${label} ` : ''}
      <span dir="ltr" className="tabular-nums">
        {time}
      </span>
    </span>
  )
}
