"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BoardProvider } from "@/components/strategy/hooks/BoardProvider";
import { Board } from "@/components/strategy/Board";
import { getBoard } from "@/lib/strategy/queries";
import { setCurrentBoardId } from "@/lib/strategy/utils/storage";
import type { BoardState, BoardRow } from "@/lib/strategy/types";

export default function StrategyPage() {
  return (
    <Suspense fallback={<div className="ab-wrap" />}>
      <StrategyInner />
    </Suspense>
  );
}

function StrategyInner() {
  const id = useSearchParams().get("id");

  // No id → empty-state CTA. Mirrors /'s journal-empty pattern.
  if (!id) return <EmptyState />;

  return <BoardMount id={id} />;
}

function EmptyState() {
  return (
    <div className="ab-wrap">
      <div className="dashed-panel">
        <div className="dashed-panel-title">No board open</div>
        <p>
          Strategy boards hold the North Star, drivers, problems, goals, and
          work — and the lineage between them.
        </p>
        <p>
          <Link href="/strategy/new">Start a new board →</Link>
        </p>
        <p>
          <Link href="/strategy/new?example=nsf">
            Load the example NSF board →
          </Link>{" "}
          <span className="text-ink-faint text-[11px]">
            (22 cards, 14 connections — for exploration)
          </span>
        </p>
      </div>
    </div>
  );
}

function BoardMount({ id }: { id: string }) {
  const [initial, setInitial] = useState<BoardState | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const row: BoardRow | undefined = await getBoard(id);
      if (cancelled) return;
      if (!row) {
        setNotFound(true);
        return;
      }
      setCurrentBoardId(id);
      const { id: _id, ownerId: _o, createdAt: _c, updatedAt: _u, ...state } =
        row;
      setInitial(state);
    })();
    return () => {
      cancelled = true;
      setCurrentBoardId(null);
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="ab-wrap">
        <div className="dashed-panel">
          <div className="dashed-panel-title">Board not found</div>
          <p>
            No board exists at <code>?id={id}</code>.{" "}
            <Link href="/strategy/new">Start a new one →</Link>
          </p>
        </div>
      </div>
    );
  }

  if (!initial) {
    return <div className="ab-wrap" />;
  }

  return (
    <div className="strategy-canvas">
      <BoardProvider initialState={initial}>
        <Board />
      </BoardProvider>
    </div>
  );
}
