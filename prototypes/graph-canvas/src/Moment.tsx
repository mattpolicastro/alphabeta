import { useState } from 'react'
import type { BetRecord, InstrumentType, StratRecord, Outcome } from './model'
import { StatusChip, surfaceClass } from './StatusChip'
import { RUNGS, missingDemand, rung } from './instrument'
import type { LockInput } from './lock'
import { specLine } from './funnel'
import { committedReference, evidenceHint, suggestBucket } from './resolve'

export type MomentKind = 'lock' | 'resolve' | 'answer' | 'amend'
export interface MomentReq { kind: MomentKind; nodeId: string }

const MOMENT_CAP: Record<MomentKind, string> = { lock: 'moment-lock', resolve: 'moment-resolve', answer: 'moment-answer', amend: 'moment-amend' }

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
  onLock: (id: string, p: LockInput) => void
  onResolve: (id: string, p: { actuals: string; outcome: Outcome; call: string; deviation: string }) => void
  onAnswer: (id: string, p: { expectation: string; answer: string; takeaway: string; validity: string }) => void
  onAmend: (id: string, p: { field: string; change: string; reason: string }) => void
}) {
  return (
    <div className="moment-scrim" onClick={onClose}>
      <div className={`moment ${surfaceClass(MOMENT_CAP[req.kind])}`} onClick={(e) => e.stopPropagation()}>
        <StatusChip id={MOMENT_CAP[req.kind]} />
        {req.kind === 'lock' && bet && <LockMoment bet={bet} onDone={(p) => { onLock(req.nodeId, p); onClose() }} />}
        {req.kind === 'resolve' && bet && <ResolveMoment bet={bet} onDone={(p) => { onResolve(req.nodeId, p); onClose() }} />}
        {req.kind === 'answer' && strat && <AnswerMoment strat={strat} onDone={(p) => { onAnswer(req.nodeId, p); onClose() }} />}
        {req.kind === 'amend' && bet && <AmendMoment onDone={(p) => { onAmend(req.nodeId, p); onClose() }} />}
      </div>
    </div>
  )
}

const DEMAND_LABEL = { foldIf: 'a fold-if', expectation: 'an expectation', evidenceBar: 'an evidence bar' } as const

function LockMoment({ bet, onDone }: { bet: BetRecord; onDone: (p: LockInput) => void }) {
  const [premortem, setPremortem] = useState('')
  const [instrument, setInstrument] = useState<InstrumentType | null>(bet.instrument?.type ?? null)
  const labSpec = typeof bet.instrument?.spec === 'object' ? bet.instrument.spec : null
  const [spec, setSpec] = useState(labSpec ? labSpec.note ?? '' : (bet.instrument?.spec as string | undefined) ?? '')
  const [foldIf, setFoldIf] = useState(bet.foldIf.startsWith('(') ? '' : bet.foldIf)
  const [expectation, setExpectation] = useState(bet.expectation ?? '')
  const [evidenceBar, setEvidenceBar] = useState(bet.evidenceBar ?? '')
  const [confidence, setConfidence] = useState(bet.confidence ?? '')
  const [guardrails, setGuardrails] = useState(bet.guardrails ?? '')
  const [win, setWin] = useState(bet.criteria.win.startsWith('(') ? '' : bet.criteria.win)
  const [inconclusive, setInc] = useState(bet.criteria.inconclusive.startsWith('(') ? '' : bet.criteria.inconclusive)
  const [loss, setLoss] = useState(bet.criteria.loss.startsWith('(') ? '' : bet.criteria.loss)
  const [step, setStep] = useState(0)
  const r = instrument ? rung(instrument) : null
  const missing = instrument ? missingDemand(instrument, { foldIf, expectation, evidenceBar }) : null
  const ready = !!instrument && !missing && win.trim() && loss.trim()
  const refusal = !instrument ? 'pick the rung — the ceremony depends on it'
    : missing ? `${instrument} demands ${DEMAND_LABEL[missing]}; win and loss actions too — the lock refuses blanks`
    : !ready ? 'win and loss actions are required — the lock refuses blanks' : null
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
      <label>instrument — the rung sets the ceremony and the validity ceiling</label>
      <div className="rungs">
        {RUNGS.map((x) => (
          <button key={x.type} className={`rung ${instrument === x.type ? 'on' : ''}`} onClick={() => setInstrument(x.type)}>
            <span className="rung-n">{x.rung}</span>
            <span className="rung-label">{x.label}</span>
            <span className="rung-line">{x.ceremony} · {x.ceiling}</span>
          </button>
        ))}
      </div>
      {r && (
        <>
          {labSpec && <div className="locked-note mono-line">{specLine(labSpec)} — sealed with the lock</div>}
          <label>{labSpec ? 'spec note (optional — rides along with the lab inputs)' : 'spec (optional — split, unit, sample, window)'}</label>
          <input className="finput" value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="50/50 by visitor · 14 days · n ≥ 4,000/arm" />
          {r.demand === 'foldIf' && (
            <>
              <label>fold if (the mind-changer — one falsifiable line)</label>
              <input className="finput" value={foldIf} onChange={(e) => setFoldIf(e.target.value)} placeholder="fold if…" autoFocus />
            </>
          )}
          {r.demand === 'expectation' && (
            <>
              <label>expectation — no counterfactual, so say what you think will happen</label>
              <input className="finput" value={expectation} onChange={(e) => setExpectation(e.target.value)} placeholder="I expect…" autoFocus />
            </>
          )}
          {r.demand === 'evidenceBar' && (
            <>
              <label>evidence bar — what you would need to hear or see to be moved</label>
              <input className="finput" value={evidenceBar} onChange={(e) => setEvidenceBar(e.target.value)} placeholder="4 of 6 interviewees, unprompted, …" autoFocus />
            </>
          )}
        </>
      )}
      <div className="row2">
        <div><label>confidence (0–1)</label><input className="finput" value={confidence} onChange={(e) => setConfidence(e.target.value)} placeholder="0.6" /></div>
        <div><label>guardrails (; separated)</label><input className="finput" value={guardrails} onChange={(e) => setGuardrails(e.target.value)} placeholder="conversion must hold" /></div>
      </div>
      <label>on win</label><input className="finput" value={win} onChange={(e) => setWin(e.target.value)} placeholder="keep — roll out" />
      <label>on inconclusive</label><input className="finput" value={inconclusive} onChange={(e) => setInc(e.target.value)} placeholder="hold — …" />
      <label>on loss</label><input className="finput" value={loss} onChange={(e) => setLoss(e.target.value)} placeholder="revert — …" />
      <div className="locked-note" style={{ marginTop: 6, fontSize: 11 }}>prose stays as typed; a machine-checkable shadow is compiled at lock where a number is marked (≥ 1pp, +2pp, at least 3%)</div>
      <div style={{ marginTop: 16 }}>
        <button className="btn2 pri" disabled={!ready} onClick={() => instrument && onDone({ instrument, spec, foldIf, expectation, evidenceBar, confidence, guardrails, win, inconclusive, loss, premortem })}>
          Lock it
        </button>
        {refusal && <span className="warn">{refusal}</span>}
      </div>
    </>
  )
}

function ResolveMoment({ bet, onDone }: { bet: BetRecord; onDone: (p: any) => void }) {
  const [actuals, setActuals] = useState('')
  const [outcome, setOutcome] = useState<Outcome>(null)
  const [call, setCall] = useState('')
  const [deviation, setDeviation] = useState('')
  const ref = committedReference(bet)
  const evidence = evidenceHint(bet)
  const hint = actuals.trim() || evidence ? suggestBucket(bet, actuals) : null
  const expected = outcome ? BUCKET_CALL[outcome] : null
  const mismatch = !!(outcome && call && call !== expected)
  const ready = actuals.trim() && outcome && call && (!mismatch || deviation.trim())
  return (
    <>
      <h3>Resolve against the lock</h3>
      <div className="sub mono" style={{ fontFamily: 'IBM Plex Mono' }}>locked {ref.label}: {ref.text}</div>
      {evidence && <div className="locked-note mono-line">{evidence}</div>}
      <label>actuals (per metric, with confidence)</label>
      <textarea className="finput" rows={2} value={actuals} onChange={(e) => setActuals(e.target.value)} placeholder="recurring conv +3.1pp (95%) · total conv −0.4pp (n.s.)" autoFocus />
      <label>bucket — read against the {ref.label}, not the mood</label>
      <div className="segbtns">
        {(['win', 'inconclusive', 'loss', 'invalid'] as const).map((b) => (
          <button key={b} className={outcome === b ? 'on' : ''} onClick={() => setOutcome(b)}>{b}</button>
        ))}
      </div>
      {hint && (
        <div className="locked-note mono-line" style={{ marginTop: 6 }}>
          {hint.bucket ? `reads as ${hint.bucket} — ${hint.why}` : hint.why}
          {hint.bucket && outcome !== hint.bucket && <button className="dock-toggle" onClick={() => setOutcome(hint.bucket)}>use it</button>}
        </div>
      )}
      <label>your call</label>
      <div className="segbtns">
        {['keep', 'revert', 'hold', 're-run'].map((c) => (
          <button key={c} className={call === c ? 'on' : ''} onClick={() => setCall(c)}>{c}</button>
        ))}
      </div>
      {mismatch && (
        <>
          {/* the alarm belongs on the deviation line, in --incon — never a one-off red */}
          <label className="dev-label">deviation — your call ({call}) differs from the pre-registered action ({expected}); say why, in your words</label>
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
