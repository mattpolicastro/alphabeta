// One shell for everything that opens in context: the two trays (ambient, at the
// side) and the three documents (centered on a scrim). Same header strip — mono
// eyebrow, optional chip + meta, title, close × — same z-order token, Esc closes.
// Placement is the one thing that differs, by design: trays sit beside the canvas
// so you can keep working; documents are read on their own.
import { useEffect, type ReactNode } from 'react'

export function Overlay({ kind, eyebrow, chip, meta, title, className = '', onClose, children }: {
  kind: 'tray' | 'doc'
  eyebrow: ReactNode
  chip?: ReactNode
  meta?: ReactNode
  title?: ReactNode
  className?: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  const head = (
    <>
      <div className="sheet-head">
        <span className="sheet-eyebrow">{eyebrow}</span>
        {chip}
        {meta && <span className="sheet-meta">{meta}</span>}
        <button className="sheet-close" aria-label="close" onClick={onClose}>×</button>
      </div>
      {title && <h2 className="sheet-title">{title}</h2>}
    </>
  )
  if (kind === 'tray') return <aside className={`sheet tray ${className}`}>{head}{children}</aside>
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <section className={`sheet doc ${className}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {head}
        {children}
      </section>
    </div>
  )
}
