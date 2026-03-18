import { transformResponse } from '../transformResponse';
import type {
  AnalysisRequest,
  AnalysisResponse,
} from '../types';

describe('transformResponse', () => {
  describe('Bayesian response mapping', () => {
    it('should correctly map Bayesian results to VariationResult', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'Conversion', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 1000, metrics: { 'metric-1': 200 } },
            treatment: { units: 1000, metrics: { 'metric-1': 220 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 1000,
            rate: 0.22,
            relativeUplift: 0.1,
            absoluteUplift: 0.02,
            significant: true,
            chanceToBeatControl: 0.95,
            expectedLoss: 0.001,
            credibleIntervalLower: 0.195,
            credibleIntervalUpper: 0.245,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);

      expect(result.overall).toHaveLength(1);
      const metricResult = result.overall[0];
      expect(metricResult.metricId).toBe('metric-1');
      expect(metricResult.variationResults).toHaveLength(2);

      const treatmentVar = metricResult.variationResults.find(
        (v) => v.variationId === 'var-treatment'
      );
      expect(treatmentVar).toBeDefined();
      expect(treatmentVar!.chanceToBeatControl).toBe(0.95);
      expect(treatmentVar!.expectedLoss).toBe(0.001);
      expect(treatmentVar!.credibleIntervalLower).toBe(0.195);
      expect(treatmentVar!.credibleIntervalUpper).toBe(0.245);
    });
  });

  describe('Frequentist response mapping', () => {
    it('should correctly map Frequentist results with p-value and confidence intervals', () => {
      const request: AnalysisRequest = {
        engine: 'frequentist',
        correction: 'holm-bonferroni',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'CTR', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 2000, metrics: { 'metric-1': 300 } },
            treatment: { units: 2000, metrics: { 'metric-1': 330 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.6,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 2000,
            rate: 0.165,
            relativeUplift: 0.1,
            absoluteUplift: 0.015,
            significant: true,
            pValue: 0.02,
            confidenceIntervalLower: 0.152,
            confidenceIntervalUpper: 0.178,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);
      const metricResult = result.overall[0];
      const treatmentVar = metricResult.variationResults.find(
        (v) => v.variationId === 'var-treatment'
      );

      expect(treatmentVar!.pValue).toBe(0.02);
      expect(treatmentVar!.confidenceIntervalLower).toBe(0.152);
      expect(treatmentVar!.confidenceIntervalUpper).toBe(0.178);
    });
  });

  describe('scaledImpact computation', () => {
    it('should compute scaledImpact as absoluteUplift * baselineUnits when baselineUnits > 0', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-revenue', name: 'Revenue', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 1000, metrics: { 'metric-revenue': 50000 } },
            treatment: { units: 1000, metrics: { 'metric-revenue': 55000 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.4,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-revenue',
            variationId: 'var-treatment',
            units: 1000,
            rate: 55,
            relativeUplift: 0.1,
            absoluteUplift: 5,
            significant: true,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);
      const treatmentVar = result.overall[0].variationResults.find(
        (v) => v.variationId === 'var-treatment'
      );

      expect(treatmentVar!.scaledImpact).toBe(5 * 1000); // absoluteUplift * baselineUnits
    });

    it('should set scaledImpact to undefined when baselineUnits is 0', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'Test', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 0, metrics: { 'metric-1': 0 } },
            treatment: { units: 0, metrics: { 'metric-1': 0 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 0,
            rate: 0,
            relativeUplift: 0,
            absoluteUplift: 0,
            significant: false,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);
      const treatmentVar = result.overall[0].variationResults.find(
        (v) => v.variationId === 'var-treatment'
      );

      expect(treatmentVar!.scaledImpact).toBeUndefined();
    });
  });

  describe('Multiple metrics', () => {
    it('should produce multiple MetricResult entries for multiple metrics', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [
          { id: 'metric-1', name: 'Conversion', isGuardrail: false },
          { id: 'metric-2', name: 'Revenue', isGuardrail: false },
          { id: 'metric-3', name: 'AOV', isGuardrail: true },
        ],
        data: {
          overall: {
            control: {
              units: 1000,
              metrics: { 'metric-1': 200, 'metric-2': 50000, 'metric-3': 150 },
            },
            treatment: {
              units: 1000,
              metrics: { 'metric-1': 220, 'metric-2': 55000, 'metric-3': 160 },
            },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 1000,
            rate: 0.22,
            relativeUplift: 0.1,
            absoluteUplift: 0.02,
            significant: true,
          },
          {
            metricId: 'metric-2',
            variationId: 'var-treatment',
            units: 1000,
            rate: 55,
            relativeUplift: 0.1,
            absoluteUplift: 5,
            significant: true,
          },
          {
            metricId: 'metric-3',
            variationId: 'var-treatment',
            units: 1000,
            rate: 0.16,
            relativeUplift: 0.0667,
            absoluteUplift: 0.01,
            significant: false,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);

      expect(result.overall).toHaveLength(3);
      expect(result.overall[0].metricId).toBe('metric-1');
      expect(result.overall[1].metricId).toBe('metric-2');
      expect(result.overall[2].metricId).toBe('metric-3');

      for (const metricResult of result.overall) {
        expect(metricResult.variationResults).toHaveLength(2);
      }
    });
  });

  describe('Dimension slices', () => {
    it('should preserve overall results and per-dimension/per-value structure', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'Conversion', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 1000, metrics: { 'metric-1': 200 } },
            treatment: { units: 1000, metrics: { 'metric-1': 220 } },
          },
          slices: {
            browser: {
              chrome: {
                control: { units: 600, metrics: { 'metric-1': 120 } },
                treatment: { units: 600, metrics: { 'metric-1': 135 } },
              },
              safari: {
                control: { units: 400, metrics: { 'metric-1': 80 } },
                treatment: { units: 400, metrics: { 'metric-1': 85 } },
              },
            },
          },
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 1000,
            rate: 0.22,
            relativeUplift: 0.1,
            absoluteUplift: 0.02,
            significant: true,
          },
        ],
        slices: {
          browser: {
            chrome: [
              {
                metricId: 'metric-1',
                variationId: 'var-treatment',
                units: 600,
                rate: 0.225,
                relativeUplift: 0.0875,
                absoluteUplift: 0.025,
                significant: true,
              },
            ],
            safari: [
              {
                metricId: 'metric-1',
                variationId: 'var-treatment',
                units: 400,
                rate: 0.2125,
                relativeUplift: 0.0656,
                absoluteUplift: 0.0125,
                significant: false,
              },
            ],
          },
        },
        warnings: [],
      };

      const result = transformResponse(response, request);

      // Verify overall exists and has correct structure
      expect(result.overall).toHaveLength(1);
      expect(result.overall[0].metricId).toBe('metric-1');
      expect(result.overall[0].variationResults).toHaveLength(2); // control + treatment

      // Verify slices structure
      expect(result.slices).toBeDefined();
      expect(result.slices.browser).toBeDefined();
      expect(result.slices.browser.chrome).toBeDefined();
      expect(result.slices.browser.safari).toBeDefined();

      // Verify per-slice metrics
      expect(result.slices.browser.chrome).toHaveLength(1);
      expect(result.slices.browser.chrome[0].metricId).toBe('metric-1');
      expect(result.slices.browser.chrome[0].variationResults).toHaveLength(2);

      expect(result.slices.browser.safari).toHaveLength(1);
      expect(result.slices.browser.safari[0].metricId).toBe('metric-1');
      expect(result.slices.browser.safari[0].variationResults).toHaveLength(2);
    });
  });

  describe('Empty response', () => {
    it('should produce empty array for response with no metrics', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [],
        data: {
          overall: {
            control: { units: 1000, metrics: {} },
            treatment: { units: 1000, metrics: {} },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);

      expect(result.overall).toEqual([]);
      expect(result.slices).toEqual({});
    });
  });

  describe('Control variation synthesis', () => {
    it('should include control variation in results with correct baseline stats', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'Conversion', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 1000, metrics: { 'metric-1': 200 } },
            treatment: { units: 1000, metrics: { 'metric-1': 220 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 1000,
            rate: 0.22,
            relativeUplift: 0.1,
            absoluteUplift: 0.02,
            significant: true,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);
      const metricResult = result.overall[0];
      const controlVar = metricResult.variationResults.find(
        (v) => v.variationId === 'var-control'
      );

      expect(controlVar).toBeDefined();
      expect(controlVar!.users).toBe(1000);
      expect(controlVar!.mean).toBe(0.2);
      expect(controlVar!.relativeUplift).toBe(0);
      expect(controlVar!.absoluteUplift).toBe(0);
      expect(controlVar!.significant).toBe(false);
      expect(controlVar!.cupedApplied).toBe(false);
    });

    it('should throw error when no control variation is found in request', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-treatment-1', key: 'treatment-1', weight: 0.5, isControl: false },
          { id: 'var-treatment-2', key: 'treatment-2', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'Test', isGuardrail: false }],
        data: {
          overall: {
            'treatment-1': { units: 1000, metrics: { 'metric-1': 100 } },
            'treatment-2': { units: 1000, metrics: { 'metric-1': 120 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [],
        slices: {},
        warnings: [],
      };

      expect(() => transformResponse(response, request)).toThrow(
        'No control variation found in request'
      );
    });
  });

  describe('Treatment variation omitted from request metrics', () => {
    it('should synthesize control variation even if treatment has no results in response', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [
          { id: 'metric-1', name: 'Conversion', isGuardrail: false },
          { id: 'metric-2', name: 'Revenue', isGuardrail: false },
        ],
        data: {
          overall: {
            control: { units: 1000, metrics: { 'metric-1': 200, 'metric-2': 50000 } },
            treatment: { units: 1000, metrics: { 'metric-1': 220, 'metric-2': 55000 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 1000,
            rate: 0.22,
            relativeUplift: 0.1,
            absoluteUplift: 0.02,
            significant: true,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);

      // metric-1 should have both control and treatment
      expect(result.overall[0].metricId).toBe('metric-1');
      expect(result.overall[0].variationResults).toHaveLength(2);

      // metric-2 should have only control (no treatment result in response)
      expect(result.overall[1].metricId).toBe('metric-2');
      expect(result.overall[1].variationResults).toHaveLength(1);
      expect(result.overall[1].variationResults[0].variationId).toBe('var-control');
    });
  });

  describe('rawPValue preservation', () => {
    it('should pass through rawPValue when present in response', () => {
      const request: AnalysisRequest = {
        engine: 'frequentist',
        correction: 'holm-bonferroni',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'CTR', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 2000, metrics: { 'metric-1': 300 } },
            treatment: { units: 2000, metrics: { 'metric-1': 330 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.6,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 2000,
            rate: 0.165,
            relativeUplift: 0.1,
            absoluteUplift: 0.015,
            significant: true,
            pValue: 0.04,       // corrected
            rawPValue: 0.02,    // pre-correction
            confidenceIntervalLower: 0.152,
            confidenceIntervalUpper: 0.178,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);
      const treatmentVar = result.overall[0].variationResults.find(
        (v) => v.variationId === 'var-treatment'
      );

      expect(treatmentVar!.pValue).toBe(0.04);
      expect(treatmentVar!.rawPValue).toBe(0.02);
    });

    it('should leave rawPValue undefined when not present in response', () => {
      const request: AnalysisRequest = {
        engine: 'frequentist',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'CTR', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 2000, metrics: { 'metric-1': 300 } },
            treatment: { units: 2000, metrics: { 'metric-1': 330 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.6,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 2000,
            rate: 0.165,
            relativeUplift: 0.1,
            absoluteUplift: 0.015,
            significant: true,
            pValue: 0.02,
            confidenceIntervalLower: 0.152,
            confidenceIntervalUpper: 0.178,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);
      const treatmentVar = result.overall[0].variationResults.find(
        (v) => v.variationId === 'var-treatment'
      );

      expect(treatmentVar!.rawPValue).toBeUndefined();
    });
  });

  describe('stddev calculation', () => {
    it('should correctly calculate stddev for treatment variation', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'Test', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 1000, metrics: { 'metric-1': 200 } },
            treatment: { units: 1000, metrics: { 'metric-1': 220 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 1000,
            rate: 0.22,
            relativeUplift: 0.1,
            absoluteUplift: 0.02,
            significant: true,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);
      const treatmentVar = result.overall[0].variationResults.find(
        (v) => v.variationId === 'var-treatment'
      );

      // stddev = sqrt(0.22 * (1 - 0.22) / 1000) = sqrt(0.22 * 0.78 / 1000) = sqrt(0.0001716) ≈ 0.01309
      const expectedStddev = Math.sqrt((0.22 * (1 - 0.22)) / 1000);
      expect(treatmentVar!.stddev).toBeCloseTo(expectedStddev, 6);
    });

    it('should set stddev to 0 when units is 0', () => {
      const request: AnalysisRequest = {
        engine: 'bayesian',
        correction: 'none',
        alpha: 0.05,
        srmThreshold: 0.001,
        variations: [
          { id: 'var-control', key: 'control', weight: 0.5, isControl: true },
          { id: 'var-treatment', key: 'treatment', weight: 0.5, isControl: false },
        ],
        metrics: [{ id: 'metric-1', name: 'Test', isGuardrail: false }],
        data: {
          overall: {
            control: { units: 0, metrics: { 'metric-1': 0 } },
            treatment: { units: 0, metrics: { 'metric-1': 0 } },
          },
          slices: {},
        },
        multipleExposureCount: 0,
      };

      const response: AnalysisResponse = {
        srmPValue: 0.5,
        srmFlagged: false,
        multipleExposureFlagged: false,
        overall: [
          {
            metricId: 'metric-1',
            variationId: 'var-treatment',
            units: 0,
            rate: 0,
            relativeUplift: 0,
            absoluteUplift: 0,
            significant: false,
          },
        ],
        slices: {},
        warnings: [],
      };

      const result = transformResponse(response, request);
      const treatmentVar = result.overall[0].variationResults.find(
        (v) => v.variationId === 'var-treatment'
      );

      expect(treatmentVar!.stddev).toBe(0);
    });
  });
});
