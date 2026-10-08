'use client'

import { useRouter } from '@/lib/router'
import { useI18n } from '@/lib/i18n'

/** 404 — rendered for unknown hash routes (e.g. #/en/xyz). Fully localized
 *  via the notFound.* message keys (ar + en). */
export default function NotFoundPage() {
  const { href } = useRouter()
  const { t } = useI18n()
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="font-display text-7xl text-primary mb-4" aria-hidden="true">404</div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        {t('notFound.title')}
      </h1>
      <p className="text-muted-foreground mb-8">{t('notFound.message')}</p>
      {/* Real link (not a button) so middle-click / open-in-new-tab / copy
          link work; the hash router picks it up via hashchange. */}
      <a
        href={href('/')}
        className="btn-lux px-8 py-3 rounded-full text-sm cursor-pointer border-0"
      >
        {t('notFound.backHome')}
      </a>
    </div>
  )
}
