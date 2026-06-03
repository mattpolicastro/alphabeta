import type { HTMLAttributes, ReactNode } from "react";

type DashedPanelProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  sub?: ReactNode;
};

export function DashedPanel({
  title,
  sub,
  children,
  className,
  ...rest
}: DashedPanelProps) {
  return (
    <div
      className={["dashed-panel", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {title !== undefined && <div className="dashed-panel-title">{title}</div>}
      {sub !== undefined && <div className="dashed-panel-sub">{sub}</div>}
      {children}
    </div>
  );
}
