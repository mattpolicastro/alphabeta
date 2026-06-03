"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { mintDraft } from "@/lib/bet/queries";

export default function NewBetPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const bet = await mintDraft();
        if (!cancelled) {
          router.replace(`/bet/wager?id=${bet.id}`);
        }
      } catch (error) {
        console.error("Failed to create new bet:", error);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="ab-wrap">
      <div className="dashed-panel">
        <div className="dashed-panel-title">Starting a new bet…</div>
      </div>
    </div>
  );
}
