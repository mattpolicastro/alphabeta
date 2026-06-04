import type { GpsGoalFields } from '@/lib/strategy/types'
import { Labeled, TextArea, TextInput } from '../sharedEdit'

interface Props {
  fields: GpsGoalFields
  editing: boolean
  onDraft: (next: GpsGoalFields) => void
}

export function GoalCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <GoalEdit fields={fields} onDraft={onDraft} />
  ) : (
    <GoalDisplay fields={fields} />
  )
}

function GoalDisplay({ fields }: { fields: GpsGoalFields }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-gray-800">
        {fields.title || <span className="italic text-gray-400">Untitled</span>}
      </h3>
      {fields.successCriteria ? (
        <p className="text-[11px] text-gray-600">{fields.successCriteria}</p>
      ) : null}
      {(fields.measuredBy || fields.targetValue) ? (
        <div className="flex gap-2 text-[11px] text-gray-500">
          {fields.measuredBy && <span>{fields.measuredBy}</span>}
          {fields.targetValue && <span>→ {fields.targetValue}</span>}
        </div>
      ) : null}
    </div>
  )
}

function GoalEdit({
  fields,
  onDraft,
}: {
  fields: GpsGoalFields
  onDraft: (next: GpsGoalFields) => void
}) {
  function set<K extends keyof GpsGoalFields>(key: K, value: GpsGoalFields[K]) {
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
      <Labeled label="Success criteria">
        <TextArea
          value={fields.successCriteria ?? ''}
          onChange={(v) => set('successCriteria', v || undefined)}
          ariaLabel="Success criteria"
        />
      </Labeled>
      <Labeled label="Measured by">
        <TextInput
          value={fields.measuredBy ?? ''}
          onChange={(v) => set('measuredBy', v || undefined)}
          ariaLabel="Measured by"
        />
      </Labeled>
      <Labeled label="Target value">
        <TextInput
          value={fields.targetValue ?? ''}
          onChange={(v) => set('targetValue', v || undefined)}
          ariaLabel="Target value"
        />
      </Labeled>
    </div>
  )
}
