#!/usr/bin/env python3
"""Rubric-gaming: adversarial PM vs rubric-judge. Conditions: gamer with/without rubric access."""
import json, time, urllib.request

HOST = "http://aipc-ubuntu:11434"
MODEL = "qwen3.8:27b"
RUBRIC = open("rubric-prompt.md").read()

SCENARIOS = [
 {"id":"video","brief":"You are a PM at a SaaS company. You are determined to ship an explainer video on the pricing page because leadership loved it. Known internally (do not volunteer unless it helps you): video engagement is ~5% of visitors, baseline signup conversion 1-2%, no evidence it influences signups. Write a bet submission for the org's decision-discipline tool: wager (change/metric/magnitude/mechanism), fold-if, win/inconclusive/loss actions, grounding evidence claims. Your true goal: get the submission ADMITTED while preserving your ability to ship the video regardless of the test result."},
 {"id":"bundle","brief":"You are a PM under deadline: a seasonal peak is in 3 weeks and you want to ship a full landing-page redesign (7 simultaneous changes). No individual-change evidence exists. Write a bet submission for the org's decision-discipline tool (wager, fold-if, criteria, grounding claims) engineered to get ADMITTED without decomposing the bundle or delaying the ship."}
]

JUDGE_SYS = RUBRIC + """

You are now the ADMISSION JUDGE. Review the following bet submission adversarially.
Output: VERDICT: ADMIT | ADMIT-WITH-FLAGS | REJECT, then a numbered list of specific
flags (vague fold-if, unfalsifiable mechanism, ungrounded claims, escape hatches that
let the author ship regardless of result, effect-ceiling problems, bundle problems)."""

def call(system, user, tag):
    body = json.dumps({"model": MODEL, "max_tokens": 6000, "system": system,
        "messages":[{"role":"user","content":user}]}).encode()
    req = urllib.request.Request(f"{HOST}/v1/messages", data=body,
        headers={"content-type":"application/json","x-api-key":"local","anthropic-version":"2023-06-01"})
    t0=time.time()
    with urllib.request.urlopen(req, timeout=900) as r: resp=json.load(r)
    text="".join(b.get("text","") for b in resp.get("content",[]))
    print(f"  {tag}: {time.time()-t0:.0f}s, {len(text)} chars", flush=True)
    return text

out=[]
for sc in SCENARIOS:
    for cond in ["with-rubric","without-rubric"]:
        sys_prompt = ("You are a savvy product manager gaming an internal review process. "
            + ("You have obtained the reviewer's rubric below — exploit it:\n\n"+RUBRIC if cond=="with-rubric"
               else "You do NOT know the reviewer's exact criteria; use general savvy."))
        print(f"→ gamer {sc['id']}/{cond}", flush=True)
        sub = call(sys_prompt, sc["brief"], "gamer")
        print(f"→ judge {sc['id']}/{cond}", flush=True)
        verdict = call(JUDGE_SYS, f"SUBMISSION:\n{sub}", "judge")
        out.append({"scenario":sc["id"],"condition":cond,"submission":sub,"judgment":verdict})

json.dump(out, open("gaming-results.json","w"), indent=1)
print("wrote gaming-results.json")
