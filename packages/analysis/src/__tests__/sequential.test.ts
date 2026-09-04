/**
 * Oracle: R 4.5.3 + gsDesign 3.11.0, running the ORIGINAL app's `createTest()`
 * (sourced verbatim from alphanumerritt/sequential-test-app
 * sequentialTestingApp.Rmd, v3.21) and, for the analysis half, the app's own
 * z / p-value / interval calls (testBinomial, gsProbability, ciBinomial)
 * exactly as its observers issue them. The script also calls gsDesign()
 * directly with the same parameters and asserts createTest adds nothing.
 * Generated 2026-09-04; see README "Sequential".
 *
 * Specified tolerances: boundaries 1e-6, per-look n ±1. Actual agreement on
 * this grid: boundaries ≤ 4e-14 (plans) / 2e-9 (re-timed designs), n ≤ 2e-5
 * (the residue is R's own uniroot tolerance inside power.prop.test).
 */
import { describe, expect, it } from 'vitest';
import {
  ciBinomial, pnorm, pnormUpper, qnorm, qnormUpper, reviseLooks,
  sequentialAnalyze, sequentialPlan, testBinomial, type Checkpoint, type SequentialPlanInput,
} from '../sequential/index.js';

const R = {
 "plans": {
  "A": {
   "input": {
    "baseline": 0.1,
    "mde": 0.1,
    "margin": 0,
    "tails": 1,
    "alpha": 0.05,
    "power": 0.8,
    "k": 4
   },
   "nFix": 11619.0699363744,
   "nI": [3185.67806929924, 6371.35613859848, 9557.03420789772, 12742.712277197],
   "lower": [-0.93943765814222, 0.141558396378822, 0.957851293290952, 1.70746646680084],
   "upper": [3.16281796562129, 2.52299788850859, 2.08139635436274, 1.70746646680084],
   "power": 0.8,
   "alphaSpent": 0.0460792612208251
  },
  "B": {
   "input": {
    "baseline": 0.02,
    "mde": 0.1,
    "margin": 0,
    "tails": 2,
    "alpha": 0.05,
    "power": 0.8,
    "k": 5
   },
   "nFix": 80681.3802824081,
   "nI": [16653.2957773071, 33306.5915546141, 49959.8873319212, 66613.1831092283, 83266.4788865353],
   "lower": [-3.54008379920614, -2.97430998381632, -2.60451404802157, -2.30635679726439, -2.04547993262853],
   "upper": [3.54008379920614, 2.97430998381632, 2.60451404802157, 2.30635679726439, 2.04547993262853],
   "power": 0.8,
   "alphaSpent": 0.025000001033593
  },
  "C": {
   "input": {
    "baseline": 0.05,
    "mde": 0.05,
    "margin": 0,
    "tails": 1,
    "alpha": 0.1,
    "power": 0.9,
    "k": 3
   },
   "nFix": 102216.456469082,
   "nI": [36834.7154024537, 73669.4308049073, 110504.146207361],
   "lower": [-0.747917476936737, 0.4191718044348, 1.31862039712484],
   "upper": [2.67795090896555, 1.90833887716796, 1.31862039712484],
   "power": 0.9,
   "alphaSpent": 0.0938926554823795
  },
  "D": {
   "input": {
    "baseline": 0.2,
    "mde": 0.03,
    "margin": 0,
    "tails": 2,
    "alpha": 0.01,
    "power": 0.8,
    "k": 10
   },
   "nFix": 104973.669671278,
   "nI": [11008.813294098, 22017.626588196, 33026.439882294, 44035.2531763921, 55044.0664704901, 66052.8797645881, 77061.6930586861, 88070.5063527841, 99079.3196468822, 110088.13294098],
   "lower": [-4.41717341346902, -3.97072222319337, -3.70254431115425, -3.49910989938039, -3.33066810703649, -3.1846541162145, -3.05440848289295, -2.93591431320398, -2.82653543221453, -2.72442961198638],
   "upper": [4.41717341346902, 3.97072222319337, 3.70254431115425, 3.49910989938039, 3.33066810703649, 3.1846541162145, 3.05440848289295, 2.93591431320398, 2.82653543221453, 2.72442961198638],
   "power": 0.799999999998925,
   "alphaSpent": 0.0050000003227902
  },
  "E": {
   "input": {
    "baseline": 0.005,
    "mde": 0.3,
    "margin": 0.02,
    "tails": 1,
    "alpha": 0.05,
    "power": 0.8,
    "k": 8
   },
   "nFix": 27373.7231380297,
   "nI": [3898.04426020932, 7796.08852041864, 11694.132780628, 15592.1770408373, 19490.2213010466, 23388.2655612559, 27286.3098214652, 31184.3540816746],
   "lower": [-1.79607137024709, -0.974916811906981, -0.385005942413628, 0.107408777955663, 0.542885147855409, 0.941556085034055, 1.32024884223102, 1.75311112758607],
   "upper": [3.72500351562068, 3.18953383699847, 2.84705270654409, 2.57561773458733, 2.34210490833543, 2.13201031434221, 1.93736129543534, 1.75311112758607],
   "power": 0.8,
   "alphaSpent": 0.0448142391248622
  },
  "F": {
   "input": {
    "baseline": 0.1,
    "mde": 0.2,
    "margin": 0,
    "tails": 2,
    "alpha": 0.1,
    "power": 0.9,
    "k": 6
   },
   "nFix": 4190.12783929904,
   "nI": [719.806319255426, 1439.61263851085, 2159.41895776628, 2879.22527702171, 3599.03159627713, 4318.83791553256],
   "lower": [-3.50131805864836, -2.92874396305373, -2.55266346568485, -2.24820742835969, -1.98071165055049, -1.73450796339069],
   "upper": [3.50131805864836, 2.92874396305373, 2.55266346568485, 2.24820742835969, 1.98071165055049, 1.73450796339069],
   "power": 0.900000000000001,
   "alphaSpent": 0.0500000013939609
  },
  "G": {
   "input": {
    "baseline": 0.03,
    "mde": 0.08,
    "margin": 0,
    "tails": 1,
    "alpha": 0.05,
    "power": 0.85,
    "k": 7
   },
   "nFix": 75452.7111003568,
   "nI": [12214.8977653151, 24429.7955306302, 36644.6932959453, 48859.5910612605, 61074.4888265756, 73289.3865918907, 85504.2843572058],
   "lower": [-1.66232582792188, -0.78418265168432, -0.150737498151003, 0.378222408606518, 0.845945367696843, 1.27714704106052, 1.7445777894374],
   "upper": [3.62269884125968, 3.07088419883227, 2.71380810396052, 2.42822317282509, 2.18036267757822, 1.95527020029759, 1.7445777894374],
   "power": 0.85,
   "alphaSpent": 0.0448556441163761
  },
  "H": {
   "input": {
    "baseline": 0.5,
    "mde": 0.04,
    "margin": 0,
    "tails": 1,
    "alpha": 0.2,
    "power": 0.8,
    "k": 3
   },
   "nFix": 3539.50648964242,
   "nI": [1292.88456819355, 2585.76913638709, 3878.65370458064],
   "lower": [-0.992560355660411, 0.0407278235869701, 0.869449649522601],
   "upper": [2.43687462730099, 1.5806098350581, 0.869449649522601],
   "power": 0.800000000005601,
   "alphaSpent": 0.189100574466333
  }
 },
 "analyses": {
  "A1": {
   "plan": "A",
   "rows": [
    [1, 300, 3000, 340, 3000],
    [2, 700, 7000, 800, 7000]
   ],
   "z": [1.67287401279551, 2.73252020425589],
   "revised": [3000, 7000, 9871, 12743],
   "lower": [-1.02397842439171, 0.336365002668421, 1.02688396423213, 1.7062545673227],
   "upper": [3.21489934133922, 2.41270246754502, 2.04763733426283, 1.71372289709533],
   "checkpoint": 2,
   "outcome": "reject",
   "status": "early_upper",
   "pValue": 0.00361312383253938,
   "ci": [0.0168541135951666, 0.269306612335265],
   "mean": 0.142857142857143
  },
  "B1": {
   "plan": "B",
   "rows": [
    [1, 400, 20000, 410, 20000],
    [2, 900, 45000, 990, 45000],
    [3, 1400, 70000, 1600, 70000]
   ],
   "z": [0.354976705528954, 2.09228220541188, 3.69124696224096],
   "revised": [20000, 45000, 70000, 76633, 83266],
   "lower": [-3.39238653169456, -2.67563803478731, -2.22047729150219, -2.1829863453057, -2.09369062932304],
   "upper": [3.39238653169456, 2.67563803478731, 2.22047729150219, 2.1829863453057, 2.09369062932304],
   "checkpoint": 3,
   "outcome": "reject",
   "status": "early_upper",
   "pValue": 0.00794155369032936,
   "ci": [0.0575248884399833, 0.228147815798813],
   "mean": 0.142857142857143
  },
  "A2": {
   "plan": "A",
   "rows": [
    [2, 620, 6200, 640, 6200],
    [4, 1300, 13000, 1330, 13000]
   ],
   "z": [0.594446768171231, 0.61702206979882],
   "revised": [3100, 6200, 9600, 13000],
   "lower": [-0.978051851216781, 0.0900002463734275, 0.972773956688434, 1.71192156187643],
   "upper": [3.18655301377971, 2.55196413710202, 2.07185628393782, 1.71192156187643],
   "checkpoint": 4,
   "outcome": "inconclusive",
   "status": "complete_lower_1tail",
   "pValue": null,
   "ci": [-0.0409369274690865, 0.0871097335818656],
   "mean": 0.023076923076923
  },
  "F1": {
   "plan": "F",
   "rows": [
    [1, 70, 700, 84, 700],
    [3, 215, 2150, 190, 2150]
   ],
   "z": [1.19583888693828, -1.30524787204588],
   "revised": [700, 1425, 2150, 2873, 3596, 4319],
   "lower": [-3.52356167666242, -2.93713081225811, -2.55644480813951, -2.25029262915858, -1.9814636209173, -1.73423903740527],
   "upper": [3.52356167666242, 2.93713081225811, 2.55644480813951, 2.25029262915858, 1.9814636209173, 1.73423903740527],
   "checkpoint": 3,
   "outcome": "continue",
   "status": "early_middle",
   "pValue": null,
   "ci": [-0.345590478449043, 0.11232965245011],
   "mean": -0.116279069767442
  },
  "E1": {
   "plan": "E",
   "rows": [
    [3, 60, 12000, 78, 12000]
   ],
   "z": [1.63815416013251],
   "revised": [4000, 8000, 12000, 15837, 19674, 23511, 27347, 31184],
   "lower": [-1.76683460628266, -0.937536482000231, -0.340873159374374, 0.135348312785375, 0.561292851501352, 0.952570974121145, 1.32510750798147, 1.75293163950705],
   "upper": [3.70541800096697, 3.16689594666258, 2.82171314223238, 2.56093809086933, 2.33283554315995, 2.12675262380651, 1.93546807449495, 1.7541062858221],
   "checkpoint": 3,
   "outcome": "continue",
   "status": "early_middle",
   "pValue": null,
   "ci": [-0.264521331906674, 0.865035844354047],
   "mean": 0.3
  },
  "G1": {
   "plan": "G",
   "rows": [
    [1, 360, 12000, 380, 12000],
    [2, 720, 24000, 760, 24000],
    [3, 1100, 36000, 1250, 36000]
   ],
   "z": [0.746818214224657, 1.05616044718377, 3.14603113072442],
   "revised": [12000, 24000, 36000, 48376, 60752, 73128, 85504],
   "lower": [-1.68350087745276, -0.811385195619914, -0.18289322838572, 0.359414946428022, 0.835135042581639, 1.27248679430881, 1.74375469662459],
   "upper": [3.63644486467149, 3.08688522892773, 2.73184160030918, 2.43790027641207, 2.1856728236949, 1.95726219417843, 1.74375469662459],
   "checkpoint": 3,
   "outcome": "reject",
   "status": "early_upper",
   "pValue": 0.00167169201987891,
   "ci": [0.0188299267786969, 0.256109358417748],
   "mean": 0.136363636363636
  },
  "H1": {
   "plan": "H",
   "rows": [
    [1, 650, 1300, 620, 1300],
    [2, 1300, 2600, 1310, 2600]
   ],
   "z": [-1.17701025766394, 0.277352149541425],
   "revised": [1300, 2600, 3879],
   "lower": [-0.985152495273239, 0.050861104161237, 0.86919648476642],
   "upper": [2.43091457768612, 1.57225436616248, 0.869858511014083],
   "checkpoint": 2,
   "outcome": "continue",
   "status": "early_middle",
   "pValue": null,
   "ci": [-0.0358826500740303, 0.0512602880765239],
   "mean": 0.00769230769230766
  },
  "H2": {
   "plan": "H",
   "rows": [
    [1, 650, 1300, 620, 1300],
    [2, 1300, 2600, 1310, 2600],
    [3, 1950, 3900, 1960, 3900]
   ],
   "z": [-1.17701025766394, 0.277352149541425, 0.226456151261934],
   "revised": [1300, 2600, 3900],
   "lower": [-0.985152495273239, 0.050861104161237, 0.870413516420964],
   "upper": [2.43091457768612, 1.57225436616248, 0.870413516420964],
   "checkpoint": 3,
   "outcome": "inconclusive",
   "status": "complete_lower_1tail",
   "pValue": null,
   "ci": [-0.0145839528593432, 0.0248402461061755],
   "mean": 0.00512820512820511
  }
 },
 "pnorm": {
  "x": [-8, -4.5, -3, -1.96, -0.5, 0, 0.3, 1.644853626951, 2.5, 3.5, 5, 7],
  "lower": [6.22096057427178e-16, 0.00000339767312473006, 0.00134989803163009, 0.0249978951482204, 0.308537538725987, 0.5, 0.617911422188953, 0.949999999999951, 0.993790334674224, 0.999767370920964, 0.999999713348428, 0.99999999999872],
  "upper": [0.999999999999999, 0.999996602326875, 0.99865010196837, 0.97500210485178, 0.691462461274013, 0.5, 0.382088577811047, 0.0500000000000488, 0.00620966532577613, 0.000232629079035525, 2.86651571879194e-7, 1.27981254388584e-12]
 },
 "qnorm": {
  "p": [1e-10, 0.000025, 0.000390625, 0.001, 0.01, 0.025, 0.05, 0.2, 0.5, 0.8, 0.975],
  "lower": [-6.36134090240406, -4.0556269811224, -3.35935371793431, -3.09023230616781, -2.32634787404084, -1.95996398454005, -1.64485362695147, -0.841621233572914, 0, 0.841621233572914, 1.95996398454005],
  "upper": [6.36134090240406, 4.0556269811224, 3.35935371793431, 3.09023230616781, 2.32634787404084, 1.95996398454005, 1.64485362695147, 0.841621233572914, 0, -0.841621233572914, -1.95996398454005]
 },
 "testBinomial": [
  {
   "x1": 300,
   "x2": 340,
   "n1": 3000,
   "n2": 3000,
   "d0": 0,
   "z": -1.67287401279551
  },
  {
   "x1": 120,
   "x2": 150,
   "n1": 24000,
   "n2": 24000,
   "d0": 0.0001,
   "z": -1.97633008321778
  },
  {
   "x1": 50,
   "x2": 20,
   "n1": 500,
   "n2": 480,
   "d0": 0.01,
   "z": 2.97254439975818
  }
 ]
} as {
  plans: Record<string, { input: SequentialPlanInput; nFix: number; nI: number[]; lower: number[]; upper: number[]; power: number; alphaSpent: number }>;
  analyses: Record<string, { plan: string; rows: number[][]; z: number[]; revised: number[]; lower: number[]; upper: number[]; checkpoint: number; outcome: string; status: string; pValue: number | null; ci: number[]; mean: number }>;
  pnorm: { x: number[]; lower: number[]; upper: number[] };
  qnorm: { p: number[]; lower: number[]; upper: number[] };
  testBinomial: { x1: number; x2: number; n1: number; n2: number; d0: number; z: number }[];
};

const planCases = Object.entries(R.plans).map(([id, c]) => ({ id, ...c }));
const analysisCases = Object.entries(R.analyses).map(([id, c]) => ({ id, ...c }));
// The app stores a result as c(chk, aConv, aTraffic, bConv, bTraffic, z).
const toCheckpoints = (rows: number[][]): Checkpoint[] =>
  rows.map(([index, cc, cv, tc, tv]) => ({ index, control: { visitors: cv, conversions: cc }, treatment: { visitors: tv, conversions: tc } }));

describe('oracle: the app’s createTest() — planning', () => {
  it.each(planCases)('$id tails=$input.tails k=$input.k baseline=$input.baseline mde=$input.mde α=$input.alpha power=$input.power', (c) => {
    const p = sequentialPlan(c.input);
    expect(Math.abs(p.fixed.nExact - c.nFix)).toBeLessThan(1e-3);
    for (let i = 0; i < c.input.k; i++) {
      expect(Math.abs(p.looks[i].perVariant - c.nI[i])).toBeLessThanOrEqual(1);
      expect(Math.abs(p.looks[i].perVariant - c.nI[i])).toBeLessThan(1e-3);
      expect(Math.abs(p.looks[i].upper - c.upper[i])).toBeLessThan(1e-6);
      expect(Math.abs(p.looks[i].lower - c.lower[i])).toBeLessThan(1e-6);
    }
    expect(p.power).toBeCloseTo(c.power, 9);
    expect(p.design.alphaSpent).toBeCloseTo(c.alphaSpent, 9);
    expect(p.maxTotal).toBeCloseTo(c.nI[c.input.k - 1] * 2, 3);
  });

  it('a two-tailed design is symmetric and a one-tailed design meets at the final look', () => {
    const two = sequentialPlan(R.plans.B.input);
    for (const l of two.looks) expect(l.lower).toBeCloseTo(-l.upper, 12);
    const one = sequentialPlan(R.plans.A.input);
    const last = one.looks[one.looks.length - 1];
    expect(last.lower).toBeCloseTo(last.upper, 12);
    expect(one.alphaSpent).toBeCloseTo(0.05, 6); // efficacy bound alone spends exactly α (non-binding futility)
  });
});

describe('oracle: the app’s createTest(…, results) and outcome observers — analysis', () => {
  it.each(analysisCases)('$id plan $plan, $rows.length look(s)', (c) => {
    const input = R.plans[c.plan].input;
    const a = sequentialAnalyze(input, toCheckpoints(c.rows));
    expect(a.revisedPerVariant).toEqual(c.revised);
    for (let i = 0; i < input.k; i++) {
      expect(Math.abs(a.plan.looks[i].upper - c.upper[i])).toBeLessThan(1e-6);
      expect(Math.abs(a.plan.looks[i].lower - c.lower[i])).toBeLessThan(1e-6);
    }
    a.checkpoints.forEach((cp, i) => expect(cp.z).toBeCloseTo(c.z[i], 9));
    expect(a.verdict).not.toBeNull();
    expect(a.verdict!.checkpoint).toBe(c.checkpoint);
    expect(a.verdict!.outcome).toBe(c.outcome);
    expect(a.verdict!.status).toBe(c.status);
    if (c.pValue === null) expect(a.verdict!.pValue).toBeNull();
    else expect(a.verdict!.pValue).toBeCloseTo(c.pValue, 9);
    expect(a.verdict!.ci.lower).toBeCloseTo(c.ci[0], 6);
    expect(a.verdict!.ci.upper).toBeCloseTo(c.ci[1], 6);
    expect(a.verdict!.ci.mean).toBeCloseTo(c.mean, 12);
  });

  it('scoring stops at the first rejection; later entries are kept but not scored', () => {
    const c = R.analyses.A1;
    const rows = [...c.rows, [3, 1000, 9800, 1100, 9800]];
    const a = sequentialAnalyze(R.plans.A.input, toCheckpoints(rows));
    expect(a.checkpoints.map((x) => x.index)).toEqual([1, 2]);
    expect(a.verdict!.checkpoint).toBe(2);
    expect(a.revisedPerVariant).toEqual([3000, 7000, 9800, 12743]);
  });
});

describe('re-timing (the app’s dplyr “renumbering” chain)', () => {
  it('interpolates un-entered looks linearly between anchors, never moving entered ones', () => {
    expect(reviseLooks(4, 12742.712, [{ index: 2, perVariant: 7000 }])).toEqual([3500, 7000, 9871, 12743]);
    expect(reviseLooks(4, 12742.712, [{ index: 1, perVariant: 3000 }, { index: 3, perVariant: 9000 }])).toEqual([3000, 6000, 9000, 12743]);
    expect(reviseLooks(4, 12742.712, [{ index: 4, perVariant: 13000 }])).toEqual([3250, 6500, 9750, 13000]);
    expect(reviseLooks(5, 1000, [])).toEqual([200, 400, 600, 800, 1000]);
  });
  it('adding a look never rewrites an earlier entered row', () => {
    const one = reviseLooks(5, 1000, [{ index: 2, perVariant: 450 }]);
    const two = reviseLooks(5, 1000, [{ index: 2, perVariant: 450 }, { index: 4, perVariant: 900 }]);
    expect(two[1]).toBe(one[1]);
    expect(two[3]).toBe(900);
  });
});

describe('primitives against R', () => {
  it('pnorm both tails to 1e-14 relative', () => {
    R.pnorm.x.forEach((x, i) => {
      expect(Math.abs(pnorm(x) / R.pnorm.lower[i] - 1)).toBeLessThan(1e-13);
      expect(Math.abs(pnormUpper(x) / R.pnorm.upper[i] - 1)).toBeLessThan(1e-13);
    });
  });
  it('qnorm both tails to 1e-13', () => {
    R.qnorm.p.forEach((p, i) => {
      expect(Math.abs(qnorm(p) - R.qnorm.lower[i])).toBeLessThan(1e-13);
      expect(Math.abs(qnormUpper(p) - R.qnorm.upper[i])).toBeLessThan(1e-13);
    });
  });
  it('testBinomial (Miettinen–Nurminen difference scale) to 1e-12', () => {
    for (const t of R.testBinomial) expect(testBinomial(t.x1, t.x2, t.n1, t.n2, t.d0)).toBeCloseTo(t.z, 12);
  });
  it('ciBinomial brackets the observed difference and tightens with alpha', () => {
    const wide = ciBinomial(340, 300, 3000, 3000, 0.05);
    const tight = ciBinomial(340, 300, 3000, 3000, 0.2);
    const d = 340 / 3000 - 300 / 3000;
    expect(wide.lower).toBeLessThan(d);
    expect(wide.upper).toBeGreaterThan(d);
    expect(tight.upper - tight.lower).toBeLessThan(wide.upper - wide.lower);
  });
});

describe('validation', () => {
  const base: SequentialPlanInput = { baseline: 0.1, mde: 0.1, tails: 1, alpha: 0.05, power: 0.8, k: 4 };
  it('rejects out-of-range plan inputs with a sentence', () => {
    expect(() => sequentialPlan({ ...base, k: 1 })).toThrow(RangeError);
    expect(() => sequentialPlan({ ...base, k: 21 })).toThrow(/2 to 20/);
    expect(() => sequentialPlan({ ...base, mde: 0 })).toThrow(/positive/);
    expect(() => sequentialPlan({ ...base, mde: 10 })).toThrow(/100%/);
    expect(() => sequentialPlan({ ...base, margin: 0.02, tails: 2 })).toThrow(/one-tailed/);
    expect(() => sequentialPlan({ ...base, alpha: 0 })).toThrow(RangeError);
  });
  it('rejects a look that does not grow, a duplicate, or one past k', () => {
    const cp = (index: number, n: number): Checkpoint => ({ index, control: { visitors: n, conversions: Math.round(n / 10) }, treatment: { visitors: n, conversions: Math.round(n / 10) } });
    expect(() => sequentialAnalyze(base, [cp(1, 3000), cp(2, 3000)])).toThrow(/exceed/);
    expect(() => sequentialAnalyze(base, [cp(1, 3000), cp(1, 4000)])).toThrow(/twice/);
    expect(() => sequentialAnalyze(base, [cp(5, 3000)])).toThrow(/1 to 4/);
    expect(() => sequentialAnalyze(base, [{ index: 1, control: { visitors: 100, conversions: 101 }, treatment: { visitors: 100, conversions: 1 } }])).toThrow(/conversions/);
  });
  it('with no looks, returns the plan untouched and no verdict', () => {
    const a = sequentialAnalyze(base, []);
    expect(a.verdict).toBeNull();
    expect(a.revisedPerVariant).toEqual(sequentialPlan(base).looks.map((l) => l.perVariant));
  });
});
