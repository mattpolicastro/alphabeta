import { useState } from 'react'
import type { BetRecord, StratRecord, Outcome } from './model'

export type MomentKind = 'lock' | 'resolve' | 'answer' | 'amend'
export interface MomentReq { kind: MomentKind; nodeId: string }

const BUCKET_CALL: Record<string, string> = {
  win: 'keep', loss: 'revert', inconclusive: 'hold', invalid: 're-run',
}

export function MomentOverlay({
  req, bet, strat, onClose, onLock, onResolve, onAnswer, onAmend,
}: {
  req: MomentReq
  bet?: BetRecord
  strat?: StratRecord
  onClose: () => void
  onLock: (id: string, p: { foldIf: string; confidence: string; guardrails: string; win: string; inconclusive: string; loss: string }) => void
  onResolve: (id: string, p: { actuals: string; outcome: Outcome; call: string; deviation: string }) => void
  onAnswer: (id: string, p: { expectation: string; answer: string; takeaway: string; validity: string }) => void
  onAmend: (id: string, p: { field: string; change: string; reason: string }) => void
}) {
  return (
    <div className="moment-scrim" onClick={onClose}>
      <div className="moment" onClick={(e) => e.stopPropagation()}>
        {req.kind === 'lock' && bet && <LockMoment bet={bet} onDone={(p) => { onLock(req.nodeId, p); onClose() }} />}
        {req.kind === 'resolve' && bet && <ResolveMoment bet={bet} onDone={(p) => { onResolve(req.nodeId, p); onClose() }} />}
        {req.kind === 'answer' && strat && <AnswerMoment strat={strat} onDone={(p) => { onAnswer(req.nodeId, p); onClose() }} />}
        {req.kind === 'amend' && bet && <AmendMoment onDone={(p) => { onAmend(req.nodeId, p); onClose() }} />}
      </div>
    </div>
  )
}

function LockMoment({ bet, onDone }: { bet: BetRecord; onDone: (p: any) => void }) {
  const [premortem, setPremortem] = useState('')
  const [foldIf, setFoldIf] = useState(bet.foldIf.startsWith('(') ? '' : bet.foldIf)
  const [confidence, setConfidence] = useState(bet.confidence ?? '')
  const [guardrails, setGuardrails] = useState(bet.guardrails ?? '')
  const [win, setWin] = useState(bet.criteria.win.startsWith('(') ? '' : bet.criteria.win)
  const [inconclusive, setInc] = useState(bet.criteria.inconclusive.startsWith('(') ? '' : bet.criteria.inconclusive)
  const [loss, setLoss] = useState(bet.criteria.loss.startsWith('(') ? '' : bet.criteria.loss)
  const [step, setStep] = useState(0)
  const ready = foldIf.trim() && win.trim() && loss.trim()
  return step === 0 ? (
    <>
      <h3>Lock — but first, the premortem</h3>
      <div className="sub">It's a year later and this bet failed. What happened? (Your answer writes the criteria better than a form would.)</div>
      <textarea className="finput" rows={4} value={premortem} onChange={(e) => setPremortem(e.target.value)}
        placeholder="it failed because…" autoFocus />
      <div style={{ marginTop: 14 }}>
        <button className="btn2 pri" onClick={() => setStep(1)}>Continue</button>
        <span style={{ fontSize: 11, color: 'var(--fade)' }}>your premortem is kept on the record</span>
      </div>
    </>
  ) : (
    <>
      <h3>Lock the commitment</h3>
      <div className="sub">Ink register from here on: this content freezes, timestamped. Changes after lock are amendments — recorded, never hidden.</div>
      <label>fold if (the mind-changer — one falsifiable line)</label>
      <input className="finput" value={foldIf} onChange={(e) => setFoldIf(e.target.value)} placeholder="fold if…" />
      <div className="row2">
        <div><label>confidence (0–1)</label><input className="finput" value={confidence} onChange={(e) => setConfidence(e.target.value)} placeholder="0.6" /></div>
        <div><label>guardrails</label><input className="finput" value={guardrails} onChange={(e) => setGuardrails(e.target.value)} placeholder="conversion must hold" /></div>
      </div>
      <label>on win</label><input className="finput" value={win} onChange={(e) => setWin(e.target.value)} placeholder="keep — roll out" />
      <label>on inconclusive</label><input className="finput" value={inconclusive} onChange={(e) => setInc(e.target.value)} placeholder="hold — …" />
      <label>on loss</label><input className="finput" value={loss} onChange={(e) => setLoss(e.target.value)} placeholder="revert — …" />
      <div style={{ marginTop: 16 }}>
        <button className="btn2 pri" disabled={!ready} onClick={() => onDone({ foldIf, confidence, guardrails, win, inconclusive, loss, premortem })}>
          Lock it
        </button>
        {!ready && <span className="warn">fold-if, win, and loss actions are required — the lock refuses blanks</span>}
      </div>
    </>
  )
}

function ResolveMoment({ bet, onDone }: { bet: BetRecord; onDone: (p: any) => void }) {
  const [actuals, setActuals] = useState('')
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [call, setCall] = useState('')
  const [deviation, setDeviation] = useState('')
  const expected = outcome ? BUCKET_CALL[outcome] : null
  const mismatch = !!(outcome && call && call !== expected)
  const ready = actuals.trim() && outcome && call && (!mismatch || deviation.trim())
  return (
    <>
      <h3>Resolve against the lock</h3>
      <div className="sub mono" style={{ fontFamily: 'IBM Plex Mono' }}>locked fold-if: {bet.foldIf}</div>
      <label>actuals (per metric, with confidence)</label>
      <textarea className="finput" rows={2} value={actuals} onChange={(e) => setActuals(e.target.value)} placeholder="recurring conv +3.1pp (95%) · total conv −0.4pp (n.s.)" autoFocus />
      <label>bucket — computed against the fold-if, not the mood</label>
      <div className="segbtns">
        {(['win', 'inconclusive', 'loss', 'invalid'] as const).map((b) => (
          <button key={b} className={outcome === b ? 'on' : ''} onClick={() => setOutcome(b)}>{b}</button>
        ))}
      </div>
      <label>your call</label>
      <div className="segbtns">
        {['keep', 'revert', 'hold', 're-run'].map((c) => (
          <button key={c} className={call === c ? 'on' : ''} onClick={() => setCall(c)}>{c}</button>
        ))}
      </div>
      {mismatch && (
        <>
          <label style={{ color: '#c0392b' }}>deviation — your call ({call}) differs from the pre-registered action ({expected}); say why, in your words</label>
          <textarea className="finput" rows={2} value={deviation} onChange={(e) => setDeviation(e.target.value)} />
        </>
      )}
      <div style={{ marginTop: 16 }}>
        <button className="btn2 pri" disabled={!ready} onClick={() => onDone({ actuals, outcome, call, deviation })}>Record resolution</button>
        {mismatch && !deviation.trim() && <span className="warn">deviations are recorded, never blocked — but they must be said out loud</span>}
      </div>
    </>
  )
}

function AnswerMoment({ strat, onDone }: { strat: StratRecord; onDone: (p: any) => void }) {
  const [expectation, setExpectation] = useState(strat.expectation ?? '')
  const [step, setStep] = useState(strat.expectation ? 1 : 0)
  const [answer, setAnswer] = useState('')
  const [takeaway, setTakeaway] = useState('')
  const [validity, setValidity] = useState('valid')
  return step === 0 ? (
    <>
      <h3>Before you look —</h3>
      <div className="sub">What do you expect the answer to be? Five seconds now buys a calibration point forever.</div>
      <input className="finput" value={expectation} onChange={(e) => setExpectation(e.target.value)} placeholder="I expect…" autoFocus />
      <div style={{ marginTop: 14 }}>
        <button className="btn2 pri" disabled={!expectation.trim()} onClick={() => setStep(1)}>Locked in — now the answer</button>
      </div>
    </>
  ) : (
    <>
      <h3>Answer</h3>
      {expectation && <div className="sub mono" style={{ fontFamily: 'IBM Plex Mono' }}>expected: {expectation}</div>}
      <label>the answer</label>
      <textarea className="finput" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus />
      <label>takeaway (one line — lives on the node)</label>
      <input className="finput" value={takeaway} onChange={(e) => setTakeaway(e.target.value)} />
      <label>validity</label>
      <div className="segbtns">
        {['valid', 'anecdotal', 'invalid'].map((v) => (
          <button key={v} className={validity === v ? 'on' : ''} onClick={() => setValidity(v)}>{v}</button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn2 pri" disabled={!answer.trim() || !takeaway.trim()} onClick={() => onDone({ expectation, answer, takeaway, validity })}>
          Record &amp; fold
        </button>
      </div>
    </>
  )
}

function AmendMoment({ onDone }: { onDone: (p: any) => void }) {
  const [field, setField] = useState('')
  const [change, setChange] = useState('')
  const [reason, setReason] = useState('')
  return (
    <>
      <h3>Amend mid-flight</h3>
      <div className="sub">Updating on new facts is scored as virtue here, not confession. Disclosure earns credit.</div>
      <label>what changed</label><input className="finput" value={field} onChange={(e) => setField(e.target.value)} placeholder="runtime / sample / instrument…" autoFocus />
      <label>from → to</label><input className="finput" value={change} onChange={(e) => setChange(e.target.value)} placeholder="14d → 21d" />
      <label>reason</label><input className="finput" value={reason} onChange={(e) => setReason(e.target.value)} />
      <div style={{ marginTop: 16 }}>
        <button className="btn2 pri" disabled={!field.trim() || !reason.trim()} onClick={() => onDone({ field, change, reason })}>Record amendment</button>
      </div>
    </>
  )
}
