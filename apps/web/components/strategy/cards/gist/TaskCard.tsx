import type { GistTaskFields } from '@/lib/strategy/types'
import { Labeled, TextArea, TextInput } from '../sharedEdit'

interface Props {
  fields: GistTaskFields
  editing: boolean
  onDraft: (next: GistTaskFields) => void
  onToggleDone?: () => void
}

export function GistTaskCard({
  fields,
  editing,
  onDraft,
  onToggleDone,
}: Props) {
  return editing ? (
    <GistTaskEdit fields={fields} onDraft={onDraft} />
  ) : (
    <GistTaskDisplay fields={fields} onToggleDone={onToggleDone} />
  )
}

function GistTaskDisplay({
  fields,
  onToggleDone,
}: {
  fields: GistTaskFields
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
            <span className="italic text-gray-400">Describe the task…</span>
          )}
        </p>
      </div>
      {fields.owner ? (
        <span className="ml-6 self-start rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
          {fields.owner}
        </span>
      ) : null}
    </div>
  )
}

function GistTaskEdit({
  fields,
  onDraft,
}: {
  fields: GistTaskFields
  onDraft: (next: GistTaskFields) => void
}) {
  function set<K extends keyof GistTaskFields>(
    key: K,
    value: GistTaskFields[K],
  ) {
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
