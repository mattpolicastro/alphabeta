import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Labeled,
  TextInput,
  TextArea,
  ImpactSelect,
  EffortSelect,
  ProblemStateSelect,
  updateField,
} from '../sharedEdit'

/* ------------------------------------------------------------------ */
/*  Labeled                                                           */
/* ------------------------------------------------------------------ */

describe('Labeled', () => {
  it('renders the label text', () => {
    render(<Labeled label="Score">content</Labeled>)
    expect(screen.getByText('Score')).toBeInTheDocument()
  })

  it('renders children', () => {
    render(
      <Labeled label="Score">
        <input data-testid="child" />
      </Labeled>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})

/* ------------------------------------------------------------------ */
/*  TextInput                                                         */
/* ------------------------------------------------------------------ */

describe('TextInput', () => {
  it('renders with the provided value', () => {
    render(<TextInput value="hello" onChange={() => {}} ariaLabel="name" />)
    expect(screen.getByRole('textbox', { name: 'name' })).toHaveValue('hello')
  })

  it('calls onChange when the user types', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TextInput value="" onChange={onChange} ariaLabel="name" />)

    await user.type(screen.getByRole('textbox', { name: 'name' }), 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('renders with the placeholder', () => {
    render(
      <TextInput value="" onChange={() => {}} placeholder="type here" ariaLabel="name" />,
    )
    expect(screen.getByPlaceholderText('type here')).toBeInTheDocument()
  })

  it('has the correct aria-label', () => {
    render(<TextInput value="" onChange={() => {}} ariaLabel="Title" />)
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument()
  })
})

/* ------------------------------------------------------------------ */
/*  TextArea                                                          */
/* ------------------------------------------------------------------ */

describe('TextArea', () => {
  it('renders with the provided value', () => {
    render(<TextArea value="notes" onChange={() => {}} ariaLabel="notes" />)
    expect(screen.getByRole('textbox', { name: 'notes' })).toHaveValue('notes')
  })

  it('defaults to 3 rows', () => {
    render(<TextArea value="" onChange={() => {}} ariaLabel="notes" />)
    expect(screen.getByRole('textbox', { name: 'notes' })).toHaveAttribute('rows', '3')
  })

  it('accepts a custom rows prop', () => {
    render(<TextArea value="" onChange={() => {}} ariaLabel="notes" rows={5} />)
    expect(screen.getByRole('textbox', { name: 'notes' })).toHaveAttribute('rows', '5')
  })

  it('calls onChange when the user types', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<TextArea value="" onChange={onChange} ariaLabel="notes" />)

    await user.type(screen.getByRole('textbox', { name: 'notes' }), 'x')
    expect(onChange).toHaveBeenCalledWith('x')
  })
})

/* ------------------------------------------------------------------ */
/*  ImpactSelect                                                      */
/* ------------------------------------------------------------------ */

describe('ImpactSelect', () => {
  it('renders with the provided label', () => {
    render(<ImpactSelect value={undefined} onChange={() => {}} label="Impact" />)
    expect(screen.getByText('Impact')).toBeInTheDocument()
  })

  it('shows all 3 impact options plus the blank', () => {
    render(<ImpactSelect value={undefined} onChange={() => {}} label="Impact" />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4) // — + high, medium, low
    expect(options.map((o) => o.textContent)).toEqual(['—', 'high', 'medium', 'low'])
  })

  it('calls onChange with the selected value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ImpactSelect value={undefined} onChange={onChange} label="Impact" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Impact' }), 'medium')
    expect(onChange).toHaveBeenCalledWith('medium')
  })

  it('calls onChange with undefined when "—" is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ImpactSelect value="high" onChange={onChange} label="Impact" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Impact' }), '')
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})

/* ------------------------------------------------------------------ */
/*  EffortSelect                                                      */
/* ------------------------------------------------------------------ */

describe('EffortSelect', () => {
  it('renders the "Effort" label', () => {
    render(<EffortSelect value={undefined} onChange={() => {}} />)
    expect(screen.getByText('Effort')).toBeInTheDocument()
  })

  it('shows all 5 effort options plus the blank', () => {
    render(<EffortSelect value={undefined} onChange={() => {}} />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(6) // — + XS, S, M, L, XL
    expect(options.map((o) => o.textContent)).toEqual(['—', 'XS', 'S', 'M', 'L', 'XL'])
  })

  it('calls onChange with the selected value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EffortSelect value={undefined} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Effort' }), 'L')
    expect(onChange).toHaveBeenCalledWith('L')
  })
})

/* ------------------------------------------------------------------ */
/*  ProblemStateSelect                                                */
/* ------------------------------------------------------------------ */

describe('ProblemStateSelect', () => {
  it('renders the "State" label text', () => {
    render(<ProblemStateSelect value={undefined} onChange={() => {}} />)
    expect(screen.getByText('State')).toBeInTheDocument()
  })

  it('shows all 3 state options', () => {
    render(<ProblemStateSelect value={undefined} onChange={() => {}} />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options.map((o) => o.textContent)).toEqual(['active', 'prospect', 'pool'])
  })

  it('defaults to "active" when value is undefined', () => {
    render(<ProblemStateSelect value={undefined} onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Problem state' })).toHaveValue('active')
  })

  it('calls onChange with the selected state', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ProblemStateSelect value="active" onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Problem state' }), 'pool')
    expect(onChange).toHaveBeenCalledWith('pool')
  })
})

/* ------------------------------------------------------------------ */
/*  updateField                                                       */
/* ------------------------------------------------------------------ */

describe('updateField', () => {
  it('returns a new object with the updated field', () => {
    const original = { columnId: 'problems' as const, title: 'old', state: 'active' as const }
    const result = updateField(original, 'title', 'new')
    expect(result).toEqual({ columnId: 'problems', title: 'new', state: 'active' })
  })

  it('does not mutate the original object', () => {
    const original = { columnId: 'problems' as const, title: 'old', state: 'active' as const }
    const result = updateField(original, 'title', 'new')
    expect(original.title).toBe('old')
    expect(result).not.toBe(original)
  })
})
