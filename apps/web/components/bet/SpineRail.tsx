import type { ReactNode } from "react";

export type SpineStep = {
  n: number;
  label: ReactNode;
  status: "active" | "done" | "reachable" | "locked";
  href?: string;
};

type SpineRailProps = {
  steps: SpineStep[];
};

export function SpineRail({ steps }: SpineRailProps) {
  return (
    <nav className="spine-rail" aria-label="Bet lifecycle progress">
      {steps.map((step, i) => (
        <span key={step.n} className="contents">
          <SpineRailChip step={step} />
          {i < steps.length - 1 && (
            <span className="srail-arrow" aria-hidden>
              →
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

function SpineRailChip({ step }: { step: SpineStep }) {
  const cls = `srail srail-${step.status}`;
  const content = (
    <>
      <span className="sn">{step.n}</span> {step.label}
    </>
  );
  if (step.href && step.status !== "locked") {
    return (
      <a className={cls} href={step.href}>
        {content}
      </a>
    );
  }
  return <div className={cls}>{content}</div>;
}
