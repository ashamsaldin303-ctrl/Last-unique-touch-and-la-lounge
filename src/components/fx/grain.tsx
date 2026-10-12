'use client'

/**
 * Grain — the film-grain overlay: a whisper of analog texture over the
 * whole viewport (opacity ~4-5%), stepping like real film. Pure CSS
 * animation of a repeating SVG turbulence tile; pointer-events-none so
 * it never intercepts interaction; honors prefers-reduced-motion
 * (renders a static, even quieter grain).
 */
export function Grain({
  opacity = 0.045,
  className,
}: {
  opacity?: number
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`lux-grain pointer-events-none fixed inset-0 z-[35] ${className ?? ''}`}
      style={{ opacity }}
    />
  )
}
