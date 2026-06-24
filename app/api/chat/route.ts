import { NextRequest } from "next/server";
import OpenAI from "openai";
import { openai, VPN_SYSTEM_PROMPT } from "@/lib/openai";
import { classifyIntent, isOffTopicIntent } from "@/lib/intent";
import { retrieve, buildContext } from "@/lib/vectordb";
import { ChatRequest } from "@/types";

export const runtime = "nodejs";

function isValidRole(role: unknown): role is "user" | "assistant" {
  return role === "user" || role === "assistant";
}

function mapOpenAIError(err: unknown): { status: number; message: string } {
  if (err instanceof OpenAI.AuthenticationError) {
    return { status: 401, message: "Authentication error — check your API key." };
  }
  if (err instanceof OpenAI.RateLimitError) {
    return { status: 429, message: "Rate limit reached. Please wait a moment and try again." };
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return { status: 503, message: "Could not reach the AI service. Please try again." };
  }
  if (err instanceof OpenAI.APIError) {
    return { status: err.status ?? 500, message: "The AI service returned an error. Please try again." };
  }
  return { status: 500, message: "An unexpected error occurred. Please try again." };
}

export async function POST(req: NextRequest) {
  // Check API key is configured
  if (!process.env.OPENAI_API_KEY) {
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

  const intent = await classifyIntent(trimmed);
  const isOffTopic = isOffTopicIntent(intent);

  // Retrieval-augmented generation: pull relevant docs from the vector DB for
  // substantive VPN questions. Skip for greetings and off-topic messages.
  const useRag = intent !== "greeting" && !isOffTopic;
  const hits = useRag ? retrieve(trimmed, 3) : [];
  const context = buildContext(hits);

  const systemContent = context
    ? `${VPN_SYSTEM_PROMPT}\n\n---\n${context}`
    : VPN_SYSTEM_PROMPT;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: trimmed },
  ];

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        const stream = await openai.chat.completions.create({
          model: "gpt-4",
          max_tokens: 1024,
          messages,
          stream: true,
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            send({ type: "delta", text, isOffTopic, intent });
          }
        }

        send({ type: "done" });
      } catch (err) {
        const { message } = mapOpenAIError(err);
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
