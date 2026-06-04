import type { EffortLevel, ImpactLevel } from '@/lib/strategy/types'

interface BadgeRowProps {
  impact?: ImpactLevel
  confidence?: ImpactLevel
  effort?: EffortLevel
}

const IMPACT_STYLES: Record<ImpactLevel, string> = {
  high: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  medium: 'bg-amber-100 text-amber-800 ring-amber-200',
  low: 'bg-gray-100 text-gray-600 ring-gray-200',
}

const EFFORT_STYLES: Record<EffortLevel, string> = {
  XS: 'bg-sky-100 text-sky-800 ring-sky-200',
  S: 'bg-sky-100 text-sky-800 ring-sky-200',
  M: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  L: 'bg-purple-100 text-purple-800 ring-purple-200',
  XL: 'bg-rose-100 text-rose-800 ring-rose-200',
}

export function BadgeRow({ impact, confidence, effort }: BadgeRowProps) {
  if (!impact && !confidence && !effort) return null
  return (
    <div className="flex flex-wrap gap-1 text-[10px] font-medium">
      {impact ? (
        <Badge label={`Impact ${impact}`} className={IMPACT_STYLES[impact]} />
      ) : null}
      {confidence ? (
        <Badge
          label={`Confidence ${confidence}`}
          className={IMPACT_STYLES[confidence]}
        />
      ) : null}
      {effort ? (
        <Badge label={`Effort ${effort}`} className={EFFORT_STYLES[effort]} />
      ) : null}
    </div>
  )
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 uppercase tracking-wide ring-1 ${className}`}
    >
      {label}
    </span>
  )
}
