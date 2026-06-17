"use client";

export default function LoadingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-3">
      <span className="sr-only">Thinking…</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
