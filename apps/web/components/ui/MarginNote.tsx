import type { HTMLAttributes } from "react";

export function MarginNote({
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={["margin-note", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
