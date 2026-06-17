"use client";

import { useState } from "react";
import { Shield, Lock, Zap, Globe } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";

const features = [
  { icon: Lock, label: "No-log policy", desc: "Your data stays yours" },
  { icon: Zap, label: "Ultra-fast speeds", desc: "WireGuard protocol" },
  { icon: Globe, label: "100+ countries", desc: "Global server network" },
];

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  function handleOpen() {
    setIsOpen(true);
    setHasUnread(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #ffffff 50%, #f8fafc 100%)" }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", filter: "blur(60px)" }} />

      {/* Hero */}
      <div className="text-center max-w-md relative z-10">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)" }}
        >
          <Shield size={30} className="text-white" />
        </div>

        <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
          Secure<span className="text-indigo-600">VPN</span>
        </h1>
        <p className="text-slate-500 text-lg mb-8 leading-relaxed">
          Private, fast, and secure internet access for everyone.
        </p>

        {/* Feature pills */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 bg-white rounded-xl px-3.5 py-2.5 border border-slate-100 shadow-sm"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800 leading-none">{label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-slate-400 text-sm">
          Need help?{" "}
          <button
            onClick={handleOpen}
            className="text-indigo-600 font-medium hover:text-indigo-700 underline underline-offset-2"
          >
            Chat with support
          </button>
        </p>
      </div>

      {/* Floating bubble + widget */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
        {isOpen && (
          <div className="animate-slideUp">
            <ChatWidget onClose={() => setIsOpen(false)} />
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          {/* Pulse ring — only when unread and closed */}
          {hasUnread && !isOpen && (
            <span
              className="absolute inset-0 rounded-full animate-pulseRing pointer-events-none"
              style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)" }}
            />
          )}
          <button
            onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
            aria-label={isOpen ? "Close support chat" : "Open support chat"}
            className="relative w-14 h-14 rounded-full flex items-center justify-center
              shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-300
              transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)" }}
          >
            <span key={isOpen ? "x" : "msg"} className="animate-iconIn absolute">
              {isOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              )}
            </span>
          </button>

          {/* Unread dot */}
          {hasUnread && !isOpen && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">1</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
