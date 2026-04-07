import { formatValue, formatRate } from '../formatValue';

describe('formatRate', () => {
  it('formats a proportion as a two-decimal percentage', () => {
    expect(formatRate(0.0532)).toBe('5.32%');
    expect(formatRate(0)).toBe('0.00%');
    expect(formatRate(1)).toBe('100.00%');
  });
});

describe('formatValue', () => {
  describe('binomial / default (rate)', () => {
    it('formats as percentage with two decimals for binomial metrics', () => {
      expect(formatValue(0.0532, 'binomial')).toBe('5.32%');
    });

    it('falls through to rate for unknown metric types', () => {
      expect(formatValue(0.25, undefined)).toBe('25.00%');
      expect(formatValue(0.25, 'something-new')).toBe('25.00%');
    });

    it('also renders count metrics as a rate (historic behaviour)', () => {
      // mean for count metrics is per-user average; ResultsTable displays
      // it in the same column as binomial rates.
      expect(formatValue(0.3, 'count')).toBe('30.00%');
    });
  });

  describe('revenue', () => {
    it('prefixes the currency symbol and uses two decimal places', () => {
      expect(formatValue(24.5, 'revenue')).toBe('$24.50');
    });

    it('respects a custom currency symbol', () => {
      expect(formatValue(24.5, 'revenue', { currencySymbol: '€' })).toBe('€24.50');
    });

    it('accepts the legacy string-valued options argument', () => {
      expect(formatValue(24.5, 'revenue', '£')).toBe('£24.50');
    });

    it('renders thousands separators in the integer part', () => {
      expect(formatValue(1234567.891, 'revenue')).toBe('$1,234,567.89');
    });

    it('renders negative revenue with a minus sign before the symbol', () => {
      expect(formatValue(-12.3, 'revenue')).toBe('−$12.30');
    });

    it('always uses exactly two decimals', () => {
      expect(formatValue(1, 'revenue')).toBe('$1.00');
      expect(formatValue(0, 'revenue')).toBe('$0.00');
      expect(formatValue(1.2345, 'revenue')).toBe('$1.23');
    });
  });

  describe('continuous', () => {
    it('renders with two decimals', () => {
      expect(formatValue(3.14159, 'continuous')).toBe('3.14');
    });

    it('accepts negative values', () => {
      expect(formatValue(-0.5, 'continuous')).toBe('-0.50');
    });
  });

  describe('edge cases', () => {
    it('returns an em dash for null', () => {
      expect(formatValue(null, 'binomial')).toBe('—');
    });

    it('returns an em dash for undefined', () => {
      expect(formatValue(undefined, 'continuous')).toBe('—');
    });

    it('returns an em dash for NaN', () => {
      expect(formatValue(NaN, 'revenue')).toBe('—');
    });

    it('returns ∞ / −∞ for infinities', () => {
      expect(formatValue(Infinity, 'continuous')).toBe('∞');
      expect(formatValue(-Infinity, 'continuous')).toBe('−∞');
    });

    it('formats very small binomial values without scientific notation', () => {
      expect(formatValue(0.00001, 'binomial')).toBe('0.00%');
    });
  });
});
