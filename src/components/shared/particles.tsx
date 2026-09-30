'use client'

/**
 * Gold rising particles — CSS-only, GPU-light, DETERMINISTIC.
 *
 * Values derive from the particle index (not Math.random) so the SSR
 * markup and the client's first render match byte-for-byte — no
 * hydration mismatch.
 */

import { useMemo, type CSSProperties } from 'react'

interface ParticleSpec {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  drift: number
  opacity: number
}

/** Deterministic pseudo-random specs — same output on server & client. */
function buildParticles(count: number): ParticleSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: (i * 37.7 + 11) % 100,
    size: 2 + ((i * 7) % 5),
    duration: 9 + ((i * 5) % 14),
    delay: -((i * 13) % 20),
    drift: ((i * 53) % 120) - 60,
    opacity: 0.25 + ((i * 11) % 10) / 22,
  }))
}

export function Particles({ count = 26 }: { count?: number }) {
  const particles = useMemo(() => buildParticles(count), [count])

  return (
    <div className="particles" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={
            {
              left: `${p.left}%`,
              bottom: '-4%',
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              '--p-drift': `${p.drift}px`,
              '--p-opacity': p.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
