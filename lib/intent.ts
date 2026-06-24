import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

/**
 * Intent categories for the VPN support assistant.
 * Everything except `off_topic` is considered in-scope — including `greeting`,
 * which is why a plain "hello" is no longer flagged as outside support scope.
 */
export const INTENTS = [
  "greeting",
  "troubleshooting",
  "account_billing",
  "server_recommendation",
  "general_vpn",
  "off_topic",
] as const;

export type Intent = (typeof INTENTS)[number];

const intentSchema = z.object({
  intent: z
    .enum(INTENTS)
    .describe(
      "The single best-matching intent for the user's message. " +
        "greeting: hellos, thanks, small talk, or chit-chat with no concrete request. " +
        "troubleshooting: connection drops, slow speeds, errors, leaks, crashes, setup problems. " +
        "account_billing: plans, payments, refunds, device limits, login, subscription, licensing. " +
        "server_recommendation: choosing a server/location/protocol for a use case. " +
        "general_vpn: any other VPN, networking, or internet privacy/security question. " +
        "off_topic: clearly unrelated to VPNs, networking, or internet privacy/security.",
    ),
});

const SYSTEM_PROMPT =
  "You are an intent classifier for a VPN support assistant. " +
  "Classify the user's latest message into exactly one intent. " +
  "Greetings, thanks, and small talk are 'greeting' (in-scope), never 'off_topic'. " +
  "Only use 'off_topic' when the message is clearly unrelated to VPNs, networking, " +
  "or internet privacy/security (e.g. recipes, sports, dating).";

// Single-step structured-output chain: model -> typed { intent }.
const classifier = new ChatOpenAI({
  model: "gpt-4",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
}).withStructuredOutput(intentSchema, { name: "classify_intent" });

/**
 * Classify a user message into a VPN-support intent.
 * Fails open to `general_vpn` (in-scope) so a classifier hiccup never blocks a real answer.
 */
export async function classifyIntent(message: string): Promise<Intent> {
  try {
    const result = await classifier.invoke([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ]);
    return result.intent;
  } catch {
    return "general_vpn";
  }
}

export function isOffTopicIntent(intent: Intent): boolean {
  return intent === "off_topic";
}
