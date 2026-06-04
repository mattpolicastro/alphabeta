import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EvidenceBar } from '../EvidenceBar'

describe('EvidenceBar', () => {
  it('renders the header label', () => {
    render(<EvidenceBar segments={['contra', null, null, null, 'support']} />)
    expect(
      screen.getByText(/evidence bar/i),
    ).toBeInTheDocument()
  })

  it('renders scale labels', () => {
    render(<EvidenceBar segments={[null, null, null, null, null]} />)
    expect(screen.getByText('strongly contradicts')).toBeInTheDocument()
    expect(screen.getByText('neutral')).toBeInTheDocument()
    expect(screen.getByText('strongly supports')).toBeInTheDocument()
  })

  it('renders the correct number of segments', () => {
    const { container } = render(
      <EvidenceBar segments={['contra', 'contra', 'neutral', null, null]} />,
    )
    const segments = container.querySelectorAll('.flex.h-2\\.5 > div')
    expect(segments).toHaveLength(5)
  })

  it('applies contra color to lit contra segments', () => {
    const { container } = render(
      <EvidenceBar segments={['contra', null, null, null, null]} />,
    )
    const firstSeg = container.querySelectorAll('.flex.h-2\\.5 > div')[0]
    expect(firstSeg.className).toContain('bg-terra')
  })

  it('renders empty segments without color', () => {
    const { container } = render(
      <EvidenceBar segments={[null, null, null, null, null]} />,
    )
    const firstSeg = container.querySelectorAll('.flex.h-2\\.5 > div')[0]
    expect(firstSeg.className).toContain('bg-transparent')
  })

  it('renders summary text when provided', () => {
    render(
      <EvidenceBar
        segments={['contra', 'contra', 'neutral', null, null]}
        summary="Evidence leans against the hypothesis."
      />,
    )
    expect(
      screen.getByText('Evidence leans against the hypothesis.'),
    ).toBeInTheDocument()
  })

  it('omits summary when not provided', () => {
    const { container } = render(
      <EvidenceBar segments={[null, null, null, null, null]} />,
    )
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(0)
  })
})
