import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InlineEdit } from '../InlineEdit'

describe('InlineEdit', () => {
  it('renders value as display text', () => {
    render(<InlineEdit value="Hello" onCommit={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveTextContent('Hello')
  })

  it('shows placeholder when value is empty', () => {
    render(
      <InlineEdit value="" onCommit={vi.fn()} placeholder="Type here" />,
    )
    const span = screen.getByRole('button')
    expect(span).toHaveTextContent('Type here')
    expect(span).toHaveClass('italic')
  })

  it('clicking enters edit mode (input appears)', () => {
    render(<InlineEdit value="Hello" onCommit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('pressing Enter on display span enters edit mode', () => {
    render(<InlineEdit value="Hello" onCommit={vi.fn()} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('typing and pressing Enter calls onCommit with new value', () => {
    const onCommit = vi.fn()
    render(<InlineEdit value="old" onCommit={onCommit} />)
    fireEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'new' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledWith('new')
  })

  it('pressing Escape in edit mode reverts to display without calling onCommit', () => {
    const onCommit = vi.fn()
    render(<InlineEdit value="original" onCommit={onCommit} />)
    fireEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toHaveTextContent('original')
  })

  it('blur commits the edit', () => {
    const onCommit = vi.fn()
    render(<InlineEdit value="old" onCommit={onCommit} />)
    fireEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'new' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledWith('new')
  })

  it('does not call onCommit when value has not changed', () => {
    const onCommit = vi.fn()
    render(<InlineEdit value="same" onCommit={onCommit} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('multiline renders textarea instead of input', () => {
    render(<InlineEdit value="text" onCommit={vi.fn()} multiline />)
    fireEvent.click(screen.getByRole('button'))
    const textarea = screen.getByRole('textbox')
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('passes ariaLabel to display and edit modes', () => {
    const { rerender } = render(
      <InlineEdit value="val" onCommit={vi.fn()} ariaLabel="Edit name" />,
    )
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Edit name',
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'aria-label',
      'Edit name',
    )
  })
})
