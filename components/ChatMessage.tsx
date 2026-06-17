"use client";

import { Message } from "@/types";
import { ShieldAlert, Bot, User } from "lucide-react";

interface Props {
  message: Message;
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

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}>
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1
          ${isUser ? "bg-blue-600" : "bg-blue-600"}`}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Bot size={14} className="text-white" />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
          ${isUser
            ? "bg-blue-600 text-white rounded-tr-sm"
            : message.isOffTopic
            ? "bg-amber-50 border border-amber-200 text-gray-800 rounded-tl-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
          }`}
      >
        {message.isOffTopic && !isUser && (
          <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium mb-2">
            <ShieldAlert size={12} />
            <span>Off-topic detected</span>
          </div>
        )}
        <div>{formatContent(message.content)}</div>
        <div className={`text-[10px] mt-1.5 ${isUser ? "text-blue-200" : "text-gray-400"}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
