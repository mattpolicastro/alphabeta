import { capability, type Status } from './capabilities'

export const STATUS_LABEL: Record<Status, string> = { live: 'live', partial: 'partial', stub: 'preview', planned: 'planned' }

// Pass a registry id, or an already rolled-up status (see loop.ts).
// live renders nothing (it just works); planned renders nothing (not in the UI).
export function StatusChip({ id, status, gap }: { id?: string; status?: Status; gap?: string }) {
  const c = id ? capability(id) : { status, gap, note: undefined as string | undefined }
  if (c.status === 'partial') return <span className="capchip">partial · {c.gap}</span>
  if (c.status === 'stub') return <span className="capchip" title={c.gap ?? c.note}>preview</span>
  return null
}

// stubs put their enclosing surface in pencil register
export function surfaceClass(id: string): string {
  return capability(id).status === 'stub' ? 'is-stub' : ''
}
