"use client";

import { Message } from "@/types";
import { ShieldAlert, Bot, User } from "lucide-react";

interface Props {
  message: Message;
  compact?: boolean;
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
        <ol key={i} className="list-decimal list-inside space-y-1 my-2">
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
        <ul key={i} className="list-disc list-inside space-y-1 my-2">
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
        <p key={i} className="font-semibold mt-3 mb-1" dangerouslySetInnerHTML={{ __html: formatInline(headingText) }} />
      );
      i++;
      continue;
    }

    if (line.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      elements.push(
        <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
    }
    i++;
  }

  return elements;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">$1</code>');
}

export default function ChatMessage({ message, compact = false }: Props) {
  const isUser = message.role === "user";
  const avatarSize = compact ? "w-6 h-6" : "w-7 h-7";
  const iconSize = compact ? 11 : 14;
  const textSize = compact ? "text-xs" : "text-sm";
  const padding = compact ? "px-3 py-2" : "px-4 py-3";
  const gap = compact ? "gap-2 mb-2" : "gap-2.5 mb-3";

  return (
    <div className={`flex ${gap} ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`flex-shrink-0 ${avatarSize} rounded-full flex items-center justify-center mt-1 bg-blue-600`}>
        {isUser ? (
          <User size={iconSize} className="text-white" />
        ) : (
          <Bot size={iconSize} className="text-white" />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-2xl ${padding} ${textSize} leading-relaxed shadow-sm
          ${isUser
            ? "bg-blue-600 text-white rounded-tr-sm"
            : message.isOffTopic
            ? "bg-amber-50 border border-amber-200 text-gray-800 rounded-tl-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
          }`}
      >
        {message.isOffTopic && !isUser && (
          <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-medium mb-1.5">
            <ShieldAlert size={11} />
            <span>Off-topic detected</span>
          </div>
        )}
        <div>{formatContent(message.content)}</div>
        <div className={`text-[10px] mt-1 ${isUser ? "text-blue-200" : "text-gray-400"}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
