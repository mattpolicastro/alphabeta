import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "default" | "primary" | "green";

const variantClass: Record<Variant, string> = {
  default: "btn",
  primary: "btn btn-primary",
  green: "btn btn-green",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "default",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[variantClass[variant], className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
};

export function ButtonLink({
  variant = "default",
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <a
      className={[variantClass[variant], className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
