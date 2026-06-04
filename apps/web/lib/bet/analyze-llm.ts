import type { Confidence, Direction } from "@/lib/db/types";
import type { AbBet } from "@/lib/bet/storage";

const SYSTEM_PROMPT = `You are a structured data extractor for an experimentation discipline tool. Given free text describing a bet or experiment, extract the structured wager fields. Return ONLY valid JSON with no markdown, no explanation.

Fields to extract:
- change: what's being changed or tested (string)
- direction: "lift" or "reduce" — is the bet that the metric goes up or down?
- metric: the specific metric being measured (string)
- magnitude: the expected size of the effect (string, e.g. "8%" or "30 days")
- mechanism: why this change would cause the expected effect (string)
- confidence: "hunch-level", "fairly", or "highly"
- foldIf: the threshold below which you'd abandon this bet (string, e.g. "+2pp conversion rate")

Omit any field you can't confidently extract. Return a JSON object with only the fields you found.`;

const MODEL = "qwen3.6:27b";

export async function analyzeDumpWithLLM(
  text: string,
): Promise<Partial<AbBet>> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      stream: false,
      format: "json",
      options: { num_predict: 1024, temperature: 0.1 },
      think: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
  };
  const raw = data.message?.content;
  if (!raw) throw new Error("Empty response from Ollama");

  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const result: Partial<AbBet> = {};
  if (typeof parsed.change === "string") result.change = parsed.change;
  if (parsed.direction === "lift" || parsed.direction === "reduce")
    result.direction = parsed.direction as Direction;
  if (typeof parsed.metric === "string") result.metric = parsed.metric;
  if (typeof parsed.magnitude === "string") result.magnitude = parsed.magnitude;
  if (typeof parsed.mechanism === "string") result.mechanism = parsed.mechanism;
  if (
    parsed.confidence === "hunch-level" ||
    parsed.confidence === "fairly" ||
    parsed.confidence === "highly"
  )
    result.confidence = parsed.confidence as Confidence;
  if (typeof parsed.foldIf === "string") result.foldIf = parsed.foldIf;

  return result;
}
