import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { initialNodes, initialEdges } from './data'
import { deriveGates, type BetRecord, type EdgeKind, type Outcome, type StratKind } from './model'
import { BetNode, StratNode } from './nodes'
import { Dock, type ThreadMsg } from './Dock'
import { OpenFieldNode } from './OpenField'
import { RecordPanel } from './Panel'
import { LedgerView } from './Ledger'
import { DocketView } from './Docket'
import { MomentOverlay, type MomentReq } from './Moment'
import { lockPatch, sealOf, type LockInput } from './lock'
import { LoopTray } from './LoopTray'
import type { LoopStepId } from './loop'
import { exportBoard, importBoard, downloadEnvelope, readJsonFile } from './portable'
import { IntakeTray } from './IntakeTray'
import { isFunnelLanding, parseFunnel } from './funnel'
import { providerFor } from './llm'

const nodeTypes = { strat: StratNode, bet: BetNode, openfield: OpenFieldNode }

let fieldCounter = 0

// Static demo build (VITE_STATIC=1, used for app.alphabeta.tools): the relay is
// a dev-server plugin, so there is no /api/*. State lives in localStorage and
// the LLM-backed open field + dock are compiled out.
const STATIC = import.meta.env.VITE_STATIC === '1'

const INK = '#26282c'
const TERRA = '#4059d8'
const FADE = '#8b939c'

let mintCounter = 0

// ── collision rule: cards never overlap. Altitude (y) is sacred; resolve in x only.
const PAD = 24
function sizeOf(n: Node): { w: number; h: number } {
  const m = (n as any).measured
  if (m?.width && m?.height) return { w: m.width, h: m.height }
  if (n.type === 'bet') return { w: 260, h: 120 }
  if (n.type === 'openfield') return { w: 320, h: 160 }
  const kind = (n.data as any)?.strat?.kind
  return { w: kind === 'goal' ? 250 : 230, h: 90 }
}

// ── tree auto-layout: subtree-contiguous (no interleaving → no crossings within a tree),
//    altitude by kind. Questions and solutions share a lane so problem→child edges never
//    traverse another lane.
const LANE_Y: Record<string, number> = { goal: 0, problem: 200, child: 420 }
const BET_Y0 = 680, BET_GEN = 260, XGAP = 28, ROOTGAP = 90
const LANE_X: Record<string, number> = { goal: 0, problem: 330, child: 660 }
const BET_X0 = 990, BET_GENX = 320
function relayout(ns: Node[], es: Edge[], orient: 'v' | 'h' = 'v'): Node[] {
  const H = orient === 'h'
  const ext = (n: Node) => (H ? sizeOf(n).h : sizeOf(n).w)
  const byId = new Map(ns.map((n) => [n.id, n]))
  const PRI = ['lineage', 'elevation', 'spawn', 'dependency']
  const parentOf = new Map<string, string>()
  for (const kind of PRI)
    for (const e of es)
      if ((e.data as any)?.kind === kind && !parentOf.has(e.target) && byId.has(e.source) && byId.has(e.target) && e.source !== e.target)
        parentOf.set(e.target, e.source)
  const kids = new Map<string, string[]>()
  for (const [c, p] of parentOf) { if (!kids.has(p)) kids.set(p, []); kids.get(p)!.push(c) }
  for (const [, cs] of kids) cs.sort((x, y) => (H ? byId.get(x)!.position.y - byId.get(y)!.position.y : byId.get(x)!.position.x - byId.get(y)!.position.x))

  const gen = new Map<string, number>()
  const genOf = (id: string): number => {
    if (gen.has(id)) return gen.get(id)!
    const p = parentOf.get(id)
    const g = p && byId.get(p)?.type === 'bet' ? 1 + genOf(p) : 0
    gen.set(id, g); return g
  }
  const laneY = (n: Node) => {
    const k = (n.data as any)?.strat?.kind
    if (H) {
      if (n.type === 'bet') return BET_X0 + BET_GENX * genOf(n.id)
      return k === 'goal' ? LANE_X.goal : k === 'problem' ? LANE_X.problem : LANE_X.child
    }
    if (n.type === 'bet') return BET_Y0 + BET_GEN * genOf(n.id)
    return k === 'goal' ? LANE_Y.goal : k === 'problem' ? LANE_Y.problem : LANE_Y.child
  }
  const wMemo = new Map<string, number>()
  const widthOf = (id: string): number => {
    if (wMemo.has(id)) return wMemo.get(id)!
    const own = ext(byId.get(id)!)
    const cs = kids.get(id) ?? []
    const kw = cs.reduce((s, c) => s + widthOf(c), 0) + XGAP * Math.max(cs.length - 1, 0)
    const w = Math.max(own, kw); wMemo.set(id, w); return w
  }
  const pos = new Map<string, { x: number; y: number }>()
  const place = (id: string, x0: number) => {
    const n = byId.get(id)!, total = widthOf(id), own = ext(n)
    const packed = x0 + (total - own) / 2
    pos.set(id, H ? { x: laneY(n), y: packed } : { x: packed, y: laneY(n) })
    const cs = kids.get(id) ?? []
    const kw = cs.reduce((s, c) => s + widthOf(c), 0) + XGAP * Math.max(cs.length - 1, 0)
    let cur = x0 + (total - kw) / 2
    for (const c of cs) { place(c, cur); cur += widthOf(c) + XGAP }
  }
  const roots = ns.filter((n) => n.type !== 'openfield' && !parentOf.has(n.id))
    .sort((p, q) => {
      const rank = (n: Node) => (n.type === 'bet' ? 3 : ({ goal: 0, problem: 1 } as any)[(n.data as any)?.strat?.kind] ?? 2)
      return rank(p) - rank(q) || (H ? p.position.y - q.position.y : p.position.x - q.position.x)
    })
  let x = 0
  for (const r of roots) { place(r.id, x); x += widthOf(r.id) + ROOTGAP }
  return ns.map((n) => (pos.has(n.id) ? { ...n, position: pos.get(n.id)! } : n))
}

function deoverlap(ns: Node[], orient: 'v' | 'h' = 'v'): Node[] {
  const out = ns.map((n) => ({ ...n, position: { ...n.position } }))
  for (let pass = 0; pass < 12; pass++) {
    let moved = false
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const A = out[i], B = out[j], sa = sizeOf(A), sb = sizeOf(B)
        const ox = Math.min(A.position.x + sa.w + PAD, B.position.x + sb.w + PAD) - Math.max(A.position.x, B.position.x)
        const oy = Math.min(A.position.y + sa.h + PAD, B.position.y + sb.h + PAD) - Math.max(A.position.y, B.position.y)
        if (ox > 0 && oy > 0) {
          // push the right-hand one further right (or the later one if tied)
          if (orient === 'h') {
            const [T, D] = A.position.y <= B.position.y ? [A, B] : [B, A]
            D.position.y = T.position.y + sizeOf(T).h + PAD
          } else {
            const [L, R] = A.position.x <= B.position.x ? [A, B] : [B, A]
            R.position.x = L.position.x + sizeOf(L).w + PAD
          }
          moved = true
        }
      }
    }
    if (!moved) break
  }
  return out
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}

const loadState = () => {
  try {
    return JSON.parse(localStorage.getItem('gc-state') || 'null')
  } catch {
    return null
  }
}
const loadSeen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('gc-seen') || '[]')
  } catch {
    return []
  }
}

function Canvas() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dockThread, setDockThread] = useState<ThreadMsg[]>([])
  const [relayUp, setRelayUp] = useState(true)
  const [view, setView] = useState<'canvas' | 'ledger' | 'docket'>('canvas')
  const [moment, setMoment] = useState<MomentReq | null>(null)
  // the walkthrough opens itself on first visit and stays closed once dismissed
  const [tray, setTray] = useState(() => { try { return !localStorage.getItem('ab-loop-seen') && !isFunnelLanding(window.location) } catch { return false } })
  const closeTray = () => { setTray(false); try { localStorage.setItem('ab-loop-seen', '1') } catch {} }
  const [intake, setIntake] = useState(false)
  const [dockError, setDockError] = useState<string | null>(null)
  const [pulseId, setPulseId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [orient, setOrient] = useState<'v' | 'h'>(() => { try { return (localStorage.getItem('gc-orient') as any) || 'v' } catch { return 'v' } })
  const updateInternals = useUpdateNodeInternals()
  const flip = () => {
    const next = orient === 'v' ? 'h' : 'v'
    setOrient(next)
    try { localStorage.setItem('gc-orient', next) } catch {}
    setNodes((ns) => deoverlap(relayout(ns, edges, next), next))
    setTimeout(() => nodes.forEach((n) => updateInternals(n.id)), 50)
  }
  const [loaded, setLoaded] = useState(false)
  const [seenVer, setSeenVer] = useState(0)
  const lastSaved = useRef<string>('')
  const { screenToFlowPosition, fitView } = useReactFlow()

  // ── the funnel: /bet/new?from=<tool>&v=1&… (the lab's "lock as bet →") mints a
  //    draft onto the loaded board, then the URL goes back to / so a reload doesn't
  //    re-mint. An empty board is seeded from the fixture first. Idempotent under
  //    StrictMode's double effect: the second pass sees no funnel in the URL.
  const landFunnel = (base: Node[]): Node[] => {
    if (!isFunnelLanding(location.pathname, location.search)) return base
    const r = parseFunnel(location.search)
    history.replaceState(null, '', '/')
    if (r.ok === false) { setImportError(r.error); return base }
    const seeded = base.length ? base : deoverlap(relayout(initialNodes, initialEdges, orient), orient)
    if (!base.length) setEdges(initialEdges)
    const id = `funnel-${Date.now().toString(36)}`
    const fresh: Node = { id, type: 'bet', position: orient === 'h' ? { x: BET_X0, y: 0 } : { x: 0, y: BET_Y0 }, data: { bet: r.bet } }
    setSelectedId(id)
    setTimeout(() => fitView({ duration: 400, nodes: [{ id }], maxZoom: 1 }), 120)
    return deoverlap([...seeded, fresh], orient)
  }

  // ── boot: server state is canonical; migrate old localStorage once ─
  useEffect(() => {
    if (STATIC) {
      const local = loadState()
      if (local?.nodes) {
        setEdges(local.edges ?? [])
        setNodes(landFunnel(local.nodes))
      } else {
        // fixture positions are authored by hand, not laid out — run the tree
        // layout once on first load so a fresh visitor lands on a clean board
        setEdges(initialEdges)
        setNodes(landFunnel(deoverlap(relayout(initialNodes, initialEdges, orient), orient)))
      }
      primed.current = true
      setLoaded(true)
      return
    }
    const boot = async () => {
      try {
        const res = await fetch('/api/state')
        const data = await res.json()
        if (data) {
          setEdges(data.edges ?? [])
          setNodes(landFunnel(data.nodes ?? []))
          setDockThread(data.dockThread ?? [])
          seenReplies.current = new Set(data.seen ?? [])
          primed.current = true
          lastSaved.current = JSON.stringify({
            nodes: data.nodes ?? [],
            edges: data.edges ?? [],
            dockThread: data.dockThread ?? [],
            seen: [...seenReplies.current],
          })
        } else {
          const local = loadState()
          if (local) {
            setEdges(local.edges ?? [])
            setNodes(landFunnel(local.nodes ?? []))
            setDockThread(local.dockThread ?? [])
            seenReplies.current = new Set(loadSeen())
            primed.current = localStorage.getItem('gc-seen') !== null
          } else {
            setNodes(landFunnel([]))
          }
        }
        setLoaded(true)
      } catch {
        // server unreachable: don't enable saving (would clobber canonical state); retry
        setTimeout(boot, 2000)
      }
    }
    boot()
  }, [])

  // ── save (debounced, skip no-ops) ──────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!loaded) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const body = JSON.stringify({ nodes, edges, dockThread, seen: [...seenReplies.current] })
      if (body === lastSaved.current) return
      lastSaved.current = body
      if (STATIC) {
        try { localStorage.setItem('gc-state', body) } catch {}
        return
      }
      fetch('/api/state', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body,
      }).catch(() => {})
    }, 400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [nodes, edges, dockThread, seenVer, loaded])

  // ── stable per-kind sequence tags (G1, P2, Q3, S1, B1…) ────────────
  // assign-once at first sight, count from per-kind max: deletes never renumber
  useEffect(() => {
    if (!loaded) return
    const kindOf = (n: Node): string | null => {
      if (n.type === 'bet') return 'B'
      const k = (n.data as any)?.strat?.kind
      return k ? k[0].toUpperCase() : null
    }
    const counters: Record<string, number> = {}
    for (const n of nodes) {
      const k = kindOf(n)
      const s = (n.data as any)?.seq
      if (k && s) counters[k] = Math.max(counters[k] ?? 0, s)
    }
    let changed = false
    const next = nodes.map((n) => {
      const k = kindOf(n)
      if (!k || (n.data as any)?.seq) return n
      changed = true
      counters[k] = (counters[k] ?? 0) + 1
      return { ...n, data: { ...n.data, seq: counters[k] } }
    })
    if (changed) setNodes(next)
  }, [nodes, loaded])

  // ── open-field relay (two placements, one channel) ───────────────
  // NB: not crypto.randomUUID() — unavailable on insecure origins (LAN/tailnet HTTP)
  const mkId = () => `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const post = async (nodeId: string, text: string): Promise<boolean> => {
    try {
      const r = await fetch('/api/dump', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: mkId(), nodeId, text, ts: new Date().toISOString() }),
      })
      return r.ok
    } catch {
      return false
    }
  }

  // the dock speaks to one seam: the relay under npm run dev, api.anthropic.com with
  // the user's own key in the static build (src/llm.ts). Direct replies land inline;
  // relay replies still arrive by polling below.
  const provider = useMemo(() => providerFor(STATIC), [])
  const boardRef = useRef({ nodes, dockThread })
  boardRef.current = { nodes, dockThread }
  const sendDock = useCallback((text: string) => {
    const mid = mkId()
    setDockThread((t) => [...t, { id: mid, role: 'you', text, status: 'sending' }])
    setDockError(null)
    provider.send(text, { nodes: boardRef.current.nodes, thread: boardRef.current.dockThread }).then((r) => {
      setDockThread((t) => {
        const next = t.map((m) => (m.id === mid ? { ...m, status: r.captured ? ('captured' as const) : ('failed' as const) } : m))
        return r.reply ? [...next, { role: 'claude' as const, text: r.reply }] : next
      })
      if (r.error) setDockError(r.error)
    })
  }, [provider])

  const sendField = useCallback((nodeId: string, text: string) => {
    const mid = mkId()
    const patchThread = (fn: (t: ThreadMsg[]) => ThreadMsg[]) =>
      setNodes((ns) =>
        ns.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, thread: fn((n.data as any).thread ?? []) } } : n,
        ),
      )
    patchThread((t) => [...t, { id: mid, role: 'you', text, status: 'sending' }])
    post(nodeId, text).then((ok) =>
      patchThread((t) =>
        t.map((m) => (m.id === mid ? { ...m, status: ok ? 'captured' : 'failed' } : m)),
      ),
    )
  }, [])

  const seenReplies = useRef<Set<string>>(new Set())
  const primed = useRef(false)
  useEffect(() => {
    if (!loaded || STATIC) return
    type RemoteOp =
      | { op: 'clear' }
      | { op: 'addNode'; node: Node }
      | { op: 'addEdge'; edge: { id: string; source: string; target: string; kind: EdgeKind; label?: string } }
      | { op: 'update'; id: string; data: any }
      | { op: 'removeNode'; id: string }
      | { op: 'removeEdge'; id: string }
    type Reply = { id: string; nodeId: string; text?: string; ops?: RemoteOp[] }

    const mergeData = (d: any, patch: any) => ({
      ...d,
      ...patch,
      ...(patch.bet ? { bet: { ...d.bet, ...patch.bet } } : {}),
      ...(patch.strat ? { strat: { ...d.strat, ...patch.strat } } : {}),
    })

    const tick = async () => {
      try {
        const res = await fetch('/api/replies')
        const replies: Reply[] = await res.json()
        const persistSeen = () => setSeenVer((v) => v + 1)
        if (!primed.current) {
          // first-ever load: ignore replies from previous runs
          replies.forEach((r) => seenReplies.current.add(r.id))
          primed.current = true
          persistSeen()
          return
        }
        const fresh = replies.filter((r) => !seenReplies.current.has(r.id))
        if (!fresh.length) return
        fresh.forEach((r) => seenReplies.current.add(r.id))
        persistSeen()

        const dockMsgs = fresh.filter((r) => r.nodeId === 'dock' && r.text)
        if (dockMsgs.length)
          setDockThread((t) => [...t, ...dockMsgs.map((r) => ({ role: 'claude' as const, text: r.text! }))])

        const opsList = fresh.flatMap((r) => r.ops ?? [])
        setNodes((ns) => {
          let out = ns.map((n) => {
            const mine = fresh.filter((r) => r.nodeId === n.id && r.text)
            if (!mine.length) return n
            return {
              ...n,
              data: {
                ...n.data,
                thread: [
                  ...((n.data as any).thread ?? []),
                  ...mine.map((r) => ({ role: 'claude' as const, text: r.text! })),
                ],
              },
            }
          })
          for (const o of opsList) {
            if (o.op === 'clear') out = []
            else if (o.op === 'addNode') out = [...out, o.node]
            else if (o.op === 'update')
              out = out.map((n) => (n.id === o.id ? { ...n, data: mergeData(n.data, o.data) } : n))
            else if (o.op === 'removeNode') out = out.filter((n) => n.id !== o.id)
          }
          return opsList.some((o) => o.op === 'addNode') ? deoverlap(out, orient) : out
        })
        if (opsList.length)
          setEdges((es) => {
            let out = es
            for (const o of opsList) {
              if (o.op === 'clear') out = []
              else if (o.op === 'removeNode')
                out = out.filter((e) => e.source !== o.id && e.target !== o.id)
              else if (o.op === 'removeEdge') out = out.filter((e) => e.id !== o.id)
              else if (o.op === 'addEdge')
                out = [
                  ...out,
                  {
                    id: o.edge.id,
                    source: o.edge.source,
                    target: o.edge.target,
                    data: { kind: o.edge.kind },
                    label: o.edge.label,
                  },
                ]
            }
            return out
          })
        setRelayUp(true)
      } catch {
        setRelayUp(false)
      }
    }
    tick()
    const h = setInterval(tick, 1500)
    return () => clearInterval(h)
  }, [loaded])

  const gates = useMemo(() => deriveGates(nodes, edges), [nodes, edges])

  const onNodesChange = useCallback(
    (changes: any) => setNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  )
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((es) => applyEdgeChanges(changes, es)),
    [],
  )

  const resolve = useCallback((id: string, outcome: Outcome) => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, bet: { ...(n.data as any).bet, status: 'resolved', outcome } } }
          : n,
      ),
    )
  }, [])

  const editBet = useCallback((id: string, patch: Partial<BetRecord>) => {
    setNodes((ns) =>
      ns.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, bet: { ...(n.data as any).bet, ...patch } } } : n,
      ),
    )
  }, [])

  const elevate = useCallback((solutionId: string) => {
    setNodes((ns) => {
      const src = ns.find((n) => n.id === solutionId)
      if (!src) return ns
      const id = `minted-${++mintCounter}`
      // drop below the source, nudging down until the spot is clear of other bets
      const pos = { x: src.position.x - 20, y: src.position.y + 240 }
      const collides = () =>
        ns.some(
          (n) =>
            n.type === 'bet' &&
            Math.abs(n.position.x - pos.x) < 280 &&
            Math.abs(n.position.y - pos.y) < 200,
        )
      while (collides()) pos.y += 320
      const fresh: Node = {
        id,
        type: 'bet',
        position: pos,
        data: {
          bet: {
            change: `(testing) ${(src.data as any).strat.title.toLowerCase()}`,
            direction: 'lift',
            metric: '(metric not yet declared)',
            magnitude: '?',
            foldIf: '(not yet declared)',
            mechanism: '',
            surface: '',
            status: 'draft',
            outcome: null,
            criteria: {
              win: '(pre-register at criteria moment)',
              inconclusive: '(pre-register at criteria moment)',
              loss: '(pre-register at criteria moment)',
            },
            deviation: null,
            learning: null,
          },
        },
      }
      setEdges((es) => [
        ...es,
        { id: `e-${solutionId}-${id}`, source: solutionId, target: id, data: { kind: 'elevation' }, label: 'tests' },
      ])
      setSelectedId(id)
      return deoverlap([...ns, fresh], orient)
    })
  }, [])

  // intake tray → a draft strat node in its altitude lane, pushed clear of neighbours
  const placeIntake = useCallback((kind: StratKind, title: string) => {
    const id = `intake-${Date.now().toString(36)}`
    const lane = kind === 'goal' ? 'goal' : kind === 'problem' ? 'problem' : 'child'
    const fresh: Node = { id, type: 'strat', position: orient === 'h' ? { x: LANE_X[lane], y: 0 } : { x: 0, y: LANE_Y[lane] }, data: { strat: { kind, title } } }
    setNodes((ns) => deoverlap([...ns, fresh], orient))
    setSelectedId(id); setView('canvas')
    setTimeout(() => fitView({ duration: 400, nodes: [{ id }], maxZoom: 1 }), 120)
  }, [orient, fitView])

  const onConnect = useCallback(
    (conn: Connection) => {
      const src = nodes.find((n) => n.id === conn.source)
      const tgt = nodes.find((n) => n.id === conn.target)
      let kind: EdgeKind = 'lineage'
      let label: string | undefined
      if (src?.type === 'bet' && tgt?.type === 'bet') {
        kind = 'dependency'
        label = 'unlocks'
      } else if ((src?.data as any)?.strat?.kind === 'question' && tgt?.type === 'bet') {
        kind = 'dependency'
        label = 'gates until answered'
      } else if (tgt?.type === 'bet') {
        kind = 'elevation'
        label = 'tests'
      }
      setEdges((es) => addEdge({ ...conn, data: { kind }, label }, es))
    },
    [nodes],
  )

  const patchBet = useCallback((id: string, patch: Partial<BetRecord>) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, bet: { ...(n.data as any).bet, ...patch } } } : n)))
  }, [])
  const patchStrat = useCallback((id: string, patch: any) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, strat: { ...(n.data as any).strat, ...patch } } } : n)))
  }, [])
  const doLock = useCallback((id: string, p: LockInput) => {
    const bet = (nodes.find((n) => n.id === id)?.data as any)?.bet as BetRecord
    const patch = lockPatch(bet, p, new Date().toISOString())
    patchBet(id, patch)
    // seal the committed fields; the cockpit re-verifies this hash on every open
    sealOf({ ...bet, ...patch }).then((seal) => patchBet(id, { seal }))
  }, [patchBet, nodes])
  const doResolve = useCallback((id: string, p: any) => {
    patchBet(id, { status: 'resolved', outcome: p.outcome, actuals: p.actuals, call: p.call,
      deviation: p.deviation || null } as any)
  }, [patchBet])
  const doAnswer = useCallback((id: string, p: any) => {
    patchStrat(id, { answered: true, expectation: p.expectation, takeaway: p.takeaway, validity: p.validity,
      detail: ((nodes.find((n) => n.id === id)?.data as any)?.strat?.detail ?? '') + `\nANSWER (${new Date().toISOString().slice(0, 10)}): ` + p.answer })
  }, [patchStrat, nodes])
  const doAmend = useCallback((id: string, p: any) => {
    const bet = (nodes.find((n) => n.id === id)?.data as any)?.bet
    patchBet(id, { amendments: [...(bet?.amendments ?? []), { ts: new Date().toISOString(), field: p.field, change: p.change, reason: p.reason }] } as any)
  }, [patchBet, nodes])

  // destructive board actions keep one undo snapshot — a stray click on
  // "reset demo" replaced a real board on 2026-09-04 with no way back
  const [undo, setUndo] = useState<{ nodes: Node[]; edges: Edge[]; label: string } | null>(null)
  const guarded = useCallback((label: string, apply: () => void) => {
    if (nodes.length && !confirm(`${label}? The current board is kept for one undo.`)) return
    if (nodes.length) setUndo({ nodes, edges, label })
    apply(); setSelectedId(null)
  }, [nodes, edges])
  const reset = useCallback(() => guarded('Reset to the demo board', () => {
    setNodes(structuredClone(initialNodes)); setEdges(structuredClone(initialEdges))
  }), [guarded])
  const clear = useCallback(() => guarded('Clear the board', () => { setNodes([]); setEdges([]) }), [guarded])
  const undoLast = useCallback(() => {
    if (!undo) return
    setNodes(undo.nodes); setEdges(undo.edges); setSelectedId(null); setUndo(null)
  }, [undo])

  const tryStep = (id: LoopStepId): string | void => {
    const betOf = (n: Node) => (n.data as any)?.bet as BetRecord | undefined
    if (id === 'talk') {
      closeTray()
      setTimeout(() => document.querySelector<HTMLElement>('.dock-row textarea, .dock-row .key-field')?.focus(), 50)
    } else if (id === 'map') {
      const goal = nodes.find((n) => (n.data as any)?.strat?.kind === 'goal') ?? nodes[0]
      closeTray()
      setView('canvas')
      setTimeout(() => fitView({ duration: 400 }), 60)
      if (goal) { setPulseId(goal.id); setTimeout(() => setPulseId(null), 2000) }
    } else if (id === 'commit') {
      const b = nodes.find((n) => betOf(n)?.status === 'draft')
      if (!b) return 'no draft bet on the board — elevate a solution first'
      closeTray(); setView('canvas'); setSelectedId(b.id); setMoment({ kind: 'lock', nodeId: b.id })
    } else if (id === 'resolve') {
      const b = nodes.find((n) => ['locked', 'running'].includes(betOf(n)?.status ?? ''))
      if (!b) return 'nothing is locked yet — commit a bet first'
      closeTray(); setView('canvas'); setSelectedId(b.id); setMoment({ kind: 'resolve', nodeId: b.id })
    }
  }

  const doExport = useCallback(async () => {
    downloadEnvelope(await exportBoard(nodes, edges))
  }, [nodes, edges])

  // import replaces the board wholesale — the envelope's fingerprint is verified first
  const doImport = useCallback(async (file: File) => {
    setImportError(null)
    let data: unknown
    try { data = await readJsonFile(file) } catch (e) { setImportError((e as Error).message); return }
    const r = await importBoard(data)
    if (r.ok === false) { setImportError(r.error); return }
    const { nodes: ns, edges: es } = r.board
    if (!confirm(`Replace the current board (${nodes.length} nodes) with ${ns.length} nodes and ${es.length} edges from ${file.name}?`)) return
    setNodes(ns); setEdges(es); setSelectedId(null); setMoment(null)
  }, [nodes.length])

  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.detail === 2 && !STATIC) {
        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        const id = `field-${++fieldCounter}-${Math.random().toString(36).slice(2, 6)}`
        setNodes((ns) => [...ns, { id, type: 'openfield', position: pos, data: { thread: [] } }])
      } else {
        setSelectedId(null)
      }
    },
    [screenToFlowPosition],
  )

  // inject derived gate + handlers at render time; base state stays pure
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        ...(n.id === pulseId ? { className: 'pulse' } : {}),
        data: {
          ...n.data,
          gate: gates.get(n.id) ?? 'open',
          orient,
          onResolve: n.type === 'bet' ? (o: Outcome) => resolve(n.id, o) : undefined,
          onSend: n.type === 'openfield' ? sendField : undefined,
          onElevate:
            n.type === 'strat' && (n.data as any).strat.kind === 'solution'
              ? () => elevate(n.id)
              : undefined,
        },
      })),
    [nodes, gates, resolve, elevate, orient, pulseId],
  )

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const kind = (e.data as any)?.kind as EdgeKind
        const srcBet = (nodes.find((n) => n.id === e.source)?.data as any)?.bet as BetRecord | undefined
        const targetPruned = gates.get(e.target) === 'pruned'
        const base: Partial<Edge> = { type: 'smoothstep' }
        if (kind === 'lineage') {
          base.style = { stroke: INK, strokeWidth: 1.4 }
        } else if (kind === 'elevation') {
          base.style = { stroke: TERRA, strokeWidth: 1.4, strokeDasharray: '7 4' }
        } else if (kind === 'spawn') {
          base.style = { stroke: FADE, strokeWidth: 1.4, strokeDasharray: '2 4' }
        } else if (kind === 'evidence') {
          base.style = { stroke: '#2e7d5b', strokeWidth: 1.8 }
          base.markerEnd = { type: MarkerType.ArrowClosed, color: '#2e7d5b' }
        } else if (kind === 'refute') {
          base.style = { stroke: TERRA, strokeWidth: 2.2, strokeDasharray: '3 3' }
          base.markerEnd = { type: MarkerType.ArrowClosed, color: TERRA }
        } else if (kind === 'dependency') {
          base.style = { stroke: TERRA, strokeWidth: 2 }
          base.markerEnd = { type: MarkerType.ArrowClosed, color: TERRA }
          base.animated = srcBet?.status === 'running'
        }
        if (targetPruned) base.style = { ...base.style, opacity: 0.25 }
        return { ...e, ...base, labelStyle: { fontFamily: 'IBM Plex Mono', fontSize: 10, fill: kind === 'spawn' ? FADE : TERRA }, labelBgStyle: { fill: '#f6f7f9' } }
      }),
    [edges, nodes, gates],
  )

  const selectedNode = selectedId ? displayNodes.find((n) => n.id === selectedId) : null

  return (
    <div className="frame">
      <div className="prodbar">
        <span className="wordmark">αlphaβeta</span>
        <button className={`tab ${view === 'canvas' ? 'on' : ''}`} onClick={() => setView('canvas')}>canvas</button>
        <button className={`tab ${view === 'ledger' ? 'on' : ''}`} onClick={() => setView('ledger')}>ledger</button>
        <button className={`tab ${view === 'docket' ? 'on' : ''}`} onClick={() => setView('docket')}>docket</button>
        <span className="right">
          {importError && <span className="import-err">{importError}</span>}
          <button className="btn2 sm" onClick={doExport}>export</button>
          <button className="btn2 sm" onClick={() => fileRef.current?.click()}>import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = '' }} />
          {undo && <button className="btn2 sm" onClick={undoLast} title={`undo: ${undo.label}`}>↶ undo</button>}
          <button className="btn2 sm" onClick={clear}>clear board</button>
          <button className="btn2 sm" onClick={reset}>reset demo</button>
          <button className={`btn2 sm ${intake ? 'on' : ''}`} onClick={() => { setIntake((v) => !v); if (!intake) closeTray() }}>intake</button>
          <button className={`btn2 sm ${tray ? 'on' : ''}`} onClick={() => { if (tray) closeTray(); else { setTray(true); setIntake(false) } }}>the loop</button>
        </span>
      </div>

      {view === 'canvas' ? (
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => n.type !== 'openfield' && setSelectedId(n.id)}
        onPaneClick={onPaneClick}
        zoomOnDoubleClick={false}
        fitView
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        {/* layout controls belong to the canvas, not the global nav */}
        <Panel position="top-right" className="canvastools">
          <button className="btn2 sm" onClick={flip} title="flip layout orientation">{orient === 'v' ? '⇆ horizontal' : '⇅ vertical'}</button>
          <button className="btn2 sm" onClick={() => setNodes((ns) => deoverlap(relayout(ns, edges, orient), orient))} title="tree auto-layout">re-layout</button>
          <button className="btn2 sm" onClick={() => setNodes((ns) => deoverlap(ns, orient))} title="resolve overlaps along the packing axis">tidy</button>
        </Panel>
        <Background variant={BackgroundVariant.Lines} gap={28} color="#e3e7ec" />
        <Controls />
        <MiniMap pannable zoomable nodeColor={(n) => (n.type === 'bet' ? TERRA : INK)} />
      </ReactFlow>
      ) : view === 'docket' ? (
        <DocketView nodes={nodes} edges={edges} onOpen={(id) => setSelectedId(id)} />
      ) : (
        <LedgerView nodes={nodes} onOpen={(id) => { setSelectedId(id) }}
          onMoment={(kind, nodeId) => setMoment({ kind, nodeId })}
          onStatus={(id, status) => patchBet(id, { status } as any)} />
      )}

      {view === 'canvas' && <div className="legend narrator">
        <div><span className="sw" style={{ background: INK }} /> lineage (cascade)</div>
        <div><span className="sw dash" style={{ borderColor: TERRA }} /> tests (elevation)</div>
        <div><span className="sw" style={{ background: TERRA }} /> unlocks (dependency)</div>
        <div><span className="sw dot" style={{ borderColor: FADE }} /> spawned (learning)</div>
        <div><span className="sw" style={{ background: '#2e7d5b' }} /> evidence (supports / grounds)</div>
        <div><span className="sw dash" style={{ borderColor: TERRA }} /> refutes (detonation)</div>
      </div>}

      {selectedNode && (
        <RecordPanel node={selectedNode} nodes={nodes} edges={edges} onClose={() => setSelectedId(null)} onEdit={editBet} onEditStrat={patchStrat}
          onMoment={(kind, nodeId) => setMoment({ kind, nodeId })} />
      )}

      {tray && <LoopTray onClose={closeTray} onTry={tryStep} />}
      {intake && <IntakeTray onClose={() => setIntake(false)} onPlace={placeIntake} />}

      {moment && (
        <MomentOverlay
          req={moment}
          bet={(nodes.find((n) => n.id === moment.nodeId)?.data as any)?.bet}
          strat={(nodes.find((n) => n.id === moment.nodeId)?.data as any)?.strat}
          onClose={() => setMoment(null)}
          onLock={doLock}
          onResolve={doResolve}
          onAnswer={doAnswer}
          onAmend={doAmend}
        />
      )}

      <Dock thread={dockThread} onSend={sendDock} relayUp={relayUp} error={dockError} />
    </div>
  )
}
