import type { ReactNode } from "react";

export type IntegrityCheckStatus = 'ok' | 'warn' | 'fail';

type IntegrityCheckProps = {
  status: IntegrityCheckStatus;
  title: string;
  detail: ReactNode;
};

const STATUS_CONFIG: Record<IntegrityCheckStatus, { cls: string; icon: string }> = {
  ok: { cls: 'text-green border-green/50 bg-green/[.07]', icon: '✓' },
  warn: { cls: 'text-amber border-amber/50 bg-amber/[.08]', icon: '!' },
  fail: { cls: 'text-terra border-terra/50 bg-terra/[.07]', icon: '✕' },
};

export function IntegrityCheck({ status, title, detail }: IntegrityCheckProps) {
  const { cls, icon } = STATUS_CONFIG[status];

  return (
    <div className="flex items-start gap-3">
      <div className={`w-[28px] h-[28px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${cls}`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[12.5px] font-bold">{title}</span>
        <span className="text-[11px] text-ink-soft leading-[1.5] mt-1">{detail}</span>
      </div>
    </div>
  );
}
