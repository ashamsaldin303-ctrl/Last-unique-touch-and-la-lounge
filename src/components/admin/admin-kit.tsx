'use client'

/**
 * admin-kit — the shared ADMIN page chrome (Task 38), extracted from
 * views/admin.tsx so the overview AND the three brand pages render the
 * identical maison shell:
 *
 *   - <AdminBackdrop/>   warm dark champagne gradients + drifting gold dust
 *   - <AdminToaster/>    the single shell-level sonner toaster (panels and
 *                        pages share one dark-gold toast style)
 *   - <CheckingState/>   session-probe spinner state
 *   - <PanelSkeleton/>   dark-glass shimmer while a lazily-loaded panel
 *                        chunk streams in (used by dynamic imports)
 *
 * Everything here is presentation-only — the session machine lives in
 * use-admin-session.ts.
 */

import { ShieldCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { Particles } from '@/components/shared/particles'
import { useI18n } from '@/lib/i18n'

/* ============================================================
   Backdrop — warm dark maison gradients + drifting gold dust
   ============================================================ */

export function AdminBackdrop({ particleCount = 12 }: { particleCount?: number }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(201,162,94,0.13),transparent_62%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_115%,rgba(139,107,61,0.10),transparent_65%)]"
      />
      <Particles count={particleCount} />
    </>
  )
}

/* ============================================================
   Toaster — one per admin page (views never co-render)
   ============================================================ */

export function AdminToaster() {
  const { dir } = useI18n()
  return (
    <Toaster
      position="top-center"
      dir={dir}
      theme="dark"
      toastOptions={{
        style: {
          background: '#171410',
          border: '1px solid rgba(201,162,94,0.25)',
          color: '#F2EDE2',
          fontSize: '13px',
        },
      }}
    />
  )
}

/* ============================================================
   Session-probe state (rendered before the first API answer)
   ============================================================ */

export function CheckingState({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-24" role="status">
      <div className="flex flex-col items-center gap-4">
        <span className="animate-pulse-ring inline-flex size-14 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
          <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

/* ============================================================
   Panel placeholder — dark-glass shimmer while a lazily-loaded
   panel chunk streams in (shared by the dynamic imports)
   ============================================================ */

export function PanelSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="lux-card flex flex-col gap-4 rounded-xl border border-[#C9A25E]/20 bg-[#14110B]/95 p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-44 rounded-md bg-white/[0.07]" />
          <Skeleton className="h-3 w-16 rounded bg-white/[0.05]" />
        </div>
        <Skeleton className="h-11 w-24 rounded-md bg-white/[0.05]" />
      </div>
      <Skeleton className="h-11 w-full rounded-md bg-white/[0.05]" />
      <Skeleton className="h-64 w-full rounded-lg bg-white/[0.04]" />
    </div>
  )
}
