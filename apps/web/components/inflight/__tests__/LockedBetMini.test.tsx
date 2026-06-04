import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LockedBetMini } from '../LockedBetMini'

describe('LockedBetMini', () => {
  it('renders the locked bet label', () => {
    render(
      <LockedBetMini title="A/B test emails" foldIf="+4%" metric="7-day login" />,
    )
    expect(screen.getByText(/locked bet/i)).toBeInTheDocument()
  })

  it('renders the title in terra styling', () => {
    render(
      <LockedBetMini title="A/B test emails" foldIf="+4%" metric="7-day login" />,
    )
    expect(screen.getByText('A/B test emails')).toBeInTheDocument()
  })

  it('renders the fold-if value', () => {
    render(
      <LockedBetMini title="A/B test emails" foldIf="+4%" metric="7-day login" />,
    )
    expect(screen.getByText('+4%')).toBeInTheDocument()
  })

  it('renders the metric', () => {
    render(
      <LockedBetMini title="A/B test emails" foldIf="+4%" metric="7-day login" />,
    )
    expect(screen.getByText(/7-day login/)).toBeInTheDocument()
  })

  it('renders lockedAgo when provided', () => {
    render(
      <LockedBetMini
        title="A/B test emails"
        foldIf="+4%"
        metric="7-day login"
        lockedAgo="18 days ago"
      />,
    )
    expect(screen.getByText(/locked 18 days ago/)).toBeInTheDocument()
  })

  it('omits lockedAgo text when not provided', () => {
    const { container } = render(
      <LockedBetMini title="A/B test emails" foldIf="+4%" metric="7-day login" />,
    )
    expect(container.textContent).not.toContain('days ago')
  })

  it('renders extra content when provided', () => {
    render(
      <LockedBetMini
        title="A/B test emails"
        foldIf="+4%"
        metric="7-day login"
        extra={<span> · runtime complete</span>}
      />,
    )
    expect(screen.getByText(/runtime complete/)).toBeInTheDocument()
  })
})
