// The calibration mirror — private: confidence said at lock against what happened.
// Shape adapted from apps/web/components/km/{OutcomeBadge, CycleSummary} @ 7a2cad8
// (the outcome pill and the one-paragraph read); the chart is inline SVG in tokens.
// Pencil register while the registry says stub — n has to reach MIN_N first.
import type { Node } from '@xyflow/react'
import { MIN_N, brier, calibrationBins, calibrationPoints, calibrationRead, type CalPoint } from './calibration-score'
import { initialNodes } from './data'
import { StatusChip } from './StatusChip'

// the fixture's bets carry no seq until the board assigns one — number them here so the tags read
function withSeq(nodes: Node[]): Node[] {
  let b = 0
  return nodes.map((n) => (n.type === 'bet' ? { ...n, data: { ...n.data, seq: ++b } } : n))
}

const W = 380, H = 250, PL = 40, PB = 30, PT = 12, PR = 12
const sx = (c: number) => PL + c * (W - PL - PR)
const sy = (o: number) => PT + (1 - o) * (H - PT - PB)

export function CalibrationDoc({ nodes }: { nodes: Node[] }) {
  const real = calibrationPoints(nodes)
  const fixture = real.length === 0
  const pts = fixture ? calibrationPoints(withSeq(initialNodes)) : real
  const bins = calibrationBins(pts).filter((b) => b.n > 0)
  const score = brier(pts)
  return (
    <>
      <div className="doc-head">
        <span className="panel-eyebrow">the calibration mirror</span>
        <StatusChip id="doc-calibration" />
        <span className="mono-line doc-meta">{fixture ? 'fixture data — this board has no resolved bet with a confidence' : `this board · ${pts.length} of ${MIN_N} needed`}</span>
      </div>
      <h3>What you said, against what happened.</h3>
      <svg className="cal-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="confidence at lock against outcome">
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(0)} className="cal-axis" />
        <line x1={sx(0)} y1={sy(0)} x2={sx(0)} y2={sy(1)} className="cal-axis" />
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} className="cal-diag" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <text x={sx(t)} y={H - PB + 14} className="cal-tick" textAnchor="middle">{t}</text>
            <text x={PL - 6} y={sy(t) + 3} className="cal-tick" textAnchor="end">{t}</text>
          </g>
        ))}
        <text x={sx(0.5)} y={H - 4} className="cal-lbl" textAnchor="middle">confidence at lock</text>
        <text x={10} y={sy(0.5)} className="cal-lbl" textAnchor="middle" transform={`rotate(-90 10 ${sy(0.5)})`}>won</text>
        {bins.length > 1 && <polyline className="cal-binline" points={bins.map((b) => `${sx(b.meanConfidence)},${sy(b.winRate)}`).join(' ')} />}
        {bins.map((b) => <rect key={b.lo} x={sx(b.meanConfidence) - 4} y={sy(b.winRate) - 4} width={8} height={8} className="cal-bin"><title>{`${b.lo}–${b.hi}: n=${b.n}, won ${Math.round(b.winRate * 100)}%`}</title></rect>)}
        {pts.map((p, i) => <Point key={p.id} p={p} nth={pts.filter((q, j) => j < i && q.confidence === p.confidence && q.outcome === p.outcome).length} />)}
      </svg>
      <div className="cal-read mono-line">{calibrationRead(pts)}</div>
      <dl className="cal-stats">
        <dt>Brier</dt><dd className="mono-line">{score === null ? '—' : score.toFixed(3)} <span className="locked-note">(0 is perfect; 0.25 is saying 0.5 every time)</span></dd>
        <dt>points</dt>
        <dd>
          {pts.length === 0 && <span className="locked-note">none</span>}
          {pts.map((p) => (
            <div className="cal-row" key={p.id}>
              <span className="mono dtag">{p.tag}</span>
              <span className="dtitle">{p.change}</span>
              <span className="mono-line">{p.confidence.toFixed(2)} → {p.outcome}</span>
              <span className={`pill s-${p.label}`}>{p.label === 'inconclusive' ? 'incon.' : p.label}</span>
            </div>
          ))}
        </dd>
      </dl>
      <p className="margin-note">binned means (squares) sit on the diagonal when you are calibrated. below n={MIN_N} the mirror shows the shape and refuses the verdict.</p>
    </>
  )
}

// points at the same (confidence, outcome) stack outward so none hide
function Point({ p, nth }: { p: CalPoint; nth: number }) {
  const y = sy(p.outcome) + (p.outcome ? 1 : -1) * nth * 7
  return (
    <circle cx={sx(p.confidence)} cy={y} r={4} className={`cal-pt ${p.outcome ? 'won' : 'lost'}`}>
      <title>{`${p.tag} · ${p.confidence} → ${p.label}`}</title>
    </circle>
  )
}
