"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage, RouteAction } from "@/lib/compose/types";
import type { ConversationNode } from "@/lib/compose/templates";
import {
  PRESET_INPUTS,
  getConversationForPreset,
  getConversationForAltitude,
} from "@/lib/compose/templates";
import { classifyAltitude } from "@/lib/compose/altitude";
import { negotiateProvider } from "@/lib/llm/provider";
import type { LLMProvider, ChatTurn, ChatResponse } from "@/lib/llm/provider";
import { mintFromExtraction, stashSequenceSeed } from "@/lib/compose/handoff";
import { mintDraft } from "@/lib/bet/queries";
import { ExtractionCard } from "./ExtractionCard";
import { AltitudeBadge } from "./AltitudeBadge";
import { ReplyChips } from "./ReplyChips";
import { ChatInput } from "./ChatInput";

let msgSeq = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++msgSeq}`;
}

const GREETING: ChatMessage = {
  id: "greeting",
  role: "system",
  text: "What are you thinking about testing, changing, or figuring out? Say it however it comes out — I'll help structure it.",
};

export function DecompositionChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [activeBranches, setActiveBranches] =
    useState<Record<string, () => ConversationNode> | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [llm, setLlm] = useState<LLMProvider | null>(null);
  const [llmHistory, setLlmHistory] = useState<ChatTurn[]>([]);
  const [latestExtractions, setLatestExtractions] =
    useState<ChatResponse["extractions"]>(undefined);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    negotiateProvider().then(setLlm);
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy, scrollToBottom]);

  // ── Template-based flow (regex-only fallback) ────────────────────

  const appendConversation = useCallback(
    (node: ConversationNode, delay = true) => {
      setBusy(true);
      const msgs = node.messages;
      let idx = 0;

      function next() {
        if (idx >= msgs.length) {
          setActiveBranches(node.branches);
          setBusy(false);
          return;
        }
        const msg = msgs[idx];
        idx++;
        const d = delay && msg.role === "system" ? 600 : 100;
        setTimeout(() => {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
          next();
        }, d);
      }

      next();
    },
    [scrollToBottom],
  );

  const handlePreset = useCallback(
    (key: string) => {
      if (busy) return;

      if (llm?.available) {
        // In LLM mode, presets inject the preset text as a user message
        const preset = PRESET_INPUTS[key];
        if (!preset) return;
        handleLlmMessage(preset.text);
        return;
      }

      const node = getConversationForPreset(key);
      if (!node) return;
      setMessages([GREETING]);
      setActiveBranches(undefined);
      setTimeout(() => appendConversation(node), 150);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, llm, appendConversation],
  );

  const handleChipSelect = useCallback(
    (chipId: string) => {
      if (!activeBranches?.[chipId]) return;
      setActiveBranches(undefined);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.chips) {
          updated[updated.length - 1] = { ...last, chips: undefined };
        }
        return updated;
      });
      appendConversation(activeBranches[chipId]());
    },
    [activeBranches, appendConversation],
  );

  // ── LLM multi-turn flow ──────────────────────────────────────────

  const handleLlmMessage = useCallback(
    async (text: string) => {
      if (busy || !llm?.available) return;
      setBusy(true);

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        text,
      };
      setMessages((prev) => [...prev, userMsg]);
      scrollToBottom();

      const newHistory: ChatTurn[] = [
        ...llmHistory,
        { role: "user", content: text },
      ];

      try {
        const response = await llm.chat(newHistory);

        const systemMsg: ChatMessage = {
          id: nextId(),
          role: "system",
          text: response.text,
          extractions: response.extractions,
          altitude: response.altitude,
        };

        if (response.readyToRoute && response.routeKind) {
          systemMsg.routeTo = buildRouteAction(response);
        }

        if (response.extractions) {
          setLatestExtractions((prev) => ({
            ...prev,
            ...response.extractions,
          }));
        }

        setMessages((prev) => [...prev, systemMsg]);
        setLlmHistory([
          ...newHistory,
          { role: "assistant", content: response.text },
        ]);
        scrollToBottom();
      } catch (err) {
        console.error("LLM chat failed:", err);
        const fallbackMsg: ChatMessage = {
          id: nextId(),
          role: "system",
          text: "I lost my train of thought — could you say that again?",
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        scrollToBottom();
      }

      setBusy(false);
    },
    [busy, llm, llmHistory, scrollToBottom],
  );

  // ── Template-based free text (regex-only) ────────────────────────

  const handleTemplateText = useCallback(
    async (text: string) => {
      if (busy) return;
      setBusy(true);
      setActiveBranches(undefined);
      setMessages([GREETING]);
      scrollToBottom();

      const altitude = classifyAltitude(text).altitude;
      const node = getConversationForAltitude(altitude, text);
      setBusy(false);
      appendConversation(node);
    },
    [busy, appendConversation, scrollToBottom],
  );

  // ── Dispatch: LLM or template ────────────────────────────────────

  const handleSend = useCallback(
    (text: string) => {
      if (llm?.available) {
        handleLlmMessage(text);
      } else {
        handleTemplateText(text);
      }
    },
    [llm, handleLlmMessage, handleTemplateText],
  );

  // ── Route handling ───────────────────────────────────────────────

  const handleRoute = useCallback(
    async (action: RouteAction) => {
      setBusy(true);
      try {
        switch (action.kind) {
          case "bet": {
            if (action.extractions) {
              const id = await mintFromExtraction(action.extractions);
              router.push(`/bet/wager?id=${id}`);
            } else if (latestExtractions) {
              const id = await mintFromExtraction(latestExtractions);
              router.push(`/bet/wager?id=${id}`);
            } else {
              const bet = await mintDraft();
              router.push(`/bet/wager?id=${bet.id}`);
            }
            break;
          }
          case "sequence": {
            stashSequenceSeed({
              depType: action.depType,
              subBets: action.subBets,
            });
            router.push("/sequencing");
            break;
          }
          case "navigate": {
            router.push(action.href);
            break;
          }
        }
      } catch (err) {
        console.error("Route action failed:", err);
        setBusy(false);
      }
    },
    [router, latestExtractions],
  );

  const handleReset = useCallback(() => {
    setMessages([GREETING]);
    setActiveBranches(undefined);
    setLlmHistory([]);
    setLatestExtractions(undefined);
    setBusy(false);
  }, []);

  const lastMsg = messages[messages.length - 1];
  const hasRoute = !!lastMsg?.routeTo;
  const showInput = !hasRoute;

  return (
    <div className="compose-shell">
      <header className="compose-header">
        <div className="compose-sub">front door</div>
      </header>

      <div className="compose-presets">
        <span className="compose-presets-label">try:</span>
        {Object.entries(PRESET_INPUTS).map(([key, { label }]) => (
          <button
            key={key}
            type="button"
            className="compose-preset"
            onClick={() => handlePreset(key)}
            disabled={busy}
          >
            {label}
          </button>
        ))}
        {messages.length > 1 && (
          <>
            <span className="compose-presets-sep">·</span>
            <button
              type="button"
              className="compose-preset"
              onClick={handleReset}
              style={{ color: "var(--color-ink-faint)" }}
            >
              ↻ reset
            </button>
          </>
        )}
        <span style={{ flex: 1 }} />
        <a
          href="/bet/new/express"
          className="compose-express"
        >
          skip — I know what I want
        </a>
      </div>

      <div className="compose-thread" ref={threadRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`compose-msg compose-msg-${msg.role}`}
          >
            <div className="compose-msg-who">
              {msg.role === "user" ? "you" : "⍺β"}
            </div>
            <div className="compose-msg-body">
              {msg.text.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i < msg.text.split("\n").length - 1 && <br />}
                </span>
              ))}

              {msg.extractions && (
                <ExtractionCard extractions={msg.extractions} />
              )}

              {msg.altitude && <AltitudeBadge altitude={msg.altitude} />}

              {msg.classify && (
                <div className="compose-classify">
                  <span className="compose-cl-icon">{msg.classify.icon}</span>
                  <span
                    className={`compose-cl-label compose-cl-${msg.classify.colorClass}`}
                  >
                    {msg.classify.label}
                  </span>
                </div>
              )}

              {msg.chips && !busy && (
                <ReplyChips
                  chips={msg.chips}
                  onSelect={handleChipSelect}
                  disabled={busy}
                />
              )}

              {msg.routeTo && (
                <button
                  type="button"
                  className="compose-route-cta"
                  onClick={() => handleRoute(msg.routeTo!)}
                  disabled={busy}
                >
                  {msg.routeTo.label} ▸
                </button>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="compose-typing">
            <div className="compose-typing-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      {showInput && (
        <ChatInput
          onSend={handleSend}
          disabled={busy}
        />
      )}

      {llm !== null && (
        <div className="compose-llm-status">
          {llm.available ? "llm connected · multi-turn" : "regex-only mode"}
        </div>
      )}

      <ArtifactRail extractions={latestExtractions} messages={messages} />
    </div>
  );
}

function ArtifactRail({
  extractions,
  messages,
}: {
  extractions: ChatResponse["extractions"];
  messages: ChatMessage[];
}) {
  const lastAltitude = [...messages]
    .reverse()
    .find((m) => m.altitude)?.altitude;

  const fields = extractions
    ? Object.entries(extractions).filter(
        ([, v]) => v && typeof v === "object" && "value" in v && v.status !== "missing",
      )
    : [];

  return (
    <div className="compose-rail">
      <div>
        <div className="compose-rail-section">altitude</div>
        {lastAltitude ? (
          <AltitudeBadge altitude={lastAltitude} />
        ) : (
          <div className="compose-rail-empty">waiting for input</div>
        )}
      </div>

      <div>
        <div className="compose-rail-section">extracted fields</div>
        {fields.length === 0 ? (
          <div className="compose-rail-empty">
            fields appear here as the conversation fills them in
          </div>
        ) : (
          <div className="flex flex-col gap-[6px]">
            {fields.map(([key, field]) => {
              const f = field as { value: string; status: string };
              return (
                <div key={key}>
                  <div className="text-[9px] uppercase tracking-[1px] text-ink-faint">
                    {key}
                  </div>
                  <div className="text-[11px] leading-[1.4]">
                    {f.value}
                    {f.status === "present" && (
                      <span className="text-amber text-[9px] ml-[4px]">
                        (implied)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-auto pt-[14px] border-t border-dashed border-rule-faint">
        <a
          href="/bet/new/express"
          className="compose-express"
        >
          skip — I know what I want
        </a>
      </div>
    </div>
  );
}

function buildRouteAction(response: ChatResponse): RouteAction {
  if (response.routeKind === "sequence" && response.sequenceInfo) {
    return {
      kind: "sequence",
      label: "Create sequence →",
      depType: response.sequenceInfo.depType,
      subBets: response.sequenceInfo.subBets,
    };
  }
  return {
    kind: "bet",
    label: "Create draft bet →",
    extractions: response.extractions,
  };
}
