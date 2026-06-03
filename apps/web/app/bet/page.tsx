"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBet } from "@/lib/bet/queries";
import { currentStage } from "@/lib/lifecycle/stage";

function BetRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    const redirect = async () => {
      const id = searchParams.get("id");
      if (!id) {
        router.replace("/");
        return;
      }

      const bet = await getBet(id);
      if (cancelled) return;
      if (!bet) {
        router.replace("/");
        return;
      }

      const stage = currentStage(bet);
      router.replace(`/bet/${stage}?id=${bet.id}`);
    };

    void redirect();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return <LoadingPanel />;
}

function LoadingPanel() {
  return (
    <div className="ab-wrap">
      <div className="dashed-panel">
        <div className="dashed-panel-title">Resolving…</div>
      </div>
    </div>
  );
}

export default function BetRedirectPage() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <BetRedirectInner />
    </Suspense>
  );
}
