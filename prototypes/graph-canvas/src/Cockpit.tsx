// The cockpit — a bet after the lock. Ink register, read-only by law: nothing here
// edits a committed field; amendments and resolution are the only doors.
// Structure adapted from apps/web/components/inflight/{LockedBetMini @ 0cedf8c,
// GuardrailRow @ 2d8aa2d, BucketResult @ 8c5ad1d, IntegrityCheck @ c27e3ab};
// none of their CSS — skinned to src/styles.css tokens.
import { useEffect, useState } from 'react'
import type { BetRecord, DecisionRule, EvidenceRecord } from './model'
import type { MomentKind } from './Moment'
import { compileCriteria, parseCriterion, ruleLine } from './criteria'
import { rungLine } from './instrument'
import { sealOf } from './lock'
import { StatusChip } from './StatusChip'
import { specLine } from './funnel'
import { LAB_LABEL, labUrl, sealState } from './attach'

const CALL_FOR: Record<string, keyof BetRecord['criteria']> = { win: 'win', inconclusive: 'inconclusive', loss: 'loss' }

export function Cockpit({ id, bet, onMoment, onDiff }: { id: string; bet: BetRecord; onMoment: (kind: MomentKind, id: string) => void; onDiff?: (id: string) => void }) {
  const resolved = bet.status === 'resolved'
  const date = bet.lockedAt ? bet.lockedAt.slice(0, 10) : null
  const rules = bet.decisionRules ?? compileCriteria(bet)
  const compiledOnRead = !bet.decisionRules
  const guardrails = (bet.guardrails ?? '').split(/[;\n]|,\s/).map((g) => g.trim()).filter(Boolean)
  const foldRule = bet.foldIf.startsWith('(') ? null : ruleLine({ metric: bet.metric, ...withDir(parseCriterion(bet.foldIf), bet) })

  return (
    <>
      <div className="dimlbl">ink register — sealed{date ? ` ${date}` : ''}</div>
      <div className="lockbox2">
        <div className="seal-row">
          <span className="seal">LOCKED{date ? ` · ${date}` : ''}</span>
          {bet.seal && <span className="seal-hash" title={bet.seal}>sha256 {bet.seal.slice(0, 8)}…{bet.seal.slice(-4)}</span>}
          {onDiff && <button className="btn2 sm" style={{ marginLeft: 'auto', marginRight: 0 }} onClick={() => onDiff(id)}>view the diff →</button>}
        </div>
        <dl>
          <dt>instrument</dt>
          <dd className="mono-line">{bet.instrument ? rungLine(bet.instrument.type) : <span className="locked-note">rung not declared — locked before the ladder</span>}
            {bet.instrument?.spec && <div className="locked-note">{specLine(bet.instrument.spec)}</div>}</dd>
          <dt>mechanism</dt><dd>{bet.mechanism || '—'}</dd>
          <dt>fold-if</dt>
          <dd className="fold-if-dd">{bet.foldIf}
            {foldRule && <div className="rule">{foldRule}</div>}</dd>
          {bet.expectation && <><dt>expectation</dt><dd>{bet.expectation}</dd></>}
          {bet.evidenceBar && <><dt>evidence bar</dt><dd>{bet.evidenceBar}</dd></>}
          {bet.confidence && <><dt>confidence</dt><dd className="mono-line">{bet.confidence}</dd></>}
          <dt>pre-registered actions</dt>
          <dd>
            {rules.map((r) => <Rule key={r.bucket} r={r} />)}
            {compiledOnRead && <div className="locked-note" style={{ marginTop: 6 }}>rules compiled on read — this bet was locked before rules were sealed</div>}
          </dd>
          {bet.premortem && <><dt>premortem</dt><dd className="locked-note">“{bet.premortem}”</dd></>}
        </dl>
      </div>

      <Integrity bet={bet} />

      <div className="dimlbl">guardrails</div>
      {guardrails.length ? guardrails.map((g, i) => (
        <div className="guard-row" key={i}><span>{g}</span><span className="pill">declared</span></div>
      )) : <div className="locked-note">none declared</div>}

      <div className="dimlbl">evidence</div>
      {bet.evidence?.length ? bet.evidence.map((e) => <EvidenceRow key={e.id} e={e} />)
        : <div className="locked-note">none attached — evidence tools in the lab end in “attach to a bet”</div>}

      <div className="dimlbl">amendments</div>
      {bet.amendments?.length ? bet.amendments.map((a, i) => (
        <div className="amend-row" key={i}><span className="k">{a.ts.slice(0, 10)}</span> {a.field}: {a.change} — “{a.reason}”</div>
      )) : <div className="locked-note">none — the record stands as locked</div>}

      {resolved ? <Bucket bet={bet} /> : (
        <div style={{ marginTop: 16 }}>
          <button className="btn2 pri" onClick={() => onMoment('resolve', id)}>Resolve…</button>
          <button className="btn2" onClick={() => onMoment('amend', id)}>Amend…</button>
          <StatusChip id="moment-resolve" />
        </div>
      )}
    </>
  )
}

// Evidence from the lab (src/attach.ts): recomputed here, outside the seal, never accent.
function EvidenceRow({ e }: { e: EvidenceRecord }) {
  const s = sealState(e)
  const sealText = s === 'verified' ? 'sealed · verified' : s === 'mismatch' ? 'unsealed — the lab seal does not match this hash' : 'unsealed'
  return (
    <div className="evid-row">
      <div className="evid-head">
        <span>{e.ts.slice(0, 10)}</span>
        <span>{LAB_LABEL[e.tool]} v{e.v}</span>
        {e.verdict && <span className="evid-verdict">{e.verdict}</span>}
        <span className={`evid-seal ${s}`} title={`sha256 ${e.hash}`}>{sealText}</span>
        <a href={labUrl(e)} target="_blank" rel="noopener noreferrer">view ↗</a>
      </div>
      <div>{e.summary}</div>
    </div>
  )
}

function withDir(p: ReturnType<typeof parseCriterion>, bet: BetRecord) {
  return { ...p, direction: p.direction ?? (bet.direction === 'reduce' ? 'decrease' as const : 'increase' as const) }
}

function Rule({ r }: { r: DecisionRule }) {
  const line = ruleLine(r)
  return (
    <div className="crit-row">
      <span className="crit">{r.bucket === 'inconclusive' ? 'incon.' : r.bucket}</span> {r.prose || <span className="locked-note">—</span>}
      <div className={line ? 'rule' : 'rule pencil'}>{line ?? 'not machine-checkable'}</div>
    </div>
  )
}

// Re-verifies the seal against the committed fields on every render of the face.
function Integrity({ bet }: { bet: BetRecord }) {
  const [state, setState] = useState<'ok' | 'fail' | 'none' | 'checking'>(bet.seal ? 'checking' : 'none')
  useEffect(() => {
    let live = true
    if (!bet.seal) { setState('none'); return }
    sealOf(bet).then((h) => { if (live) setState(h === bet.seal ? 'ok' : 'fail') })
    return () => { live = false }
  }, [bet])
  const rows = {
    checking: { mark: '…', title: 'verifying seal', detail: '' },
    ok: { mark: '✓', title: 'seal verifies', detail: 'the committed fields hash to the seal written at lock' },
    fail: { mark: '✕', title: 'committed fields differ from the seal', detail: 'something committed was edited after the lock — the record is not what was sealed' },
    none: { mark: '—', title: 'no seal', detail: 'locked before sealing existed, or seeded — the lock now seals on write' },
  }[state]
  return (
    <div className={`integ integ-${state}`}>
      <span className="integ-mark">{rows.mark}</span>
      <div><b>{rows.title}</b>{rows.detail && <div className="locked-note">{rows.detail}</div>}</div>
    </div>
  )
}

function Bucket({ bet }: { bet: BetRecord }) {
  const o = bet.outcome ?? 'inconclusive'
  const key = CALL_FOR[o]
  return (
    <div className={`bucket s-${o}`}>
      <div className="bucket-title">{o.toUpperCase()}</div>
      <dl>
        <dt>actuals</dt><dd>{bet.actuals || '—'}</dd>
        {key && <><dt>pre-registered action for this outcome</dt><dd>{bet.criteria[key]}</dd></>}
        <dt>call</dt><dd className="mono-line">{bet.call || '—'}</dd>
        {bet.deviation && <><dt>deviation</dt><dd className="deviation">{bet.deviation}</dd></>}
        {bet.learning && <><dt>learning</dt><dd>{bet.learning}</dd></>}
      </dl>
    </div>
  )
}
