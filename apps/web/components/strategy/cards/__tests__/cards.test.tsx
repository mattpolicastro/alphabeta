import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithBoard } from '@/lib/strategy/test-utils'
import { NorthStarCard } from '../NorthStarCard'
import { DriverCard } from '../DriverCard'
import { ProblemCard } from '../ProblemCard'
import { GoalCard } from '../GoalCard'
import { WorkCard } from '../WorkCard'
import type {
  DriverFields,
  GoalFields,
  NorthStarFields,
  ProblemFields,
  WorkFields,
} from '@/lib/strategy/types'

const NS: NorthStarFields = {
  title: 'The Vision',
  measuredBy: 'MAU',
  startValue: '1K',
  startDate: '2025-01-01',
  goalValue: '10K',
  goalDate: '2025-12-31',
  hypothesis: 'If we do X then Y',
  planningNotes: 'careful with Z',
  expectedImpact: 'high',
  confidence: 'medium',
  effort: 'L',
}

const DR: DriverFields = {
  title: 'The Driver',
  measuredBy: 'Conversion',
  startValue: '5%',
  goalValue: '20%',
  hypothesis: 'Because funnel',
  expectedImpact: 'high',
  confidence: 'medium',
  effort: 'M',
}

const PR: ProblemFields = {
  title: 'The Problem',
  state: 'prospect',
  hypothesis: 'Root cause',
  expectedImpact: 'medium',
  confidence: 'high',
  effort: 'S',
}

const GO_VALUE: GoalFields = {
  title: 'Value Goal',
  measuredBy: 'Signups',
  mode: 'value',
  startValue: '10',
  goalValue: '100',
  department: 'Growth',
  team: 'Acquisition',
  statusUpdate: 'tracking well',
  statusUpdateDate: '2025-11-28',
}

const GO_MILES: GoalFields = {
  title: 'Milestone Goal',
  measuredBy: '',
  mode: 'milestones',
  milestones: [
    { id: 'm1', label: 'Design', done: true },
    { id: 'm2', label: 'Build', done: false },
  ],
}

const WK: WorkFields = {
  description: 'Do the thing',
  done: false,
  statusUpdate: 'In progress',
  statusUpdateDate: '2025-11-28',
}

describe('NorthStarCard display', () => {
  it('renders title, metric, chips, badges, expandables', async () => {
    const user = userEvent.setup()
    renderWithBoard(
      <NorthStarCard fields={NS} editing={false} onDraft={() => {}} />,
    )
    expect(screen.getByRole('heading').textContent).toBe('The Vision')
    expect(screen.getByText(/Metric:/).parentElement).toHaveTextContent('MAU')
    expect(screen.getByText('1K')).toBeInTheDocument()
    expect(screen.getByText('10K')).toBeInTheDocument()
    expect(screen.getByText(/Impact high/i)).toBeInTheDocument()
    expect(screen.getByText(/Confidence medium/i)).toBeInTheDocument()
    expect(screen.getByText(/Effort L/i)).toBeInTheDocument()
    // Expandable hypothesis is initially collapsed
    expect(screen.queryByText(/If we do X/)).toBeNull()
    await user.click(screen.getByRole('button', { name: /Hypothesis/i }))
    expect(screen.getByText(/If we do X/)).toBeInTheDocument()
  })

  it('renders edit form when editing=true', () => {
    const onDraft = vi.fn()
    renderWithBoard(
      <NorthStarCard fields={NS} editing={true} onDraft={onDraft} />,
    )
    expect(screen.getByLabelText('Title')).toHaveValue('The Vision')
    expect(screen.getByLabelText('Start value')).toHaveValue('1K')
    expect(screen.getByLabelText('Goal date')).toHaveValue('2025-12-31')
  })
})

describe('DriverCard', () => {
  it('renders without dates in chips (spec)', () => {
    renderWithBoard(<DriverCard fields={DR} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('The Driver')).toBeInTheDocument()
    // Driver chips: value only, no start/goal date strings
    expect(screen.getByText('5%')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.queryByText(/2025-/)).toBeNull()
  })

  it('renders edit form with only value (no date) inputs', () => {
    renderWithBoard(
      <DriverCard fields={DR} editing={true} onDraft={() => {}} />,
    )
    expect(screen.getByLabelText('Start value')).toBeInTheDocument()
    expect(screen.queryByLabelText('Start date')).toBeNull()
  })
})

describe('ProblemCard', () => {
  it('renders state badge with proper label', () => {
    renderWithBoard(
      <ProblemCard fields={PR} editing={false} onDraft={() => {}} />,
    )
    expect(screen.getByText(/The Problem/)).toBeInTheDocument()
    expect(screen.getByText('Prospect')).toBeInTheDocument()
  })

  it('defaults to Active when state is omitted', () => {
    renderWithBoard(
      <ProblemCard
        fields={{ title: 'No state' }}
        editing={false}
        onDraft={() => {}}
      />,
    )
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('edit mode exposes a state dropdown', () => {
    renderWithBoard(
      <ProblemCard fields={PR} editing={true} onDraft={() => {}} />,
    )
    expect(screen.getByLabelText('Problem state')).toHaveValue('prospect')
  })
})

describe('GoalCard', () => {
  it('renders value chips when mode=value', () => {
    renderWithBoard(
      <GoalCard fields={GO_VALUE} editing={false} onDraft={() => {}} />,
    )
    expect(screen.getByText('Value Goal')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('Growth')).toBeInTheDocument()
    expect(screen.getByText('Acquisition')).toBeInTheDocument()
    expect(screen.getByText('tracking well')).toBeInTheDocument()
  })

  it('renders milestone bar when mode=milestones', () => {
    renderWithBoard(
      <GoalCard fields={GO_MILES} editing={false} onDraft={() => {}} />,
    )
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '1')
    expect(bar).toHaveAttribute('aria-valuemax', '2')
  })

  it('edit form toggles between value and milestones mode', async () => {
    const user = userEvent.setup()
    let fields: GoalFields = GO_VALUE
    const onDraft = vi.fn((next: GoalFields) => {
      fields = next
    })
    const { rerender } = renderWithBoard(
      <GoalCard fields={fields} editing={true} onDraft={onDraft} />,
    )
    await user.selectOptions(screen.getByLabelText('Goal mode'), 'milestones')
    expect(onDraft).toHaveBeenCalled()
    rerender(<GoalCard fields={fields} editing={true} onDraft={onDraft} />)
    expect(
      screen.getByRole('button', { name: /Milestone/ }),
    ).toBeInTheDocument()
  })
})

describe('WorkCard', () => {
  it('renders checkbox + description + status update', () => {
    renderWithBoard(
      <WorkCard fields={WK} editing={false} onDraft={() => {}} />,
    )
    const checkbox = screen.getByRole('checkbox', { name: /Mark/ })
    expect(checkbox).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Do the thing')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('applies strikethrough when done', () => {
    renderWithBoard(
      <WorkCard
        fields={{ ...WK, done: true }}
        editing={false}
        onDraft={() => {}}
      />,
    )
    const para = screen.getByText('Do the thing')
    expect(para.className).toMatch(/line-through/)
  })

  it('calls onToggleDone when checkbox clicked', async () => {
    const user = userEvent.setup()
    const onToggleDone = vi.fn()
    renderWithBoard(
      <WorkCard
        fields={WK}
        editing={false}
        onDraft={() => {}}
        onToggleDone={onToggleDone}
      />,
    )
    await user.click(screen.getByRole('checkbox', { name: /Mark/ }))
    expect(onToggleDone).toHaveBeenCalledTimes(1)
  })
})
