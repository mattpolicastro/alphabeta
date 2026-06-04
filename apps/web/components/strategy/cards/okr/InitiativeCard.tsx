import type { OkrInitiativeFields } from '@/lib/strategy/types'
import { Labeled, TextInput, TextArea } from '../sharedEdit'

interface Props {
  fields: OkrInitiativeFields
  editing: boolean
  onDraft: (next: OkrInitiativeFields) => void
}

type InitiativeStatus = NonNullable<OkrInitiativeFields['status']>

const STATUS_STYLES: Record<InitiativeStatus, string> = {
  'not-started': 'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
}

const STATUS_OPTIONS: InitiativeStatus[] = [
  'not-started',
  'in-progress',
  'done',
  'blocked',
]

export function InitiativeCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <InitiativeEdit fields={fields} onDraft={onDraft} />
  ) : (
    <InitiativeDisplay fields={fields} />
  )
}

function InitiativeDisplay({ fields }: { fields: OkrInitiativeFields }) {
  const status = fields.status ?? 'not-started'

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold leading-snug text-gray-800">
        {fields.title || (
          <span className="italic text-gray-400">Untitled initiative</span>
        )}
      </p>
      {fields.description ? (
        <p className="text-xs leading-snug text-gray-500">
          {fields.description}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}
        >
          {status}
        </span>
        {fields.owner ? (
          <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
            {fields.owner}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function InitiativeEdit({
  fields,
  onDraft,
}: {
  fields: OkrInitiativeFields
  onDraft: (next: OkrInitiativeFields) => void
}) {
  function set<K extends keyof OkrInitiativeFields>(
    key: K,
    value: OkrInitiativeFields[K],
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
          value={fields.status ?? 'not-started'}
          onChange={(e) =>
            set('status', e.target.value as InitiativeStatus)
          }
          aria-label="Status"
          className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
        >
          {STATUS_OPTIONS.map((v) => (
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
