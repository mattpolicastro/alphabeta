// Admission face — a solution's paperwork: grounds with provenance tiers, screens,
// rivals, arbitration. Pencil register: a solution is never locked, so every field
// stays editable. Structure adapted from apps/web/components/strategy/cards/gps/
// SolutionCard.tsx @ 89da93f (display/edit split); fields are the grammar's, not GPS's.
import { useState } from 'react'
import type { Ground, GroundTier, StratRecord } from './model'

export const TIERS: { id: GroundTier; line: string }[] = [
  { id: 'local-observed',    line: 'seen here, on this surface' },
  { id: 'adjacent',          line: 'seen here, on a neighbouring surface' },
  { id: 'cross-org-pattern', line: 'a pattern reported across organisations' },
  { id: 'anecdotal',         line: 'someone said so — a JDI before/after, a hunch' },
]

export function Admission({ id, strat, rivals, onEdit }: {
  id: string; strat: StratRecord; rivals: string[]; onEdit: (id: string, patch: Partial<StratRecord>) => void
}) {
  const [gText, setGText] = useState('')
  const [gTier, setGTier] = useState<GroundTier>('local-observed')
  const [screen, setScreen] = useState('')
  const grounds = strat.grounds ?? []
  const screens = strat.screens ?? []

  const addGround = () => {
    if (!gText.trim()) return
    onEdit(id, { grounds: [...grounds, { text: gText.trim(), tier: gTier }] })
    setGText('')
  }
  const addScreen = () => {
    if (!screen.trim()) return
    onEdit(id, { screens: [...screens, screen.trim()] })
    setScreen('')
  }
  const drop = (patch: Partial<StratRecord>) => onEdit(id, patch)

  return (
    <>
      <div className="dimlbl">grounds — why believe it</div>
      {grounds.length ? grounds.map((g, i) => (
        <div className="ground-row" key={i}>
          <span className={`tier tier-${g.tier}`} title={TIERS.find((t) => t.id === g.tier)?.line}>{g.tier}</span>
          <span style={{ flex: 1 }}>{g.text}</span>
          <button className="x" title="remove" onClick={() => drop({ grounds: grounds.filter((_, j) => j !== i) })}>×</button>
        </div>
      )) : <div className="locked-note">ungrounded — admitted on assertion alone</div>}
      <div className="add-row">
        <input className="finput" value={gText} onChange={(e) => setGText(e.target.value)} placeholder="a reason, with its source"
          onKeyDown={(e) => { if (e.key === 'Enter') addGround() }} />
        <select className="finput sel" value={gTier} onChange={(e) => setGTier(e.target.value as GroundTier)}>
          {TIERS.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
        </select>
        <button className="btn2 sm" onClick={addGround}>add</button>
      </div>
      <div className="locked-note" style={{ fontSize: 10.5 }}>{TIERS.find((t) => t.id === gTier)?.line}</div>

      <div className="dimlbl">screens — premises to vet first</div>
      {screens.length ? screens.map((s, i) => (
        <div className="ground-row" key={i}><span style={{ flex: 1 }}>{s}</span>
          <button className="x" title="remove" onClick={() => drop({ screens: screens.filter((_, j) => j !== i) })}>×</button></div>
      )) : <div className="locked-note">none</div>}
      <div className="add-row">
        <input className="finput" value={screen} onChange={(e) => setScreen(e.target.value)} placeholder="what has to be true for this to work?"
          onKeyDown={(e) => { if (e.key === 'Enter') addScreen() }} />
        <button className="btn2 sm" onClick={addScreen}>add</button>
      </div>

      <div className="dimlbl">⚔ rivals under the same problem</div>
      {rivals.length ? <ul style={{ paddingLeft: 18, margin: 0 }}>{rivals.map((r) => <li key={r}>{r}</li>)}</ul>
        : <div className="locked-note">none — no arbitration needed yet</div>}

      {(rivals.length > 0 || strat.arbitration) && (
        <>
          <div className="dimlbl">arbitration — how the rivals get decided</div>
          <textarea className="finput" rows={2} value={strat.arbitration ?? ''} onChange={(e) => drop({ arbitration: e.target.value })}
            placeholder="which one goes first, and what result would settle it" />
        </>
      )}
    </>
  )
}
