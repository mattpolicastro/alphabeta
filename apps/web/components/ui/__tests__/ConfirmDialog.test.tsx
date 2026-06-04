import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from '../ConfirmDialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Delete item?',
    message: 'This cannot be undone.',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('returns null when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the title and message', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Delete item?')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('uses default button labels', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Proceed')).toBeInTheDocument()
  })

  it('uses custom button labels', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />,
    )
    expect(screen.getByText('Keep')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Proceed'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not call onCancel when inner content is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Delete item?'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
