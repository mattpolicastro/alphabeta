import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ObjectiveCard } from '../okr/ObjectiveCard'
import { KeyResultCard } from '../okr/KeyResultCard'
import { InitiativeCard } from '../okr/InitiativeCard'
import type {
  OkrObjectiveFields,
  OkrKeyResultFields,
  OkrInitiativeFields,
} from '@/lib/strategy/types'

const OBJECTIVE: OkrObjectiveFields = {

  title: 'Expand to APAC market',
  description: 'Enter three APAC markets by Q3',
  timeframe: 'Q3 2026',
  owner: 'VP International',
}

const KEY_RESULT: OkrKeyResultFields = {

  title: '100 paying customers in Japan',
  measuredBy: 'Customer count',
  startValue: '0',
  currentValue: '34',
  targetValue: '100',
  owner: 'APAC Sales',
}

const INITIATIVE: OkrInitiativeFields = {

  title: 'Localize marketing site',
  description: 'Translate and launch JP/KR/AU versions',
  status: 'in-progress',
  owner: 'Marketing',
}

describe('OKR ObjectiveCard', () => {
  it('renders title, description, timeframe, and owner', () => {
    render(<ObjectiveCard fields={OBJECTIVE} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Expand to APAC market')).toBeInTheDocument()
    expect(screen.getByText('Enter three APAC markets by Q3')).toBeInTheDocument()
    expect(screen.getByText('Q3 2026')).toBeInTheDocument()
    expect(screen.getByText('VP International')).toBeInTheDocument()
  })

  it('renders edit form', () => {
    render(<ObjectiveCard fields={OBJECTIVE} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Title')).toHaveValue('Expand to APAC market')
    expect(screen.getByLabelText('Timeframe')).toHaveValue('Q3 2026')
  })
})

describe('OKR KeyResultCard', () => {
  it('renders title, metric, progress arrow, and owner', () => {
    render(<KeyResultCard fields={KEY_RESULT} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('100 paying customers in Japan')).toBeInTheDocument()
    expect(screen.getByText(/Customer count/)).toBeInTheDocument()
    const progressText = screen.getByText(/0 → 34 → 100/)
    expect(progressText).toBeInTheDocument()
    expect(screen.getByText('APAC Sales')).toBeInTheDocument()
  })

  it('renders edit form with all value inputs', () => {
    render(<KeyResultCard fields={KEY_RESULT} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Start value')).toHaveValue('0')
    expect(screen.getByLabelText('Current value')).toHaveValue('34')
    expect(screen.getByLabelText('Target value')).toHaveValue('100')
  })
})

describe('OKR InitiativeCard', () => {
  it('renders title, description, status badge, and owner', () => {
    render(<InitiativeCard fields={INITIATIVE} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('Localize marketing site')).toBeInTheDocument()
    expect(screen.getByText('Translate and launch JP/KR/AU versions')).toBeInTheDocument()
    expect(screen.getByText('in-progress')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
  })

  it('defaults to not-started when status omitted', () => {
    const noStatus: OkrInitiativeFields = {
    
      title: 'No status',
    }
    render(<InitiativeCard fields={noStatus} editing={false} onDraft={() => {}} />)
    expect(screen.getByText('not-started')).toBeInTheDocument()
  })

  it('renders edit form with status dropdown', () => {
    render(<InitiativeCard fields={INITIATIVE} editing={true} onDraft={() => {}} />)
    expect(screen.getByLabelText('Status')).toHaveValue('in-progress')
  })
})
