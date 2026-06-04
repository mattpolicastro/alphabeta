import type { GistStepFields } from '@/lib/strategy/types'
import { Labeled, TextArea, TextInput } from '../sharedEdit'

interface Props {
  fields: GistStepFields
  editing: boolean
  onDraft: (next: GistStepFields) => void
}

export function GistStepCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <GistStepEdit fields={fields} onDraft={onDraft} />
  ) : (
    <GistStepDisplay fields={fields} />
  )
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-500',
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
}

type StepStatus = 'planned' | 'in-progress' | 'done'
const STATUSES: StepStatus[] = ['planned', 'in-progress', 'done']

function GistStepDisplay({ fields }: { fields: GistStepFields }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold leading-snug text-gray-800">
        {fields.title || <span className="italic text-gray-400">Untitled</span>}
      </h3>
      {fields.description ? (
        <p className="whitespace-pre-wrap text-[11px] leading-snug text-gray-600">
          {fields.description}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {fields.status ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[fields.status]}`}
          >
            {fields.status}
          </span>
        ) : null}
        {fields.owner ? (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
            {fields.owner}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function GistStepEdit({
  fields,
  onDraft,
}: {
  fields: GistStepFields
  onDraft: (next: GistStepFields) => void
}) {
  function set<K extends keyof GistStepFields>(
    key: K,
    value: GistStepFields[K],
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
      <Labeled label="Status">
        <select
          value={fields.status ?? ''}
          onChange={(e) =>
            set(
              'status',
              (e.target.value || undefined) as StepStatus | undefined,
            )
          }
          aria-label="Status"
          className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
        >
          <option value="">—</option>
          {STATUSES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
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
