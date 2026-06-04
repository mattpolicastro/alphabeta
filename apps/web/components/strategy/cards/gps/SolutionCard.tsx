import type { GpsSolutionFields } from '@/lib/strategy/types'
import { Labeled, TextArea, TextInput } from '../sharedEdit'

interface Props {
  fields: GpsSolutionFields
  editing: boolean
  onDraft: (next: GpsSolutionFields) => void
}

export function SolutionCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <SolutionEdit fields={fields} onDraft={onDraft} />
  ) : (
    <SolutionDisplay fields={fields} />
  )
}

function SolutionDisplay({ fields }: { fields: GpsSolutionFields }) {
  const levelColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  }

  const statusColors = {
    proposed: 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
  }

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-gray-800">
        {fields.title || <span className="italic text-gray-400">Untitled</span>}
      </h3>
      {fields.description ? (
        <p className="text-[11px] text-gray-600">{fields.description}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {fields.effort && (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${levelColors[fields.effort]}`}>
            Effort: {fields.effort}
          </span>
        )}
        {fields.impact && (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${levelColors[fields.impact]}`}>
            Impact: {fields.impact}
          </span>
        )}
        {fields.status && (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[fields.status]}`}>
            {fields.status}
          </span>
        )}
      </div>
    </div>
  )
}

function SolutionEdit({
  fields,
  onDraft,
}: {
  fields: GpsSolutionFields
  onDraft: (next: GpsSolutionFields) => void
}) {
  function set<K extends keyof GpsSolutionFields>(key: K, value: GpsSolutionFields[K]) {
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
        />
      </Labeled>
      <Labeled label="Effort">
        <select
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          value={fields.effort ?? ''}
          onChange={(e) => set('effort', (e.target.value || undefined) as GpsSolutionFields['effort'])}
        >
          <option value="">Select effort</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </Labeled>
      <Labeled label="Impact">
        <select
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          value={fields.impact ?? ''}
          onChange={(e) => set('impact', (e.target.value || undefined) as GpsSolutionFields['impact'])}
        >
          <option value="">Select impact</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </Labeled>
      <Labeled label="Status">
        <select
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          value={fields.status ?? ''}
          onChange={(e) => set('status', (e.target.value || undefined) as GpsSolutionFields['status'])}
        >
          <option value="">Select status</option>
          <option value="proposed">Proposed</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </Labeled>
    </div>
  )
}
