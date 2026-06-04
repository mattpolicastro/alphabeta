import type { GpsProblemFields } from '@/lib/strategy/types'
import { Labeled, TextArea, TextInput } from '../sharedEdit'

interface Props {
  fields: GpsProblemFields
  editing: boolean
  onDraft: (next: GpsProblemFields) => void
}

export function ProblemCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <ProblemEdit fields={fields} onDraft={onDraft} />
  ) : (
    <ProblemDisplay fields={fields} />
  )
}

function ProblemDisplay({ fields }: { fields: GpsProblemFields }) {
  const severityColors = {
    critical: 'bg-red-100 text-red-700',
    major: 'bg-amber-100 text-amber-700',
    minor: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-gray-800">
        {fields.title || <span className="italic text-gray-400">Untitled</span>}
      </h3>
      {fields.description ? (
        <p className="text-[11px] text-gray-600 whitespace-pre-wrap">{fields.description}</p>
      ) : null}
      {fields.severity ? (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[fields.severity]}`}>
          {fields.severity}
        </span>
      ) : null}
      {fields.evidence ? (
        <p className="text-[11px] text-gray-500 italic">{fields.evidence}</p>
      ) : null}
    </div>
  )
}

function ProblemEdit({
  fields,
  onDraft,
}: {
  fields: GpsProblemFields
  onDraft: (next: GpsProblemFields) => void
}) {
  function set<K extends keyof GpsProblemFields>(key: K, value: GpsProblemFields[K]) {
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
      <Labeled label="Severity">
        <select
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          value={fields.severity ?? ''}
          onChange={(e) => set('severity', (e.target.value || undefined) as GpsProblemFields['severity'])}
        >
          <option value="">Select severity</option>
          <option value="critical">Critical</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
        </select>
      </Labeled>
      <Labeled label="Evidence">
        <TextArea
          value={fields.evidence ?? ''}
          onChange={(v) => set('evidence', v || undefined)}
          ariaLabel="Evidence"
        />
      </Labeled>
    </div>
  )
}
