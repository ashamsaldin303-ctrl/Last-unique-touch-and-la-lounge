'use client'

import { useRouter } from '@/lib/router'
import { useI18n } from '@/lib/i18n'
import { KineticWords, HairlineDraw } from '@/components/fx/kinetic-heading'
import { RollLabel } from '@/components/fx/roll-label'

/** 404 — rendered for unknown hash routes (e.g. #/en/xyz). Fully localized
 *  via the notFound.* message keys (ar + en).
 *
 *  Task 44-e (cinematic, still instant): the big 404 rises out of its word
 *  mask (KineticWords), a gold hairline draws itself beneath it, and the
 *  "back home" label rolls to its twin on hover (RollLabel — the anchor
 *  carries `group`). No imagery, no data fetch — the page paints in one
 *  frame; the masks are pure transforms. */
export default function NotFoundPage() {
  const { href } = useRouter()
  const { t } = useI18n()
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* The big numeral stays decorative — the h1 below is the accessible
          title (the masked word is aria-hidden inside KineticWords). */}
      <div className="mb-5" aria-hidden="true">
        <KineticWords
          text="404"
          delay={0.15}
          className="font-display text-8xl sm:text-9xl text-primary leading-none"
        />
        <div className="mt-5 flex justify-center">
          <HairlineDraw className="w-24" delay={0.6} origin="center" />
        </div>
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        {t('notFound.title')}
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md text-pretty">
        {t('notFound.message')}
      </p>
      {/* Real link (not a button) so middle-click / open-in-new-tab / copy
          link work; the hash router picks it up via hashchange.
          Touch target stays ≥44px (min-h-11 + py-3). */}
      <a
        href={href('/')}
        className="btn-lux group min-h-11 inline-flex items-center justify-center px-8 py-3 rounded-full text-sm cursor-pointer border-0"
      >
        <RollLabel text={t('notFound.backHome')} />
      </a>
    </div>
  )
}
