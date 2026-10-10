"use client";

import { useEffect, useRef } from "react";

/**
 * GoldDust — a lightweight canvas particle field.
 * Replaces the original heavy Three.js cosmic background with an
 * elegant "floating gold dust in dark hall" atmosphere:
 *  - drifting embers/dust motes with parallax depth layers
 *  - subtle mouse-reactive drift (desktop only)
 *  - device-pixel-ratio aware, pauses when tab hidden,
 *  - degrades gracefully (no canvas → nothing rendered)
 */
export function GoldDust({ density = 70 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    interface Mote {
      x: number;
      y: number;
      r: number;
      depth: number; // 0 far — 1 near
      vx: number;
      vy: number;
      phase: number;
      speed: number;
      hue: number;
    }

    let motes: Mote[] = [];
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const seed = () => {
      const count = Math.max(30, Math.min(density, Math.floor((w * h) / 16000)));
      motes = Array.from({ length: count }, () => {
        const depth = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.4 + depth * 1.8,
          depth,
          vx: (Math.random() - 0.5) * 0.08 * (0.3 + depth),
          vy: -(0.05 + Math.random() * 0.22) * (0.3 + depth), // gentle upward drift
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.8,
          hue: 36 + Math.random() * 14, // gold band 36-50
        };
      });
    };

    const draw = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      // ease mouse toward target
      mouse.x += (mouse.tx - mouse.x) * 0.03;
      mouse.y += (mouse.ty - mouse.y) * 0.03;
      const mOffX = (mouse.x - 0.5) * 24;
      const mOffY = (mouse.y - 0.5) * 18;

      for (const m of motes) {
        // sinusoidal sway + linear drift
        m.x += m.vx + Math.sin(t * 0.0004 * m.speed + m.phase) * 0.06 * (0.4 + m.depth);
        m.y += m.vy;

        // wrap around edges
        if (m.y < -8) { m.y = h + 8; m.x = Math.random() * w; }
        if (m.x < -8) m.x = w + 8;
        if (m.x > w + 8) m.x = -8;

        const px = m.x + mOffX * m.depth;
        const py = m.y + mOffY * m.depth;

        // twinkle alpha
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.0012 * m.speed + m.phase * 3));
        const alpha = (0.12 + m.depth * 0.5) * tw;

        // glow halo for near motes
        if (m.depth > 0.55) {
          const halo = ctx.createRadialGradient(px, py, 0, px, py, m.r * 6);
          halo.addColorStop(0, `hsla(${m.hue}, 62%, 68%, ${alpha * 0.35})`);
          halo.addColorStop(1, "hsla(40, 60%, 60%, 0)");
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(px, py, m.r * 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // core
        ctx.fillStyle = `hsla(${m.hue}, 70%, ${62 + m.depth * 14}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = e.clientY / window.innerHeight;
    };

    const onVis = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(draw);
      else cancelAnimationFrame(raf);
    };

    resize();
    raf = requestAnimationFrame(draw);

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
