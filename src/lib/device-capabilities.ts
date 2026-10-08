'use client'

/**
 * Detects whether the current device/browser can comfortably run the 3D hero.
 * Returns false for: reduced-motion preference, no WebGL, very low-end devices.
 */

/**
 * Minimum CPU cores required to enable the 3D scene.
 * The hero scene is optimized (draw calls reduced ~52% via geometry merging
 * and instancing), so 2-core devices can run it comfortably. We gate only on
 * truly incapable hardware (< 2 cores).
 */
const MIN_CORES_FOR_3D = 2

/**
 * Minimum device memory (GB, exposed as `navigator.deviceMemory`) required to
 * enable the 3D scene. The scene fits comfortably in ~512 MB of GPU/CPU
 * memory after optimization, so we gate only on devices below 2 GB.
 */
const MIN_MEMORY_GB_FOR_3D = 2

/**
 * Probe-result cache. Stored on globalThis (survives dev hot-reloads, which
 * re-evaluate this module) because every probe creates a fresh <canvas> +
 * WebGL context and browsers cap live contexts (~16) — repeated probes from
 * multiple components on SPA route changes would churn contexts for values
 * that are static for the lifetime of the page.
 */
interface ProbeCache {
  shouldEnable3D?: boolean
  deviceTier?: DeviceTier
  softwareRenderer?: boolean
}
const probeCache: ProbeCache =
  ((globalThis as typeof globalThis & { __lutDeviceProbes?: ProbeCache })
    .__lutDeviceProbes ??= {})

export function shouldEnable3D(): boolean {
  if (typeof window === 'undefined') return false
  // Memoized (see ProbeCache above).
  if (probeCache.shouldEnable3D === undefined) {
    probeCache.shouldEnable3D = shouldEnable3DProbe()
  }
  return probeCache.shouldEnable3D
}

function shouldEnable3DProbe(): boolean {
  // Respect reduced-motion preference
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return false
  }

  // Require WebGL
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false
    // Release the context so we don't leak GPU resources just by probing
    const loseExt = gl.getExtension('WEBGL_lose_context')
    loseExt?.loseContext()
  } catch {
    // Older browsers / locked-down environments where getContext() itself
    // throws — deliberately silent, the false return IS the fallback.
    return false
  }

  // Low memory / cores → skip 3D.
  // The 3D scene is now optimized (draw calls reduced 52% via geometry
  // merging + instancing). 2-core / 2-GB devices can run it comfortably, so
  // we gate ONLY on truly incapable hardware (< MIN_CORES_FOR_3D cores or
  // < MIN_MEMORY_GB_FOR_3D GB).
  //
  // Task 2b fix: a previous revision (commit 6a540be / "v23-fix-F3") had
  // accidentally raised the threshold to `< 4`, which silently disabled the
  // 3D background on 2- to 3-core preview browsers and mid-range mobile
  // devices — contradicting the documented intent above. The "v24-fix-F4"
  // note claimed to have restored `< 2` but the code still read `< 4`. We
  // now use the named constants below so the threshold is unambiguous and
  // matches the documented behavior.
  const nav = navigator as Navigator & { deviceMemory?: number }
  const mem = nav.deviceMemory ?? 4
  const cores = nav.hardwareConcurrency ?? 4
  if (mem < MIN_MEMORY_GB_FOR_3D || cores < MIN_CORES_FOR_3D) return false

  return true
}

/**
 * Device tier for 3D scene quality scaling.
 * - 'low': skip 3D entirely (CSS fallback)
 * - 'mid': mobile / mid-range — reduced element counts, frame skipping
 * - 'high': desktop / high-end — full quality, every frame
 */
export type DeviceTier = 'low' | 'mid' | 'high'

/**
 * Detects the device's capability tier for 3D rendering.
 * Used by the birthday 3D background to scale quality.
 */
export function getDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'low'
  // Memoized (see ProbeCache above).
  if (probeCache.deviceTier === undefined) {
    probeCache.deviceTier = getDeviceTierProbe()
  }
  return probeCache.deviceTier
}

function getDeviceTierProbe(): DeviceTier {
  // Respect reduced-motion preference
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return 'low'
  }

  // Require WebGL
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return 'low'
    const loseExt = gl.getExtension('WEBGL_lose_context')
    loseExt?.loseContext()
  } catch {
    // Same intentional swallow as shouldEnable3D() — 'low' is the fallback.
    return 'low'
  }

  const nav = navigator as Navigator & { deviceMemory?: number }
  const mem = nav.deviceMemory ?? 4
  const cores = nav.hardwareConcurrency ?? 4

  // Low-end: < 2 cores or < 2 GB
  if (mem < MIN_MEMORY_GB_FOR_3D || cores < MIN_CORES_FOR_3D) return 'low'

  // Mobile detection: narrow viewport or touch
  const isMobileViewport = window.innerWidth < 768
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Mid-tier: mobile devices or low-core/mem desktops
  if (isMobileViewport || isTouch || cores < 4 || mem < 4) return 'mid'

  // High-tier: desktop with 4+ cores and 4+ GB
  return 'high'
}

/**
 * Checks if the user prefers reduced motion.
 */
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Detects software WebGL rasterizers (SwiftShader / llvmpipe / "Basic Render"
 * fallbacks). These run on the CPU, where per-draw-call overhead is enormous
 * and fill-rate is the dominant cost — scenes with hundreds of small draw
 * calls that fly on a real GPU can drop below 10 FPS here.
 *
 * Used by the La Lounge 3D background to switch to its
 * software-renderer strategy (skip the build-in animation, merge static
 * geometry immediately, start at a reduced pixel ratio).
 */
export function isSoftwareRenderer(): boolean {
  if (typeof window === 'undefined') return false
  // Memoized (see ProbeCache above).
  if (probeCache.softwareRenderer === undefined) {
    probeCache.softwareRenderer = isSoftwareRendererProbe()
  }
  return probeCache.softwareRenderer
}

function isSoftwareRendererProbe(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null
    if (!gl) return true
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER))
    // Release the probe context.
    const loseExt = gl.getExtension('WEBGL_lose_context')
    loseExt?.loseContext()
    return /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i.test(renderer)
  } catch {
    // Probe failure is treated as software rendering — conservative true
    // makes the 3D background pick its cheapest strategy, never a crash.
    return true
  }
}
