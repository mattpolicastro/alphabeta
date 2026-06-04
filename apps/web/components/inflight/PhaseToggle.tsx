interface Phase {
  id: string
  label: string
}

interface Props {
  phases: Phase[]
  activeId: string
  onChange: (id: string) => void
}

export function PhaseToggle({ phases, activeId, onChange }: Props) {
  return (
    <div className="mb-4 flex w-fit border-[1.5px] border-terra-line">
      {phases.map((phase) => {
        const isActive = phase.id === activeId
        return (
          <button
            key={phase.id}
            type="button"
            onClick={() => onChange(phase.id)}
            className={`border-r-[1.5px] border-dashed border-terra-line px-4 py-2 font-mono text-xs last:border-r-0 ${
              isActive
                ? 'bg-terra font-bold text-paper'
                : 'bg-transparent text-ink-soft hover:bg-terra-soft'
            }`}
          >
            {phase.label}
          </button>
        )
      })}
    </div>
  )
}
