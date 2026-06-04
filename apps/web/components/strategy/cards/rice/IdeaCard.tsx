import type { RiceIdeaFields } from '@/lib/strategy/types'
import { Labeled, TextArea, TextInput } from '../sharedEdit'

interface Props {
  fields: RiceIdeaFields
  editing: boolean
  onDraft: (next: RiceIdeaFields) => void
}

export function IdeaCard({ fields, editing, onDraft }: Props) {
  return editing ? (
    <IdeaEdit fields={fields} onDraft={onDraft} />
  ) : (
    <IdeaDisplay fields={fields} />
  )
}

function IdeaDisplay({ fields }: { fields: RiceIdeaFields }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold text-gray-800">
        {fields.title || <span className="italic text-gray-400">Untitled</span>}
      </h3>
      {fields.description ? (
        <p className="whitespace-pre-wrap text-[11px] text-gray-600">{fields.description}</p>
      ) : null}
      {fields.category ? (
        <span className="inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
          {fields.category}
        </span>
      ) : null}
    </div>
  )
}

function IdeaEdit({ fields, onDraft }: { fields: RiceIdeaFields; onDraft: (next: RiceIdeaFields) => void }) {
  function set<K extends keyof RiceIdeaFields>(key: K, value: RiceIdeaFields[K]) {
    onDraft({ ...fields, [key]: value })
  }
  return (
    <div className="flex flex-col gap-2">
      <Labeled label="Title">
        <TextInput value={fields.title} onChange={(v: string) => set('title', v)} ariaLabel="Title" />
      </Labeled>
      <Labeled label="Description">
        <TextArea value={fields.description ?? ''} onChange={(v: string) => set('description', v || undefined)} ariaLabel="Description" rows={2} />
      </Labeled>
      <Labeled label="Category">
        <TextInput value={fields.category ?? ''} onChange={(v: string) => set('category', v || undefined)} placeholder="e.g. Growth, UX, Infrastructure" ariaLabel="Category" />
      </Labeled>
    </div>
  )
}
