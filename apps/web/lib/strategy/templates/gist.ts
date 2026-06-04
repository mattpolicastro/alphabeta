import type { BoardState, Card, CardFields, Connection } from '@/lib/strategy/types'
import type { TemplateDefinition, CardComponentProps } from './types'
import { GistGoalCard } from '@/components/strategy/cards/gist/GoalCard'
import { GistIdeaCard } from '@/components/strategy/cards/gist/IdeaCard'
import { GistStepCard } from '@/components/strategy/cards/gist/StepCard'
import { GistTaskCard } from '@/components/strategy/cards/gist/TaskCard'

function GistGoalWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'gist-goals') return null
  return GistGoalCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'gist-goals' }),
  })
}

function GistIdeaWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'gist-ideas') return null
  return GistIdeaCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'gist-ideas' }),
  })
}

function GistStepWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'steps') return null
  return GistStepCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'steps' }),
  })
}

function GistTaskWrapper({
  fields,
  editing,
  onDraft,
  onToggleDone,
}: CardComponentProps) {
  if (fields.columnId !== 'tasks') return null
  return GistTaskCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'tasks' }),
    onToggleDone: editing ? undefined : onToggleDone,
  })
}

export const gistTemplate: TemplateDefinition = {
  id: 'gist',
  name: 'GIST Framework',
  shortName: 'GIST',
  description:
    'Plan from Goals through Ideas and Steps down to Tasks using the GIST planning framework.',
  columns: [
    {
      id: 'gist-goals',
      title: 'GOALS',
      subtitle: 'we want to achieve…',
      bgClass: 'bg-gist-goals',
      nextColumn: 'gist-ideas',
      blankFields: (): CardFields => ({
        columnId: 'gist-goals',
        title: '',
      }),
      cardComponent: GistGoalWrapper,
    },
    {
      id: 'gist-ideas',
      title: 'IDEAS',
      subtitle: 'we could try…',
      bgClass: 'bg-gist-ideas',
      nextColumn: 'steps',
      blankFields: (): CardFields => ({
        columnId: 'gist-ideas',
        title: '',
      }),
      cardComponent: GistIdeaWrapper,
    },
    {
      id: 'steps',
      title: 'STEPS',
      subtitle: 'by taking these steps…',
      bgClass: 'bg-gist-steps',
      nextColumn: 'tasks',
      blankFields: (): CardFields => ({
        columnId: 'steps',
        title: '',
      }),
      cardComponent: GistStepWrapper,
    },
    {
      id: 'tasks',
      title: 'TASKS',
      subtitle: 'with these specific tasks…',
      bgClass: 'bg-gist-tasks',
      nextColumn: null,
      blankFields: (): CardFields => ({
        columnId: 'tasks',
        description: '',
        done: false,
      }),
      cardComponent: GistTaskWrapper,
    },
  ],
  exampleBoard: (): BoardState => EXAMPLE_BOARD,
}

const GL_1 = 'ex-gist-goal-1'
const GL_2 = 'ex-gist-goal-2'
const ID_1 = 'ex-gist-idea-1'
const ID_2 = 'ex-gist-idea-2'
const ID_3 = 'ex-gist-idea-3'
const ST_1 = 'ex-gist-step-1'
const ST_2 = 'ex-gist-step-2'
const ST_3 = 'ex-gist-step-3'
const ST_4 = 'ex-gist-step-4'
const TK_1 = 'ex-gist-task-1'
const TK_2 = 'ex-gist-task-2'
const TK_3 = 'ex-gist-task-3'
const TK_4 = 'ex-gist-task-4'
const TK_5 = 'ex-gist-task-5'

const exampleCards: Card[] = [
  {
    id: GL_1,
    columnId: 'gist-goals',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gist-goals',
      title: 'Increase monthly active users by 40%',
      measuredBy: 'Monthly active users (MAU)',
      targetValue: '140,000',
      timeframe: 'Q3 2026',
    },
  },
  {
    id: GL_2,
    columnId: 'gist-goals',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gist-goals',
      title: 'Reduce average onboarding time to under 3 minutes',
      measuredBy: 'Median time from signup to first action',
      targetValue: '< 3 min',
      timeframe: 'Q2 2026',
    },
  },
  {
    id: ID_1,
    columnId: 'gist-ideas',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gist-ideas',
      title: 'Social sharing and invite rewards',
      description:
        'Let users share achievements and invite friends with mutual rewards to drive organic growth.',
      confidence: 'medium',
      impact: 'high',
    },
  },
  {
    id: ID_2,
    columnId: 'gist-ideas',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gist-ideas',
      title: 'Guided onboarding wizard',
      description:
        'Replace the current 8-step signup with a 3-step wizard that defers non-essential profile fields.',
      confidence: 'high',
      impact: 'high',
    },
  },
  {
    id: ID_3,
    columnId: 'gist-ideas',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'gist-ideas',
      title: 'Weekly digest email with personalized tips',
      description:
        'Send a weekly email highlighting unused features based on user behavior patterns.',
      confidence: 'low',
      impact: 'medium',
    },
  },
  {
    id: ST_1,
    columnId: 'steps',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'steps',
      title: 'Design referral reward structure',
      description:
        'Define reward tiers, eligibility rules, and fraud prevention measures for the referral program.',
      status: 'done',
      owner: 'Product',
    },
  },
  {
    id: ST_2,
    columnId: 'steps',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'steps',
      title: 'Build sharing SDK integration',
      description:
        'Integrate native share sheets on iOS and Android with deep link tracking.',
      status: 'in-progress',
      owner: 'Mobile team',
    },
  },
  {
    id: ST_3,
    columnId: 'steps',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'steps',
      title: 'Prototype new onboarding flow',
      description:
        'Create high-fidelity prototypes for the 3-step wizard and run usability tests with 10 users.',
      status: 'in-progress',
      owner: 'Design',
    },
  },
  {
    id: ST_4,
    columnId: 'steps',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'steps',
      title: 'Set up email automation pipeline',
      description:
        'Configure the email service provider with segmentation rules and content templates.',
      status: 'planned',
      owner: 'Growth',
    },
  },
  {
    id: TK_1,
    columnId: 'tasks',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'tasks',
      description: 'Implement deep link generation API endpoint',
      done: true,
      owner: 'Backend',
    },
  },
  {
    id: TK_2,
    columnId: 'tasks',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'tasks',
      description: 'Add share button to achievement cards in the app',
      done: false,
      owner: 'Mobile team',
    },
  },
  {
    id: TK_3,
    columnId: 'tasks',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'tasks',
      description: 'Create Figma mockups for the 3-step onboarding wizard',
      done: true,
      owner: 'Design',
    },
  },
  {
    id: TK_4,
    columnId: 'tasks',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'tasks',
      description: 'Schedule and run usability tests with 10 participants',
      done: false,
      owner: 'UX Research',
    },
  },
  {
    id: TK_5,
    columnId: 'tasks',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'tasks',
      description: 'Draft email copy for 4 weekly digest variants',
      done: false,
      owner: 'Content',
    },
  },
]

const exampleConnections: Connection[] = [
  { id: 'ex-gist-c-1', fromCardId: GL_1, toCardId: ID_1 },
  { id: 'ex-gist-c-2', fromCardId: GL_1, toCardId: ID_3 },
  { id: 'ex-gist-c-3', fromCardId: GL_2, toCardId: ID_2 },
  { id: 'ex-gist-c-4', fromCardId: ID_1, toCardId: ST_1 },
  { id: 'ex-gist-c-5', fromCardId: ID_1, toCardId: ST_2 },
  { id: 'ex-gist-c-6', fromCardId: ID_2, toCardId: ST_3 },
  { id: 'ex-gist-c-7', fromCardId: ID_3, toCardId: ST_4 },
  { id: 'ex-gist-c-8', fromCardId: ST_1, toCardId: TK_1 },
  { id: 'ex-gist-c-9', fromCardId: ST_2, toCardId: TK_2 },
  { id: 'ex-gist-c-10', fromCardId: ST_3, toCardId: TK_3 },
  { id: 'ex-gist-c-11', fromCardId: ST_3, toCardId: TK_4 },
  { id: 'ex-gist-c-12', fromCardId: ST_4, toCardId: TK_5 },
]

const EXAMPLE_BOARD: BoardState = {
  templateId: 'gist',
  cycleName: 'Current cycle',
  columnMeta: Object.fromEntries(
    gistTemplate.columns.map((c) => [
      c.id,
      { title: c.title, subtitle: c.subtitle },
    ]),
  ),
  cards: exampleCards,
  connections: exampleConnections,
}
