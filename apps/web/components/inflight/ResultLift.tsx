type ResultLiftProps = {
  lift: number;
  ci: [number, number] | null;
  metric: string;
  foldIf: number;
};

export function ResultLift({ lift, ci, metric, foldIf }: ResultLiftProps) {
  const sign = lift >= 0 ? '+' : '';
  const formattedLift = `${sign}${lift.toFixed(1)}%`;

  let colorClass = 'text-ink';
  if (lift >= foldIf) {
    colorClass = 'text-green';
  } else if (lift <= 0) {
    colorClass = 'text-terra';
  }

  let ciText = 'confidence interval not available';
  if (ci !== null) {
    const fmt = (v: number) => (v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`);
    ciText = `95% CI: [${fmt(ci[0])}, ${fmt(ci[1])}]`;
  }

  return (
    <div>
      <div className={`text-[34px] font-bold leading-none ${colorClass}`}>
        {formattedLift}
      </div>
      <div className="text-[11.5px] text-ink-soft mt-[6px]">
        {ciText}
      </div>
      <div className="text-[11px] text-ink-faint mt-[4px]">
        observed relative lift on {metric}
      </div>
    </div>
  );
}
