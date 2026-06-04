'use client'

import { useEffect } from 'react'
import { TEMPLATE_LIST } from '@/lib/strategy/templates'
import type { TemplateDefinition } from '@/lib/strategy/templates'

interface TemplatePickerProps {
  open: boolean
  onSelect: (template: TemplateDefinition) => void
  onCancel?: () => void
}

export function TemplatePicker({ open, onSelect, onCancel }: TemplatePickerProps) {
  useEffect(() => {
    if (!open || !onCancel) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel!()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl rounded border border-dashed border-rule bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="template-picker-title"
          className="text-base font-bold text-ink"
        >
          Choose a framework
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Select a decision-planning framework to structure your board.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TEMPLATE_LIST.map((t) => (
            <TemplateOption key={t.id} template={t} onSelect={onSelect} />
          ))}
        </div>
        {onCancel ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-rule-faint bg-paper px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-hover"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function TemplateOption({
  template,
  onSelect,
}: {
  template: TemplateDefinition
  onSelect: (t: TemplateDefinition) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="flex flex-col gap-1 rounded border border-dashed border-rule-faint p-4 text-left transition hover:border-rule hover:bg-paper-hover"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-ink">
          {template.name}
        </span>
        <span className="rounded bg-terra-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-terra">
          {template.shortName}
        </span>
      </div>
      <p className="text-xs text-ink-soft">{template.description}</p>
      <div className="mt-1 flex gap-1">
        {template.columns.map((col) => (
          <span
            key={col.id}
            className="rounded-full bg-paper-veil px-1.5 py-0.5 text-[9px] font-medium text-ink-soft"
          >
            {col.title}
          </span>
        ))}
      </div>
    </button>
  )
}
