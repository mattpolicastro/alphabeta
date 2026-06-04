import type {
  CardFields,
  EffortLevel,
  ImpactLevel,
  ProblemState,
} from '@/lib/strategy/types'

/**
 * Shared field-editor atoms used across multiple card types. They all
 * take a current value and an onChange callback.
 */

interface LabeledProps {
  label: string
  children: React.ReactNode
}
export function Labeled({ label, children }: LabeledProps) {
  return (
    <label className="flex flex-col gap-0.5 text-[11px] text-gray-500">
      <span className="font-medium uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  return (
    <input
      type="text"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500"
    />
  )
}

export function TextArea({
  value,
  onChange,
  placeholder,
  ariaLabel,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel?: string
  rows?: number
}) {
  return (
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500"
    />
  )
}

const IMPACTS: ImpactLevel[] = ['high', 'medium', 'low']
const EFFORTS: EffortLevel[] = ['XS', 'S', 'M', 'L', 'XL']
const STATES: ProblemState[] = ['active', 'prospect', 'pool']

export function ImpactSelect({
  value,
  onChange,
  label,
}: {
  value: ImpactLevel | undefined
  onChange: (v: ImpactLevel | undefined) => void
  label: string
}) {
  return (
    <Labeled label={label}>
      <select
        value={value ?? ''}
        onChange={(e) =>
          onChange((e.target.value || undefined) as ImpactLevel | undefined)
        }
        aria-label={label}
        className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
      >
        <option value="">—</option>
        {IMPACTS.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </Labeled>
  )
}

export function EffortSelect({
  value,
  onChange,
}: {
  value: EffortLevel | undefined
  onChange: (v: EffortLevel | undefined) => void
}) {
  return (
    <Labeled label="Effort">
      <select
        value={value ?? ''}
        onChange={(e) =>
          onChange((e.target.value || undefined) as EffortLevel | undefined)
        }
        aria-label="Effort"
        className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
      >
        <option value="">—</option>
        {EFFORTS.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </Labeled>
  )
}

export function ProblemStateSelect({
  value,
  onChange,
}: {
  value: ProblemState | undefined
  onChange: (v: ProblemState) => void
}) {
  return (
    <Labeled label="State">
      <select
        value={value ?? 'active'}
        onChange={(e) => onChange(e.target.value as ProblemState)}
        aria-label="Problem state"
        className="rounded border border-gray-300 bg-white px-1 py-0.5 text-xs"
      >
        {STATES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </Labeled>
  )
}

/** Convenience updater producing a new CardFields with a single field changed. */
export function updateField<F extends CardFields, K extends keyof F>(
  fields: F,
  key: K,
  value: F[K],
): F {
  return { ...fields, [key]: value }
}
