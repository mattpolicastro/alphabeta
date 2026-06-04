type RecruitmentTrackerProps = {
  recruited: number;
  completed: number;
  noShows: number;
  committed: number;
  sampleSpec: string;
};

export function RecruitmentTracker({
  recruited,
  completed,
  noShows,
  committed,
  sampleSpec,
}: RecruitmentTrackerProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-[10px]">
        <div className="border-[1.5px] border-dashed border-rule-faint p-[10px] text-center">
          <div className="text-[9.5px] uppercase tracking-[1px] text-ink-soft mb-[4px]">
            recruited
          </div>
          <div
            className={`text-[20px] font-bold ${
              recruited >= committed ? "text-green" : "text-ink"
            }`}
          >
            {recruited} / {committed}
          </div>
        </div>

        <div className="border-[1.5px] border-dashed border-rule-faint p-[10px] text-center">
          <div className="text-[9.5px] uppercase tracking-[1px] text-ink-soft mb-[4px]">
            completed
          </div>
          <div
            className={`text-[20px] font-bold ${
              completed >= committed ? "text-green" : "text-ink"
            }`}
          >
            {completed} / {committed}
          </div>
        </div>

        <div className="border-[1.5px] border-dashed border-rule-faint p-[10px] text-center">
          <div className="text-[9.5px] uppercase tracking-[1px] text-ink-soft mb-[4px]">
            no-shows
          </div>
          <div
            className={`text-[20px] font-bold ${
              noShows > 0 ? "text-terra" : "text-ink-faint"
            }`}
          >
            {noShows}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-ink-soft mt-[8px]">
        committed sample: {committed} participants · {sampleSpec}
      </div>
    </>
  );
}
