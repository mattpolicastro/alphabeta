import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MilestoneBar } from '../MilestoneBar'
import type { Milestone } from '@/lib/strategy/types'

const milestones: Milestone[] = [
  { id: '1', label: 'Alpha', done: true },
  { id: '2', label: 'Beta', done: true },
  { id: '3', label: 'GA', done: false },
]

describe('MilestoneBar', () => {
  it('renders done/total count', () => {
    render(<MilestoneBar milestones={milestones} />)
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('progressbar has correct aria values', () => {
    render(<MilestoneBar milestones={milestones} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '3')
    expect(bar).toHaveAttribute('aria-valuenow', '2')
  })

  it('each milestone segment has aria-label with status', () => {
    render(<MilestoneBar milestones={milestones} />)
    expect(screen.getByLabelText('Alpha (done)')).toBeInTheDocument()
    expect(screen.getByLabelText('Beta (done)')).toBeInTheDocument()
    expect(screen.getByLabelText('GA (not done)')).toBeInTheDocument()
  })

  it('editable mode renders checkboxes', () => {
    render(<MilestoneBar milestones={milestones} editable />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('checkbox onChange calls onToggle with milestone id', () => {
    const onToggle = vi.fn()
    render(
      <MilestoneBar milestones={milestones} editable onToggle={onToggle} />,
    )
    fireEvent.click(screen.getByLabelText('Toggle GA'))
    expect(onToggle).toHaveBeenCalledWith('3')
  })

  it('done milestone shows line-through text', () => {
    render(<MilestoneBar milestones={milestones} editable />)
    const alphaLabel = screen.getByText('Alpha')
    expect(alphaLabel).toHaveClass('line-through')
  })

  it('non-editable mode omits checkboxes', () => {
    render(<MilestoneBar milestones={milestones} />)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})
