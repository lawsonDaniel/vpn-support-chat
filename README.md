# VPN Support Chat Assistant

An AI-powered VPN support chat application built with Next.js and **OpenAI GPT-4**. Users ask VPN-related questions and receive streaming, context-aware answers grounded in a built-in knowledge base. The UI uses an **iOS 26 "Liquid Glass"** aesthetic.

## Features

- **Streaming responses** — text streams in token-by-token for a responsive feel
- **LLM intent classification** — a LangChain classifier labels every message (greeting, troubleshooting, account/billing, server recommendation, general VPN, or off-topic) instead of brittle keyword matching
- **Retrieval-augmented generation (RAG)** — relevant articles are pulled from an in-memory vector DB and injected into the prompt so answers stay accurate and grounded
- **Graceful off-topic handling** — only genuinely unrelated messages are flagged; greetings like "hello" are no longer mislabeled
- **Conversation context** — message history (last 20 turns) is passed with each request
- **Session analytics** — live message count in the header
- **Liquid Glass UI** — translucent frosted-glass surfaces with backdrop blur, light-catching borders, and specular highlights
- **Markdown rendering** — numbered lists, bullets, and inline code formatted inline
- **Auto-resizing input** — textarea grows with multi-line input (Shift+Enter)
- **Suggested questions** — quick-start prompts on the empty state

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 + custom Liquid Glass CSS |
| LLM | OpenAI **GPT-4** via the `openai` SDK |
| Intent classifier | LangChain (`@langchain/openai`) with Zod structured output |
| Vector DB / RAG | Custom in-memory TF-IDF vector store (`lib/vectordb.ts`) |
| Icons | lucide-react |
| Language | TypeScript |

## Setup

### Prerequisites

- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Installation

```bash
git clone <repo-url>
cd vpn-support-chat
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your API key:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key (required) |

> **Note:** `.env.local` must live in the project root (this folder), next to `package.json` — that's the only place Next.js loads it from. `.env.example` is a committed template and must never contain a real key.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Restart the dev server after changing env vars — they load at startup only.

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Set `OPENAI_API_KEY` in your Vercel project environment variables.

---

## How a message is processed

```
User message
   │
   ▼
1. Validate & sanitise (length, role, history window)   app/api/chat/route.ts
   │
   ▼
2. Classify intent (LangChain → GPT-4, structured output) lib/intent.ts
   │   greeting | troubleshooting | account_billing |
   │   server_recommendation | general_vpn | off_topic
   ▼
3. Retrieve context (skipped for greetings / off-topic)   lib/vectordb.ts
   │   top-k docs by TF-IDF cosine similarity
   ▼
4. Build prompt = system prompt + retrieved context       lib/openai.ts
   │
   ▼
5. Stream GPT-4 completion back over SSE                   app/api/chat/route.ts
```

---

## Project structure

| Path | Responsibility |
|------|----------------|
| `app/api/chat/route.ts` | Chat endpoint: validation, orchestration, SSE streaming |
| `lib/openai.ts` | OpenAI client + VPN system prompt |
| `lib/intent.ts` | LangChain intent classifier (Zod-typed structured output) |
| `lib/vectordb.ts` | Fake in-memory vector DB + RAG retrieval |
| `components/ChatWidget.tsx` | Chat panel, streaming reader, state |
| `components/ChatMessage.tsx` | Message bubbles + markdown rendering |
| `components/ChatInput.tsx` | Auto-resizing input |
| `app/page.tsx` | Landing page + floating chat bubble |
| `app/globals.css` | Liquid Glass material classes + animations |

---

## Architecture Decisions

### LLM: OpenAI GPT-4

Migrated from Anthropic Claude to OpenAI GPT-4. The system prompt is passed as a `system`-role message in the `messages` array (OpenAI convention), and responses stream via the `openai` SDK's `stream: true` reading `chunk.choices[0].delta.content`.

### Intent classification with LangChain (not keywords)

The original keyword heuristic produced false positives — a plain "hello" was flagged "Outside VPN support scope". It's replaced by a LangChain classifier (`ChatOpenAI(...).withStructuredOutput(zodSchema)`) that returns a typed intent. Greetings are their own in-scope category, and only clearly unrelated messages become `off_topic`. The classifier fails open (defaults to in-scope) so a hiccup never blocks a real answer.

### Fake vector DB + RAG

`lib/vectordb.ts` is a self-contained, in-memory "vector database" with **no external service**. Documents (the VPN knowledge base) are embedded with a deterministic local embedder — token hashing over unigrams + bigrams, light stemming, and **TF-IDF weighting** — then retrieved by cosine similarity. For substantive questions the top-k docs are injected into the system prompt so GPT-4 answers from real reference content. The interface (`retrieve()` / `buildContext()`) mirrors a real store, so swapping in OpenAI embeddings + Pinecone/pgvector/Chroma is a drop-in change.

### Streaming via Server-Sent Events

The API route returns a `ReadableStream` with `text/event-stream`; the frontend reads chunks with the Fetch `ReadableStream` API. Immediate visual feedback beats staring at a spinner.

### Stateless backend with client-side history

Conversation history lives in React state and is sent with every request (last 20 turns) — no database. History is lost on refresh, which is acceptable for short support sessions.

### Liquid Glass UI

`app/globals.css` defines a small material system — `.glass`, `.glass-strong`, `.glass-subtle`, `.glass-tint`, and a `.glass-sheen` specular highlight — built on `backdrop-filter: blur() saturate()`, translucent fills, rim borders, and inner highlights. A drifting, saturated colour field behind the surfaces gives the glass something to refract.

---

## Tradeoffs

| Decision | Benefit | Cost |
|----------|---------|------|
| No database | Zero infra to manage | History lost on refresh |
| LLM intent classifier | Accurate, nuanced routing | One extra GPT-4 call per message |
| Fake (local) vector DB | No external service, fully offline-capable | Lexical TF-IDF, not true semantic embeddings |
| SSE over WebSockets | Simpler, stateless | Server-push only (fine here) |
| 20-turn history window | Bounded context cost | Very long sessions lose early context |
| `backdrop-filter` glass | Striking, modern look | Heavier to composite; needs a modern browser |

---

## What I'd Improve With More Time

1. **Real embeddings** — swap the local TF-IDF embedder for OpenAI embeddings + a hosted vector store (Pinecone/pgvector) for true semantic retrieval
2. **Cheaper classifier** — run intent classification on `gpt-4o-mini` to cut cost/latency of the extra call
3. **Show sources** — surface which knowledge-base articles grounded each answer
4. **Persistent sessions** — store conversations in a DB keyed by session ID
5. **Rate limiting** — per-IP limits on the API route to prevent abuse
6. **Feedback buttons** — thumbs up/down to collect quality signal
7. **Tests** — unit tests for retrieval + intent classification, integration tests for the API route with mocked OpenAI responses
8. **Accessibility** — ARIA live regions for the stream, focus management, and a reduced-transparency fallback for the glass UI
