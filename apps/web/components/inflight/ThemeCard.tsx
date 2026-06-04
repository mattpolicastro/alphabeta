type ThemeDirection = 'supports' | 'contradicts' | 'neutral';

type ThemeCardProps = {
  name: string;
  participantCount: string;
  direction: ThemeDirection;
  directionLabel?: string;
  quotes?: string;
};

const DIRECTION_STYLES: Record<ThemeDirection, string> = {
  supports: "text-green border-green/50",
  contradicts: "text-terra border-terra/50",
  neutral: "text-ink-faint border-rule-faint",
};

const DEFAULT_DIRECTION_TEXTS: Record<ThemeDirection, string> = {
  supports: "supports",
  contradicts: "contradicts",
  neutral: "neutral / mixed",
};

export function ThemeCard({ name, participantCount, direction, directionLabel, quotes }: ThemeCardProps) {
  const directionStyle = DIRECTION_STYLES[direction];
  const directionText = DEFAULT_DIRECTION_TEXTS[direction];

  return (
    <div className="border-[1.5px] border-solid border-rule-faint bg-white/40 p-3 mb-[10px]">
      <div className="flex justify-between items-baseline gap-[10px]">
        <span className="text-[13px] font-bold">{name}</span>
        <span className="text-[10px] text-ink-soft">{participantCount}</span>
      </div>
      <span className={`text-[10px] tracking-[1px] uppercase px-[7px] py-[2px] border-[1.5px] mt-[6px] inline-block ${directionStyle}`}>
        {directionLabel ?? directionText}
      </span>
      {quotes && (
        <div className="mt-2 text-[11px] text-ink-soft leading-[1.5] italic border-l-[3px] border-rule-faint pl-[10px]">
          {quotes}
        </div>
      )}
    </div>
  );
}
