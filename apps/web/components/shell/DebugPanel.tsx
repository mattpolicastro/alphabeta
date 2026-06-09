"use client";

import { useState, useEffect } from "react";
import { __resetDb, getDb } from "@/lib/db";
import { seedDemoBets, clearDemoBets } from "@/lib/bet/seed";
import { getWalkthroughEnabled, setWalkthroughEnabled } from "@/lib/walkthrough";

export function DebugPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [betCount, setBetCount] = useState<number | null>(null);
  const [walkthroughOn, setWalkthroughOn] = useState(true);

  useEffect(() => {
    if (open) {
      getDb().bets.count().then(setBetCount);
      setWalkthroughOn(getWalkthroughEnabled());
    }
  }, [open]);

  if (!open) return null;

  async function refreshCount() {
    const count = await getDb().bets.count();
    setBetCount(count);
  }

  return (
    <>
      {/* backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 200,
        }}
        onClick={onClose}
      />

      {/* panel */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: 340,
          background: "var(--color-paper)",
          borderLeft: "1.5px dashed var(--color-rule)",
          zIndex: 201,
          padding: 24,
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: "bold" }}>settings</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {/* data · debug */}
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-ink-soft)",
            marginBottom: 10,
          }}
        >
          data · debug
        </div>

        <div style={{ fontSize: 11.5, marginBottom: 12 }}>
          {betCount !== null ? `${betCount} bet(s) in store` : "loading…"}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <button
            className="btn"
            style={{ width: "100%", textAlign: "center" }}
            onClick={async () => {
              await seedDemoBets();
              await refreshCount();
            }}
          >
            Load demo fixtures
          </button>
          <button
            className="btn"
            style={{ width: "100%", textAlign: "center" }}
            onClick={async () => {
              await clearDemoBets();
              await refreshCount();
            }}
          >
            Clear demo fixtures
          </button>
          <button
            className="btn"
            style={{
              width: "100%",
              textAlign: "center",
              color: "var(--color-terra)",
              borderColor: "var(--color-terra-line)",
            }}
            onClick={async () => {
              await __resetDb();
              window.location.reload();
            }}
          >
            Nuke everything (full reset)
          </button>
        </div>

        <div
          style={{
            fontSize: 10,
            color: "var(--color-ink-faint)",
            fontStyle: "italic",
            marginBottom: 24,
          }}
        >
          Nuke deletes the entire IndexedDB and reloads the page.
        </div>

        {/* settings */}
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-ink-soft)",
            marginBottom: 10,
          }}
        >
          settings
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 11.5,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={walkthroughOn}
            onChange={(e) => {
              const on = e.target.checked;
              setWalkthroughOn(on);
              setWalkthroughEnabled(on);
              window.location.reload();
            }}
            style={{ accentColor: "var(--color-plinth)" }}
          />
          Show walkthrough modules
        </label>
        <div
          style={{
            fontSize: 10,
            color: "var(--color-ink-faint)",
            fontStyle: "italic",
            marginTop: 6,
          }}
        >
          Contextual guidance on each screen. Reloads the page on toggle.
        </div>
      </div>
    </>
  );
}
