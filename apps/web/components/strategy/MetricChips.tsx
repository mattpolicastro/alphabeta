interface MetricChipsProps {
  startValue: string
  goalValue: string
  startDate?: string
  goalDate?: string
}

export function MetricChips({
  startValue,
  goalValue,
  startDate,
  goalDate,
}: MetricChipsProps) {
  return (
    <div className="flex items-stretch gap-2 text-xs">
      <Chip label="START" value={startValue} date={startDate} variant="start" />
      <ArrowIndicator />
      <Chip label="GOAL" value={goalValue} date={goalDate} variant="goal" />
    </div>
  )
}

function Chip({
  label,
  value,
  date,
  variant,
}: {
  label: string
  value: string
  date?: string
  variant: 'start' | 'goal'
}) {
  const bg = variant === 'start' ? 'bg-gray-100' : 'bg-emerald-100'
  const valueTxt = value && value.length > 0 ? value : '—'
  return (
    <div
      className={`flex min-w-[70px] flex-1 flex-col items-center rounded-md px-2 py-1 ${bg}`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <span className="mt-0.5 text-sm font-semibold text-gray-800">
        {valueTxt}
      </span>
      {date ? (
        <span className="text-[9px] text-gray-500">{date}</span>
      ) : null}
    </div>
  )
}

function ArrowIndicator() {
  return (
    <div className="flex items-center px-0.5 text-gray-400" aria-hidden="true">
      →
    </div>
  )
}
