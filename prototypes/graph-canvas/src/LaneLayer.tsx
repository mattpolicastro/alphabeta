// The lane layer: bands in board coordinates, under the nodes and over the grid.
// It reads the live viewport transform and applies it itself, so the bands pan
// and zoom with the board instead of sticking to the screen.
import { useMemo } from 'react'
import { useStore } from '@xyflow/react'
import { laneBands, type Orient } from './lanes'

// far enough along the cross axis that panning never reaches a band's end
const SPAN = 200000

export function LaneLayer({ orient, generations }: { orient: Orient; generations: number }) {
  const tx = useStore((s) => s.transform[0])
  const ty = useStore((s) => s.transform[1])
  const zoom = useStore((s) => s.transform[2])
  const bands = useMemo(() => laneBands(orient, generations), [orient, generations])

  return (
    <div className="lanes">
      <div className="lanes-viewport" style={{ transform: `translate(${tx}px, ${ty}px) scale(${zoom})` }}>
        {bands.map((b, i) => (
          <div
            key={b.key}
            className={`lane lane-${orient}${i % 2 ? ' wash' : ''}`}
            style={
              orient === 'h'
                ? { left: b.start, width: b.end - b.start, top: -SPAN / 2, height: SPAN }
                : { top: b.start, height: b.end - b.start, left: -SPAN / 2, width: SPAN }
            }
          >
            <span className="lane-label">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
