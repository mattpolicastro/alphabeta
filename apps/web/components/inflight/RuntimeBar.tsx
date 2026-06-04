type RuntimeBarProps = {
  currentDay: number;
  committedDays: number;
};

export function RuntimeBar({ currentDay, committedDays }: RuntimeBarProps) {
  const fillPercent = Math.min(100, (currentDay / committedDays) * 100);

  return (
    <div>
      <div className="h-[10px] border-[1.5px] border-solid border-rule bg-white/50 relative">
        <div
          className="absolute left-0 top-0 bottom-0 bg-terra"
          style={{ width: `${fillPercent}%` }}
        />
        <div className="absolute left-[100%] top-[-4px] bottom-[-4px] w-[2px] bg-green" />
      </div>
      <div className="flex justify-between text-[9.5px] text-ink-faint mt-[5px]">
        <span>day 0</span>
        <span>
          now: <b className="text-terra">day {currentDay}</b>
        </span>
        <span>
          committed: <b className="text-terra">day {committedDays}</b>
        </span>
      </div>
    </div>
  );
}
