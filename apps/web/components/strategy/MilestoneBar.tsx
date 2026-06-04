import type { Milestone } from '@/lib/strategy/types'

interface MilestoneBarProps {
  milestones: Milestone[]
  onToggle?: (milestoneId: string) => void
  editable?: boolean
}

export function MilestoneBar({
  milestones,
  onToggle,
  editable = false,
}: MilestoneBarProps) {
  const total = milestones.length
  const done = milestones.filter((m) => m.done).length
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>Milestones</span>
        <span>
          {done}/{total}
        </span>
      </div>
      <div
        className="flex h-2 w-full gap-0.5 overflow-hidden rounded bg-gray-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        {milestones.map((m) => (
          <span
            key={m.id}
            aria-label={`${m.label} (${m.done ? 'done' : 'not done'})`}
            className={`flex-1 ${m.done ? 'bg-emerald-500' : 'bg-gray-200'}`}
          />
        ))}
        {total === 0 ? <span className="flex-1 bg-gray-200" /> : null}
      </div>
      {editable ? (
        <ul className="mt-1 flex flex-col gap-0.5 text-[11px]">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={m.done}
                onChange={() => onToggle?.(m.id)}
                aria-label={`Toggle ${m.label}`}
              />
              <span className={m.done ? 'line-through text-gray-400' : ''}>
                {m.label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
