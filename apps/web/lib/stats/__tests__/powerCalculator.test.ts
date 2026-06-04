import { describe, expect, it } from 'vitest';
import {
  computePowerCalc,
  cohensH,
  probit,
} from '../powerCalculator';
import fixtureJson from '../__fixtures__/power-calc-fixtures.json';

interface Fixture {
  input: {
    p_baseline: number;
    mde_relative: number;
    alpha: number;
    power: number;
    ratio: number;
  };
  expected: {
    cohens_h: number;
    n_control: number;
    n_treatment: number;
    total_n: number;
  };
}

function nTolerance(expected: number): number {
  return Math.max(2, Math.ceil(expected * 0.002));
}

describe('cohensH', () => {
  it('returns 0 for identical proportions', () => {
    expect(cohensH(0.2, 0.2)).toBe(0);
  });

  it('is symmetric in magnitude under swap', () => {
    expect(Math.abs(cohensH(0.1, 0.2))).toBeCloseTo(
      Math.abs(cohensH(0.2, 0.1)),
      12,
    );
  });

  it('matches the arcsine-transform definition exactly', () => {
    const p1 = 0.3;
    const p2 = 0.45;
    const expected =
      2 * (Math.asin(Math.sqrt(p2)) - Math.asin(Math.sqrt(p1)));
    expect(cohensH(p1, p2)).toBe(expected);
  });
});

describe('probit', () => {
  it('is 0 at p = 0.5', () => {
    expect(probit(0.5)).toBeCloseTo(0, 3);
  });

  it('matches known standard-normal quantiles within 4.5e-4', () => {
    expect(probit(0.975)).toBeCloseTo(1.959964, 3);
    expect(probit(0.995)).toBeCloseTo(2.575829, 3);
    expect(probit(0.80)).toBeCloseTo(0.841621, 3);
    expect(probit(0.90)).toBeCloseTo(1.281552, 3);
  });

  it('returns NaN outside (0, 1)', () => {
    expect(Number.isNaN(probit(0))).toBe(true);
    expect(Number.isNaN(probit(1))).toBe(true);
    expect(Number.isNaN(probit(-0.1))).toBe(true);
  });
});

describe('computePowerCalc — parity with statsmodels fixtures', () => {
  const cases = fixtureJson.cases as Fixture[];

  it('loads fixtures', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases)(
    'baseline=$input.p_baseline mde=$input.mde_relative α=$input.alpha power=$input.power ratio=$input.ratio',
    (fixture) => {
      const { input, expected } = fixture;
      const result = computePowerCalc({
        pBaseline: input.p_baseline,
        mde: input.mde_relative,
        mdeMode: 'relative',
        alpha: input.alpha,
        power: input.power,
        ratio: input.ratio,
      });
      expect(result).not.toBeNull();
      if (!result) return;

      expect(result.h).toBeCloseTo(expected.cohens_h, 12);

      expect(Math.abs(result.nControl - expected.n_control)).toBeLessThanOrEqual(
        nTolerance(expected.n_control),
      );
      expect(
        Math.abs(result.nTreatment - expected.n_treatment),
      ).toBeLessThanOrEqual(nTolerance(expected.n_treatment));
    },
  );
});

describe('computePowerCalc — edge cases', () => {
  it('returns null when baseline is out of range', () => {
    expect(
      computePowerCalc({ pBaseline: 0, mde: 0.1, alpha: 0.05, power: 0.8 }),
    ).toBeNull();
    expect(
      computePowerCalc({ pBaseline: 1, mde: 0.1, alpha: 0.05, power: 0.8 }),
    ).toBeNull();
  });

  it('returns null when MDE pushes the treatment rate out of (0, 1)', () => {
    expect(
      computePowerCalc({ pBaseline: 0.9, mde: 0.5, alpha: 0.05, power: 0.8 }),
    ).toBeNull();
  });

  it('returns null when effect size collapses to zero', () => {
    expect(
      computePowerCalc({ pBaseline: 0.2, mde: 0, alpha: 0.05, power: 0.8 }),
    ).toBeNull();
  });

  it('supports absolute MDE mode', () => {
    const rel = computePowerCalc({
      pBaseline: 0.05,
      mde: 0.15,
      mdeMode: 'relative',
      alpha: 0.05,
      power: 0.8,
    });
    const abs = computePowerCalc({
      pBaseline: 0.05,
      mde: 0.0075,
      mdeMode: 'absolute',
      alpha: 0.05,
      power: 0.8,
    });
    expect(rel).not.toBeNull();
    expect(abs).not.toBeNull();
    expect(abs!.pTreatment).toBeCloseTo(rel!.pTreatment, 12);
    expect(abs!.h).toBeCloseTo(rel!.h, 12);
    expect(abs!.nControl).toBe(rel!.nControl);
  });

  it('handles unequal split ratios', () => {
    const equal = computePowerCalc({
      pBaseline: 0.1,
      mde: 0.2,
      alpha: 0.05,
      power: 0.8,
      ratio: 1.0,
    });
    const unequal = computePowerCalc({
      pBaseline: 0.1,
      mde: 0.2,
      alpha: 0.05,
      power: 0.8,
      ratio: 0.5,
    });
    expect(equal).not.toBeNull();
    expect(unequal).not.toBeNull();
    expect(unequal!.nControl).toBeGreaterThan(equal!.nControl);
    expect(unequal!.nTreatment).toBe(Math.ceil(unequal!.nControl * 0.5));
  });
});
