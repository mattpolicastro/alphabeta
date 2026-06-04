import type { ProblemFields, ProblemState } from '@/lib/strategy/types'
import { BadgeRow } from '../BadgeRow'
import { Expandable } from './Expandable'
import {
  EffortSelect,
  ImpactSelect,
  Labeled,
  ProblemStateSelect,
  TextArea,
  TextInput,
} from './sharedEdit'

interface Props {
  fields: ProblemFields
  editing: boolean
  onDraft: (next: ProblemFields) => void
}

export function ProblemCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <ProblemEdit fields={fields} onDraft={onDraft} />
  ) : (
    <ProblemDisplay fields={fields} />
  )
}

const STATE_LABEL: Record<ProblemState, string> = {
  active: 'Active',
  prospect: 'Prospect',
  pool: 'Pool',
}

const STATE_STYLES: Record<ProblemState, string> = {
  active: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  prospect: 'bg-sky-100 text-sky-800 ring-sky-200',
  pool: 'bg-gray-100 text-gray-600 ring-gray-200',
}

function ProblemDisplay({ fields }: { fields: ProblemFields }) {
  const state: ProblemState = fields.state ?? 'active'
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-gray-800">
          {fields.title || (
            <span className="italic text-gray-400">Untitled</span>
          )}
        </h3>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${STATE_STYLES[state]}`}
        >
          {STATE_LABEL[state]}
        </span>
      </div>
      <BadgeRow
        impact={fields.expectedImpact}
        confidence={fields.confidence}
        effort={fields.effort}
      />
      {fields.hypothesis ? (
        <Expandable label="Hypothesis">{fields.hypothesis}</Expandable>
      ) : null}
      {fields.planningNotes ? (
        <Expandable label="Planning notes">{fields.planningNotes}</Expandable>
      ) : null}
    </div>
  )
}

function ProblemEdit({
  fields,
  onDraft,
}: {
  fields: ProblemFields
  onDraft: (next: ProblemFields) => void
}) {
  function set<K extends keyof ProblemFields>(key: K, value: ProblemFields[K]) {
    onDraft({ ...fields, [key]: value })
  }
  return (
    <div className="flex flex-col gap-2">
      <Labeled label="Title">
        <TextInput
          value={fields.title}
          onChange={(v) => set('title', v)}
          ariaLabel="Title"
        />
      </Labeled>
      <div className="grid grid-cols-2 gap-2">
        <ProblemStateSelect
          value={fields.state}
          onChange={(v) => set('state', v)}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ImpactSelect
          value={fields.expectedImpact}
          onChange={(v) => set('expectedImpact', v)}
          label="Impact"
        />
        <ImpactSelect
          value={fields.confidence}
          onChange={(v) => set('confidence', v)}
          label="Confidence"
        />
        <EffortSelect
          value={fields.effort}
          onChange={(v) => set('effort', v)}
        />
      </div>
      <Labeled label="Hypothesis">
        <TextArea
          value={fields.hypothesis ?? ''}
          onChange={(v) => set('hypothesis', v || undefined)}
          ariaLabel="Hypothesis"
        />
      </Labeled>
      <Labeled label="Planning notes">
        <TextArea
          value={fields.planningNotes ?? ''}
          onChange={(v) => set('planningNotes', v || undefined)}
          ariaLabel="Planning notes"
        />
      </Labeled>
    </div>
  )
}
