import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

interface InlineEditProps {
  value: string
  onCommit: (next: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  /** Render as <textarea>? Defaults to <input type="text"> */
  multiline?: boolean
  /** Custom render for the non-editing "display" view; defaults to raw text. */
  renderDisplay?: (value: string) => ReactNode
  ariaLabel?: string
}

export function InlineEdit({
  value,
  onCommit,
  placeholder,
  className = '',
  inputClassName = '',
  multiline = false,
  renderDisplay,
  ariaLabel,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [editing, value])

  function commit() {
    setEditing(false)
    const trimmed = draft
    if (trimmed !== value) onCommit(trimmed)
  }

  function cancel() {
    setEditing(false)
    setDraft(value)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      commit()
    }
  }

  if (editing) {
    const common = {
      ref: inputRef as never,
      value: draft,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown,
      placeholder,
      className: `w-full rounded border border-gray-300 bg-white px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-500 ${inputClassName}`,
      'aria-label': ariaLabel,
    }
    return multiline ? (
      <textarea rows={3} {...common} />
    ) : (
      <input type="text" {...common} />
    )
  }

  const shown = value.length > 0 ? value : placeholder ?? ''
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`cursor-text rounded hover:bg-black/5 ${
        value.length === 0 ? 'italic text-gray-400' : ''
      } ${className}`}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setEditing(true)
        }
      }}
    >
      {renderDisplay ? renderDisplay(shown) : shown}
    </span>
  )
}
