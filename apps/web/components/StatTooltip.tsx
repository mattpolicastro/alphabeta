/**
 * CSS-only hover tooltip for statistical terms.
 * No Bootstrap JS required — uses a positioned pseudo-element pattern
 * implemented with inline styles and a visually-hidden <span> for the definition.
 */

import type { ReactNode } from 'react';

export interface StatTooltipProps {
  /** The visible label text. */
  term: ReactNode;
  /** Plain-English definition shown on hover. */
  definition: string;
}

/**
 * Wraps a statistical term with a dotted-underline hint and a hover tooltip.
 *
 * Implementation: uses the native `title` attribute for maximum compatibility
 * and zero JS. The dotted underline signals to users that a tooltip is available.
 */
export function StatTooltip({ term, definition }: StatTooltipProps) {
  return (
    <span
      title={definition}
      style={{
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
        textUnderlineOffset: '2px',
        cursor: 'help',
      }}
    >
      {term}
    </span>
  );
}

// ----- Pre-defined terms -----

/** Convenience wrapper — renders "p-value" with its definition. */
export function PValueTip() {
  return (
    <StatTooltip
      term="p-value"
      definition="The probability of observing a result at least as extreme as this one, assuming there is no real difference between variations."
    />
  );
}

/** Convenience wrapper — renders "CTW" (chance to win). */
export function CTWTip() {
  return (
    <StatTooltip
      term="CTW"
      definition="Confidence That Wins — the Bayesian posterior probability that this variation is better than control."
    />
  );
}

/** Convenience wrapper — renders "SRM" (sample ratio mismatch). */
export function SRMTip() {
  return (
    <StatTooltip
      term="Sample Ratio Mismatch"
      definition="A check that users were split between variations in the expected ratio. A mismatch suggests a data pipeline or randomization bug."
    />
  );
}

/** Convenience wrapper — renders "credible interval". */
export function CredibleIntervalTip() {
  return (
    <StatTooltip
      term="Credible interval"
      definition="A Bayesian range of plausible values for the true effect. There is a 95% probability the true value lies within this interval, given the data and prior."
    />
  );
}

/** Convenience wrapper — renders "confidence interval". */
export function ConfidenceIntervalTip() {
  return (
    <StatTooltip
      term="Confidence interval"
      definition="A frequentist range such that, across repeated experiments, 95% of these intervals would contain the true effect."
    />
  );
}

/** Convenience wrapper — renders "Holm-Bonferroni". */
export function HolmBonferroniTip() {
  return (
    <StatTooltip
      term="Holm-Bonferroni"
      definition="A step-down multiple-testing correction that controls the family-wise error rate. More powerful than plain Bonferroni, but still conservative."
    />
  );
}

/** Convenience wrapper — renders "Benjamini-Hochberg". */
export function BenjaminiHochbergTip() {
  return (
    <StatTooltip
      term="Benjamini-Hochberg"
      definition="A multiple-testing correction that controls the false discovery rate (FDR). Less conservative than Holm-Bonferroni, allowing more true positives at the cost of a small expected proportion of false positives."
    />
  );
}

/** Convenience wrapper — renders "Cohen's h". */
export function CohensHTip() {
  return (
    <StatTooltip
      term="Cohen&rsquo;s h"
      definition="An effect-size measure for the difference between two proportions. Values below 0.2 are considered small effects."
    />
  );
}

/** Convenience wrapper — renders "MDE". */
export function MDETip() {
  return (
    <StatTooltip
      term="MDE"
      definition="Minimum Detectable Effect — the smallest lift the experiment is designed to reliably detect at the given power and significance level."
    />
  );
}

/** Convenience wrapper — renders "statistical power" or just "Power". */
export function PowerTip({ label = 'Power' }: { label?: string }) {
  return (
    <StatTooltip
      term={label}
      definition="Statistical power — the probability that the test correctly detects a real effect of the specified size. Typically set to 80%."
    />
  );
}

/** Convenience wrapper — renders "alpha" / "α". */
export function AlphaTip({ label = '\u03B1' }: { label?: string }) {
  return (
    <StatTooltip
      term={label}
      definition="Significance level (alpha) — the maximum acceptable probability of a false positive. Typically set to 5%."
    />
  );
}

/** Convenience wrapper — renders "expected loss". */
export function ExpectedLossTip() {
  return (
    <StatTooltip
      term="Expected loss"
      definition="The average amount you expect to lose by choosing this variation, if it is actually worse. Lower is better."
    />
  );
}

/** Convenience wrapper — renders "CUPED". */
export function CUPEDTip() {
  return (
    <StatTooltip
      term="CUPED"
      definition="Controlled-experiment Using Pre-Experiment Data — a variance reduction technique that uses pre-experiment behavior to reduce noise and increase power."
    />
  );
}
