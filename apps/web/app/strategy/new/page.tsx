"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Walkthrough, WalkthroughStep } from "@/components/shell/Walkthrough";
import { mintBoard } from "@/lib/strategy/queries";
import { defaultBoardState } from "@/lib/strategy/constants";
import { TEMPLATES, getTemplate } from "@/lib/strategy/templates";
import type { TemplateDefinition } from "@/lib/strategy/templates";
import type { TemplateId } from "@/lib/strategy/types";
import { TemplatePicker } from "@/components/strategy/TemplatePicker";

function isValidTemplateId(value: string): value is TemplateId {
  return value in TEMPLATES;
}

export default function NewBoardPage() {
  return (
    <Suspense fallback={<div className="ab-wrap" />}>
      <NewBoardInner />
    </Suspense>
  );
}

function NewBoardInner() {
  const router = useRouter();
  const example = useSearchParams().get("example");
  const validExample = example && isValidTemplateId(example) ? example : null;

  const [showPicker, setShowPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const mintedRef = useRef(false);

  // ?example=<templateId> → seed with that template's example board
  useEffect(() => {
    if (!validExample) {
      setShowPicker(true);
      return;
    }
    if (mintedRef.current) return;
    mintedRef.current = true;
    setCreating(true);
    (async () => {
      try {
        const initial = getTemplate(validExample).exampleBoard();
        const row = await mintBoard(initial);
        router.replace(`/strategy?id=${row.id}`);
      } catch (err) {
        console.error("Failed to create new board:", err);
        mintedRef.current = false;
        setCreating(false);
      }
    })();
  }, [router, validExample]);

  const handleSelect = useCallback(
    async (template: TemplateDefinition) => {
      setShowPicker(false);
      setCreating(true);
      try {
        const initial = defaultBoardState(template.id);
        const row = await mintBoard(initial);
        router.replace(`/strategy?id=${row.id}`);
      } catch (err) {
        console.error("Failed to create new board:", err);
        setCreating(false);
        setShowPicker(true);
      }
    },
    [router],
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (showPicker) {
    return (
      <>
        <div className="ab-wrap">
          <Walkthrough>
            <WalkthroughStep n={1} title="Choose a prioritization framework">
              Each framework structures how you think about work differently — NSF for north-star alignment, RICE for scoring, OKR for objectives, GPS or GIST for goal-driven planning.
            </WalkthroughStep>
            <WalkthroughStep n={2} title="Pre-built examples">
              The example boards show the framework in action with realistic cards. Start from an example or create a blank board.
            </WalkthroughStep>
          </Walkthrough>
        </div>
        <TemplatePicker
          open
          onSelect={handleSelect}
          onCancel={handleCancel}
        />
      </>
    );
  }

  return (
    <div className="ab-wrap">
      <div className="dashed-panel">
        <div className="dashed-panel-title">
          {creating
            ? "Loading example board…"
            : "Starting a new board…"}
        </div>
      </div>
    </div>
  );
}
