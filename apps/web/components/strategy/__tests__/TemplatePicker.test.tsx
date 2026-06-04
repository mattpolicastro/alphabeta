import { describe, expect, it, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { TemplatePicker } from '../TemplatePicker'

describe('TemplatePicker', () => {
  it('returns null when open is false', () => {
    render(<TemplatePicker open={false} onSelect={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders dialog with title when open', () => {
    render(<TemplatePicker open={true} onSelect={() => {}} />)
    expect(
      screen.getByRole('dialog', { name: /Choose a framework/ }),
    ).toBeInTheDocument()
  })

  it('renders all 5 template options', () => {
    render(<TemplatePicker open={true} onSelect={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('North Star Framework')).toBeInTheDocument()
    expect(within(dialog).getByText('Objectives & Key Results')).toBeInTheDocument()
    expect(within(dialog).getByText('RICE Prioritization')).toBeInTheDocument()
    expect(within(dialog).getByText('GIST Framework')).toBeInTheDocument()
    expect(within(dialog).getByText('Goals, Problems, Solutions')).toBeInTheDocument()
  })

  it('renders short name badges', () => {
    render(<TemplatePicker open={true} onSelect={() => {}} />)
    expect(screen.getByText('NSF')).toBeInTheDocument()
    expect(screen.getByText('OKR')).toBeInTheDocument()
    expect(screen.getByText('RICE')).toBeInTheDocument()
    expect(screen.getByText('GIST')).toBeInTheDocument()
    expect(screen.getByText('GPS')).toBeInTheDocument()
  })

  it('clicking a template calls onSelect with that template', () => {
    const onSelect = vi.fn()
    render(<TemplatePicker open={true} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('North Star Framework'))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect.mock.calls[0][0].id).toBe('nsf')
  })

  it('clicking Cancel button calls onCancel', () => {
    const onCancel = vi.fn()
    render(
      <TemplatePicker open={true} onSelect={() => {}} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('Escape key calls onCancel', () => {
    const onCancel = vi.fn()
    render(
      <TemplatePicker open={true} onSelect={() => {}} onCancel={onCancel} />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('clicking the backdrop calls onCancel', () => {
    const onCancel = vi.fn()
    render(
      <TemplatePicker open={true} onSelect={() => {}} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByRole('dialog'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('clicking inside the dialog does not call onCancel', () => {
    const onCancel = vi.fn()
    render(
      <TemplatePicker open={true} onSelect={() => {}} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByText('Choose a framework'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('does not render Cancel button when onCancel is not provided', () => {
    render(<TemplatePicker open={true} onSelect={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })
})
