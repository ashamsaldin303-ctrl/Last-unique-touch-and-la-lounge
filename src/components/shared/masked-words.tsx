'use client'

/**
 * MaskedWords — renders a string as a sequence of clip-masked words that
 * rise into place with staggered delays (driven by the ancestor's `.revealed`
 * state from the shared Reveal observer). Screen-reader friendly: the
 * animated words are aria-hidden and one sr-only copy carries the full text.
 */

import { Fragment, type ReactNode } from 'react'

export function MaskedWords({ text }: { text: string }) {
  const words = text.split(' ').filter(Boolean)
  return (
    <>
      {words.map((word, idx) => (
        <Fragment key={`${word}-${idx}`}>
          <span className="word-mask" aria-hidden="true">
            <span style={{ ['--word-idx' as string]: idx }}>{word}</span>
          </span>
          {/* Real inter-word space (JSX array children get no whitespace) */}
          {idx < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
      <span className="sr-only">{text}</span>
    </>
  )
}

/** Non-string titles render untouched. */
export function MaskedTitle({ title }: { title: ReactNode }) {
  if (typeof title !== 'string') return <>{title}</>
  return <MaskedWords text={title} />
}
