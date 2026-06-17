"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, Trash2, X, ChevronDown, Zap } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import LoadingDots from "@/components/LoadingDots";
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

  // Determine last-in-group for each message
  const allMessages = [...messages];

  return (
    <div
      className={`flex flex-col rounded-[20px] overflow-hidden transition-all duration-300 ease-in-out
        w-[370px] border border-white/60
        ${minimised ? "h-[62px]" : "h-[620px]"}`}
      style={{
        maxHeight: "calc(100vh - 110px)",
        boxShadow: "0 32px 64px -12px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 flex-shrink-0 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

        <div className="flex items-center gap-3 relative">
          {/* Avatar */}
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
              <Shield size={16} className="text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#3b5be6]" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight tracking-tight">VPN Support</p>
            <p className="text-indigo-200 text-[11px] mt-0.5 flex items-center gap-1">
              <Zap size={9} className="text-emerald-300" />
              AI-powered · Always online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 relative">
          {analytics.totalMessages > 0 && !minimised && (
            <span className="text-[10px] text-indigo-200 mr-2 bg-white/10 rounded-full px-2 py-0.5">
              {analytics.totalMessages} msgs
            </span>
          )}
          {messages.length > 0 && !minimised && (
            <button
              onClick={clearChat}
              title="Clear chat"
              className="text-indigo-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            onClick={() => setMinimised((v) => !v)}
            title={minimised ? "Expand" : "Minimise"}
            className="text-indigo-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
          >
            <ChevronDown size={15} className={`transition-transform duration-200 ${minimised ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="text-indigo-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimised && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50/80 space-y-0">
            {showEmpty && (
              <div className="flex flex-col items-center text-center gap-4 pt-2">
                {/* Welcome card */}
                <div className="w-full rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100/80 px-4 py-5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-200">
                    <Shield size={18} className="text-white" />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm mb-1">Hi there! 👋</p>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    I&apos;m your VPN support assistant. Ask me anything about connections, servers, performance, or your account.
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="w-full">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2 text-left">
                    Common questions
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-left text-xs px-3.5 py-2.5 rounded-xl bg-white hover:bg-indigo-50
                          border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-700
                          transition-all duration-150 shadow-sm hover:shadow-md"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {allMessages.map((msg, idx) => {
              const next = allMessages[idx + 1];
              const isLastInGroup = !next || next.role !== msg.role;
              return <ChatMessage key={msg.id} message={msg} isLastInGroup={isLastInGroup} compact />;
            })}

            {/* Typing indicator */}
            {isLoading && streamingText === "" && (
              <div className="flex gap-2.5 mb-1 animate-msgIn">
                <div className="flex-shrink-0 w-7 mt-auto">
                  <div className="w-7 h-7 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-500">
                    AI
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-[4px] shadow-sm px-3 py-2.5">
                  <LoadingDots />
                </div>
              </div>
            )}

            {/* Streaming */}
            {streamingText && (
              <ChatMessage
                message={{ id: "streaming", role: "assistant", content: streamingText, timestamp: new Date() }}
                isLastInGroup
                compact
              />
            )}

            {/* Error */}
            {error && (
              <div className="my-2 rounded-xl bg-red-50 border border-red-100 px-3.5 py-3 text-xs animate-msgIn">
                <p className="font-semibold text-red-700 mb-0.5">Something went wrong</p>
                <p className="text-red-500 leading-relaxed">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-red-500 hover:text-red-700 underline font-medium"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Footer */}
          <div className="px-3.5 pt-3 pb-3.5 bg-white border-t border-slate-100 flex-shrink-0">
            <ChatInput onSend={sendMessage} disabled={isLoading} compact />
            <p className="text-[10px] text-slate-400 text-center mt-2 tracking-tight">
              Secured by end-to-end encryption · VPN support only
            </p>
          </div>
        </>
      )}
    </div>
  );
}
