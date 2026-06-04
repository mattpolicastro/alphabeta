type SegmentDirection = 'contra' | 'neutral' | 'support'

interface Props {
  segments: (SegmentDirection | null)[]
  summary?: string
}

const SEGMENT_COLORS: Record<SegmentDirection, string> = {
  contra: 'bg-terra border-terra',
  neutral: 'bg-amber-400 border-amber-400',
  support: 'bg-green-600 border-green-600',
}

export function EvidenceBar({ segments, summary }: Props) {
  return (
    <div className="mb-3.5 border-[1.5px] border-rule p-3.5">
      <div className="mb-2 text-[10px] uppercase tracking-[1px] text-ink-soft">
        evidence bar — qualitative judgment against the hypothesis
      </div>
      <div className="mb-2 flex h-2.5 gap-[3px]">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`flex-1 border ${
              seg ? SEGMENT_COLORS[seg] : 'border-rule-faint bg-transparent'
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-ink-faint">
        <span>strongly contradicts</span>
        <span>neutral</span>
        <span>strongly supports</span>
      </div>
      {summary ? (
        <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">
          {summary}
        </p>
      ) : null}
    </div>
  )
}
