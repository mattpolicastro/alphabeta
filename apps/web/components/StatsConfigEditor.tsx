'use client';

/**
 * Stats engine and correction selector.
 * Shared between experiment creation wizard and experiment config panel.
 */

type StatsEngine = 'bayesian' | 'frequentist' | 'sequential';
type Correction = 'none' | 'holm-bonferroni' | 'benjamini-hochberg';

export interface StatsConfigEditorProps {
  engine: StatsEngine;
  correction: Correction;
  onEngineChange: (engine: StatsEngine) => void;
  onCorrectionChange: (correction: Correction) => void;
  /** Show longer option descriptions (used in wizard). Default false. */
  verbose?: boolean;
}

export function StatsConfigEditor({
  engine,
  correction,
  onEngineChange,
  onCorrectionChange,
  verbose = false,
}: StatsConfigEditorProps) {
  return (
    <div className="row g-3">
      <div className={verbose ? 'col-12 mb-3' : 'col-md-4'}>
        <label className="form-label">Engine</label>
        <select
          className="form-select"
          value={engine}
          onChange={(e) => onEngineChange(e.target.value as StatsEngine)}
        >
          <option value="bayesian">
            {verbose ? 'Bayesian \u2014 probability of being best, expected loss' : 'Bayesian'}
          </option>
          <option value="frequentist">
            {verbose ? 'Frequentist \u2014 p-value, confidence interval' : 'Frequentist'}
          </option>
          <option value="sequential">
            {verbose ? 'Sequential \u2014 safe continuous monitoring (mSPRT)' : 'Sequential'}
          </option>
        </select>
      </div>
      <div className={verbose ? 'col-12' : 'col-md-4'}>
        <label className="form-label">{verbose ? 'Multiple Comparison Correction' : 'Correction'}</label>
        <select
          className="form-select"
          value={correction}
          onChange={(e) => onCorrectionChange(e.target.value as Correction)}
        >
          <option value="none">None</option>
          <option value="holm-bonferroni">
            {verbose ? 'Holm-Bonferroni (FWER \u2014 conservative)' : 'Holm-Bonferroni'}
          </option>
          <option value="benjamini-hochberg">
            {verbose ? 'Benjamini-Hochberg (FDR \u2014 less conservative)' : 'Benjamini-Hochberg'}
          </option>
        </select>
      </div>
    </div>
  );
}
