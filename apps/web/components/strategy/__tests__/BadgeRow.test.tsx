import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BadgeRow } from '../BadgeRow'

describe('BadgeRow', () => {
  it('renders nothing when all props are undefined', () => {
    const { container } = render(<BadgeRow />)
    expect(container.innerHTML).toBe('')
  })

  it('renders impact badge with correct text', () => {
    render(<BadgeRow impact="high" />)
    expect(screen.getByText('Impact high')).toBeInTheDocument()
  })

  it('renders confidence badge with correct text', () => {
    render(<BadgeRow confidence="medium" />)
    expect(screen.getByText('Confidence medium')).toBeInTheDocument()
  })

  it('renders effort badge with correct text', () => {
    render(<BadgeRow effort="XS" />)
    expect(screen.getByText('Effort XS')).toBeInTheDocument()
  })

  it('renders multiple badges when multiple props provided', () => {
    render(<BadgeRow impact="low" confidence="high" effort="L" />)
    expect(screen.getByText('Impact low')).toBeInTheDocument()
    expect(screen.getByText('Confidence high')).toBeInTheDocument()
    expect(screen.getByText('Effort L')).toBeInTheDocument()
  })
})
