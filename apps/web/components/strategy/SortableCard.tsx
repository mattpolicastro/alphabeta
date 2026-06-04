import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import type { Card } from '@/lib/strategy/types'
import { CardShell } from './CardShell'

interface SortableCardProps {
  card: Card
}

export function SortableCard({ card }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <span
        aria-label="Drag to reorder"
        className="absolute left-1/2 -top-2 z-10 hidden h-4 w-10 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm transition hover:bg-gray-100 group-hover:flex"
        {...attributes}
        {...listeners}
      >
        <svg
          width="16"
          height="6"
          viewBox="0 0 16 6"
          fill="currentColor"
          aria-hidden="true"
          className="text-gray-400"
        >
          <circle cx="4" cy="2" r="1" />
          <circle cx="8" cy="2" r="1" />
          <circle cx="12" cy="2" r="1" />
          <circle cx="4" cy="5" r="1" />
          <circle cx="8" cy="5" r="1" />
          <circle cx="12" cy="5" r="1" />
        </svg>
      </span>
      <CardShell card={card} />
    </div>
  )
}
