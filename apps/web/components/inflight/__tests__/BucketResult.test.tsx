import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BucketResult } from "../BucketResult";

describe("BucketResult", () => {
  it("renders WIN in uppercase for outcome='win'", () => {
    render(
      <BucketResult
        outcome="win"
        why="test why"
        action="test action"
      />,
    );
    expect(screen.getByText("WIN")).toBeInTheDocument();
  });

  it("renders INCONCLUSIVE in uppercase for outcome='inconclusive'", () => {
    render(
      <BucketResult
        outcome="inconclusive"
        why="test why"
        action="test action"
      />,
    );
    expect(screen.getByText("INCONCLUSIVE")).toBeInTheDocument();
  });

  it("renders LOSS in uppercase for outcome='loss'", () => {
    render(
      <BucketResult
        outcome="loss"
        why="test why"
        action="test action"
      />,
    );
    expect(screen.getByText("LOSS")).toBeInTheDocument();
  });

  it("renders why text", () => {
    render(
      <BucketResult
        outcome="win"
        why="because reasons"
        action="test action"
      />,
    );
    expect(screen.getByText("because reasons")).toBeInTheDocument();
  });

  it("renders action text", () => {
    render(
      <BucketResult
        outcome="win"
        why="test why"
        action="do something"
      />,
    );
    expect(screen.getByText("do something")).toBeInTheDocument();
  });

  it("renders default actionLabel when not provided", () => {
    render(
      <BucketResult
        outcome="win"
        why="test why"
        action="test action"
      />,
    );
    expect(screen.getByText("your pre-registered action for this outcome")).toBeInTheDocument();
  });

  it("renders custom actionLabel when provided", () => {
    render(
      <BucketResult
        outcome="win"
        why="test why"
        action="test action"
        actionLabel="custom label"
      />,
    );
    expect(screen.getByText("custom label")).toBeInTheDocument();
  });
});
