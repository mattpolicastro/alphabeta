import type { Outcome } from '@/lib/db/types';

type BucketResultProps = {
  outcome: Outcome;
  why: string;
  actionLabel?: string;
  action: string;
};

const outcomeStyles: Record<Outcome, { border: string; bg: string; title: string }> = {
  win: { border: 'border-green/50', bg: 'bg-green/[.07]', title: 'text-green' },
  inconclusive: { border: 'border-amber/50', bg: 'bg-amber/[.08]', title: 'text-amber' },
  loss: { border: 'border-terra/50', bg: 'bg-terra/[.07]', title: 'text-terra' },
};

export function BucketResult({ outcome, why, actionLabel, action }: BucketResultProps) {
  const styles = outcomeStyles[outcome];
  const label = actionLabel ?? 'your pre-registered action for this outcome';

  return (
    <div className={`border-[1.5px] border-solid p-[14px] ${styles.border} ${styles.bg}`}>
      <div className={`text-[18px] font-bold ${styles.title}`}>
        {outcome.toUpperCase()}
      </div>
      <div className="text-[11.5px] text-ink-soft mt-[6px] leading-[1.5]">
        {why}
      </div>
      <div className="mt-[10px] border-t border-dashed border-rule-faint pt-[10px]">
        <div className="text-[9px] tracking-[1px] uppercase text-ink-soft mb-1">
          {label}
        </div>
        <div className="text-[12.5px] font-medium">
          {action}
        </div>
      </div>
    </div>
  );
}
