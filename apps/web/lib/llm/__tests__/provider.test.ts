import { afterEach, describe, expect, it, vi } from "vitest";
import { negotiateProvider } from "../provider";
import { NullProvider } from "../null";
import { OllamaProvider } from "../ollama";

/**
 * `negotiateProvider` is the capability negotiation at boot described in the
 * handoff: probe /api/llm, use Ollama when it answers, otherwise degrade to
 * the null provider. Every failure mode has to degrade rather than throw —
 * the app must stay usable with no LLM behind it.
 */

function mockFetch(impl: (...args: unknown[]) => unknown) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("negotiateProvider — provider selection", () => {
  it("returns the Ollama provider when the probe succeeds", async () => {
    mockFetch(async () => ({ ok: true }));
    const provider = await negotiateProvider();
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.available).toBe(true);
  });

  it("falls back to the null provider on a non-ok response", async () => {
    mockFetch(async () => ({ ok: false, status: 500 }));
    const provider = await negotiateProvider();
    expect(provider).toBeInstanceOf(NullProvider);
    expect(provider.available).toBe(false);
  });

  it("falls back to the null provider when the request rejects", async () => {
    mockFetch(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await negotiateProvider()).toBeInstanceOf(NullProvider);
  });

  it("falls back to the null provider when the probe times out", async () => {
    mockFetch(async () => {
      throw new DOMException("The operation was aborted.", "TimeoutError");
    });
    expect(await negotiateProvider()).toBeInstanceOf(NullProvider);
  });

  it("never rejects, whatever the transport does", async () => {
    mockFetch(() => {
      throw new Error("synchronous explosion");
    });
    await expect(negotiateProvider()).resolves.toBeInstanceOf(NullProvider);
  });
});

describe("negotiateProvider — probe request", () => {
  it("POSTs a minimal ping to /api/llm", async () => {
    const spy = mockFetch(async () => ({ ok: true }));
    await negotiateProvider();

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/llm");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });

    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual([{ role: "user", content: "ping" }]);
    expect(body.stream).toBe(false);
    // Keep the probe as cheap as possible: one token, no thinking.
    expect(body.think).toBe(false);
    expect(body.options).toEqual({ num_predict: 1 });
  });

  it("pins the model in VRAM with keep_alive: -1", async () => {
    const spy = mockFetch(async () => ({ ok: true }));
    await negotiateProvider();
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).keep_alive).toBe(-1);
  });

  it("aborts the probe rather than hanging", async () => {
    const spy = mockFetch(async () => ({ ok: true }));
    await negotiateProvider();
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses NEXT_PUBLIC_LLM_MODEL when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_LLM_MODEL", "devstral:latest");
    const spy = mockFetch(async () => ({ ok: true }));
    await negotiateProvider();
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).model).toBe("devstral:latest");
  });

  it("falls back to a default model when the env var is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_LLM_MODEL", "");
    const spy = mockFetch(async () => ({ ok: true }));
    await negotiateProvider();
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).model).toBe("qwen3.6:27b");
  });
});

describe("NullProvider", () => {
  it("reports itself unavailable", () => {
    expect(new NullProvider().available).toBe(false);
  });

  it("resolves parse to an empty result rather than throwing", async () => {
    await expect(
      new NullProvider().parse({ text: "swap the CTA", task: "extract" }),
    ).resolves.toEqual({});
  });

  it("resolves chat to empty text rather than throwing", async () => {
    await expect(
      new NullProvider().chat([{ role: "user", content: "hello" }]),
    ).resolves.toEqual({ text: "" });
  });

  it("satisfies the LLMProvider contract", () => {
    const provider = new NullProvider();
    expect(typeof provider.parse).toBe("function");
    expect(typeof provider.chat).toBe("function");
  });
});
