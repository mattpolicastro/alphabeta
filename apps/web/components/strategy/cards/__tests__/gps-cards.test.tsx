import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GoalCard } from '../gps/GoalCard'
import { ProblemCard } from '../gps/ProblemCard'
import { SolutionCard } from '../gps/SolutionCard'
import type {
  GpsGoalFields,
  GpsProblemFields,
  GpsSolutionFields,
} from '@/lib/strategy/types'

const GOAL: GpsGoalFields = {
  columnId: 'gps-goals',
  title: 'Increase retention',
  successCriteria: '90% 30-day retention',
  measuredBy: 'Retention rate',
  targetValue: '90%',
}

const PROBLEM: GpsProblemFields = {
  columnId: 'gps-problems',
  title: 'High churn in month 2',
  description: 'Users drop off after initial onboarding',
  severity: 'critical',
  evidence: 'Cohort analysis shows 40% drop',
}

const SOLUTION: GpsSolutionFields = {
  columnId: 'solutions',
  title: 'Automated re-engagement emails',
  description: 'Drip campaign targeting inactive users',
  effort: 'medium',
  impact: 'high',
  status: 'in-progress',
}

describe('GPS GoalCard', () => {
  it('renders title, success criteria, metric, and target', () => {
    render(<GoalCard fields={GOAL} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Increase retention')).toBeInTheDocument()
    expect(screen.getByText('90% 30-day retention')).toBeInTheDocument()
    expect(screen.getByText('Retention rate')).toBeInTheDocument()
    expect(screen.getByText(/→ 90%/)).toBeInTheDocument()
  })

  it('renders edit form', () => {
    render(<GoalCard fields={GOAL} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Title')).toHaveValue('Increase retention')
    expect(screen.getByLabelText('Target value')).toHaveValue('90%')
  })
})

describe('GPS ProblemCard', () => {
  it('renders title, description, severity, and evidence', () => {
    render(<ProblemCard fields={PROBLEM} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('High churn in month 2')).toBeInTheDocument()
    expect(screen.getByText('Users drop off after initial onboarding')).toBeInTheDocument()
    expect(screen.getByText('critical')).toBeInTheDocument()
    expect(screen.getByText('Cohort analysis shows 40% drop')).toBeInTheDocument()
  })

  it('renders edit form with severity dropdown', () => {
    render(<ProblemCard fields={PROBLEM} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Title')).toHaveValue('High churn in month 2')
  })
})

describe('GPS SolutionCard', () => {
  it('renders title, description, effort, impact, and status', () => {
    render(<SolutionCard fields={SOLUTION} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Automated re-engagement emails')).toBeInTheDocument()
    expect(screen.getByText('Drip campaign targeting inactive users')).toBeInTheDocument()
    expect(screen.getByText(/Effort: medium/)).toBeInTheDocument()
    expect(screen.getByText(/Impact: high/)).toBeInTheDocument()
    expect(screen.getByText('in-progress')).toBeInTheDocument()
  })

  it('renders edit form', () => {
    render(<SolutionCard fields={SOLUTION} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Title')).toHaveValue('Automated re-engagement emails')
  })
})
