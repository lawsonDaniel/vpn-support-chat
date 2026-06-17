"use client";

import { SessionAnalytics } from "@/types";
import { BarChart2 } from "lucide-react";

interface Props {
  analytics: SessionAnalytics;
  variant?: "light" | "dark";
}

export default function AnalyticsBadge({ analytics, variant = "light" }: Props) {
  const duration = Math.floor(
    (Date.now() - analytics.sessionStart.getTime()) / 60000
  );

  const base = variant === "dark"
    ? "text-blue-100 bg-white/10 border-white/20"
    : "text-gray-500 bg-gray-100 border-gray-200";

  const dot = variant === "dark" ? "text-white/30" : "text-gray-300";
  const icon = variant === "dark" ? "text-blue-200" : "text-blue-500";
  const offTopic = variant === "dark" ? "text-yellow-300" : "text-amber-500";

  return (
    <div className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1 border ${base}`}>
      <BarChart2 size={11} className={icon} />
      <span>{analytics.totalMessages} msg</span>
      <span className={dot}>·</span>
      <span>{duration}m</span>
      {analytics.offTopicCount > 0 && (
        <>
          <span className={dot}>·</span>
          <span className={offTopic}>{analytics.offTopicCount} off-topic</span>
        </>
      )}
    </div>
  );
}
