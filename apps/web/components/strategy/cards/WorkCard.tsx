import type { WorkFields } from '@/lib/strategy/types'
import { Labeled, TextArea, TextInput } from './sharedEdit'

interface Props {
  fields: WorkFields
  editing: boolean
  onDraft: (next: WorkFields) => void
  onToggleDone?: () => void
}

export function WorkCard({ fields, editing, onDraft, onToggleDone }: Props) {
  return editing ? (
    <WorkEdit fields={fields} onDraft={onDraft} />
  ) : (
    <WorkDisplay fields={fields} onToggleDone={onToggleDone} />
  )
}

function WorkDisplay({
  fields,
  onToggleDone,
}: {
  fields: WorkFields
  onToggleDone?: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={fields.done}
          aria-label={fields.done ? 'Mark incomplete' : 'Mark complete'}
          onClick={onToggleDone}
          disabled={!onToggleDone}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
            fields.done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-gray-300 bg-white hover:border-gray-500'
          }`}
        >
          {fields.done ? (
            <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
              <path
                d="M3 8l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>
        <p
          className={`text-sm leading-snug ${
            fields.done ? 'text-gray-400 line-through' : 'text-gray-800'
          }`}
        >
          {fields.description || (
            <span className="italic text-gray-400">Describe the work…</span>
          )}
        </p>
      </div>
      {fields.statusUpdate ? (
        <div className="ml-6 rounded bg-yellow-50 px-2 py-1.5 text-[11px] text-gray-700 ring-1 ring-yellow-200">
          <p className="whitespace-pre-wrap leading-snug">
            {fields.statusUpdate}
          </p>
          {fields.statusUpdateDate ? (
            <p className="mt-1 text-[10px] italic text-gray-500">
              {fields.statusUpdateDate}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function WorkEdit({
  fields,
  onDraft,
}: {
  fields: WorkFields
  onDraft: (next: WorkFields) => void
}) {
  function set<K extends keyof WorkFields>(key: K, value: WorkFields[K]) {
    onDraft({ ...fields, [key]: value })
  }
  return (
    <div className="flex flex-col gap-2">
      <Labeled label="Description">
        <TextArea
          value={fields.description}
          onChange={(v) => set('description', v)}
          ariaLabel="Description"
          rows={2}
        />
      </Labeled>
      <label className="flex items-center gap-1.5 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={fields.done}
          onChange={(e) => set('done', e.target.checked)}
          aria-label="Done"
        />
        Done
      </label>
      <Labeled label="Status update">
        <TextArea
          value={fields.statusUpdate ?? ''}
          onChange={(v) => set('statusUpdate', v || undefined)}
          ariaLabel="Status update"
        />
      </Labeled>
      <Labeled label="Status update date">
        <TextInput
          value={fields.statusUpdateDate ?? ''}
          onChange={(v) => set('statusUpdateDate', v || undefined)}
          ariaLabel="Status update date"
        />
      </Labeled>
    </div>
  )
}
