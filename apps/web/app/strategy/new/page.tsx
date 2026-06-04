"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mintBoard } from "@/lib/strategy/queries";
import { defaultBoardState } from "@/lib/strategy/constants";
import { getTemplate } from "@/lib/strategy/templates";

export default function NewBoardPage() {
  return (
    <Suspense fallback={<div className="ab-wrap" />}>
      <NewBoardInner />
    </Suspense>
  );
}

function NewBoardInner() {
  const router = useRouter();
  // ?example=nsf seeds the new board with the NSF demo data (22 cards,
  // 14 connections — the Plinth Board exampleBoard fixture). Anything
  // else falls through to an empty board.
  const example = useSearchParams().get("example");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const initial =
          example === "nsf"
            ? getTemplate("nsf").exampleBoard()
            : defaultBoardState();
        const row = await mintBoard(initial);
        if (!cancelled) {
          router.replace(`/strategy?id=${row.id}`);
        }
      } catch (err) {
        console.error("Failed to create new board:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, example]);

  return (
    <div className="ab-wrap">
      <div className="dashed-panel">
        <div className="dashed-panel-title">
          {example === "nsf"
            ? "Loading example board…"
            : "Starting a new board…"}
        </div>
      </div>
    </div>
  );
}
