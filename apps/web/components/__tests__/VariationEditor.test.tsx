import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VariationEditor, variationsValid } from '../VariationEditor';
import type { Variation } from '@/lib/db/schema';

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeVariation(overrides: Partial<Variation> = {}, idx = 0): Variation {
  return {
    id: `var-${idx}`,
    name: `Variation ${idx}`,
    key: `variation_${idx}`,
    weight: 0.5,
    isControl: idx === 0,
    ...overrides,
  };
}

const TWO_VALID: Variation[] = [
  makeVariation({ id: 'ctrl', name: 'Control', key: 'control', weight: 0.5, isControl: true }, 0),
  makeVariation({ id: 'trt', name: 'Treatment', key: 'treatment', weight: 0.5, isControl: false }, 1),
];

// ── variationsValid() pure function tests ─────────────────────────────────

describe('variationsValid()', () => {
  it('returns true for two valid variations with weights summing to 1', () => {
    expect(variationsValid(TWO_VALID)).toBe(true);
  });

  it('returns false when fewer than 2 variations', () => {
    expect(variationsValid([TWO_VALID[0]])).toBe(false);
  });

  it('returns false when no variation is marked control', () => {
    const noControl = TWO_VALID.map((v) => ({ ...v, isControl: false }));
    expect(variationsValid(noControl)).toBe(false);
  });

  it('returns false when a variation weight is 0', () => {
    const zeroWeight = [
      { ...TWO_VALID[0], weight: 0 },
      { ...TWO_VALID[1], weight: 1 },
    ];
    expect(variationsValid(zeroWeight)).toBe(false);
  });

  it('returns false when weights do not sum to 1', () => {
    const badWeights = [
      { ...TWO_VALID[0], weight: 0.4 },
      { ...TWO_VALID[1], weight: 0.4 },
    ];
    expect(variationsValid(badWeights)).toBe(false);
  });

  it('returns true with 3 variations whose weights sum to 1', () => {
    const three: Variation[] = [
      makeVariation({ id: 'a', weight: 1 / 3, isControl: true }, 0),
      makeVariation({ id: 'b', weight: 1 / 3, isControl: false }, 1),
      makeVariation({ id: 'c', weight: 1 / 3, isControl: false }, 2),
    ];
    expect(variationsValid(three)).toBe(true);
  });
});

// ── VariationEditor render tests ──────────────────────────────────────────

describe('VariationEditor', () => {
  it('renders all passed variations', () => {
    render(<VariationEditor variations={TWO_VALID} onChange={jest.fn()} />);
    // Each variation has a name input — verify both are rendered
    expect(screen.getByDisplayValue('Control')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Treatment')).toBeInTheDocument();
  });

  it('renders the correct number of weight inputs', () => {
    render(<VariationEditor variations={TWO_VALID} onChange={jest.fn()} />);
    // Two number inputs (weights displayed as percentages: 50, 50)
    const numericInputs = screen.getAllByRole('spinbutton');
    expect(numericInputs).toHaveLength(2);
  });

  it('"Add Variation" button calls onChange with one more variation', () => {
    const onChange = jest.fn();
    render(<VariationEditor variations={TWO_VALID} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /add variation/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated: Variation[] = onChange.mock.calls[0][0];
    expect(updated).toHaveLength(3);
    // New variation has a name (e.g. "Variant B"), not empty
    expect(updated[2].name).toBeTruthy();
    expect(updated[2].key).toBeTruthy();
    // New variation should not be marked control
    expect(updated[2].isControl).toBe(false);
  });

  it('"Add Variation" button is disabled when at max (5) variations', () => {
    const fiveVars: Variation[] = Array.from({ length: 5 }, (_, i) =>
      makeVariation(
        { id: `v${i}`, weight: 0.2, isControl: i === 0 },
        i,
      ),
    );
    render(<VariationEditor variations={fiveVars} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /add variation/i })).toBeDisabled();
  });

  it('"Remove" button calls onChange with one fewer variation', () => {
    // Need 3 so removal is allowed (min is 2)
    const three: Variation[] = [
      makeVariation({ id: 'a', weight: 0.34, isControl: true }, 0),
      makeVariation({ id: 'b', weight: 0.33, isControl: false }, 1),
      makeVariation({ id: 'c', weight: 0.33, isControl: false }, 2),
    ];
    const onChange = jest.fn();
    render(<VariationEditor variations={three} onChange={onChange} />);
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[2]); // remove the third
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated: Variation[] = onChange.mock.calls[0][0];
    expect(updated).toHaveLength(2);
    expect(updated.find((v) => v.id === 'c')).toBeUndefined();
  });

  it('"Remove" buttons are disabled when at min (2) variations', () => {
    render(<VariationEditor variations={TWO_VALID} onChange={jest.fn()} />);
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    removeButtons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('"Distribute evenly" button equalizes weights', () => {
    // Unbalanced variations to trigger the button
    const unbalanced: Variation[] = [
      makeVariation({ id: 'a', weight: 0, isControl: true }, 0),
      makeVariation({ id: 'b', weight: 0, isControl: false }, 1),
    ];
    const onChange = jest.fn();
    render(<VariationEditor variations={unbalanced} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /distribute evenly/i }));
    const updated: Variation[] = onChange.mock.calls[0][0];
    const total = updated.reduce((s, v) => s + v.weight, 0);
    expect(Math.abs(total - 1)).toBeLessThan(0.01);
    // All weights should be equal (within floating point)
    const weights = updated.map((v) => v.weight);
    expect(weights[0]).toBeCloseTo(weights[1], 1);
  });

  it('calls onChange with updated name when name input changes', () => {
    const onChange = jest.fn();
    render(<VariationEditor variations={TWO_VALID} onChange={onChange} />);
    const nameInput = screen.getByDisplayValue('Treatment');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updated: Variation[] = onChange.mock.calls[0][0];
    const updated1 = updated.find((v) => v.id === 'trt');
    expect(updated1?.name).toBe('New Name');
  });

  it('shows weight total warning when weights do not sum to 100%', () => {
    const badWeights: Variation[] = [
      makeVariation({ id: 'a', weight: 0.4, isControl: true }, 0),
      makeVariation({ id: 'b', weight: 0.4, isControl: false }, 1),
    ];
    render(<VariationEditor variations={badWeights} onChange={jest.fn()} />);
    expect(screen.getByText(/must sum to exactly 100%/i)).toBeInTheDocument();
  });
});
