// "One loop, five moments" — the walkthrough. Pure data; status rolls up from the registry.
import { capability, type Capability, type Status } from './capabilities'

export type LoopStepId = 'talk' | 'map' | 'commit' | 'resolve' | 'calibrate'

export interface LoopStep {
  id: LoopStepId
  name: string
  line: string
  dependsOn: string[]
}

export const LOOP: LoopStep[] = [
  { id: 'talk', name: 'Talk', line: 'say what you’re trying to do, in plain language', dependsOn: ['tray-openfield'] },
  { id: 'map', name: 'Map', line: 'goals → problems → questions → bets, laid out by altitude', dependsOn: ['canvas'] },
  { id: 'commit', name: 'Commit', line: 'write the fold-if before the data exists', dependsOn: ['moment-lock', 'face-draft'] },
  { id: 'resolve', name: 'Resolve', line: 'the bucket is computed from what you committed, not argued', dependsOn: ['moment-resolve'] },
  { id: 'calibrate', name: 'Calibrate', line: 'over time: how good your judgment actually is', dependsOn: ['doc-calibration'] },
]

// precedence: planned > stub > partial > live — the weakest dependency sets the step
const RANK: Record<Status, number> = { live: 0, partial: 1, stub: 2, planned: 3 }

export function stepStatus(step: LoopStep, lookup: (id: string) => Capability = capability): { status: Status; gap?: string } {
  let status: Status = 'live'
  let gap: string | undefined
  for (const id of step.dependsOn) {
    const c = lookup(id)
    if (RANK[c.status] > RANK[status]) status = c.status
    if (c.status === 'partial' && !gap) gap = c.gap
  }
  return status === 'partial' ? { status, gap } : { status }
}
