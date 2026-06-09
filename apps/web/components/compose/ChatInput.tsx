"use client";

import { useCallback, useRef } from "react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({ onSend, disabled, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const text = ref.current?.value.trim();
    if (!text || disabled) return;
    onSend(text);
    if (ref.current) {
      ref.current.value = "";
      ref.current.style.height = "auto";
    }
  }, [onSend, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height =
      Math.min(ref.current.scrollHeight, 120) + "px";
  }, []);

  return (
    <div className="compose-input-bar">
      <textarea
        ref={ref}
        rows={1}
        placeholder={
          placeholder ??
          'e.g. "I think the onboarding is too long and we\'re losing people…"'
        }
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        className="compose-textarea"
      />
      <button
        type="button"
        className="compose-send"
        onClick={handleSend}
        disabled={disabled}
      >
        ▸
      </button>
    </div>
  );
}
