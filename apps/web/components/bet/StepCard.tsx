import type { HTMLAttributes, ReactNode } from "react";

export type StepStatus = "active" | "done" | "locked" | "open";

type StepCardProps = HTMLAttributes<HTMLDivElement> & {
  n: number;
  title: ReactNode;
  sub?: ReactNode;
  status: StepStatus;
  trailing?: ReactNode;
};

export function StepCard({
  n,
  title,
  sub,
  status,
  trailing,
  children,
  className,
  ...rest
}: StepCardProps) {
  const stepCls = [
    "step",
    status === "active" && "step-active",
    status === "done" && "step-done",
    status === "locked" && "step-locked",
  ]
    .filter(Boolean)
    .join(" ");

  const cardCls = ["scard", status === "active" && "scard-active", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={stepCls} data-n={n} {...rest}>
      <div className={cardCls}>
        <div className="scard-h">
          <div className="scard-title">{title}</div>
          {trailing}
        </div>
        {sub && <div className="scard-sub">{sub}</div>}
        {children}
      </div>
    </div>
  );
}
