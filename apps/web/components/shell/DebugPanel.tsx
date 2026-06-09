"use client";

import { useRef, useState, useEffect } from "react";
import { __resetDb, getDb } from "@/lib/db";
import { seedDemoBets, clearDemoBets } from "@/lib/bet/seed";
import { getWalkthroughEnabled, setWalkthroughEnabled } from "@/lib/walkthrough";
import {
  exportAll,
  importAll,
  downloadExport,
  readImportFile,
} from "@/lib/db/portable";

export function DebugPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [betCount, setBetCount] = useState<number | null>(null);
  const [boardCount, setBoardCount] = useState<number | null>(null);
  const [walkthroughOn, setWalkthroughOn] = useState(true);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const db = getDb();
      db.bets.count().then(setBetCount);
      db.boards.count().then(setBoardCount);
      setWalkthroughOn(getWalkthroughEnabled());
      setImportStatus(null);
    }
  }, [open]);

  if (!open) return null;

  async function refreshCounts() {
    const db = getDb();
    setBetCount(await db.bets.count());
    setBoardCount(await db.boards.count());
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
          {betCount !== null
            ? `${betCount} bet(s), ${boardCount ?? 0} board(s) in store`
            : "loading…"}
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
              await refreshCounts();
            }}
          >
            Load demo fixtures
          </button>
          <button
            className="btn"
            style={{ width: "100%", textAlign: "center" }}
            onClick={async () => {
              await clearDemoBets();
              await refreshCounts();
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

        {/* import / export */}
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-ink-soft)",
            marginBottom: 10,
          }}
        >
          import / export
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
              const envelope = await exportAll();
              downloadExport(envelope);
            }}
          >
            Export all data
          </button>
          <button
            className="btn"
            style={{ width: "100%", textAlign: "center" }}
            onClick={() => fileInputRef.current?.click()}
          >
            Import (merge)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const data = await readImportFile(file);
                const result = await importAll(data, "merge");
                if (result.ok) {
                  setImportStatus(
                    `Imported ${result.counts.bets} bet(s), ${result.counts.boards} board(s)`,
                  );
                  await refreshCounts();
                } else {
                  setImportStatus(`Error: ${result.error}`);
                }
              } catch (err) {
                setImportStatus(
                  `Error: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
              e.target.value = "";
            }}
          />
        </div>

        {importStatus && (
          <div
            style={{
              fontSize: 10,
              color: importStatus.startsWith("Error")
                ? "var(--color-terra)"
                : "var(--color-ink-soft)",
              fontStyle: "italic",
              marginBottom: 24,
            }}
          >
            {importStatus}
          </div>
        )}

        <div
          style={{
            fontSize: 10,
            color: "var(--color-ink-faint)",
            fontStyle: "italic",
            marginBottom: 24,
          }}
        >
          Export saves all bets and boards as a versioned JSON file.
          Import merges into existing data (matching IDs are overwritten).
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
