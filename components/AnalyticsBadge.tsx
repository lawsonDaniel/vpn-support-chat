"use client";

import { SessionAnalytics } from "@/types";
import { BarChart2 } from "lucide-react";

interface Props {
  analytics: SessionAnalytics;
}

export default function AnalyticsBadge({ analytics }: Props) {
  const duration = Math.floor(
    (Date.now() - analytics.sessionStart.getTime()) / 60000
  );

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5 border border-gray-200">
      <BarChart2 size={12} className="text-blue-500" />
      <span>{analytics.totalMessages} msg</span>
      <span className="text-gray-300">·</span>
      <span>{duration}m session</span>
      {analytics.offTopicCount > 0 && (
        <>
          <span className="text-gray-300">·</span>
          <span className="text-amber-500">{analytics.offTopicCount} off-topic</span>
        </>
      )}
    </div>
  );
}
