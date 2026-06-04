import type { BoardState, Card, CardFields, Connection } from '@/lib/strategy/types'
import type { TemplateDefinition, CardComponentProps } from './types'
import { IdeaCard } from '@/components/strategy/cards/rice/IdeaCard'
import { ScoringCard } from '@/components/strategy/cards/rice/ScoringCard'
import { PrioritizedCard } from '@/components/strategy/cards/rice/PrioritizedCard'

function RiceIdeaCardWrapper({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'ideas') return null
  return IdeaCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'ideas' }),
  })
}

function RiceScoringCardWrapper({
  fields,
  editing,
  onDraft,
}: CardComponentProps) {
  if (fields.columnId !== 'scoring') return null
  return ScoringCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'scoring' }),
  })
}

function RicePrioritizedCardWrapper({
  fields,
  editing,
  onDraft,
}: CardComponentProps) {
  if (fields.columnId !== 'prioritized') return null
  return PrioritizedCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'prioritized' }),
  })
}

export const riceTemplate: TemplateDefinition = {
  id: 'rice',
  name: 'RICE Prioritization',
  shortName: 'RICE',
  description:
    'Score and prioritize product ideas using Reach, Impact, Confidence, and Effort.',
  columns: [
    {
      id: 'ideas',
      title: 'IDEAS',
      subtitle: 'capture raw ideas and requests…',
      bgClass: 'bg-rice-ideas',
      nextColumn: 'scoring',
      blankFields: (): CardFields => ({
        columnId: 'ideas',
        title: '',
      }),
      cardComponent: RiceIdeaCardWrapper,
    },
    {
      id: 'scoring',
      title: 'SCORING',
      subtitle: 'evaluate with RICE metrics…',
      bgClass: 'bg-rice-scoring',
      nextColumn: 'prioritized',
      blankFields: (): CardFields => ({
        columnId: 'scoring',
        title: '',
      }),
      cardComponent: RiceScoringCardWrapper,
    },
    {
      id: 'prioritized',
      title: 'PRIORITIZED',
      subtitle: 'ranked and ready for execution…',
      bgClass: 'bg-rice-prioritized',
      nextColumn: null,
      blankFields: (): CardFields => ({
        columnId: 'prioritized',
        title: '',
        status: 'queued',
      }),
      cardComponent: RicePrioritizedCardWrapper,
    },
  ],
  exampleBoard: (): BoardState => EXAMPLE_BOARD,
}

const IDEA_1 = 'ex-rice-idea-1'
const IDEA_2 = 'ex-rice-idea-2'
const IDEA_3 = 'ex-rice-idea-3'
const IDEA_4 = 'ex-rice-idea-4'

const SCORE_1 = 'ex-rice-score-1'
const SCORE_2 = 'ex-rice-score-2'
const SCORE_3 = 'ex-rice-score-3'

const PRIO_1 = 'ex-rice-prio-1'
const PRIO_2 = 'ex-rice-prio-2'
const PRIO_3 = 'ex-rice-prio-3'

const exampleCards: Card[] = [
  {
    id: IDEA_1,
    columnId: 'ideas',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'ideas',
      title: 'In-app onboarding checklist',
      description:
        'Guide new users through key setup steps with an interactive checklist that tracks completion.',
      category: 'Activation',
    },
  },
  {
    id: IDEA_2,
    columnId: 'ideas',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'ideas',
      title: 'Team collaboration spaces',
      description:
        'Shared workspaces where team members can co-edit documents and leave comments in real-time.',
      category: 'Collaboration',
    },
  },
  {
    id: IDEA_3,
    columnId: 'ideas',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'ideas',
      title: 'CSV bulk import',
      description:
        'Allow users to import existing data from spreadsheets instead of manual entry.',
      category: 'Data',
    },
  },
  {
    id: IDEA_4,
    columnId: 'ideas',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'ideas',
      title: 'Dark mode',
      description: 'System-aware dark theme to reduce eye strain and save battery on OLED screens.',
      category: 'UX',
    },
  },
  {
    id: SCORE_1,
    columnId: 'scoring',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'scoring',
      title: 'In-app onboarding checklist',
      reach: 80,
      impact: 2,
      confidence: 90,
      effort: 2,
    },
  },
  {
    id: SCORE_2,
    columnId: 'scoring',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'scoring',
      title: 'CSV bulk import',
      reach: 40,
      impact: 1,
      confidence: 80,
      effort: 1.5,
    },
  },
  {
    id: SCORE_3,
    columnId: 'scoring',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'scoring',
      title: 'Team collaboration spaces',
      reach: 60,
      impact: 3,
      confidence: 50,
      effort: 6,
    },
  },
  {
    id: PRIO_1,
    columnId: 'prioritized',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'prioritized',
      title: 'In-app onboarding checklist',
      riceScore: 72.0,
      status: 'in-progress',
      owner: 'Sarah K.',
    },
  },
  {
    id: PRIO_2,
    columnId: 'prioritized',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'prioritized',
      title: 'CSV bulk import',
      riceScore: 21.3,
      status: 'queued',
      owner: 'Dev Team B',
    },
  },
  {
    id: PRIO_3,
    columnId: 'prioritized',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'prioritized',
      title: 'Team collaboration spaces',
      riceScore: 15.0,
      status: 'queued',
    },
  },
]

const exampleConnections: Connection[] = [
  { id: 'ex-rice-c-1', fromCardId: IDEA_1, toCardId: SCORE_1 },
  { id: 'ex-rice-c-2', fromCardId: IDEA_2, toCardId: SCORE_3 },
  { id: 'ex-rice-c-3', fromCardId: IDEA_3, toCardId: SCORE_2 },
  { id: 'ex-rice-c-4', fromCardId: SCORE_1, toCardId: PRIO_1 },
  { id: 'ex-rice-c-5', fromCardId: SCORE_2, toCardId: PRIO_2 },
  { id: 'ex-rice-c-6', fromCardId: SCORE_3, toCardId: PRIO_3 },
]

const EXAMPLE_BOARD: BoardState = {
  templateId: 'rice',
  cycleName: 'Q2 2026 Prioritization',
  columnMeta: Object.fromEntries(
    riceTemplate.columns.map((c) => [
      c.id,
      { title: c.title, subtitle: c.subtitle },
    ]),
  ),
  cards: exampleCards,
  connections: exampleConnections,
}
