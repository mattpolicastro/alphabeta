import type { Altitude, Extraction } from "@/lib/compose/types";

export type ParseTask = "extract" | "classify" | "classify+extract";

export type ParseRequest = {
  text: string;
  context?: { role: "user" | "system"; content: string }[];
  task: ParseTask;
};

export type ParseResult = {
  altitude?: Altitude;
  extractions?: Extraction;
  subBets?: { label: string; extractions: Extraction }[];
  explanation?: string;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  text: string;
  extractions?: Extraction;
  altitude?: Altitude;
  readyToRoute?: boolean;
  routeKind?: "bet" | "sequence" | "navigate";
  sequenceInfo?: {
    depType: "chain" | "fanin" | "parallel";
    subBets: { question: string; instrument: string }[];
  };
};

export interface LLMProvider {
  readonly available: boolean;
  parse(req: ParseRequest): Promise<ParseResult>;
  chat(history: ChatTurn[]): Promise<ChatResponse>;
}

export async function negotiateProvider(): Promise<LLMProvider> {
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.NEXT_PUBLIC_LLM_MODEL || "qwen3.6:27b",
        messages: [{ role: "user", content: "ping" }],
        stream: false,
        think: false,
        keep_alive: -1,
        options: { num_predict: 1 },
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const { OllamaProvider } = await import("./ollama");
      return new OllamaProvider();
    }
  } catch {
    // LLM unavailable — fall back to null provider
  }
  const { NullProvider } = await import("./null");
  return new NullProvider();
}
