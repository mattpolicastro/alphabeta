// Read-only wager card surfaced on every post-wager screen (Instrument,
// Criteria, Lock, Revisit). Wraps WagerStatic with a small eyebrow header
// labelling the bet as the committed-and-carried artifact.

import type { AbBet } from "@/lib/bet/storage";
import { WagerStatic } from "./WagerStatic";

type CarriedWagerProps = {
  bet: AbBet;
  eyebrow?: string;
};

export function CarriedWager({
  bet,
  eyebrow = "the wager you committed",
}: CarriedWagerProps) {
  return (
    <div className="border-[1.5px] border-dashed border-green-line bg-green-soft p-[14px] mb-[18px]">
      <div className="text-[11px] uppercase tracking-[1px] text-green mb-[8px]">
        {eyebrow}
      </div>
      <WagerStatic bet={bet} />
    </div>
  );
}
