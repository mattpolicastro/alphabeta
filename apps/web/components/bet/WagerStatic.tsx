// Read-only rendering of the assembled wager. Used on Commit & Lock and
// Revisit to surface the committed bet without input affordances.

import type { AbBet } from "@/lib/bet/storage";

type WagerStaticProps = {
  bet: AbBet;
};

export function WagerStatic({ bet }: WagerStaticProps) {
  const v = (s?: string) => (s && s.trim().length > 0 ? s : "—");
  return (
    <div className="wager">
      <span className="lead-in">I&apos;m betting that </span>
      <span className="tok">{v(bet.change)}</span>
      <span className="lead-in"> will </span>
      <span className="tok">{bet.direction ?? "—"}</span>
      <span className="lead-in"> </span>
      <span className="tok">{v(bet.metric)}</span>
      <span className="lead-in"> by about </span>
      <span className="tok">{v(bet.magnitude)}</span>
      <span className="lead-in">. I&apos;m </span>
      <span className="tok">{bet.confidence ?? "—"}</span>
      <span className="lead-in"> sure, because </span>
      <span className="tok">{v(bet.mechanism)}</span>
      <span className="lead-in">. I&apos;ll fold if </span>
      <span className="tok">{v(bet.foldIf)}</span>
      <span className="lead-in">.</span>
    </div>
  );
}
