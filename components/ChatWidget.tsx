"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, Trash2, X, Minus } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import LoadingDots from "@/components/LoadingDots";
import AnalyticsBadge from "@/components/AnalyticsBadge";
import { Message, SessionAnalytics } from "@/types";

const SUGGESTED_QUESTIONS = [
  "My VPN keeps disconnecting",
  "Best server for Netflix US?",
  "How do I set up the kill switch?",
  "VPN is slowing my speed",
];

const REQUEST_TIMEOUT_MS = 30_000;

let msgCounter = 0;
const uid = () => `msg-${++msgCounter}`;

interface Props {
  onClose: () => void;
}

export default function ChatWidget({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [minimised, setMinimised] = useState(false);
  const [analytics, setAnalytics] = useState<SessionAnalytics>({
    totalMessages: 0,
    offTopicCount: 0,
    sessionStart: new Date(),
    topicsDiscussed: [],
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!minimised) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, minimised]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isLoading) return;

      const userMsg: Message = { id: uid(), role: "user", content: text, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingText("");
      setError(null);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS);

      let full = "";
      let offTopic = false;

      try {
        let res: Response;
        try {
          res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, history }),
            signal: controller.signal,
          });
        } catch (fetchErr) {
          if ((fetchErr as Error).name === "AbortError") {
            const reason = (fetchErr as Error).message;
            throw new Error(reason === "timeout" ? "Request timed out. Please try again." : "Request cancelled.");
          }
          throw new Error("Network error — check your connection and try again.");
        }

        if (!res.ok) {
          let serverMessage = `Request failed (${res.status})`;
          try {
            const data = await res.json();
            if (data?.error) serverMessage = data.error;
          } catch { /* keep generic */ }
          throw new Error(serverMessage);
        }

        if (!res.body) throw new Error("No response body received from server.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          let done: boolean;
          let value: Uint8Array | undefined;
          try {
            ({ done, value } = await reader.read());
          } catch (readErr) {
            if ((readErr as Error).name === "AbortError") break;
            throw new Error("Connection interrupted while receiving response.");
          }
          if (done) break;

          const raw = decoder.decode(value, { stream: true });
          for (const line of raw.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "delta") {
                full += parsed.text;
                offTopic = parsed.isOffTopic ?? false;
                setStreamingText(full);
              } else if (parsed.type === "error") {
                throw new Error(parsed.message ?? "Error generating response.");
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }

        if (full.trim().length === 0) throw new Error("Received an empty response. Please try again.");

        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: full, timestamp: new Date(), isOffTopic: offTopic },
        ]);
        setAnalytics((prev) => ({
          ...prev,
          totalMessages: prev.totalMessages + 2,
          offTopicCount: prev.offTopicCount + (offTopic ? 1 : 0),
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        if (full.trim().length > 0) {
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "assistant", content: full, timestamp: new Date(), isOffTopic: offTopic },
          ]);
        }
        setError(msg);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
        setStreamingText("");
      }
    },
    [isLoading, messages]
  );

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    setStreamingText("");
    setError(null);
    setAnalytics({ totalMessages: 0, offTopicCount: 0, sessionStart: new Date(), topicsDiscussed: [] });
  }

  const showEmpty = messages.length === 0 && !isLoading;

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200
        w-[380px] transition-all duration-300 overflow-hidden
        ${minimised ? "h-[56px]" : "h-[600px]"}`}
      style={{ maxHeight: "calc(100vh - 100px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-blue-600 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-none">VPN Support</p>
            <p className="text-blue-200 text-[10px] mt-0.5">AI Assistant · Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {analytics.totalMessages > 0 && !minimised && (
            <div className="mr-1">
              <AnalyticsBadge analytics={analytics} variant="dark" />
            </div>
          )}
          {messages.length > 0 && !minimised && (
            <button onClick={clearChat} title="Clear chat" className="text-blue-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={() => setMinimised((v) => !v)} title={minimised ? "Expand" : "Minimise"} className="text-blue-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
            <Minus size={14} />
          </button>
          <button onClick={onClose} title="Close" className="text-blue-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body — hidden when minimised */}
      {!minimised && (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-4 bg-gray-50">
            {showEmpty && (
              <div className="flex flex-col items-center text-center gap-4 pt-4">
                <p className="text-gray-500 text-sm">Hi there! How can I help with your VPN today?</p>
                <div className="flex flex-col gap-1.5 w-full">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-2 rounded-lg bg-white hover:bg-blue-50
                        border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-700
                        transition-all shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} compact />
            ))}

            {isLoading && streamingText === "" && (
              <div className="flex gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Shield size={11} className="text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm px-1">
                  <LoadingDots />
                </div>
              </div>
            )}

            {streamingText && (
              <ChatMessage
                message={{ id: "streaming", role: "assistant", content: streamingText, timestamp: new Date() }}
                compact
              />
            )}

            {error && (
              <div className="my-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                <p className="font-medium">Error</p>
                <p className="text-red-500 mt-0.5">{error}</p>
                <button onClick={() => setError(null)} className="mt-1 text-red-500 hover:text-red-700 underline">
                  Dismiss
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 bg-white border-t border-gray-200 flex-shrink-0">
            <ChatInput onSend={sendMessage} disabled={isLoading} compact />
          </div>
        </>
      )}
    </div>
  );
}
