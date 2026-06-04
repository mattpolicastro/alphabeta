import type { Metadata } from "next";
import { DesignSystemContent } from "./content";

export const metadata: Metadata = {
  title: "Design System — alphaBeta",
  description:
    "Canonical tokens, components, and patterns. Mirrors design/Design System.html.",
};

export default function DesignSystem() {
  return <DesignSystemContent />;
}
