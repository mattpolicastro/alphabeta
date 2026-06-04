import { BetCard } from "@/components/journal/BetCard";
import type { Bet } from "@/lib/db/types";
import { groupBetsByStatus, ALL_STATUSES } from "@/lib/journal/filter";

type BoardViewProps = {
  bets: Bet[];
};

export function BoardView({ bets }: BoardViewProps) {
  const groups = groupBetsByStatus(bets);
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {ALL_STATUSES.map((status) => {
        const betGroup = groups[status];
        const count = betGroup.length;
        
        return (
          <div key={status}>
            <div className="text-[10px] uppercase tracking-[1px] text-ink-soft mb-[8px]">
              {status} <span className="text-ink-faint">({count})</span>
            </div>
            <div className="flex flex-col gap-[10px]">
              {betGroup.length > 0 ? (
                betGroup.map((bet) => (
                  <BetCard key={bet.id} bet={bet} />
                ))
              ) : (
                <div className="text-[11px] text-ink-faint italic">no bets yet</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
