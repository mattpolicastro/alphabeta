type GuardrailStatus = 'ok' | 'warn';

type GuardrailRowProps = {
  name: string;
  value: string;
  status: GuardrailStatus;
};

export function GuardrailRow({ name, value, status }: GuardrailRowProps) {
  const colorByStatus = status === 'ok' ? 'text-green' : 'text-amber';
  const statusBadge = status === 'ok' ? 'text-green border-green/50' : 'text-amber border-amber/50';

  return (
    <div className="flex items-center gap-[10px] mb-2">
      <span className="text-[11.5px] flex-1">{name}</span>
      <span className={`text-[13px] font-bold ${colorByStatus}`}>{value}</span>
      <span className={`text-[9px] tracking-[1px] uppercase px-[7px] py-[2px] border-[1.5px] ${statusBadge}`}>
        {status === 'ok' ? 'holding' : 'elevated'}
      </span>
    </div>
  );
}
