import type { DriverFields } from '@/lib/strategy/types'
import { BadgeRow } from '../BadgeRow'
import { MetricChips } from '../MetricChips'
import { Expandable } from './Expandable'
import {
  EffortSelect,
  ImpactSelect,
  Labeled,
  TextArea,
  TextInput,
} from './sharedEdit'

interface Props {
  fields: DriverFields
  editing: boolean
  onDraft: (next: DriverFields) => void
}

export function DriverCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <DriverEdit fields={fields} onDraft={onDraft} />
  ) : (
    <DriverDisplay fields={fields} />
  )
}

function DriverDisplay({ fields }: { fields: DriverFields }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold leading-snug text-gray-800">
        {fields.title || <span className="italic text-gray-400">Untitled</span>}
      </h3>
      {fields.measuredBy ? (
        <p className="text-[11px] text-gray-500">
          <span className="font-medium">Metric:</span> {fields.measuredBy}
        </p>
      ) : null}
      <MetricChips
        startValue={fields.startValue}
        goalValue={fields.goalValue}
      />
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

function DriverEdit({
  fields,
  onDraft,
}: {
  fields: DriverFields
  onDraft: (next: DriverFields) => void
}) {
  function set<K extends keyof DriverFields>(key: K, value: DriverFields[K]) {
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
      <Labeled label="Measured by">
        <TextInput
          value={fields.measuredBy}
          onChange={(v) => set('measuredBy', v)}
          ariaLabel="Measured by"
        />
      </Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Start value">
          <TextInput
            value={fields.startValue}
            onChange={(v) => set('startValue', v)}
            ariaLabel="Start value"
          />
        </Labeled>
        <Labeled label="Goal value">
          <TextInput
            value={fields.goalValue}
            onChange={(v) => set('goalValue', v)}
            ariaLabel="Goal value"
          />
        </Labeled>
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
