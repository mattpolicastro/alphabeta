// Typed intake without the relay: sort a dump into a canvas kind by cues alone.
//
// adapted from apps/web/lib/compose/altitude.ts @ 2a43303 — that classifier sorted
// into vague / goal / bet / ready (how formed is the idea?). The canvas asks a
// different question — which node is this? — so the cue lists are kept and the
// output is remapped onto goal / problem / question / solution, with problem and
// question cues added. It classifies; it does not converse. The facilitator is the
// conversational version.
import type { StratKind } from './model'

export interface Intake {
  kind: StratKind
  confidence: number
  why: string[] // the cues that fired, in the order they decided it
}

const GOAL_SIGNALS = [
  'need to increase', 'need to reduce', 'need to improve', 'want to get to', 'by end of', 'by q',
  'our strategy', 'our goal', 'target is', 'okr', 'north star', 'this year', 'this quarter',
]
const SEQUENCE_SIGNALS = ['first', 'then', 'after that', 'depends on', 'each step', 'prerequisite', 'before we can', 'chain', 'sequence', 'step 1', 'step 2']
const READY_SIGNALS = ['mde', 'per arm', 'per variant', 'guardrail', '2 weeks', 'win →', 'win ->', 'loss →', 'loss ->', 'inconclusive →', 'inconclusive ->', 'a/b test:']
const PROBLEM_SIGNALS = [
  'too slow', 'too long', 'too many', 'too few', 'drop-off', 'drop off', 'dropping', 'churn', 'declin', 'losing', 'lose', 'fails', 'failing',
  'broken', "can't", 'cannot', 'complain', 'friction', 'bottleneck', 'gap', 'blocked', 'stuck', 'abandon', 'worse than', 'behind',
]
const VAGUE_SIGNALS = ['feeling', 'i feel', 'should probably', 'needs work', 'not sure', 'somewhere', 'something', 'worried about', 'concerned about']
const QUESTION_STARTS = /^\s*(how|what|why|when|where|which|who|is|are|do|does|did|can|could|should|would|will|has|have)\b/i
const QUESTION_SIGNALS = ['do we know', 'find out', 'look up', 'is it true', 'how many', 'how much', 'what fraction', 'what share', 'what percent', 'i wonder', 'not sure whether', 'unclear whether']
const BET_COMPONENTS: [RegExp, string][] = [
  [/\b(?:moving|move|change|changing|add|adding|remove|removing|redesign|replace|test|try|ship|launch|switch)\b/i, 'a change verb'],
  [/\b(?:lift|reduce|increase|decrease|improve|drop|boost|cut)\b/i, 'a direction word'],
  [/\b(?:conversion|rate|revenue|engagement|retention|sign-?ups?|checkout|completion|activation|churn|nps|ctr|aov|ltv)\b/i, 'a metric'],
  [/\d+\s?(?:%|pp|pts?|points)/, 'a magnitude'],
]

const hits = (text: string, signals: string[]) => signals.filter((s) => text.includes(s))

export function classifyIntake(raw: string): Intake {
  const text = raw.trim()
  const t = text.toLowerCase()
  if (!t) return { kind: 'problem', confidence: 0, why: ['nothing to classify'] }

  const ready = hits(t, READY_SIGNALS)
  const comps = BET_COMPONENTS.filter(([re]) => re.test(text)).map(([, name]) => name)
  const foldIf = /fold if|i'?ll fold|drop it|kill it|revert|under \+?\d|below \+?\d/i.test(text)
  const mechanism = /\bbecause\b|\bsince\b|\breason\b|\bdriven by\b/i.test(text)
  const question = hits(t, QUESTION_SIGNALS)
  const asks = /\?\s*$/.test(text)
  const starts = QUESTION_STARTS.test(text)
  const seq = hits(t, SEQUENCE_SIGNALS)
  const goal = hits(t, GOAL_SIGNALS)
  const problem = hits(t, PROBLEM_SIGNALS)
  const vague = hits(t, VAGUE_SIGNALS)

  // a pre-registration or a change + why is a solution, whatever else it mentions
  if (ready.length >= 3) return { kind: 'solution', confidence: 0.9, why: ready.map((s) => `"${s}"`).concat('reads as a pre-registration') }
  if (comps.length >= 3 && (foldIf || mechanism))
    return { kind: 'solution', confidence: 0.8, why: comps.concat(foldIf ? 'a fold-if' : 'a because-clause') }

  // a question mark or an interrogative opener is a question — a query, not a test
  if (asks || (starts && question.length) || question.length >= 2)
    return { kind: 'question', confidence: asks ? 0.8 : 0.6, why: [asks ? 'ends in a question mark' : 'interrogative opener', ...question.map((s) => `"${s}"`)] }

  if (seq.length >= 2) return { kind: 'goal', confidence: 0.7, why: seq.map((s) => `"${s}"`).concat('a sequence of steps is a plan, not one bet') }
  // two goal cues outrank bet components (a target with a date is a goal even when it names a metric)
  if (goal.length >= 2 || (goal.length === 1 && comps.length < 3)) return { kind: 'goal', confidence: goal.length >= 2 ? 0.75 : 0.6, why: goal.map((s) => `"${s}"`) }

  if (comps.length >= 2) return { kind: 'solution', confidence: 0.5, why: comps.concat('no because-clause — say why it would work') }

  if (problem.length) return { kind: 'problem', confidence: 0.65, why: problem.map((s) => `"${s}"`) }
  if (vague.length) return { kind: 'problem', confidence: 0.5, why: vague.map((s) => `"${s}"`).concat('a worry without a change is a problem to name') }
  if (starts || question.length) return { kind: 'question', confidence: 0.45, why: [starts ? 'interrogative opener' : `"${question[0]}"`] }

  return { kind: 'problem', confidence: 0.3, why: [t.length < 80 ? 'too short to read a cue — defaulting to problem' : 'no cue fired — defaulting to problem'] }
}

export const KIND_ORDER: StratKind[] = ['goal', 'problem', 'question', 'solution']
