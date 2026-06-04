import type { GistGoalFields } from '@/lib/strategy/types'
import { Labeled, TextInput } from '../sharedEdit'

interface Props {
  fields: GistGoalFields
  editing: boolean
  onDraft: (next: GistGoalFields) => void
}

export function GistGoalCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <GistGoalEdit fields={fields} onDraft={onDraft} />
  ) : (
    <GistGoalDisplay fields={fields} />
  )
}

function GistGoalDisplay({ fields }: { fields: GistGoalFields }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold leading-snug text-gray-800">
        {fields.title || <span className="italic text-gray-400">Untitled</span>}
      </h3>
      {fields.measuredBy ? (
        <p className="text-[11px] text-gray-500">
          <span className="font-medium">Metric:</span> {fields.measuredBy}
        </p>
      ) : null}
      {fields.targetValue ? (
        <p className="text-[11px] text-gray-600">
          Target: {fields.targetValue}
        </p>
      ) : null}
      {fields.timeframe ? (
        <span className="self-start rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
          {fields.timeframe}
        </span>
      ) : null}
    </div>
  )
}

function GistGoalEdit({
  fields,
  onDraft,
}: {
  fields: GistGoalFields
  onDraft: (next: GistGoalFields) => void
}) {
  function set<K extends keyof GistGoalFields>(
    key: K,
    value: GistGoalFields[K],
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
      <Labeled label="Timeframe">
        <TextInput
          value={fields.timeframe ?? ''}
          onChange={(v) => set('timeframe', v || undefined)}
          ariaLabel="Timeframe"
        />
      </Labeled>
    </div>
  )
}
