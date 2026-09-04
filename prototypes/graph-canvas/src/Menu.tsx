// A plain popover menu in the btn2 / mono register. No library. Closes on outside
// click, Esc, or focus leaving; arrow keys and Tab walk the items. Rows may carry a
// registry id so their status chip (and pencil register, when stub) shows before opening.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { StatusChip, surfaceClass } from './StatusChip'

export interface MenuItem {
  id: string
  label: string
  onSelect?: () => void
  disabled?: boolean
  hint?: string // mono, shown when disabled
  cap?: string // capability id → chip + pencil register
  chip?: ReactNode
}

export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const enabled = () => [...(pop.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not(:disabled)') ?? [])]

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      root.current?.querySelector<HTMLElement>('button')?.focus()
    }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    enabled()[0]?.focus()
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])

  const walk = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const els = enabled()
    if (!els.length) return
    const i = els.indexOf(document.activeElement as HTMLElement)
    els[(i + (e.key === 'ArrowDown' ? 1 : els.length - 1) + els.length) % els.length].focus()
  }
  const id = `menu-${label.replace(/\W+/g, '-')}`

  return (
    <span className="menu" ref={root} onBlur={(e) => { if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <button className={`btn2 sm ${open ? 'on' : ''}`} aria-haspopup="menu" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((v) => !v)} onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) } }}>
        {label} ▾
      </button>
      {open && (
        <div className="menu-pop" role="menu" id={id} ref={pop} onKeyDown={walk}>
          {items.map((it) => (
            <button key={it.id} role="menuitem" className={`menu-item ${it.cap ? surfaceClass(it.cap) : ''}`}
              disabled={it.disabled} aria-disabled={it.disabled || undefined}
              onClick={() => { setOpen(false); it.onSelect?.() }}>
              <span>{it.label}</span>
              {it.cap && <StatusChip id={it.cap} />}
              {it.chip}
              {it.disabled && it.hint && <span className="menu-hint">{it.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
