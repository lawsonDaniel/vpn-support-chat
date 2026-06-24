"use client";

import { Message } from "@/types";
import { ShieldAlert } from "lucide-react";

interface Props {
  message: Message;
  compact?: boolean;
  isLastInGroup?: boolean;
}

function formatContent(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-1 my-2 pl-1">
          {items.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ol>
      );
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-2 pl-1">
          {items.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const headingText = line.replace(/^#{1,3}\s/, "");
      elements.push(
        <p key={i} className="font-semibold mt-3 mb-1"
          dangerouslySetInnerHTML={{ __html: formatInline(headingText) }} />
      );
      i++;
      continue;
    }

    if (line.trim() === "") {
      elements.push(<span key={i} className="block h-2" />);
    } else {
      elements.push(
        <p key={i} className="leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    }
    i++;
  }

  return elements;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold'>$1</strong>")
    .replace(/`(.+?)`/g,
      '<code class="bg-black/8 px-1.5 py-0.5 rounded-md text-[11px] font-mono tracking-tight">$1</code>');
}

export default function ChatMessage({ message, isLastInGroup = true }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 animate-msgIn ${isUser ? "flex-row-reverse" : "flex-row"} mb-1`}>
      {/* Avatar — only on last message in a group */}
      <div className="flex-shrink-0 w-7 mt-auto">
        {isLastInGroup && (
          <div
            className={`glass-sheen w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold select-none relative
              ${isUser
                ? "glass-tint text-white"
                : "glass text-slate-500"
              }`}
          >
            {isUser ? "U" : "AI"}
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isLastInGroup ? "mb-3" : "mb-0.5"}`}>
        <div
          className={`glass-sheen relative rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.55]
            ${isUser
              ? "glass-tint text-white rounded-tr-[4px]"
              : message.isOffTopic
              ? "bg-amber-100/50 backdrop-blur-xl border border-amber-200/70 text-slate-700 rounded-tl-[4px] shadow-sm"
              : "glass text-slate-700 rounded-tl-[4px]"
            }`}
        >
          {message.isOffTopic && !isUser && (
            <div className="relative z-10 flex items-center gap-1.5 text-amber-600 text-[10px] font-medium mb-2 pb-2 border-b border-amber-200/60">
              <ShieldAlert size={11} />
              <span>Outside VPN support scope</span>
            </div>
          )}
          <div className="relative z-10 space-y-0.5">{formatContent(message.content)}</div>
        </div>

        {isLastInGroup && (
          <p className={`text-[10px] mt-1 px-1 ${isUser ? "text-right text-slate-400" : "text-slate-400"}`}>
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}
