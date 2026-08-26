#!/usr/bin/env python3
"""Replay corpus cases against local models via Ollama's Anthropic-compatible API."""
import json, sys, time, urllib.request

HOST = "http://aipc-ubuntu:11434"
MODELS = sys.argv[1:] or ["glm-4.7-flash", "qwen3-coder-next"]
RUBRIC = open("rubric-prompt.md").read()
CASES = json.load(open("cases.json"))

def ask(model, case):
    body = json.dumps({
        "model": model,
        "max_tokens": 2000,
        "system": RUBRIC,
        "messages": [{"role": "user", "content":
            f"[board context: {case['context']}]\n\nuser says: {case['dump']}"}],
    }).encode()
    req = urllib.request.Request(f"{HOST}/v1/messages", data=body,
        headers={"content-type": "application/json", "x-api-key": "local",
                 "anthropic-version": "2023-06-01"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=600) as r:
        resp = json.load(r)
    text = "".join(b.get("text", "") for b in resp.get("content", []))
    return text, time.time() - t0

results = []
for model in MODELS:
    for case in CASES:
        print(f"→ {model} / {case['id']} …", flush=True)
        try:
            text, dt = ask(model, case)
            results.append({"model": model, "case": case["id"], "tier": case["tier"],
                            "seconds": round(dt, 1), "output": text})
            print(f"  {dt:.0f}s, {len(text)} chars", flush=True)
        except Exception as e:
            results.append({"model": model, "case": case["id"], "error": str(e)})
            print(f"  ERROR: {e}", flush=True)

json.dump(results, open("results.json", "w"), indent=1)
print(f"\nwrote results.json ({len(results)} runs)")
