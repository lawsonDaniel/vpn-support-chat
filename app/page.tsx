"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, Trash2, Wifi } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import LoadingDots from "@/components/LoadingDots";
import AnalyticsBadge from "@/components/AnalyticsBadge";
import { Message, SessionAnalytics } from "@/types";

const SUGGESTED_QUESTIONS = [
  "My VPN keeps disconnecting every few minutes",
  "Best server for streaming Netflix US?",
  "How do I set up the kill switch?",
  "VPN is slowing my connection — how do I fix it?",
];

const REQUEST_TIMEOUT_MS = 30_000;

let msgCounter = 0;
const uid = () => `msg-${++msgCounter}`;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<SessionAnalytics>({
    totalMessages: 0,
    offTopicCount: 0,
    sessionStart: new Date(),
    topicsDiscussed: [],
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isLoading) return;

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingText("");
      setError(null);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const controller = new AbortController();
      abortRef.current = controller;

      // Abort automatically after REQUEST_TIMEOUT_MS
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
          } catch {
            // keep the generic message
          }
          throw new Error(serverMessage);
        }

        if (!res.body) {
          throw new Error("No response body received from server.");
        }

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
                throw new Error(parsed.message ?? "An error occurred while generating the response.");
              }
            } catch (parseErr) {
              // Re-throw real errors; ignore JSON parse noise from partial chunks
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }

        if (full.trim().length === 0) {
          throw new Error("Received an empty response. Please try again.");
        }

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
        // If we got partial content before the error, save it as a message so the user doesn't lose it
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
    <div className="flex flex-col h-dvh bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-gray-900 leading-none">VPN Support</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">AI Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {analytics.totalMessages > 0 && <AnalyticsBadge analytics={analytics} />}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              title="Clear conversation"
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {showEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Wifi size={28} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">How can I help you today?</h2>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                Ask me anything about your VPN — connections, servers, performance, or your account.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50
                    border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-700
                    transition-all duration-150 shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-1">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isLoading && streamingText === "" && (
            <div className="flex gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Shield size={13} className="text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm px-1 py-0.5">
                <LoadingDots />
              </div>
            </div>
          )}

          {streamingText && (
            <ChatMessage
              message={{ id: "streaming", role: "assistant", content: streamingText, timestamp: new Date() }}
            />
          )}

          {error && (
            <div className="my-3">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <p className="font-medium">Something went wrong</p>
                <p className="text-red-500 text-xs mt-0.5">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-1.5 text-xs text-red-500 hover:text-red-700 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
          <p className="text-[11px] text-gray-400 text-center mt-2">
            Specialized in VPN troubleshooting, servers, performance &amp; account support
          </p>
        </div>
      </footer>
    </div>
  );
}
