import { useState } from 'react'

export function Expandable({
  label,
  children,
  initialOpen = false,
}: {
  label: string
  children: React.ReactNode
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <div className="text-[12px] text-gray-600">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 hover:text-gray-700"
      >
        <span
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
          className="inline-block w-2 text-[10px]"
        >
          ▶
        </span>
        {label}
      </button>
      {open ? (
        <div className="mt-1 whitespace-pre-wrap rounded bg-black/5 px-2 py-1 text-[11px] leading-snug">
          {children}
        </div>
      ) : null}
    </div>
  )
}
