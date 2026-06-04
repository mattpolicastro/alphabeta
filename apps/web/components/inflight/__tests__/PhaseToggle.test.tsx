import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhaseToggle } from '../PhaseToggle'

const phases = [
  { id: 'flight', label: '4a · In-flight' },
  { id: 'results', label: '4b · Results' },
]

describe('PhaseToggle', () => {
  it('renders all phase labels', () => {
    render(<PhaseToggle phases={phases} activeId="flight" onChange={() => {}} />)
    expect(screen.getByText('4a · In-flight')).toBeInTheDocument()
    expect(screen.getByText('4b · Results')).toBeInTheDocument()
  })

  it('applies active styling to the current phase', () => {
    render(<PhaseToggle phases={phases} activeId="flight" onChange={() => {}} />)
    const activeBtn = screen.getByText('4a · In-flight')
    expect(activeBtn.className).toContain('bg-terra')
  })

  it('does not apply active styling to inactive phases', () => {
    render(<PhaseToggle phases={phases} activeId="flight" onChange={() => {}} />)
    const inactiveBtn = screen.getByText('4b · Results')
    expect(inactiveBtn.className).toContain('bg-transparent')
    expect(inactiveBtn.className).not.toContain('font-bold')
  })

  it('calls onChange with the phase id on click', () => {
    const onChange = vi.fn()
    render(<PhaseToggle phases={phases} activeId="flight" onChange={onChange} />)
    fireEvent.click(screen.getByText('4b · Results'))
    expect(onChange).toHaveBeenCalledWith('results')
  })

  it('renders three phases correctly', () => {
    const threePhases = [
      { id: 'a', label: 'Phase A' },
      { id: 'b', label: 'Phase B' },
      { id: 'c', label: 'Phase C' },
    ]
    render(<PhaseToggle phases={threePhases} activeId="b" onChange={() => {}} />)
    expect(screen.getByText('Phase A').className).toContain('bg-transparent')
    expect(screen.getByText('Phase B').className).toContain('bg-terra')
    expect(screen.getByText('Phase C').className).toContain('bg-transparent')
  })
})
