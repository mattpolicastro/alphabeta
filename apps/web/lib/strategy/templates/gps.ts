import type { BoardState, Card, CardFields, Connection } from '@/lib/strategy/types'
import type { TemplateDefinition, CardComponentProps } from './types'
import { GoalCard as GpsGoalCard } from '@/components/strategy/cards/gps/GoalCard'
import { ProblemCard as GpsProblemCard } from '@/components/strategy/cards/gps/ProblemCard'
import { SolutionCard as GpsSolutionCard } from '@/components/strategy/cards/gps/SolutionCard'

function GpsGoalWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'gps-goals') return null
  return GpsGoalCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'gps-goals' }),
  })
}

function GpsProblemWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'gps-problems') return null
  return GpsProblemCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'gps-problems' }),
  })
}

function GpsSolutionWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'solutions') return null
  return GpsSolutionCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'solutions' }),
  })
}

export const gpsTemplate: TemplateDefinition = {
  id: 'gps',
  name: 'Goals, Problems, Solutions',
  shortName: 'GPS',
  description:
    'Map strategic goals to the problems blocking them and the solutions that address each problem.',
  columns: [
    {
      id: 'gps-goals',
      title: 'GOALS',
      subtitle: 'what we want to achieve...',
      bgClass: 'bg-gps-goals',
      nextColumn: 'gps-problems',
      blankFields: (): CardFields => ({
        columnId: 'gps-goals',
        title: '',
      }),
      cardComponent: GpsGoalWrapper,
    },
    {
      id: 'gps-problems',
      title: 'PROBLEMS',
      subtitle: 'what stands in our way...',
      bgClass: 'bg-gps-problems',
      nextColumn: 'solutions',
      blankFields: (): CardFields => ({
        columnId: 'gps-problems',
        title: '',
      }),
      cardComponent: GpsProblemWrapper,
    },
    {
      id: 'solutions',
      title: 'SOLUTIONS',
      subtitle: 'how we will overcome them...',
      bgClass: 'bg-gps-solutions',
      nextColumn: null,
      blankFields: (): CardFields => ({
        columnId: 'solutions',
        title: '',
      }),
      cardComponent: GpsSolutionWrapper,
    },
  ],
  exampleBoard: (): BoardState => EXAMPLE_BOARD,
}

const GL_1 = 'ex-gps-goal-1'
const GL_2 = 'ex-gps-goal-2'
const PB_1 = 'ex-gps-problem-1'
const PB_2 = 'ex-gps-problem-2'
const PB_3 = 'ex-gps-problem-3'
const PB_4 = 'ex-gps-problem-4'
const SL_1 = 'ex-gps-solution-1'
const SL_2 = 'ex-gps-solution-2'
const SL_3 = 'ex-gps-solution-3'
const SL_4 = 'ex-gps-solution-4'

const exampleCards: Card[] = [
  {
    id: GL_1,
    columnId: 'gps-goals',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gps-goals',
      title: 'Double annual recurring revenue',
      successCriteria: 'ARR reaches $10M by end of FY26',
      measuredBy: 'Annual recurring revenue',
      targetValue: '$10M',
    },
  },
  {
    id: GL_2,
    columnId: 'gps-goals',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gps-goals',
      title: 'Expand into the European market',
      successCriteria: 'At least 200 paying customers in EU by Q4',
      measuredBy: 'EU customer count',
      targetValue: '200',
    },
  },
  {
    id: PB_1,
    columnId: 'gps-problems',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gps-problems',
      title: 'Sales cycle is too long for enterprise deals',
      description:
        'Average enterprise deal takes 6 months to close, limiting revenue growth and tying up sales resources.',
      severity: 'critical',
      evidence:
        'CRM data shows median close time of 178 days for deals over $50K. Win rate drops 40% after 120 days.',
    },
  },
  {
    id: PB_2,
    columnId: 'gps-problems',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gps-problems',
      title: 'Product lacks GDPR-compliant data residency options',
      description:
        'EU prospects require data to stay within EU borders. Current infrastructure is US-only.',
      severity: 'critical',
      evidence:
        'Lost 3 enterprise deals in Q3 explicitly due to data residency requirements. Legal flagged this as a blocker.',
    },
  },
  {
    id: PB_3,
    columnId: 'gps-problems',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gps-problems',
      title: 'Free tier users rarely convert to paid plans',
      description:
        'Only 2% of free users upgrade within 90 days, well below the 8% industry benchmark.',
      severity: 'major',
      evidence:
        'Cohort analysis of last 6 months shows conversion flat at 1.8-2.3% across all signup channels.',
    },
  },
  {
    id: PB_4,
    columnId: 'gps-problems',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gps-problems',
      title: 'No localized marketing materials for EU markets',
      description:
        'Website, docs, and sales collateral are English-only. Competitors offer localized content in 5+ languages.',
      severity: 'minor',
    },
  },
  {
    id: SL_1,
    columnId: 'solutions',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'solutions',
      title: 'Implement product-led growth with interactive demo',
      description:
        'Build a self-serve interactive demo that lets prospects experience value before engaging sales, shortening the sales cycle.',
      effort: 'high',
      impact: 'high',
      status: 'in-progress',
    },
  },
  {
    id: SL_2,
    columnId: 'solutions',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'solutions',
      title: 'Deploy EU data region on AWS Frankfurt',
      description:
        'Stand up a parallel infrastructure stack in eu-central-1 with data isolation and compliance controls.',
      effort: 'high',
      impact: 'high',
      status: 'proposed',
    },
  },
  {
    id: SL_3,
    columnId: 'solutions',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'solutions',
      title: 'Redesign free-to-paid upgrade flow with usage-based triggers',
      description:
        'Show contextual upgrade prompts when free users hit natural limits rather than time-based trial expirations.',
      effort: 'medium',
      impact: 'high',
      status: 'proposed',
    },
  },
  {
    id: SL_4,
    columnId: 'solutions',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'solutions',
      title: 'Partner with localization agency for top 3 EU languages',
      description:
        'Translate website, help docs, and key sales materials into German, French, and Spanish.',
      effort: 'low',
      impact: 'medium',
      status: 'done',
    },
  },
]

const exampleConnections: Connection[] = [
  { id: 'ex-gps-c-1', fromCardId: GL_1, toCardId: PB_1 },
  { id: 'ex-gps-c-2', fromCardId: GL_1, toCardId: PB_3 },
  { id: 'ex-gps-c-3', fromCardId: GL_2, toCardId: PB_2 },
  { id: 'ex-gps-c-4', fromCardId: GL_2, toCardId: PB_4 },
  { id: 'ex-gps-c-5', fromCardId: PB_1, toCardId: SL_1 },
  { id: 'ex-gps-c-6', fromCardId: PB_2, toCardId: SL_2 },
  { id: 'ex-gps-c-7', fromCardId: PB_3, toCardId: SL_3 },
  { id: 'ex-gps-c-8', fromCardId: PB_4, toCardId: SL_4 },
]

const EXAMPLE_BOARD: BoardState = {
  templateId: 'gps',
  cycleName: 'FY26 Strategy',
  columnMeta: Object.fromEntries(
    gpsTemplate.columns.map((c) => [c.id, { title: c.title, subtitle: c.subtitle }]),
  ),
  cards: exampleCards,
  connections: exampleConnections,
}
