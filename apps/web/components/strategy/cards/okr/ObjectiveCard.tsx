import type { OkrObjectiveFields } from '@/lib/strategy/types'
import { Labeled, TextInput, TextArea } from '../sharedEdit'

interface Props {
  fields: OkrObjectiveFields
  editing: boolean
  onDraft: (next: OkrObjectiveFields) => void
}

export function ObjectiveCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <ObjectiveEdit fields={fields} onDraft={onDraft} />
  ) : (
    <ObjectiveDisplay fields={fields} />
  )
}

function ObjectiveDisplay({ fields }: { fields: OkrObjectiveFields }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold leading-snug text-gray-800">
        {fields.title || (
          <span className="italic text-gray-400">Untitled objective</span>
        )}
      </p>
      {fields.description ? (
        <p className="text-xs leading-snug text-gray-500">
          {fields.description}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {fields.timeframe ? (
          <span className="inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">
            {fields.timeframe}
          </span>
        ) : null}
        {fields.owner ? (
          <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
            {fields.owner}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function ObjectiveEdit({
  fields,
  onDraft,
}: {
  fields: OkrObjectiveFields
  onDraft: (next: OkrObjectiveFields) => void
}) {
  function set<K extends keyof OkrObjectiveFields>(
    key: K,
    value: OkrObjectiveFields[K],
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
      <Labeled label="Description">
        <TextArea
          value={fields.description ?? ''}
          onChange={(v) => set('description', v || undefined)}
          ariaLabel="Description"
          rows={2}
        />
      </Labeled>
      <Labeled label="Timeframe">
        <TextInput
          value={fields.timeframe ?? ''}
          onChange={(v) => set('timeframe', v || undefined)}
          ariaLabel="Timeframe"
        />
      </Labeled>
      <Labeled label="Owner">
        <TextInput
          value={fields.owner ?? ''}
          onChange={(v) => set('owner', v || undefined)}
          ariaLabel="Owner"
        />
      </Labeled>
    </div>
  )
}
