/**
 * AnimClock — minimal replacement for THREE.Clock (deprecated by three in
 * favor of THREE.Timer, which this bundled three version doesn't ship).
 *
 * Same API surface the 3D backgrounds rely on:
 *   - getDelta(): seconds since the last call (auto-starts on first use)
 *   - getElapsedTime(): total accumulated seconds (advances the clock,
 *     exactly like THREE.Clock)
 *   - elapsedTime: public accumulator — supports the hidden-time swallow
 *     pattern used when a background pauses off-screen:
 *       clock.elapsedTime -= clock.getDelta()
 *
 * Built on performance.now() — no three imports, no deprecation warnings.
 * (Task 41 — visual-audit console hygiene.)
 */
export class AnimClock {
  elapsedTime = 0
  private last = 0
  private running = false

  private start(): void {
    this.running = true
    this.last = performance.now()
  }

  /** Seconds since the last getDelta call (auto-starts, like THREE.Clock). */
  getDelta(): number {
    if (!this.running) this.start()
    const now = performance.now()
    const dt = (now - this.last) / 1000
    this.last = now
    this.elapsedTime += dt
    return dt
  }

  /** Total accumulated seconds. THREE.Clock parity: advances the clock. */
  getElapsedTime(): number {
    this.getDelta()
    return this.elapsedTime
  }
}
