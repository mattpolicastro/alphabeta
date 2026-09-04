import { describe, expect, it } from 'vitest'
import { classifyIntake } from '../intake'

describe('classifyIntake', () => {
  it('a pre-registration is a solution', () => {
    const r = classifyIntake('MDE 2pp per arm, guardrail on refunds, win → ship, loss → revert')
    expect(r.kind).toBe('solution')
    expect(r.confidence).toBeGreaterThanOrEqual(0.8)
    expect(r.why.join(' ')).toMatch(/pre-registration/)
  })
  it('a change with a metric and a because-clause is a solution', () => {
    const r = classifyIntake('Redesign the signup form to improve completion rate by 10% because the current flow has too many steps.')
    expect(r.kind).toBe('solution')
    expect(r.why).toContain('a because-clause')
  })
  it('a change with a fold-if is a solution', () => {
    expect(classifyIntake('Change the checkout CTA to lift conversion by 5%. Fold if under +2%.').kind).toBe('solution')
  })
  it('a target with a date is a goal', () => {
    const r = classifyIntake('We need to increase retention. Our goal is to get to 80% by end of Q3.')
    expect(r.kind).toBe('goal')
    expect(r.why).toContain('"need to increase"')
  })
  it('a sequence of steps is a goal', () => {
    expect(classifyIntake('First we fix onboarding, then the email flow, after that pricing.').kind).toBe('goal')
  })
  it('a question mark makes a question', () => {
    const r = classifyIntake('How many trial users hit the paywall in week one?')
    expect(r.kind).toBe('question')
    expect(r.why[0]).toBe('ends in a question mark')
  })
  it('a lookup phrased flat is still a question', () => {
    expect(classifyIntake('do we know how many enterprise deals stall after the demo').kind).toBe('question')
  })
  it('a gap with a symptom is a problem', () => {
    const r = classifyIntake('Enterprise deals take too long to close and reps are losing them after the demo stage.')
    expect(r.kind).toBe('problem')
    expect(r.why.length).toBeGreaterThan(0)
  })
  it('a worry with no change is a problem, flagged as such', () => {
    const r = classifyIntake("I'm worried about the onboarding funnel, something needs work there.")
    expect(r.kind).toBe('problem')
    expect(r.why.join(' ')).toMatch(/worry without a change/)
  })
  it('ambiguous: change + direction + metric, no why → solution at low confidence with a nudge', () => {
    const r = classifyIntake('Moving checkout to lift conversion.')
    expect(r.kind).toBe('solution')
    expect(r.confidence).toBeLessThanOrEqual(0.5)
    expect(r.why.join(' ')).toMatch(/say why/)
  })
  it('ambiguous: a goal phrased as a question is a question (a mark beats a cue)', () => {
    expect(classifyIntake('Should our goal be to double ARR by end of FY26?').kind).toBe('question')
  })
  it('a bare word falls through to problem at low confidence, and says so', () => {
    const r = classifyIntake('pricing')
    expect(r.kind).toBe('problem')
    expect(r.confidence).toBeLessThan(0.4)
    expect(r.why[0]).toMatch(/too short/)
  })
  it('empty input classifies nothing', () => {
    expect(classifyIntake('   ')).toMatchObject({ confidence: 0, why: ['nothing to classify'] })
  })
  it('confidence stays in (0, 1]', () => {
    for (const s of ['pricing', 'How?', 'We need to reduce churn by Q4', 'Add a banner to lift sign-ups 3% because it is louder'])
      expect(classifyIntake(s).confidence).toBeGreaterThan(0)
  })
})
