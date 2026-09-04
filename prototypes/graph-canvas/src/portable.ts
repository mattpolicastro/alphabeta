// adapted from apps/web/lib/db/portable.ts and apps/web/lib/integrity/fingerprint.ts @ 0802d59
import type { Edge, Node } from '@xyflow/react'

export const CURRENT_EXPORT_VERSION = 1
export const APP_ID = 'alphabeta-canvas'

export interface Board { nodes: Node[]; edges: Edge[] }

export interface ExportEnvelope {
  version: number
  exportedAt: string
  app: typeof APP_ID
  fingerprint: string
  board: Board
}

export type ImportResult = { ok: true; board: Board } | { ok: false; error: string }

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(canonicalize)
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj).sort()) out[key] = canonicalize(obj[key])
  return out
}

// canonical-JSON SHA-256: recursive key sort, no whitespace
export async function fingerprint(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(canonicalize(value)))
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function exportBoard(nodes: Node[], edges: Edge[]): Promise<ExportEnvelope> {
  const board: Board = { nodes, edges }
  return {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    app: APP_ID,
    fingerprint: await fingerprint(board),
    board,
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

// null = valid
export function validateEnvelope(data: unknown): { ok: false; error: string } | null {
  if (!isObj(data)) return { ok: false, error: 'Not a valid JSON object' }
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1)
    return { ok: false, error: 'Missing or invalid version field' }
  if (data.version > CURRENT_EXPORT_VERSION)
    return {
      ok: false,
      error: `Export version ${data.version} is newer than this app supports (${CURRENT_EXPORT_VERSION}). Update the app first.`,
    }
  if (data.app !== APP_ID) return { ok: false, error: `Not an ${APP_ID} export (app: ${String(data.app ?? 'missing')})` }
  if (typeof data.fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(data.fingerprint))
    return { ok: false, error: 'Missing or invalid fingerprint' }
  if (!isObj(data.board)) return { ok: false, error: 'Missing board field' }
  const { nodes, edges } = data.board
  if (!Array.isArray(nodes)) return { ok: false, error: 'board.nodes must be an array' }
  if (!Array.isArray(edges)) return { ok: false, error: 'board.edges must be an array' }
  for (const [i, n] of nodes.entries()) {
    if (!isObj(n) || typeof n.id !== 'string' || !n.id) return { ok: false, error: `nodes[${i}]: missing or invalid id` }
    const p = n.position
    if (!isObj(p) || typeof p.x !== 'number' || typeof p.y !== 'number') return { ok: false, error: `nodes[${i}]: missing position` }
  }
  for (const [i, e] of edges.entries()) {
    if (!isObj(e) || typeof e.id !== 'string' || !e.id) return { ok: false, error: `edges[${i}]: missing or invalid id` }
    if (typeof e.source !== 'string' || typeof e.target !== 'string') return { ok: false, error: `edges[${i}]: missing source/target` }
  }
  return null
}

// Chained by version: MIGRATIONS[n] lifts an envelope from n to n+1.
const MIGRATIONS: Record<number, (env: ExportEnvelope) => ExportEnvelope> = {}

function migrateEnvelope(env: ExportEnvelope): ExportEnvelope {
  let out = env
  while (out.version < CURRENT_EXPORT_VERSION) {
    const step = MIGRATIONS[out.version]
    if (!step) throw new Error(`No migration path from export version ${out.version} to ${CURRENT_EXPORT_VERSION}`)
    out = step(out)
  }
  return out
}

export async function importBoard(data: unknown): Promise<ImportResult> {
  const invalid = validateEnvelope(data)
  if (invalid) return invalid
  const env = data as ExportEnvelope
  if ((await fingerprint(env.board)) !== env.fingerprint)
    return { ok: false, error: 'Fingerprint mismatch — the board was altered after export' }
  try {
    return { ok: true, board: migrateEnvelope(env).board }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function downloadEnvelope(envelope: ExportEnvelope): void {
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `alphabeta-board-${envelope.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try { resolve(JSON.parse(reader.result as string)) } catch { reject(new Error('File is not valid JSON')) }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
