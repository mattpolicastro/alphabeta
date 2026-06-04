"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { mintBoard } from "@/lib/strategy/queries";
import { defaultBoardState } from "@/lib/strategy/constants";

export default function NewBoardPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await mintBoard(defaultBoardState());
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
  }, [router]);

  return (
    <div className="ab-wrap">
      <div className="dashed-panel">
        <div className="dashed-panel-title">Starting a new board…</div>
      </div>
    </div>
  );
}
