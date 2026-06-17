"use client";

export default function LoadingDots() {
  return (
    <div className="flex items-center gap-[5px] px-1 py-1" aria-label="Thinking…">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot w-[7px] h-[7px] rounded-full bg-slate-400"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}
