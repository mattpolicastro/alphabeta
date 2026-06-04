import type { OkrKeyResultFields } from '@/lib/strategy/types'
import { Labeled, TextInput } from '../sharedEdit'

interface Props {
  fields: OkrKeyResultFields
  editing: boolean
  onDraft: (next: OkrKeyResultFields) => void
}

export function KeyResultCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <KeyResultEdit fields={fields} onDraft={onDraft} />
  ) : (
    <KeyResultDisplay fields={fields} />
  )
}

function KeyResultDisplay({ fields }: { fields: OkrKeyResultFields }) {
  const hasProgress =
    fields.startValue != null ||
    fields.currentValue != null ||
    fields.targetValue != null

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold leading-snug text-gray-800">
        {fields.title || (
          <span className="italic text-gray-400">Untitled key result</span>
        )}
      </p>
      {fields.measuredBy ? (
        <p className="text-xs leading-snug text-gray-500">
          Metric: {fields.measuredBy}
        </p>
      ) : null}
      {hasProgress ? (
        <p className="text-xs tabular-nums text-gray-600">
          {fields.startValue ?? '?'} &rarr; {fields.currentValue ?? '?'} &rarr;{' '}
          {fields.targetValue ?? '?'}
        </p>
      ) : null}
    </div>
  )
}

function KeyResultEdit({
  fields,
  onDraft,
}: {
  fields: OkrKeyResultFields
  onDraft: (next: OkrKeyResultFields) => void
}) {
  function set<K extends keyof OkrKeyResultFields>(
    key: K,
    value: OkrKeyResultFields[K],
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
      <Labeled label="Start value">
        <TextInput
          value={fields.startValue ?? ''}
          onChange={(v) => set('startValue', v || undefined)}
          ariaLabel="Start value"
        />
      </Labeled>
      <Labeled label="Current value">
        <TextInput
          value={fields.currentValue ?? ''}
          onChange={(v) => set('currentValue', v || undefined)}
          ariaLabel="Current value"
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
