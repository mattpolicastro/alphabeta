type Cell = {
  label: string;
  value: string;
  highlight?: boolean;
};

type StatsReadoutProps = {
  cells: Cell[];
};

export function StatsReadout({ cells }: StatsReadoutProps) {
  return (
    <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
      {cells.map((cell, idx) => (
        <div key={idx} className="border-[1.5px] border-dashed border-rule-faint p-[10px]">
          <div className="text-[9.5px] uppercase tracking-[1px] text-ink-soft mb-[4px]">
            {cell.label}
          </div>
          <div className={`text-[16px] font-bold ${cell.highlight ? 'text-terra' : 'text-ink'}`}>
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}
