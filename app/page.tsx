"use client";

import { useState } from "react";
import { Shield, MessageCircle, X } from "lucide-react";
import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  function handleOpen() {
    setIsOpen(true);
    setHasUnread(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex flex-col items-center justify-center px-4">
      {/* Demo page content */}
      <div className="text-center max-w-lg">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">SecureVPN</h1>
        <p className="text-gray-500 text-lg mb-2">Fast, private, and secure internet for everyone.</p>
        <p className="text-gray-400 text-sm">
          Have a question? Click the support bubble in the corner.
        </p>
      </div>

      {/* Floating chat bubble + widget */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
        {/* Widget */}
        {isOpen && (
          <div className="animate-slideUp">
            <ChatWidget onClose={() => setIsOpen(false)} />
          </div>
        )}

        {/* Bubble button */}
        <button
          onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
          aria-label={isOpen ? "Close support chat" : "Open support chat"}
          className="relative w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700
            shadow-lg hover:shadow-xl flex items-center justify-center
            transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          {isOpen ? (
            <X size={22} className="text-white" />
          ) : (
            <MessageCircle size={22} className="text-white" />
          )}
          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white" />
          )}
        </button>
      </div>
    </div>
  );
}
