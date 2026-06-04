import type { BoardState, Card, CardFields, Connection } from '@/lib/strategy/types'
import type { TemplateDefinition, CardComponentProps } from './types'
import { ObjectiveCard } from '@/components/strategy/cards/okr/ObjectiveCard'
import { KeyResultCard } from '@/components/strategy/cards/okr/KeyResultCard'
import { InitiativeCard } from '@/components/strategy/cards/okr/InitiativeCard'

function OkrObjectiveCardWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'objectives') return null
  return ObjectiveCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'objectives' }),
  })
}

function OkrKeyResultCardWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'key-results') return null
  return KeyResultCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'key-results' }),
  })
}

function OkrInitiativeCardWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'initiatives') return null
  return InitiativeCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'initiatives' }),
  })
}

export const okrTemplate: TemplateDefinition = {
  id: 'okr',
  name: 'Objectives & Key Results',
  shortName: 'OKR',
  description:
    'Set objectives and track measurable key results with linked initiatives.',
  direction: 'rtl',
  columns: [
    {
      id: 'objectives',
      title: 'OBJECTIVES',
      subtitle: 'what we want to achieve…',
      bgClass: 'bg-okr-objectives',
      nextColumn: null,
      blankFields: (): CardFields => ({ columnId: 'objectives', title: '' }),
      cardComponent: OkrObjectiveCardWrapper,
    },
    {
      id: 'key-results',
      title: 'KEY RESULTS',
      subtitle: 'how we measure success…',
      bgClass: 'bg-okr-keyresults',
      nextColumn: 'objectives',
      blankFields: (): CardFields => ({ columnId: 'key-results', title: '' }),
      cardComponent: OkrKeyResultCardWrapper,
    },
    {
      id: 'initiatives',
      title: 'INITIATIVES',
      subtitle: 'what we will do…',
      bgClass: 'bg-okr-initiatives',
      nextColumn: 'key-results',
      blankFields: (): CardFields => ({ columnId: 'initiatives', title: '' }),
      cardComponent: OkrInitiativeCardWrapper,
    },
  ],
  exampleBoard: (): BoardState => EXAMPLE_BOARD,
}

const OBJ_1 = 'ex-okr-obj-1'
const OBJ_2 = 'ex-okr-obj-2'
const OBJ_3 = 'ex-okr-obj-3'
const KR_1 = 'ex-okr-kr-1'
const KR_2 = 'ex-okr-kr-2'
const KR_3 = 'ex-okr-kr-3'
const KR_4 = 'ex-okr-kr-4'
const INI_1 = 'ex-okr-ini-1'
const INI_2 = 'ex-okr-ini-2'
const INI_3 = 'ex-okr-ini-3'
const INI_4 = 'ex-okr-ini-4'
const INI_5 = 'ex-okr-ini-5'

const exampleCards: Card[] = [
  {
    id: OBJ_1,
    columnId: 'objectives',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'objectives',
      title: 'Deliver a best-in-class onboarding experience',
      description:
        'New users should reach their first "aha moment" within minutes of signing up, not days.',
      timeframe: 'Q3 2026',
      owner: 'Product',
    },
  },
  {
    id: OBJ_2,
    columnId: 'objectives',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'objectives',
      title: 'Increase platform reliability and trust',
      description:
        'Reduce downtime and errors so customers can depend on us for critical workflows.',
      timeframe: 'Q3 2026',
      owner: 'Engineering',
    },
  },
  {
    id: OBJ_3,
    columnId: 'objectives',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'objectives',
      title: 'Grow revenue from existing customers',
      description:
        'Expand usage and upsell within our current customer base rather than relying solely on new acquisition.',
      timeframe: 'Q3 2026',
      owner: 'Growth',
    },
  },
  {
    id: KR_1,
    columnId: 'key-results',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'key-results',
      title: 'Reduce time-to-first-value from 4 days to under 1 hour',
      measuredBy: 'Median time from signup to first core action',
      startValue: '4d',
      targetValue: '1h',
      currentValue: '2.5d',
      owner: 'Product',
    },
  },
  {
    id: KR_2,
    columnId: 'key-results',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'key-results',
      title: 'Achieve 99.95% uptime for all production services',
      measuredBy: 'Monthly uptime percentage',
      startValue: '99.7%',
      targetValue: '99.95%',
      currentValue: '99.8%',
      owner: 'Engineering',
    },
  },
  {
    id: KR_3,
    columnId: 'key-results',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'key-results',
      title: 'Reduce P1 incident count from 8/month to 2/month',
      measuredBy: 'P1 incidents per calendar month',
      startValue: '8',
      targetValue: '2',
      currentValue: '5',
      owner: 'Engineering',
    },
  },
  {
    id: KR_4,
    columnId: 'key-results',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'key-results',
      title: 'Increase net revenue retention to 120%',
      measuredBy: 'Net revenue retention (NRR)',
      startValue: '105%',
      targetValue: '120%',
      currentValue: '110%',
      owner: 'Growth',
    },
  },
  {
    id: INI_1,
    columnId: 'initiatives',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'initiatives',
      title: 'Build interactive onboarding wizard with guided setup',
      description:
        'Replace the static welcome page with a step-by-step wizard that walks users through their first project.',
      status: 'in-progress',
      owner: 'Product',
    },
  },
  {
    id: INI_2,
    columnId: 'initiatives',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'initiatives',
      title: 'Add pre-built templates for common use cases',
      description:
        'Ship 10 starter templates so new users can see value immediately without configuring from scratch.',
      status: 'not-started',
      owner: 'Product',
    },
  },
  {
    id: INI_3,
    columnId: 'initiatives',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'initiatives',
      title: 'Implement automated canary deployments',
      description:
        'Roll out changes to 5% of traffic first and auto-rollback on error rate spikes.',
      status: 'in-progress',
      owner: 'Engineering',
    },
  },
  {
    id: INI_4,
    columnId: 'initiatives',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'initiatives',
      title: 'Launch usage-based pricing tier',
      description:
        'Introduce a metered plan that lets customers scale spend with actual usage, capturing expansion revenue.',
      status: 'not-started',
      owner: 'Growth',
    },
  },
  {
    id: INI_5,
    columnId: 'initiatives',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'initiatives',
      title: 'Build in-app upgrade prompts at usage limits',
      description:
        'Surface contextual upgrade nudges when users hit plan limits rather than hard-blocking them.',
      status: 'done',
      owner: 'Growth',
    },
  },
]

const exampleConnections: Connection[] = [
  { id: 'ex-okr-c-1', fromCardId: KR_1, toCardId: OBJ_1 },
  { id: 'ex-okr-c-2', fromCardId: KR_2, toCardId: OBJ_2 },
  { id: 'ex-okr-c-3', fromCardId: KR_3, toCardId: OBJ_2 },
  { id: 'ex-okr-c-4', fromCardId: KR_4, toCardId: OBJ_3 },
  { id: 'ex-okr-c-5', fromCardId: INI_1, toCardId: KR_1 },
  { id: 'ex-okr-c-6', fromCardId: INI_2, toCardId: KR_1 },
  { id: 'ex-okr-c-7', fromCardId: INI_3, toCardId: KR_2 },
  { id: 'ex-okr-c-8', fromCardId: INI_3, toCardId: KR_3 },
  { id: 'ex-okr-c-9', fromCardId: INI_4, toCardId: KR_4 },
  { id: 'ex-okr-c-10', fromCardId: INI_5, toCardId: KR_4 },
]

const EXAMPLE_BOARD: BoardState = {
  templateId: 'okr',
  cycleName: 'Q3 2026',
  columnMeta: Object.fromEntries(
    okrTemplate.columns.map((c) => [c.id, { title: c.title, subtitle: c.subtitle }]),
  ),
  cards: exampleCards,
  connections: exampleConnections,
}
