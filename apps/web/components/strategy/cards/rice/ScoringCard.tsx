import type { RiceScoringFields } from '@/lib/strategy/types'
import { Labeled, TextInput } from '../sharedEdit'

interface Props {
  fields: RiceScoringFields
  editing: boolean
  onDraft: (next: RiceScoringFields) => void
}

export function ScoringCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <ScoringEdit fields={fields} onDraft={onDraft} />
  ) : (
    <ScoringDisplay fields={fields} />
  )
}

function computeRiceScore(fields: RiceScoringFields): string | null {
  if (fields.reach === undefined || fields.impact === undefined || fields.confidence === undefined || fields.effort === undefined) return null
  if (fields.effort === 0) return null
  const score = (fields.reach * fields.impact * (fields.confidence / 100)) / fields.effort
  return score.toFixed(1)
}

function ScoringDisplay({ fields }: { fields: RiceScoringFields }) {
  const score = computeRiceScore(fields)
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-800">{fields.title}</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>Reach: {fields.reach ?? '—'}</div>
        <div>Impact: {fields.impact ?? '—'}</div>
        <div>Confidence: {fields.confidence ?? '—'}%</div>
        <div>Effort: {fields.effort ?? '—'} p-m</div>
      </div>
      <div className="rounded bg-indigo-50 px-2 py-1 text-center font-medium text-indigo-700">
        RICE Score: {score ?? '—'}
      </div>
    </div>
  )
}

function ScoringEdit({ fields, onDraft }: { fields: RiceScoringFields; onDraft: (next: RiceScoringFields) => void }) {
  function set<K extends keyof RiceScoringFields>(key: K, value: RiceScoringFields[K]) {
    onDraft({ ...fields, [key]: value })
  }
  return (
    <div className="flex flex-col gap-2">
      <Labeled label="Title">
        <TextInput value={fields.title} onChange={(v: string) => set('title', v)} ariaLabel="Title" />
      </Labeled>
      <Labeled label="Reach (0-100)">
        <input type="number" min="0" max="100" className="w-full rounded border px-2 py-1 text-sm" value={fields.reach ?? ''} onChange={(e) => set('reach', e.target.value ? Number(e.target.value) : undefined)} />
      </Labeled>
      <Labeled label="Impact">
        <select className="w-full rounded border px-2 py-1 text-sm" value={fields.impact ?? ''} onChange={(e) => set('impact', e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Select...</option>
          <option value="0.25">0.25 Minimal</option>
          <option value="0.5">0.5 Low</option>
          <option value="1">1 Medium</option>
          <option value="2">2 High</option>
          <option value="3">3 Massive</option>
        </select>
      </Labeled>
      <Labeled label="Confidence (0-100%)">
        <input type="number" min="0" max="100" className="w-full rounded border px-2 py-1 text-sm" value={fields.confidence ?? ''} onChange={(e) => set('confidence', e.target.value ? Number(e.target.value) : undefined)} />
      </Labeled>
      <Labeled label="Effort (person-months)">
        <input type="number" min="0" step="0.5" className="w-full rounded border px-2 py-1 text-sm" value={fields.effort ?? ''} onChange={(e) => set('effort', e.target.value ? Number(e.target.value) : undefined)} />
      </Labeled>
    </div>
  )
}
