import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, ButtonLink } from "../Button";
import { DashedPanel } from "../DashedPanel";
import { MarginNote } from "../MarginNote";

describe("Button", () => {
  it("renders children as button text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("applies primary variant class", () => {
    render(<Button variant="primary">Go</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn-primary");
  });

  it("applies default btn class when no variant", () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("btn");
  });

  it("passes through HTML button attributes", () => {
    render(<Button disabled>Go</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("ButtonLink", () => {
  it("renders as an anchor element", () => {
    render(<ButtonLink href="/test">Link</ButtonLink>);
    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toContain("/test");
  });

  it("applies variant class", () => {
    render(<ButtonLink variant="green" href="/x">Go</ButtonLink>);
    const link = screen.getByRole("link");
    expect(link.className).toContain("btn-green");
  });
});

describe("DashedPanel", () => {
  it("renders children", () => {
    render(<DashedPanel>Panel content</DashedPanel>);
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<DashedPanel title="My Title">body</DashedPanel>);
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("renders sub when provided", () => {
    render(<DashedPanel sub="subtitle">body</DashedPanel>);
    expect(screen.getByText("subtitle")).toBeInTheDocument();
  });

  it("does not render title element when omitted", () => {
    const { container } = render(<DashedPanel>body</DashedPanel>);
    expect(container.querySelector(".dashed-panel-title")).toBeNull();
  });
});

describe("MarginNote", () => {
  it("renders children", () => {
    render(<MarginNote>A note</MarginNote>);
    expect(screen.getByText("A note")).toBeInTheDocument();
  });

  it("applies margin-note class", () => {
    render(<MarginNote>text</MarginNote>);
    const p = screen.getByText("text");
    expect(p.className).toContain("margin-note");
  });

  it("merges custom className", () => {
    render(<MarginNote className="extra">text</MarginNote>);
    const p = screen.getByText("text");
    expect(p.className).toContain("margin-note");
    expect(p.className).toContain("extra");
  });
});
