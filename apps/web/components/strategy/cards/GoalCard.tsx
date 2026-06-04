import type { GoalFields, Milestone } from '@/lib/strategy/types'
import { MetricChips } from '../MetricChips'
import { MilestoneBar } from '../MilestoneBar'
import { Labeled, TextArea, TextInput } from './sharedEdit'

interface Props {
  fields: GoalFields
  editing: boolean
  onDraft: (next: GoalFields) => void
  onToggleMilestone?: (milestoneId: string) => void
}

export function GoalCard({
  fields,
  editing,
  onDraft,
  onToggleMilestone,
}: Props) {
  return editing ? (
    <GoalEdit fields={fields} onDraft={onDraft} />
  ) : (
    <GoalDisplay fields={fields} onToggleMilestone={onToggleMilestone} />
  )
}

function GoalDisplay({
  fields,
  onToggleMilestone,
}: {
  fields: GoalFields
  onToggleMilestone?: (milestoneId: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold leading-snug text-gray-800">
        {fields.title || <span className="italic text-gray-400">Untitled</span>}
      </h3>
      {fields.measuredBy ? (
        <p className="text-[11px] text-gray-500">
          <span className="font-medium">Metric:</span> {fields.measuredBy}
        </p>
      ) : null}
      {fields.mode === 'value' ? (
        <MetricChips
          startValue={fields.startValue ?? ''}
          goalValue={fields.goalValue ?? ''}
        />
      ) : (
        <MilestoneBar
          milestones={fields.milestones ?? []}
          onToggle={onToggleMilestone}
          editable={!!onToggleMilestone}
        />
      )}
      {(fields.department || fields.team) && (
        <div className="flex flex-wrap gap-1 text-[10px] text-gray-500">
          {fields.department ? (
            <span className="rounded bg-gray-100 px-1.5 py-0.5">
              {fields.department}
            </span>
          ) : null}
          {fields.team ? (
            <span className="rounded bg-gray-100 px-1.5 py-0.5">
              {fields.team}
            </span>
          ) : null}
        </div>
      )}
      {fields.statusUpdate ? (
        <div className="rounded bg-yellow-50 px-2 py-1.5 text-[11px] text-gray-700 ring-1 ring-yellow-200">
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

function GoalEdit({
  fields,
  onDraft,
}: {
  fields: GoalFields
  onDraft: (next: GoalFields) => void
}) {
  function set<K extends keyof GoalFields>(key: K, value: GoalFields[K]) {
    onDraft({ ...fields, [key]: value })
  }

  function updateMilestone(id: string, patch: Partial<Milestone>) {
    const next = (fields.milestones ?? []).map((m) =>
      m.id === id ? { ...m, ...patch } : m,
    )
    onDraft({ ...fields, milestones: next })
  }
  function addMilestone() {
    const next = [
      ...(fields.milestones ?? []),
      { id: crypto.randomUUID(), label: '', done: false },
    ]
    onDraft({ ...fields, milestones: next })
  }
  function removeMilestone(id: string) {
    const next = (fields.milestones ?? []).filter((m) => m.id !== id)
    onDraft({ ...fields, milestones: next })
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
      <Labeled label="Measured by">
        <TextInput
          value={fields.measuredBy}
          onChange={(v) => set('measuredBy', v)}
          ariaLabel="Measured by"
        />
      </Labeled>
      <Labeled label="Mode">
        <select
          aria-label="Goal mode"
          value={fields.mode}
          onChange={(e) =>
            set('mode', e.target.value as GoalFields['mode'])
          }
          className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
        >
          <option value="value">Value</option>
          <option value="milestones">Milestones</option>
        </select>
      </Labeled>
      {fields.mode === 'value' ? (
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="Start value">
            <TextInput
              value={fields.startValue ?? ''}
              onChange={(v) => set('startValue', v)}
              ariaLabel="Start value"
            />
          </Labeled>
          <Labeled label="Goal value">
            <TextInput
              value={fields.goalValue ?? ''}
              onChange={(v) => set('goalValue', v)}
              ariaLabel="Goal value"
            />
          </Labeled>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Milestones
          </span>
          {(fields.milestones ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={m.done}
                onChange={(e) =>
                  updateMilestone(m.id, { done: e.target.checked })
                }
                aria-label={`${m.label || 'Milestone'} done`}
              />
              <TextInput
                value={m.label}
                onChange={(v) => updateMilestone(m.id, { label: v })}
                ariaLabel={`Milestone label`}
              />
              <button
                type="button"
                onClick={() => removeMilestone(m.id)}
                aria-label="Remove milestone"
                className="rounded px-1 text-xs text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addMilestone}
            className="mt-1 self-start rounded border border-dashed border-gray-300 px-2 py-0.5 text-[11px] text-gray-500 hover:border-gray-400"
          >
            + Milestone
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Department">
          <TextInput
            value={fields.department ?? ''}
            onChange={(v) => set('department', v || undefined)}
            ariaLabel="Department"
          />
        </Labeled>
        <Labeled label="Team">
          <TextInput
            value={fields.team ?? ''}
            onChange={(v) => set('team', v || undefined)}
            ariaLabel="Team"
          />
        </Labeled>
      </div>
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
