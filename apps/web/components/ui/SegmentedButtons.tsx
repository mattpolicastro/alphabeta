// Mutually-exclusive segmented control. Mirrors the design's `.seg` styling
// on the Feasibility constraints panel — borderless joins between segments,
// terra fill on the active selection.

type Option<V extends string> = { value: V; label: React.ReactNode };

type SegmentedButtonsProps<V extends string> = {
  value: V;
  options: Option<V>[];
  onChange: (next: V) => void;
  ariaLabel?: string;
};

export function SegmentedButtons<V extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: SegmentedButtonsProps<V>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-[6px]"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={
              active
                ? "btn btn-primary"
                : "btn"
            }
            style={{ fontSize: 11 }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
