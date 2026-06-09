import type { Altitude, Extraction } from "@/lib/compose/types";
import type {
  LLMProvider,
  ParseRequest,
  ParseResult,
  ChatTurn,
  ChatResponse,
} from "./provider";

const MODEL = process.env.NEXT_PUBLIC_LLM_MODEL || "qwen3.6:27b";

const EXTRACT_PROMPT = `You are a structured data extractor for an experimentation discipline tool called alphaBeta. Given free text, you do two jobs:

1. CLASSIFY the altitude — how formed is this idea?
   - "vague": a feeling or worry, no specific change or metric
   - "goal": a goal or target, but no specific intervention chosen
   - "bet": a testable claim with a change, metric, and some reasoning
   - "ready": a complete pre-registration with instrument, MDE, runtime, and decision rules

2. EXTRACT structured fields from the text:
   - change: what's being changed or tested
   - direction: "lift" or "reduce"
   - metric: the specific metric being measured
   - magnitude: expected effect size (e.g. "8%", "30 days")
   - mechanism: why this change would cause the effect
   - confidence: "hunch-level", "fairly", or "highly"
   - foldIf: threshold below which you'd abandon the bet
   - instrument: test method if mentioned (e.g. "A/B test", "interviews")
   - winAction: what to do if the bet wins
   - lossAction: what to do if it loses
   - inconAction: what to do if inconclusive

For each extracted field, also rate its status:
   - "found": clearly and explicitly stated
   - "present": implied or partially stated
   - "missing": not present (still include the field with a description of what's missing)

Return ONLY valid JSON with this shape:
{
  "altitude": "vague"|"goal"|"bet"|"ready",
  "extractions": { "<field>": { "value": "<text>", "status": "found"|"present"|"missing" }, ... },
  "explanation": "<one sentence honest read of the input>"
}`;

const CHAT_PROMPT = `You are the front door of alphaBeta, a discipline layer for empirical work. You help people turn loose ideas into structured, testable bets.

A bet has these fields (you're trying to fill them through conversation):
- change: what specific thing is being changed or tested
- direction: will the metric go up ("lift") or down ("reduce")?
- metric: what specific metric measures success
- magnitude: expected effect size (e.g. "+8%", "30 days shorter")
- mechanism: WHY this change would cause the effect (the "because" clause — this is the most important field)
- confidence: how sure are they? ("hunch-level", "fairly confident", "highly confident")
- foldIf: the minimum result that would change their mind — below this, fold the bet
- instrument: how to test it (A/B test, quasi-experiment, observational, holdback, interviews)

Your job:
1. Meet people wherever they are. Some come with a fully formed hypothesis, some with a vague worry.
2. Ask ONE targeted question at a time to fill the most important missing field. Don't bombard.
3. The mechanism ("because" clause) is the most valuable field — push for it. "Why do you think this would work?"
4. When you have enough for a draft (at minimum: change, metric, mechanism), offer to create the bet.
5. Be concise. 2-3 sentences per turn max. No bullet lists unless showing the structured bet.
6. If someone describes multiple related bets, recognize it as a sequence and ask about dependencies.
7. If someone describes a high-level goal without a specific intervention, help them narrow to a testable bet.

Return ONLY valid JSON:
{
  "text": "your conversational response (plain text, no markdown)",
  "altitude": "vague"|"goal"|"bet"|"ready",
  "extractions": { "<field>": { "value": "<text>", "status": "found"|"present"|"missing" }, ... },
  "readyToRoute": false,
  "routeKind": null
}

Set readyToRoute=true and routeKind="bet" when you've gathered enough to create a draft and the user has agreed.
Set routeKind="sequence" if the user described multiple dependent bets.
Set routeKind="navigate" with extractions.navigateTo if redirecting elsewhere (e.g. strategy board).

IMPORTANT: readyToRoute should only be true when the user explicitly confirms they want to proceed. Don't auto-route — always ask first.`;

function sanitizeJsonResponse(raw: string): Record<string, unknown> {
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    // Model may have wrapped JSON in prose — try to extract it
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as Record<string, unknown>;
    }
    throw new Error(`Could not parse LLM response as JSON: ${cleaned.slice(0, 200)}`);
  }
}

function ollamaPayload(
  messages: { role: string; content: string }[],
  opts?: { maxTokens?: number; temperature?: number },
) {
  return {
    model: MODEL,
    messages,
    stream: false,
    format: "json",
    think: false,
    options: {
      num_predict: opts?.maxTokens ?? 1024,
      temperature: opts?.temperature ?? 0.3,
    },
  };
}

export class OllamaProvider implements LLMProvider {
  readonly available = true;

  async parse(req: ParseRequest): Promise<ParseResult> {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: EXTRACT_PROMPT },
    ];

    if (req.context) {
      for (const msg of req.context) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: "user", content: req.text });

    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        ollamaPayload(messages, { maxTokens: 2048, temperature: 0.1 }),
      ),
    });

    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);

    const data = (await res.json()) as {
      message?: { content?: string };
    };
    const raw = data.message?.content;
    if (!raw) throw new Error("Empty LLM response");

    const parsed = sanitizeJsonResponse(raw);
    const result: ParseResult = {};

    const validAltitudes: Altitude[] = ["vague", "goal", "bet", "ready"];
    if (
      typeof parsed.altitude === "string" &&
      validAltitudes.includes(parsed.altitude as Altitude)
    ) {
      result.altitude = parsed.altitude as Altitude;
    }

    if (
      parsed.extractions &&
      typeof parsed.extractions === "object" &&
      !Array.isArray(parsed.extractions)
    ) {
      result.extractions = parseExtractions(
        parsed.extractions as Record<string, unknown>,
      );
    }

    if (typeof parsed.explanation === "string") {
      result.explanation = parsed.explanation;
    }

    return result;
  }

  async chat(history: ChatTurn[]): Promise<ChatResponse> {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: CHAT_PROMPT },
    ];

    for (const turn of history) {
      messages.push({ role: turn.role, content: turn.content });
    }

    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ollamaPayload(messages)),
    });

    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);

    const data = (await res.json()) as {
      message?: { content?: string };
    };
    const raw = data.message?.content;
    if (!raw) throw new Error("Empty LLM response");

    const parsed = sanitizeJsonResponse(raw);
    const result: ChatResponse = {
      text:
        typeof parsed.text === "string"
          ? parsed.text
          : "I didn't quite catch that. Could you rephrase?",
    };

    const validAltitudes: Altitude[] = ["vague", "goal", "bet", "ready"];
    if (
      typeof parsed.altitude === "string" &&
      validAltitudes.includes(parsed.altitude as Altitude)
    ) {
      result.altitude = parsed.altitude as Altitude;
    }

    if (
      parsed.extractions &&
      typeof parsed.extractions === "object" &&
      !Array.isArray(parsed.extractions)
    ) {
      result.extractions = parseExtractions(
        parsed.extractions as Record<string, unknown>,
      );
    }

    if (parsed.readyToRoute === true) {
      result.readyToRoute = true;
    }

    if (
      typeof parsed.routeKind === "string" &&
      ["bet", "sequence", "navigate"].includes(parsed.routeKind)
    ) {
      result.routeKind = parsed.routeKind as ChatResponse["routeKind"];
    }

    return result;
  }
}

function parseExtractions(
  ext: Record<string, unknown>,
): Extraction {
  const extractions: Extraction = {};
  for (const [key, val] of Object.entries(ext)) {
    if (
      val &&
      typeof val === "object" &&
      "value" in val &&
      "status" in val
    ) {
      const field = val as { value: string; status: string };
      if (
        typeof field.value === "string" &&
        ["found", "present", "missing"].includes(field.status)
      ) {
        (extractions as Record<string, unknown>)[key] = {
          value: field.value,
          status: field.status,
        };
      }
    }
  }
  return extractions;
}
