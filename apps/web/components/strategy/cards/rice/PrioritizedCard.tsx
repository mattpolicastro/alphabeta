import type { RicePrioritizedFields } from '@/lib/strategy/types'
import { Labeled, TextInput } from '../sharedEdit'

interface Props {
  fields: RicePrioritizedFields
  editing: boolean
  onDraft: (next: RicePrioritizedFields) => void
}

export function PrioritizedCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <PrioritizedEdit fields={fields} onDraft={onDraft} />
  ) : (
    <PrioritizedDisplay fields={fields} />
  )
}

function PrioritizedDisplay({ fields }: { fields: RicePrioritizedFields }) {
  const statusColors = {
    queued: 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-800">{fields.title}</h3>
      <div className="flex flex-wrap items-center gap-2">
        {fields.riceScore !== undefined && (
          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
            RICE: {fields.riceScore}
          </span>
        )}
        {fields.status && (
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusColors[fields.status] || 'bg-gray-100 text-gray-600'}`}>
            {fields.status}
          </span>
        )}
        {fields.owner && (
          <span className="text-xs text-gray-500">Owner: {fields.owner}</span>
        )}
      </div>
    </div>
  )
}

function PrioritizedEdit({ fields, onDraft }: { fields: RicePrioritizedFields; onDraft: (next: RicePrioritizedFields) => void }) {
  function set<K extends keyof RicePrioritizedFields>(key: K, value: RicePrioritizedFields[K]) {
    onDraft({ ...fields, [key]: value })
  }
  return (
    <div className="flex flex-col gap-2">
      <Labeled label="Title">
        <TextInput value={fields.title} onChange={(v: string) => set('title', v)} ariaLabel="Title" />
      </Labeled>
      <Labeled label="RICE Score">
        <input type="number" step="0.1" className="w-full rounded border px-2 py-1 text-sm" value={fields.riceScore ?? ''} onChange={(e) => set('riceScore', e.target.value ? Number(e.target.value) : undefined)} />
      </Labeled>
      <Labeled label="Status">
        <select className="w-full rounded border px-2 py-1 text-sm" value={fields.status ?? ''} onChange={(e) => set('status', (e.target.value || undefined) as any)}>
          <option value="">Select...</option>
          <option value="queued">Queued</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </Labeled>
      <Labeled label="Owner">
        <TextInput value={fields.owner ?? ''} onChange={(v: string) => set('owner', v || undefined)} ariaLabel="Owner" />
      </Labeled>
    </div>
  )
}
