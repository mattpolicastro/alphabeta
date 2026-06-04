import type { BoardState, Card, CardFields, Connection, ProblemState } from '@/lib/strategy/types'
import type { TemplateDefinition, CardComponentProps } from '@/lib/strategy/templates/types'
import { NorthStarCard } from '@/components/strategy/cards/NorthStarCard'
import { DriverCard } from '@/components/strategy/cards/DriverCard'
import { ProblemCard } from '@/components/strategy/cards/ProblemCard'
import { GoalCard } from '@/components/strategy/cards/GoalCard'
import { WorkCard } from '@/components/strategy/cards/WorkCard'

// ---------------------------------------------------------------------------
// Card component wrappers (adapt specific-field props to CardComponentProps)
// ---------------------------------------------------------------------------

function NsfNorthStarCard({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'northstar') return null
  return NorthStarCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'northstar' }),
  })
}

function NsfDriverCard({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'drivers') return null
  return DriverCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'drivers' }),
  })
}

function NsfProblemCard({ fields, editing, onDraft }: CardComponentProps) {
  if (fields.columnId !== 'problems') return null
  return ProblemCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'problems' }),
  })
}

function NsfGoalCard({
  fields,
  editing,
  onDraft,
  onToggleMilestone,
}: CardComponentProps) {
  if (fields.columnId !== 'goals') return null
  return GoalCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'goals' }),
    onToggleMilestone: editing ? undefined : onToggleMilestone,
  })
}

function NsfWorkCard({
  fields,
  editing,
  onDraft,
  onToggleDone,
}: CardComponentProps) {
  if (fields.columnId !== 'work') return null
  return WorkCard({
    fields,
    editing,
    onDraft: (f) => onDraft({ ...f, columnId: 'work' }),
    onToggleDone: editing ? undefined : onToggleDone,
  })
}

// ---------------------------------------------------------------------------
// Template definition
// ---------------------------------------------------------------------------

export const nsfTemplate: TemplateDefinition = {
  id: 'nsf',
  name: 'North Star Framework',
  shortName: 'NSF',
  description:
    'Visualize the causal chain from your North Star metric through drivers, problems, goals, and work items.',
  direction: 'rtl',
  columns: [
    {
      id: 'northstar',
      title: 'NORTH STAR',
      subtitle: 'because we want to achieve…',
      bgClass: 'bg-nsf-northstar',
      nextColumn: null,
      blankFields: (): CardFields => ({
        columnId: 'northstar',
        title: '',
        measuredBy: '',
        startValue: '',
        startDate: '',
        goalValue: '',
        goalDate: '',
      }),
      cardComponent: NsfNorthStarCard,
    },
    {
      id: 'drivers',
      title: 'PRODUCT DRIVERS',
      subtitle: 'we need to optimize…',
      bgClass: 'bg-nsf-drivers',
      nextColumn: 'northstar',
      blankFields: (): CardFields => ({
        columnId: 'drivers',
        title: '',
        measuredBy: '',
        startValue: '',
        goalValue: '',
      }),
      cardComponent: NsfDriverCard,
    },
    {
      id: 'problems',
      title: 'TOP PROBLEMS',
      subtitle: 'but we are held back by…',
      bgClass: 'bg-nsf-problems',
      nextColumn: 'drivers',
      blankFields: (): CardFields => ({
        columnId: 'problems',
        title: '',
        state: 'active',
      }),
      cardComponent: NsfProblemCard,
      filter: {
        label: 'Filter problems',
        options: [
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'prospect', label: 'Prospect' },
          { value: 'pool', label: 'Pool' },
        ],
        defaultValue: 'all',
        isVisible: (fields: CardFields, filterValue: string): boolean => {
          if (fields.columnId !== 'problems') return true
          if (filterValue === 'all') return true
          const state: ProblemState = fields.state ?? 'active'
          return state === filterValue
        },
      },
    },
    {
      id: 'goals',
      title: 'CURRENT GOALS',
      subtitle: 'so this cycle we aim to…',
      bgClass: 'bg-nsf-goals',
      nextColumn: 'problems',
      blankFields: (): CardFields => ({
        columnId: 'goals',
        title: '',
        measuredBy: '',
        mode: 'value',
        startValue: '',
        goalValue: '',
      }),
      cardComponent: NsfGoalCard,
    },
    {
      id: 'work',
      title: 'THE WORK',
      subtitle: 'by doing the following…',
      bgClass: 'bg-nsf-work',
      nextColumn: 'goals',
      blankFields: (): CardFields => ({
        columnId: 'work',
        description: '',
        done: false,
      }),
      cardComponent: NsfWorkCard,
    },
  ],
  exampleBoard: (): BoardState => EXAMPLE_BOARD,
}

// ---------------------------------------------------------------------------
// Example data (fintech scenario, 22 cards + 14 connections)
// ---------------------------------------------------------------------------

const NS_1 = 'ex-ns-1'
const DR_1 = 'ex-dr-1'
const DR_2 = 'ex-dr-2'
const DR_3 = 'ex-dr-3'
const DR_4 = 'ex-dr-4'
const DR_5 = 'ex-dr-5'
const PR_1 = 'ex-pr-1'
const PR_2 = 'ex-pr-2'
const PR_3 = 'ex-pr-3'
const PR_4 = 'ex-pr-4'
const PR_5 = 'ex-pr-5'
const PR_6 = 'ex-pr-6'
const GO_1 = 'ex-go-1'
const GO_2 = 'ex-go-2'
const WK_1 = 'ex-wk-1'
const WK_2 = 'ex-wk-2'
const WK_3 = 'ex-wk-3'
const WK_4 = 'ex-wk-4'
const WK_5 = 'ex-wk-5'
const WK_6 = 'ex-wk-6'
const WK_7 = 'ex-wk-7'
const WK_8 = 'ex-wk-8'

const exampleCards: Card[] = [
  {
    id: NS_1,
    columnId: 'northstar',
    saved: true,
    collapsed: false,
    fields: {
      columnId: 'northstar',
      title: 'A leading player challenging the major banks',
      measuredBy: 'number of active personal loans and investment customers',
      startValue: '5000',
      startDate: '2025-11-21',
      goalValue: '10000',
      goalDate: '2026-12-31',
      hypothesis:
        'Traditional banks are slow to innovate on personal finance. By combining frictionless digital lending with smart investment tools, we can capture the underserved segment of tech-savvy customers aged 25-45 who want a modern alternative.',
      expectedImpact: 'high',
      confidence: 'high',
      effort: 'XL',
      planningNotes:
        'Doubling active customers in ~13 months is aggressive but achievable if we execute on cross-sell (existing base) and conversion (new signups) simultaneously. Key risk: regulatory changes in consumer lending.',
    },
  },
  { id: DR_1, columnId: 'drivers', saved: true, collapsed: false, fields: { columnId: 'drivers', title: 'Increase adoption of loan and investment products among existing customers', measuredBy: 'Share of customers who have both a loan and an investment portfolio', startValue: '5%', goalValue: '15%', hypothesis: 'Most customers use only one product (loan OR investment). Cross-sell potential is massive — our data shows loan customers have disposable income patterns that match investment profiles. Bridging this gap triples lifetime value per customer.', expectedImpact: 'high', confidence: 'medium', effort: 'L', planningNotes: "Two angles: (1) educate loan customers about investing through targeted campaigns, (2) simplify the investment onboarding so the barrier to 'try it' is near zero." } },
  { id: DR_2, columnId: 'drivers', saved: true, collapsed: false, fields: { columnId: 'drivers', title: 'Launch new automated features that lower the threshold to become a paying customer', measuredBy: 'conversion rate from non-paying to paying users', startValue: '30%', goalValue: '80%', hypothesis: "Non-paying users churn because the value of paid features isn't demonstrated early enough. Automating one high-value action (e.g., auto-round-up savings) as a 30-day free trial would show tangible value before asking for payment.", expectedImpact: 'high', confidence: 'high', effort: 'M' } },
  { id: DR_3, columnId: 'drivers', saved: true, collapsed: false, fields: { columnId: 'drivers', title: 'Reduce the number of non-paying and unprofitable customers', measuredBy: 'percentage of inactive or unprofitable accounts per quarter', startValue: '70%', goalValue: '10%', expectedImpact: 'medium', confidence: 'high', effort: 'M' } },
  { id: DR_4, columnId: 'drivers', saved: true, collapsed: false, fields: { columnId: 'drivers', title: 'Grow the number of new customers coming in through referrals', measuredBy: 'percentage of new signups attributed to referral', startValue: '5%', goalValue: '25%', hypothesis: 'Customers who join via referral have 3x higher LTV and 40% lower churn than paid acquisition channels. A structured referral program with meaningful incentives (not discounts — premium feature access) would accelerate organic growth.', expectedImpact: 'medium', confidence: 'medium', effort: 'S' } },
  { id: DR_5, columnId: 'drivers', saved: true, collapsed: false, fields: { columnId: 'drivers', title: 'Reduce churn of paying customers', measuredBy: 'monthly churn rate of paying customers', startValue: '8%', goalValue: '3%', expectedImpact: 'high', confidence: 'medium', effort: 'L' } },
  { id: PR_1, columnId: 'problems', saved: true, collapsed: false, fields: { columnId: 'problems', title: 'Loan customers are not engaging with our investment offering', hypothesis: "Loan customers see our app as a 'loan app', not a financial platform. They don't explore investment features because there's no contextual bridge from loan management to investing. Making the connection visible and reducing friction would unlock the cross-sell.", expectedImpact: 'high', confidence: 'high', effort: 'M', planningNotes: 'Two goals active this cycle: (1) email campaign to drive awareness, (2) app redesign to make investment offering visible.', state: 'active' } },
  { id: PR_2, columnId: 'problems', saved: true, collapsed: false, fields: { columnId: 'problems', title: "Customers don't understand the relationship between their loan repayments and investment potential", hypothesis: 'If we show customers how much they could earn by investing a fraction of their disposable income alongside their loan payments, conversion to investment products would increase significantly.', expectedImpact: 'medium', confidence: 'medium', effort: 'M', planningNotes: 'Could be a simple calculator or simulation tool in the app.', state: 'pool' } },
  { id: PR_3, columnId: 'problems', saved: true, collapsed: false, fields: { columnId: 'problems', title: 'Our investment onboarding requires too many steps and scares off first-time investors', hypothesis: 'Reducing the investment onboarding from 12 steps to 4 (with smart defaults) would triple the completion rate.', expectedImpact: 'high', confidence: 'high', effort: 'M', planningNotes: 'Analytics show 68% drop-off at step 5 (risk profiling). Simplify with a 3-question risk assessment.', state: 'prospect' } },
  { id: PR_4, columnId: 'problems', saved: true, collapsed: false, fields: { columnId: 'problems', title: 'Non-paying users have no clear trigger point that motivates them to try a paid feature', hypothesis: "A contextual 'try this for free' prompt at the moment a user would benefit from a paid feature could double trial activations.", expectedImpact: 'medium', confidence: 'medium', effort: 'S', state: 'pool' } },
  { id: PR_5, columnId: 'problems', saved: true, collapsed: false, fields: { columnId: 'problems', title: 'The automated savings feature has a 60% churn rate after 3 months because users forget why they set it up', hypothesis: 'Adding periodic progress summaries and milestone celebrations would reduce churn by reminding users of the value they\u2019re getting.', planningNotes: 'Quick win — push notification + in-app card showing savings progress.', expectedImpact: 'high', confidence: 'high', effort: 'S', state: 'prospect' } },
  { id: PR_6, columnId: 'problems', saved: true, collapsed: false, fields: { columnId: 'problems', title: 'We lack a systematic way to identify which inactive accounts have re-engagement potential vs. which should be sunset', hypothesis: 'A scoring model based on past activity patterns, account age, and engagement signals could help us focus re-engagement efforts on the 30% of inactive accounts most likely to convert.', planningNotes: "Needs data science involvement. Define 'inactive' precisely — no login in 90 days? No transaction in 60 days?", expectedImpact: 'medium', confidence: 'low', effort: 'L', state: 'pool' } },
  { id: GO_1, columnId: 'goals', saved: true, collapsed: false, fields: { columnId: 'goals', title: 'Send an email campaign to customers who only have a loan', measuredBy: 'Recipients who log into the app within 7 days after email', mode: 'value', startValue: '30%', goalValue: '80%', department: 'Marketing', statusUpdate: 'One week into the cycle we have created the 3 different emails and sent the A/B test to 100 customers, but not yet analyzed the results.', statusUpdateDate: '2025-11-28' } },
  { id: GO_2, columnId: 'goals', saved: true, collapsed: false, fields: { columnId: 'goals', title: 'Rearrange information panels so our offering becomes clearer', measuredBy: '', mode: 'milestones', department: 'Product', team: 'Team Welcome Aboard', statusUpdate: 'After the first week we have created the mock-ups and are about to start testing them on Monday.', statusUpdateDate: '2025-11-28', milestones: [{ id: 'm1', label: 'Create mock-ups', done: true }, { id: 'm2', label: 'Test on internal staff', done: false }, { id: 'm3', label: 'Develop new tree structure', done: false }, { id: 'm4', label: 'Smooth transitions', done: false }] } },
  { id: WK_1, columnId: 'work', saved: true, collapsed: false, fields: { columnId: 'work', description: 'Identify customers who only have a loan and who have not logged into the app in the last 90 days', done: false } },
  { id: WK_2, columnId: 'work', saved: true, collapsed: false, fields: { columnId: 'work', description: 'A/B test 3 versions of the email on 100 customers within 2 weeks', done: false, statusUpdate: 'So close to done! The emails are ready and sent out to the test group, waiting for results now.', statusUpdateDate: '2025-11-28' } },
  { id: WK_3, columnId: 'work', saved: true, collapsed: false, fields: { columnId: 'work', description: 'Send the best-performing email to all identified customers', done: false } },
  { id: WK_8, columnId: 'work', saved: true, collapsed: false, fields: { columnId: 'work', description: 'Update the analytics dashboard to track both email opens and app panel engagement', done: false } },
  { id: WK_4, columnId: 'work', saved: true, collapsed: false, fields: { columnId: 'work', description: 'Create mock-ups with 3 different versions of the info menu', done: true, statusUpdate: 'Yay! Mock-ups are ready and tested with 5 internal users.', statusUpdateDate: '2025-11-28' } },
  { id: WK_5, columnId: 'work', saved: true, collapsed: false, fields: { columnId: 'work', description: 'Test mock-ups on internal staff', done: false } },
  { id: WK_6, columnId: 'work', saved: true, collapsed: false, fields: { columnId: 'work', description: 'Develop a new tree structure in the menu', done: false } },
  { id: WK_7, columnId: 'work', saved: true, collapsed: false, fields: { columnId: 'work', description: 'Make transitions in the tree structure more "smooth"', done: false } },
]

// RTL connections: from (right) → to (left). Work items originate
// connections that build toward the North Star.
const exampleConnections: Connection[] = [
  { id: 'ex-c-1', fromCardId: DR_1, toCardId: NS_1 },
  { id: 'ex-c-2', fromCardId: DR_2, toCardId: NS_1 },
  { id: 'ex-c-3', fromCardId: PR_1, toCardId: DR_1 },
  { id: 'ex-c-4', fromCardId: GO_1, toCardId: PR_1 },
  { id: 'ex-c-5', fromCardId: GO_2, toCardId: PR_1 },
  { id: 'ex-c-6', fromCardId: WK_1, toCardId: GO_1 },
  { id: 'ex-c-7', fromCardId: WK_2, toCardId: GO_1 },
  { id: 'ex-c-8', fromCardId: WK_3, toCardId: GO_1 },
  { id: 'ex-c-9', fromCardId: WK_4, toCardId: GO_2 },
  { id: 'ex-c-10', fromCardId: WK_5, toCardId: GO_2 },
  { id: 'ex-c-11', fromCardId: WK_6, toCardId: GO_2 },
  { id: 'ex-c-12', fromCardId: WK_7, toCardId: GO_2 },
  { id: 'ex-c-13', fromCardId: WK_8, toCardId: GO_1 },
  { id: 'ex-c-14', fromCardId: WK_8, toCardId: GO_2 },
]

const DEFAULT_CYCLE_NAME = 'Current cycle'

const EXAMPLE_BOARD: BoardState = {
  templateId: 'nsf',
  cycleName: DEFAULT_CYCLE_NAME,
  columnMeta: Object.fromEntries(
    nsfTemplate.columns.map((c) => [c.id, { title: c.title, subtitle: c.subtitle }]),
  ),
  cards: exampleCards,
  connections: exampleConnections,
}
