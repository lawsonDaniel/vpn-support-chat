"use client";

import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

const MAX_CHARS = 2000;

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
  compact?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
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
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }

  const overLimit = charCount > MAX_CHARS;
  const hasText = charCount > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`glass flex items-end gap-2 rounded-2xl px-3 py-2 transition-all
        ${overLimit ? "ring-1 ring-red-300" : "focus-within:ring-1 focus-within:ring-indigo-200"}`}>
        <textarea
          ref={ref}
          rows={1}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a VPN question…"
          className="flex-1 resize-none bg-transparent text-[13px] text-slate-800 placeholder-slate-400
            focus:outline-none max-h-[110px] overflow-y-auto py-0.5 leading-relaxed"
        />
        <button
          type="button"
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          disabled={disabled || !hasText || overLimit}
          aria-label="Send message"
          className={`glass-sheen relative flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
            transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-300
            ${hasText && !overLimit && !disabled
              ? "glass-tint hover:shadow-lg hover:scale-105"
              : "bg-slate-300/40 backdrop-blur-md cursor-not-allowed"
            }`}
        >
          <ArrowUp size={15} className={`relative z-10 ${hasText && !overLimit && !disabled ? "text-white" : "text-slate-400"}`} />
        </button>
      </div>
      {charCount > 1800 && (
        <p className={`text-[10px] text-right pr-1 ${overLimit ? "text-red-500" : "text-slate-400"}`}>
          {charCount} / {MAX_CHARS}
        </p>
      )}
    </div>
  );
}
