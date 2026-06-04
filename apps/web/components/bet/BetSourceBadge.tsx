// Shown on every bet-stage page when the bet was elevated from a
// strategy card (i.e. bet.cardId is non-null). Renders nothing
// otherwise. SP-E ships the badge as text-only; a back-link to the
// source card requires knowing which board the card lives on, which
// the Bet row doesn't carry yet — revisit when boardId joins the bet
// schema.

type Props = { cardId: string | null | undefined };

export function BetSourceBadge({ cardId }: Props) {
  if (!cardId) return null;
  return (
    <p className="bet-source-badge" data-bet-source-badge>
      <span aria-hidden>↗</span> Elevated from a strategy card.
    </p>
  );
}
