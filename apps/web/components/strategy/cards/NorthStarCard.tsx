import type { NorthStarFields } from '@/lib/strategy/types'
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
  fields: NorthStarFields
  editing: boolean
  onDraft: (next: NorthStarFields) => void
}

export function NorthStarCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <NorthStarEdit fields={fields} onDraft={onDraft} />
  ) : (
    <NorthStarDisplay fields={fields} />
  )
}

function NorthStarDisplay({ fields }: { fields: NorthStarFields }) {
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
        startDate={fields.startDate}
        goalDate={fields.goalDate}
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

function NorthStarEdit({
  fields,
  onDraft,
}: {
  fields: NorthStarFields
  onDraft: (next: NorthStarFields) => void
}) {
  function set<K extends keyof NorthStarFields>(
    key: K,
    value: NorthStarFields[K],
  ) {
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
        <Labeled label="Start date">
          <TextInput
            value={fields.startDate}
            onChange={(v) => set('startDate', v)}
            ariaLabel="Start date"
          />
        </Labeled>
        <Labeled label="Goal value">
          <TextInput
            value={fields.goalValue}
            onChange={(v) => set('goalValue', v)}
            ariaLabel="Goal value"
          />
        </Labeled>
        <Labeled label="Goal date">
          <TextInput
            value={fields.goalDate}
            onChange={(v) => set('goalDate', v)}
            ariaLabel="Goal date"
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

