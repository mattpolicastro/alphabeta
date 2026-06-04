import { useState } from "react";
import { WagerStatic } from "@/components/bet/WagerStatic";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { AbBet } from "@/lib/bet/storage";
import type { Bet } from "@/lib/db/types";

type BetCardProps = {
  bet: Bet;
  compact?: boolean;
  onDelete?: (id: string) => void;
};

function buildAbBet(b: Bet): AbBet {
  return {
    change: b.articulation.change || undefined,
    direction: b.articulation.direction,
    metric: b.articulation.metric || undefined,
    magnitude: b.articulation.magnitude || undefined,
    mechanism: b.articulation.mechanism ?? undefined,
    confidence: b.articulation.confidence,
    foldIf: b.articulation.foldIf || undefined,
  };
}

function hrefFor(bet: Bet): string {
  return bet.status === "draft"
    ? `/bet/wager?id=${bet.id}`
    : `/bet/revisit?id=${bet.id}`;
}

type StatusBadge = { cls: string; label: string };

function badgeFor(bet: Bet): StatusBadge {
  if (bet.status === "draft") return { cls: "st-draft", label: "draft" };
  if (bet.status === "locked" || bet.status === "running") {
    return { cls: "st-locked", label: "locked" };
  }
  // resolved
  if (bet.resolution.outcome === "win") return { cls: "st-won", label: "won" };
  if (bet.resolution.outcome === "loss") return { cls: "st-lost", label: "lost" };
  return { cls: "st-locked", label: "resolved" };
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "just now";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (minutes >= 1) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  return "just now";
}

function metadataLine(bet: Bet): string {
  if (bet.status === "draft") {
    return `updated ${timeAgo(bet.updatedAt)}`;
  }
  const stamp = bet.lockedAt ? timeAgo(bet.lockedAt) : "—";
  const fpShort = bet.fingerprint ? `${bet.fingerprint.slice(0, 16)}…` : "";
  return `locked ${stamp}${fpShort ? ` · ${fpShort}` : ""}`;
}

function compactSummary(bet: Bet): string {
  const a = bet.articulation;
  const change = a.change?.trim() || "—";
  const magnitude = a.magnitude?.trim() || "?";
  const dir = a.direction === "reduce" ? "↓" : "↑";
  return `${change} · ${dir}${magnitude}`;
}

export function BetCard({ bet, compact = false, onDelete }: BetCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const badge = badgeFor(bet);
  const isDraft = bet.status === "draft";

  return (
    <div className="dashed-panel relative" data-testid={`bet-card-${bet.id}`}>
      <a
        href={hrefFor(bet)}
        className="text-inherit no-underline block"
      >
        <div className="flex justify-between items-start gap-[10px]">
          <div className="flex-1 min-w-0">
            {compact ? (
              <div className="text-[12.5px] leading-[1.4] break-words">
                {compactSummary(bet)}
              </div>
            ) : (
              <WagerStatic bet={buildAbBet(bet)} />
            )}
            <div className="mt-[8px] text-[11.5px] text-ink-soft break-all">
              {metadataLine(bet)}
            </div>
          </div>
          <span className={`st ${badge.cls} flex-shrink-0`}>{badge.label}</span>
        </div>
      </a>
      {isDraft && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setConfirmOpen(true);
          }}
          className="absolute top-[8px] right-[8px] text-[10px] text-ink-faint hover:text-terra"
          aria-label="Delete draft"
          title="Delete draft"
        >
          ✕
        </button>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete draft?"
        message="This draft bet will be permanently removed. Locked and resolved bets cannot be deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete?.(bet.id);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
