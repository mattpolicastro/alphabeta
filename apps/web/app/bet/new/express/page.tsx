"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Walkthrough, WalkthroughStep } from "@/components/shell/Walkthrough";
import { mintDraft } from "@/lib/bet/queries";

export default function ExpressBetPage() {
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
      <Walkthrough>
        <WalkthroughStep n={1} title="Express lane">
          You already know what you want to test. This creates a blank draft and drops you straight into the wager form — no decomposition, no classification.
        </WalkthroughStep>
      </Walkthrough>
      <div className="dashed-panel">
        <div className="dashed-panel-title">Starting a new bet…</div>
      </div>
    </div>
  );
}
