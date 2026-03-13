// Shared TypeScript types for both compute paths (Pyodide WASM and Lambda).
// See requirements.md Section 9.3.

export interface AnalysisRequest {
  engine: 'bayesian' | 'frequentist' | 'sequential';
  correction: 'none' | 'holm-bonferroni' | 'benjamini-hochberg';
  alpha: number; // default 0.05
  srmThreshold: number; // default 0.001

  variations: {
    id: string;
    key: string;
    weight: number; // expected proportion 0–1
    isControl: boolean;
  }[];

  metrics: {
    id: string;
    name: string;
    isGuardrail: boolean;
  }[];

  // Pre-aggregated totals — no row-level data
  data: {
    overall: Record<string, VariationData>;
    slices: Record<
      string, // dimension name
      Record<
        string, // dimension value
        Record<string, VariationData> // variation key → data
      >
    >;
  };

  multipleExposureCount: number; // detected client-side during CSV validation
}

export interface VariationData {
  units: number;
  metrics: Record<string, number>; // metric id → raw total
}

export interface AnalysisResponse {
  srmPValue: number;
  srmFlagged: boolean;
  multipleExposureFlagged: boolean;

  overall: MetricVariationResult[];
  slices: Record<
    string, // dimension name
    Record<
      string, // dimension value
      MetricVariationResult[]
    >
  >;

  warnings: string[];
}

export interface MetricVariationResult {
  metricId: string;
  variationId: string;
  units: number;
  rate: number;
  relativeUplift: number;
  absoluteUplift: number;
  significant: boolean;
  // Bayesian
  chanceToBeatControl?: number;
  expectedLoss?: number;
  credibleIntervalLower?: number;
  credibleIntervalUpper?: number;
  // Frequentist / Sequential
  pValue?: number;
  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;
}

// Worker message types for Path A (Pyodide Web Worker)
export type WorkerMessage =
  | { type: 'result'; data: AnalysisResponse }
  | { type: 'error'; message: string }
  | { type: 'status'; message: string };
