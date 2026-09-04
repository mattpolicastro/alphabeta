// The registry lives with the landing site (apps/landing/capabilities.json) —
// one source drives the chips here, the "what's here" tray, and /capabilities.
import registry from '../../../apps/landing/capabilities.json'

export const STATUSES = ['live', 'partial', 'stub', 'planned'] as const
export const KINDS = ['place', 'face', 'moment', 'document', 'tray', 'data', 'lab'] as const
export type Status = (typeof STATUSES)[number]
export type Kind = (typeof KINDS)[number]

export interface Capability {
  id: string
  kind: Kind
  name: string
  status: Status
  note?: string
  gap?: string
  question?: string
}

// Throws at module load so registry drift is a build/test failure, not a silent chip.
export function validateRegistry(surfaces: unknown): Capability[] {
  if (!Array.isArray(surfaces)) throw new Error('capabilities: surfaces must be an array')
  const seen = new Set<string>()
  return surfaces.map((s, i) => {
    const c = (s ?? {}) as Record<string, unknown>
    if (typeof c.id !== 'string' || !c.id) throw new Error(`capabilities[${i}]: missing id`)
    if (seen.has(c.id)) throw new Error(`capabilities: duplicate id "${c.id}"`)
    seen.add(c.id)
    if (typeof c.name !== 'string' || !c.name) throw new Error(`capabilities: "${c.id}" is missing a name`)
    if (!(STATUSES as readonly string[]).includes(c.status as string))
      throw new Error(`capabilities: "${c.id}" has unknown status "${c.status}" (expected ${STATUSES.join('|')})`)
    if (!(KINDS as readonly string[]).includes(c.kind as string))
      throw new Error(`capabilities: "${c.id}" has unknown kind "${c.kind}" (expected ${KINDS.join('|')})`)
    return c as unknown as Capability
  })
}

export const capabilities: Capability[] = validateRegistry(registry.surfaces)
export const registryUpdated: string = registry.updated

const byId = new Map(capabilities.map((c) => [c.id, c]))

export function capability(id: string): Capability {
  const c = byId.get(id)
  if (!c) throw new Error(`capabilities: no entry "${id}"`)
  return c
}
