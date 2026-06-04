import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricChips } from '../MetricChips'

describe('MetricChips', () => {
  it('renders START label', () => {
    render(<MetricChips startValue="10" goalValue="50" />)
    expect(screen.getByText('START')).toBeInTheDocument()
  })

  it('renders GOAL label', () => {
    render(<MetricChips startValue="10" goalValue="50" />)
    expect(screen.getByText('GOAL')).toBeInTheDocument()
  })

  it('renders start value', () => {
    render(<MetricChips startValue="10" goalValue="50" />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders goal value', () => {
    render(<MetricChips startValue="10" goalValue="50" />)
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('shows em dash for empty start value', () => {
    render(<MetricChips startValue="" goalValue="50" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows em dash for empty goal value', () => {
    render(<MetricChips startValue="10" goalValue="" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders arrow indicator', () => {
    render(<MetricChips startValue="10" goalValue="50" />)
    expect(screen.getByText('→')).toBeInTheDocument()
  })

  it('renders dates when provided', () => {
    render(
      <MetricChips
        startValue="10"
        goalValue="50"
        startDate="Jan 1"
        goalDate="Dec 31"
      />,
    )
    expect(screen.getByText('Jan 1')).toBeInTheDocument()
    expect(screen.getByText('Dec 31')).toBeInTheDocument()
  })

  it('omits dates when not provided', () => {
    render(<MetricChips startValue="10" goalValue="50" />)
    expect(screen.queryByText('Jan 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Dec 31')).not.toBeInTheDocument()
  })
})
