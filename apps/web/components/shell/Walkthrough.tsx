"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getWalkthroughEnabled } from "@/lib/walkthrough";

export function Walkthrough({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getWalkthroughEnabled());

    const onStorage = (e: StorageEvent) => {
      if (e.key === "ab_walkthrough") setVisible(e.newValue !== "off");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!visible) return null;

  return (
    <aside className="walkthrough" role="complementary" aria-label="Walkthrough">
      {children}
    </aside>
  );
}

export function WalkthroughStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="walkthrough-step">
      <div className="walkthrough-step-n">{n}</div>
      <div>
        <div className="walkthrough-step-title">{title}</div>
        <div className="walkthrough-step-body">{children}</div>
      </div>
    </div>
  );
}
