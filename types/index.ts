export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  isOffTopic?: boolean;
}

export interface ChatRequest {
  message: string;
  history: { role: Role; content: string }[];
}

export interface ChatResponse {
  reply: string;
  isOffTopic?: boolean;
}

export interface SessionAnalytics {
  totalMessages: number;
  offTopicCount: number;
  sessionStart: Date;
  topicsDiscussed: string[];
}
