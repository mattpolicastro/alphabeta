"use client";

import type { ReplyChip } from "@/lib/compose/types";

type Props = {
  chips: ReplyChip[];
  onSelect: (chipId: string) => void;
  disabled?: boolean;
};

export function ReplyChips({ chips, onSelect, disabled }: Props) {
  return (
    <div className="compose-replies">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="compose-reply"
          onClick={() => onSelect(chip.id)}
          disabled={disabled}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
