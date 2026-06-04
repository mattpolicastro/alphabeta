import type { ReactNode } from 'react'

interface Props {
  title: string
  foldIf: string
  metric: string
  lockedAgo?: string
  extra?: ReactNode
}

export function LockedBetMini({
  title,
  foldIf,
  metric,
  lockedAgo,
  extra,
}: Props) {
  return (
    <div className="relative mb-4 border-[1.5px] border-terra bg-white/35 px-3.5 py-2.5">
      <span className="absolute -top-2.5 left-3 bg-paper px-1.5 text-[9px] font-bold uppercase tracking-[1.5px] text-terra">
        🔒 locked bet
      </span>
      <p className="text-xs leading-relaxed">
        <span className="font-medium text-terra">{title}</span>
        {' · fold-if '}
        <span className="font-medium text-terra">{foldIf}</span>
        {' on '}
        {metric}
        {lockedAgo ? ` · locked ${lockedAgo}` : null}
        {extra}
      </p>
    </div>
  )
}
