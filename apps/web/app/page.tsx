"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { WagerStatic } from "@/components/bet/WagerStatic";
import { DashedPanel } from "@/components/ui/DashedPanel";
import { listBets } from "@/lib/bet/queries";
import type { Bet } from "@/lib/db/types";
import type { AbBet } from "@/lib/bet/storage";

type LoadState = "loading" | "loaded" | "empty";

export default function Home() {
  const [load, setLoad] = useState<LoadState>("loading");
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    const loadBets = async () => {
      try {
        const result = await listBets();
        setBets(result);
        setLoad(result.length > 0 ? "loaded" : "empty");
      } catch (error) {
        console.error("Failed to load bets:", error);
        setLoad("empty");
      }
    };

    loadBets();
  }, []);

  const timeAgo = (iso: string): string => {
    const now = Date.now();
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "just now";
    
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "just now";
  };

  const buildAbBet = (bet: Bet): AbBet => {
    return {
      change: bet.articulation.change || undefined,
      direction: bet.articulation.direction,
      metric: bet.articulation.metric || undefined,
      magnitude: bet.articulation.magnitude || undefined,
      mechanism: bet.articulation.mechanism ?? undefined,
      confidence: bet.articulation.confidence,
      foldIf: bet.articulation.foldIf || undefined,
    };
  };

  const renderBetRow = (bet: Bet) => {
    const abBet = buildAbBet(bet);
    const isDraft = bet.status === "draft";
    const status = bet.status;
    let statusClass = "";
    let statusLabel = "";
    
    if (status === "draft") {
      statusClass = "st-draft";
      statusLabel = "draft";
    } else if (status === "locked" || status === "running") {
      statusClass = "st-locked";
      statusLabel = "locked";
    } else if (status === "resolved") {
      if (bet.resolution.outcome === "win") {
        statusClass = "st-won";
        statusLabel = "won";
      } else if (bet.resolution.outcome === "loss") {
        statusClass = "st-lost";
        statusLabel = "lost";
      } else {
        statusClass = "st-locked";
        statusLabel = "resolved";
      }
    }

    const href = isDraft 
      ? `/bet/front-door?id=${bet.id}`
      : `/bet/revisit?id=${bet.id}`;
    
    const metadata = isDraft
      ? `updated ${timeAgo(bet.updatedAt)}`
      : `locked ${timeAgo(bet.lockedAt!)} · ${bet.fingerprint?.slice(0, 16)}...`;

    return (
      <a 
        key={bet.id} 
        href={href}
        className="text-inherit no-underline"
      >
        <div className="dashed-panel">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="mb-2">
                <WagerStatic bet={abBet} />
              </div>
              <div className="text-[11.5px] text-ink-soft">
                {metadata}
              </div>
            </div>
            <div className={`st ${statusClass}`}>
              {statusLabel}
            </div>
          </div>
        </div>
      </a>
    );
  };

  return (
    <div className="ab-wrap">
      <header className="border-b-[1.5px] border-dashed border-rule pb-[18px] mb-[20px]">
        <div className="wordmark">
          alph<span className="a">⍺</span>
          <span className="b">β</span>eta
        </div>
        <div className="text-[13.5px] text-ink-soft mt-[6px]">
          journal — every bet logged on this device. nothing leaves the browser.
        </div>
      </header>

      <div className="mb-[20px]">
        <ButtonLink variant="primary" href="/bet/new">
          Start a new bet ▸
        </ButtonLink>
      </div>

      {load === "loading" && (
        <div className="text-center text-ink-soft">Loading bets...</div>
      )}

      {load === "empty" && (
        <DashedPanel title="No bets yet">
          The discipline starts the first time you sharpen a loose idea into something that can lose. Start your first bet to see it persist here.
        </DashedPanel>
      )}

      {load === "loaded" && (
        <div className="space-y-4">
          {bets.map(renderBetRow)}
        </div>
      )}
    </div>
  );
}
