import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IdeaCard } from '../rice/IdeaCard'
import { ScoringCard } from '../rice/ScoringCard'
import { PrioritizedCard } from '../rice/PrioritizedCard'
import type {
  RiceIdeaFields,
  RiceScoringFields,
  RicePrioritizedFields,
} from '@/lib/strategy/types'

const IDEA: RiceIdeaFields = {
  columnId: 'ideas',
  title: 'Onboarding checklist',
  description: 'Guide new users',
  category: 'Activation',
}

const SCORING: RiceScoringFields = {
  columnId: 'scoring',
  title: 'Onboarding checklist',
  reach: 80,
  impact: 2,
  confidence: 90,
  effort: 2,
}

const PRIO: RicePrioritizedFields = {
  columnId: 'prioritized',
  title: 'Onboarding checklist',
  riceScore: 72.0,
  status: 'in-progress',
  owner: 'Sarah K.',
}

describe('RICE IdeaCard', () => {
  it('renders title, description, and category badge', () => {
    render(<IdeaCard fields={IDEA} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Onboarding checklist')).toBeInTheDocument()
    expect(screen.getByText('Guide new users')).toBeInTheDocument()
    expect(screen.getByText('Activation')).toBeInTheDocument()
  })

  it('renders edit form when editing', () => {
    render(<IdeaCard fields={IDEA} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Title')).toHaveValue('Onboarding checklist')
    expect(screen.getByLabelText('Category')).toHaveValue('Activation')
  })
})

describe('RICE ScoringCard', () => {
  it('renders RICE dimensions and computed score', () => {
    render(<ScoringCard fields={SCORING} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Onboarding checklist')).toBeInTheDocument()
    expect(screen.getByText(/Reach: 80/)).toBeInTheDocument()
    expect(screen.getByText(/Impact: 2/)).toBeInTheDocument()
    expect(screen.getByText(/Confidence: 90/)).toBeInTheDocument()
    expect(screen.getByText(/Effort: 2/)).toBeInTheDocument()
    expect(screen.getByText(/RICE Score: 72.0/)).toBeInTheDocument()
  })

  it('shows dash for missing values', () => {
    const empty: RiceScoringFields = { columnId: 'scoring', title: 'X' }
    render(<ScoringCard fields={empty} editing={false} onDraft={() => {}} />)
    expect(screen.getByText(/Reach: —/)).toBeInTheDocument()
  })
})

describe('RICE PrioritizedCard', () => {
  it('renders score badge, status, and owner', () => {
    render(<PrioritizedCard fields={PRIO} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Onboarding checklist')).toBeInTheDocument()
    expect(screen.getByText('RICE: 72')).toBeInTheDocument()
    expect(screen.getByText('in-progress')).toBeInTheDocument()
    expect(screen.getByText(/Sarah K/)).toBeInTheDocument()
  })

  it('renders edit form with status dropdown', () => {
    render(<PrioritizedCard fields={PRIO} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Owner')).toHaveValue('Sarah K.')
  })
})
