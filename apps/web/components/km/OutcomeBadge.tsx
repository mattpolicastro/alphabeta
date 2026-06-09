import type { BetOutcome } from "@/lib/km/types";

const STYLES: Record<BetOutcome, string> = {
  won: "text-paper bg-green border-green",
  lost: "text-paper bg-terra border-terra",
  inconclusive: "text-amber border-amber-line bg-amber-soft",
};

export function OutcomeBadge({ outcome }: { outcome: BetOutcome }) {
  return (
    <span
      className={`text-[8.5px] tracking-[0.5px] uppercase px-[7px] py-[2px] border-[1.5px] ${STYLES[outcome]}`}
    >
      {outcome === "inconclusive" ? "incon." : outcome}
    </span>
  );
}
