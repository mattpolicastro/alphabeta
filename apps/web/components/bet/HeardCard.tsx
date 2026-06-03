import type { HTMLAttributes, ReactNode } from "react";

export type HeardKind = "default" | "push" | "gap" | "filled";

type HeardCardProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  body: ReactNode;
  kind?: HeardKind;
};

export function HeardCard({
  label,
  body,
  kind = "default",
  className,
  ...rest
}: HeardCardProps) {
  const cls = ["heard", kind !== "default" && `heard-${kind}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      <div className="heard-k">{label}</div>
      <div className="heard-v">{body}</div>
    </div>
  );
}
