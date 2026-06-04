import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GistGoalCard } from '../gist/GoalCard'
import { GistIdeaCard } from '../gist/IdeaCard'
import { GistStepCard } from '../gist/StepCard'
import { GistTaskCard } from '../gist/TaskCard'
import type {
  GistGoalFields,
  GistIdeaFields,
  GistStepFields,
  GistTaskFields,
} from '@/lib/strategy/types'

const GOAL: GistGoalFields = {

  title: 'Reduce support tickets',
  measuredBy: 'Tickets per week',
  targetValue: '< 50',
  timeframe: 'Q4 2026',
}

const IDEA: GistIdeaFields = {

  title: 'Self-service knowledge base',
  description: 'User-facing FAQ and troubleshooting guides',
  confidence: 'high',
  impact: 'medium',
}

const STEP: GistStepFields = {

  title: 'Design KB information architecture',
  description: 'Map article categories to common ticket topics',
  status: 'in-progress',
  owner: 'UX team',
}

const TASK: GistTaskFields = {

  description: 'Write top 10 FAQ articles',
  done: false,
  owner: 'Content team',
}

describe('GIST GoalCard', () => {
  it('renders title, metric, target, and timeframe', () => {
    render(<GistGoalCard fields={GOAL} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Reduce support tickets')).toBeInTheDocument()
    expect(screen.getByText(/Tickets per week/)).toBeInTheDocument()
    expect(screen.getByText(/< 50/)).toBeInTheDocument()
    expect(screen.getByText('Q4 2026')).toBeInTheDocument()
  })

  it('renders edit form', () => {
    render(<GistGoalCard fields={GOAL} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Title')).toHaveValue('Reduce support tickets')
    expect(screen.getByLabelText('Timeframe')).toHaveValue('Q4 2026')
  })
})

describe('GIST IdeaCard', () => {
  it('renders title, description, confidence and impact badges', () => {
    render(<GistIdeaCard fields={IDEA} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Self-service knowledge base')).toBeInTheDocument()
    expect(screen.getByText('User-facing FAQ and troubleshooting guides')).toBeInTheDocument()
    expect(screen.getByText(/Confidence: high/)).toBeInTheDocument()
    expect(screen.getByText(/Impact: medium/)).toBeInTheDocument()
  })

  it('renders edit form with select dropdowns', () => {
    render(<GistIdeaCard fields={IDEA} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Confidence')).toHaveValue('high')
    expect(screen.getByLabelText('Impact')).toHaveValue('medium')
  })
})

describe('GIST StepCard', () => {
  it('renders title, description, status, and owner', () => {
    render(<GistStepCard fields={STEP} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Design KB information architecture')).toBeInTheDocument()
    expect(screen.getByText('Map article categories to common ticket topics')).toBeInTheDocument()
    expect(screen.getByText('in-progress')).toBeInTheDocument()
    expect(screen.getByText('UX team')).toBeInTheDocument()
  })

  it('renders edit form with status select', () => {
    render(<GistStepCard fields={STEP} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Status')).toHaveValue('in-progress')
  })
})

describe('GIST TaskCard', () => {
  it('renders description and checkbox', () => {
    render(
      <GistTaskCard fields={TASK} editing={false} onDraft={() => {}} />,
    )
    expect(screen.getByText('Write top 10 FAQ articles')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false')
  })

  it('renders owner badge', () => {
    render(
      <GistTaskCard fields={TASK} editing={false} onDraft={() => {}} />,
    )
    expect(screen.getByText('Content team')).toBeInTheDocument()
  })

  it('applies line-through when done', () => {
    const done: GistTaskFields = { ...TASK, done: true }
    render(
      <GistTaskCard fields={done} editing={false} onDraft={() => {}} />,
    )
    const desc = screen.getByText('Write top 10 FAQ articles')
    expect(desc.className).toMatch(/line-through/)
  })

  it('calls onToggleDone when checkbox clicked', () => {
    const onToggle = vi.fn()
    render(
      <GistTaskCard
        fields={TASK}
        editing={false}
        onDraft={() => {}}
        onToggleDone={onToggle}
      />,
    )
    screen.getByRole('checkbox').click()
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('renders edit form with description and done checkbox', () => {
    render(
      <GistTaskCard fields={TASK} editing={true} onDraft={() => {}} />,
    )
    expect(screen.getByLabelText('Description')).toHaveValue('Write top 10 FAQ articles')
    expect(screen.getByLabelText('Done')).not.toBeChecked()
  })
})
