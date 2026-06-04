import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Expandable } from '../Expandable'

describe('Expandable', () => {
  it('renders label button', () => {
    render(<Expandable label="Details">content</Expandable>)
    expect(
      screen.getByRole('button', { name: /Details/ }),
    ).toBeInTheDocument()
  })

  it('children hidden by default', () => {
    render(<Expandable label="Details">secret content</Expandable>)
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
  })

  it('clicking button shows children', () => {
    render(<Expandable label="Details">secret content</Expandable>)
    fireEvent.click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('secret content')).toBeInTheDocument()
  })

  it('clicking again hides children', () => {
    render(<Expandable label="Details">secret content</Expandable>)
    const btn = screen.getByRole('button', { name: /Details/ })
    fireEvent.click(btn)
    expect(screen.getByText('secret content')).toBeInTheDocument()
    fireEvent.click(btn)
    expect(screen.queryByText('secret content')).not.toBeInTheDocument()
  })

  it('initialOpen=true shows children immediately', () => {
    render(
      <Expandable label="Details" initialOpen>
        visible content
      </Expandable>,
    )
    expect(screen.getByText('visible content')).toBeInTheDocument()
  })

  it('button has correct aria-expanded value', () => {
    render(<Expandable label="Details">content</Expandable>)
    const btn = screen.getByRole('button', { name: /Details/ })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })
})
