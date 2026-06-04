"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BoardProvider } from "@/components/strategy/hooks/BoardProvider";
import { Board } from "@/components/strategy/Board";
import { getBoard, listBoards } from "@/lib/strategy/queries";
import { TEMPLATE_LIST } from "@/lib/strategy/templates";
import { setCurrentBoardId } from "@/lib/strategy/utils/storage";
import type { BoardState, BoardRow, TemplateId } from "@/lib/strategy/types";

const TEMPLATE_NAMES: Record<TemplateId, string> = {
  nsf: "NSF",
  rice: "RICE",
  gps: "GPS",
  okr: "OKR",
  gist: "GIST",
};

export default function StrategyPage() {
  return (
    <Suspense fallback={<div className="ab-wrap" />}>
      <StrategyInner />
    </Suspense>
  );
}

function StrategyInner() {
  const id = useSearchParams().get("id");

  if (!id) return <EmptyState />;

  return <BoardMount id={id} />;
}

function EmptyState() {
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listBoards().then((rows) => {
      if (!cancelled) {
        setBoards(rows);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="ab-wrap">
      <div className="dashed-panel">
        <div className="dashed-panel-title">Strategy</div>
        <p>
          Strategy boards hold the North Star, drivers, problems, goals, and
          work — and the lineage between them.
        </p>
        <p>
          <Link href="/strategy/new">Start a new board →</Link>
        </p>
      </div>

      {loaded && boards.length > 0 && (
        <div className="dashed-panel mt-[14px]">
          <div className="dashed-panel-title">Your boards</div>
          <div className="flex flex-col gap-[6px]">
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/strategy?id=${b.id}`}
                className="flex items-baseline gap-[8px] text-[12.5px] hover:text-terra"
              >
                <span className="rounded bg-terra-soft px-[5px] py-[1px] text-[9.5px] font-medium uppercase tracking-wide text-terra">
                  {TEMPLATE_NAMES[b.templateId] ?? b.templateId}
                </span>
                <span>{b.cycleName || "Untitled board"}</span>
                <span className="text-[10px] text-ink-faint ml-auto">
                  {b.cards.length} cards
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="dashed-panel mt-[14px]">
        <div className="dashed-panel-title">Example boards</div>
        <p className="text-[12px] text-ink-soft mb-[8px]">
          Pre-populated boards for each framework — explore before committing
          to a shape.
        </p>
        <div className="flex flex-wrap gap-[8px]">
          {TEMPLATE_LIST.map((t) => (
            <Link
              key={t.id}
              href={`/strategy/new?example=${t.id}`}
              className="rounded border border-dashed border-rule-faint px-[10px] py-[6px] text-[11.5px] hover:border-rule hover:bg-paper-hover"
            >
              <span className="font-bold">{t.shortName}</span>
              <span className="text-ink-soft ml-[6px]">{t.name}</span>
            </Link>
          ))}
        </div>
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
