import type { GistIdeaFields } from '@/lib/strategy/types'
import { Labeled, TextArea, TextInput } from '../sharedEdit'

interface Props {
  fields: GistIdeaFields
  editing: boolean
  onDraft: (next: GistIdeaFields) => void
}

export function GistIdeaCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <GistIdeaEdit fields={fields} onDraft={onDraft} />
  ) : (
    <GistIdeaDisplay fields={fields} />
  )
}

const LEVEL_COLORS: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
}

function GistIdeaDisplay({ fields }: { fields: GistIdeaFields }) {
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
        {fields.confidence ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${LEVEL_COLORS[fields.confidence]}`}
          >
            Confidence: {fields.confidence}
          </span>
        ) : null}
        {fields.impact ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${LEVEL_COLORS[fields.impact]}`}
          >
            Impact: {fields.impact}
          </span>
        ) : null}
      </div>
    </div>
  )
}

type Level = 'high' | 'medium' | 'low'
const LEVELS: Level[] = ['high', 'medium', 'low']

function GistIdeaEdit({
  fields,
  onDraft,
}: {
  fields: GistIdeaFields
  onDraft: (next: GistIdeaFields) => void
}) {
  function set<K extends keyof GistIdeaFields>(
    key: K,
    value: GistIdeaFields[K],
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
      <Labeled label="Confidence">
        <select
          value={fields.confidence ?? ''}
          onChange={(e) =>
            set(
              'confidence',
              (e.target.value || undefined) as Level | undefined,
            )
          }
          aria-label="Confidence"
          className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
        >
          <option value="">—</option>
          {LEVELS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled label="Impact">
        <select
          value={fields.impact ?? ''}
          onChange={(e) =>
            set('impact', (e.target.value || undefined) as Level | undefined)
          }
          aria-label="Impact"
          className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
        >
          <option value="">—</option>
          {LEVELS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Labeled>
    </div>
  )
}
