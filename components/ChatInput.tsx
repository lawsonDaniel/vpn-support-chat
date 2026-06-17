"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { Send } from "lucide-react";

const MAX_CHARS = 2000;

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
  compact?: boolean;
}

export default function ChatInput({ onSend, disabled, compact = false }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [charCount, setCharCount] = useState(0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = ref.current?.value.trim();
    if (!value || disabled || charCount > MAX_CHARS) return;
    onSend(value);
    if (ref.current) ref.current.value = "";
    setCharCount(0);
    autoResize();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }

  function handleChange() {
    setCharCount(ref.current?.value.length ?? 0);
    autoResize();
  }

  function autoResize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, compact ? 100 : 140)}px`;
  }

  const overLimit = charCount > MAX_CHARS;
  const btnSize = compact ? "w-8 h-8" : "w-11 h-11";
  const textSize = compact ? "text-xs" : "text-sm";
  const padding = compact ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className="flex flex-col gap-1">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a VPN question…"
          className={`flex-1 resize-none rounded-xl bg-gray-50 border
            ${padding} ${textSize} text-gray-900 placeholder-gray-400
            disabled:opacity-50 transition-all max-h-28 overflow-y-auto focus:outline-none focus:ring-2
            ${overLimit
              ? "border-red-400 focus:border-red-400 focus:ring-red-100"
              : "border-gray-300 focus:border-blue-400 focus:ring-blue-100"
            }`}
        />
        <button
          type="submit"
          disabled={disabled || overLimit}
          aria-label="Send message"
          className={`flex-shrink-0 ${btnSize} rounded-xl bg-blue-600 hover:bg-blue-700
            disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center
            transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm`}
        >
          <Send size={compact ? 14 : 17} className="text-white" />
        </button>
      </form>
      {charCount > 1800 && (
        <p className={`text-[10px] text-right pr-12 ${overLimit ? "text-red-500" : "text-gray-400"}`}>
          {charCount}/{MAX_CHARS}
        </p>
      )}
    </div>
  );
}
