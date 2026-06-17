import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, VPN_SYSTEM_PROMPT } from "@/lib/anthropic";
import { ChatRequest } from "@/types";

export const runtime = "nodejs";

const OFF_TOPIC_KEYWORDS = [
  "recipe", "cooking", "weather", "sports", "movie", "music",
  "celebrity", "stock market", "cryptocurrency", "dating", "relationship",
  "homework", "math problem", "history lesson",
];

function likelyOffTopic(message: string): boolean {
  const lower = message.toLowerCase();
  return OFF_TOPIC_KEYWORDS.some((kw) => lower.includes(kw)) &&
    !lower.includes("vpn") &&
    !lower.includes("network") &&
    !lower.includes("connection") &&
    !lower.includes("proxy") &&
    !lower.includes("tunnel");
}

function isValidRole(role: unknown): role is "user" | "assistant" {
  return role === "user" || role === "assistant";
}

function mapAnthropicError(err: unknown): { status: number; message: string } {
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 401, message: "Authentication error — check your API key." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, message: "Rate limit reached. Please wait a moment and try again." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 503, message: "Could not reach the AI service. Please try again." };
  }
  if (err instanceof Anthropic.APIError) {
    return { status: err.status ?? 500, message: "The AI service returned an error. Please try again." };
  }
  return { status: 500, message: "An unexpected error occurred. Please try again." };
}

export async function POST(req: NextRequest) {
  // Check API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Server is not configured correctly." }, { status: 503 });
  }

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string") {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  const trimmed = body.message.trim();
  if (trimmed.length === 0) {
    return Response.json({ error: "Message cannot be empty." }, { status: 400 });
  }
  if (trimmed.length > 2000) {
    return Response.json({ error: "Message is too long (max 2000 characters)." }, { status: 400 });
  }

  // Validate and sanitise history — drop any malformed entries
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory
    .filter((m) => isValidRole(m.role) && typeof m.content === "string" && m.content.trim().length > 0)
    .slice(-20);

  const isOffTopic = likelyOffTopic(trimmed);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: trimmed },
  ];

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: VPN_SYSTEM_PROMPT,
          messages,
        });

        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            send({ type: "delta", text: chunk.delta.text, isOffTopic });
          }
        }

        send({ type: "done" });
      } catch (err) {
        const { message } = mapAnthropicError(err);
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
