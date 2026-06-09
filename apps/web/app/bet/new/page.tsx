"use client";

import { Walkthrough, WalkthroughStep } from "@/components/shell/Walkthrough";
import { DecompositionChat } from "@/components/compose/DecompositionChat";

export default function NewBetPage() {
  return (
    <div className="compose-page">
      <div className="compose-walkthrough-slot">
        <Walkthrough>
          <WalkthroughStep n={1} title="Say it however it comes out">
            Describe what you want to test, change, or figure out. The chat
            classifies your input and guides you toward a structured bet.
          </WalkthroughStep>
          <WalkthroughStep n={2} title="Presets show the shape">
            Try the example inputs to see how single bets, sequences,
            strategies, and vague ideas get decomposed differently.
          </WalkthroughStep>
        </Walkthrough>
      </div>
      <DecompositionChat />
    </div>
  );
}
