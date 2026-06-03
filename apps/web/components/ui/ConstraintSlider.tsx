// Labeled range slider with a word-based readout. The Feasibility screen
// uses three of these for traffic / urgency / claim, each on a 1–5 scale
// with a word per stop ("a trickle" / "abundant" / etc).

type ConstraintSliderProps = {
  label: React.ReactNode;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  words: string[]; // index-aligned with value; words[1..max] used
  onChange: (next: number) => void;
};

export function ConstraintSlider({
  label,
  value,
  min = 1,
  max = 5,
  step = 1,
  words,
  onChange,
}: ConstraintSliderProps) {
  const word = words[value] ?? "";
  return (
    <div className="mb-[14px]">
      <div className="flex items-baseline justify-between gap-[10px] mb-[6px]">
        <span className="text-[10.5px] uppercase tracking-[1px] text-ink-soft">
          {label}
        </span>
        <span className="text-[11.5px] text-terra">{word}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full"
      />
      {words.length >= 2 && (
        <div className="flex justify-between text-[10px] text-ink-faint mt-[2px]">
          <span>{words[min]}</span>
          <span>{words[max]}</span>
        </div>
      )}
    </div>
  );
}
