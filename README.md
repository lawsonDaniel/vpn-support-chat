# VPN Support Chat Assistant

An AI-powered VPN support chat application built with Next.js and Claude (Anthropic). Users can ask VPN-related questions and receive streaming, context-aware responses.

## Features

- **Streaming responses** — text streams in token-by-token for a responsive feel
- **Conversation context** — full message history is passed with each request
- **Off-topic detection** — keyword + context heuristic flags and gracefully handles unrelated questions
- **Session analytics** — live message count and off-topic rate in the header
- **Responsive design** — works on mobile and desktop
- **Markdown rendering** — numbered lists, bullet points, and inline code formatted inline
- **Auto-resizing input** — textarea grows with multi-line input (Shift+Enter)
- **Suggested questions** — quick-start prompts on the empty state screen

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| LLM | Claude claude-sonnet-4-6 via Anthropic SDK |
| Icons | lucide-react |
| Language | TypeScript |

## Setup

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

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
| `ANTHROPIC_API_KEY` | Your Anthropic API key (required) |

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

Set `ANTHROPIC_API_KEY` in your Vercel project environment variables.

---

## Architecture Decisions

### Single Next.js app (full-stack)

Using Next.js App Router for both frontend and backend avoids running two separate servers. API routes live in `app/api/chat/route.ts` and are deployed as serverless functions on Vercel. This removes a network hop and simplifies deployment and local dev.

### Streaming via Server-Sent Events

The API route returns a `ReadableStream` with `text/event-stream` instead of waiting for the full completion. The frontend reads chunks with the Fetch `ReadableStream` API. This gives immediate visual feedback and feels dramatically more responsive for longer answers — users don't stare at a spinner for 3-5 seconds.

### Stateless backend with client-side history

Conversation history is stored in React state and sent with every request (last 20 turns). This avoids a database entirely while still supporting multi-turn dialogue. The tradeoff is that history is lost on page refresh, but for a support context this is acceptable — most sessions are short and single-topic.

### System prompt as scope enforcement

The system prompt is the primary mechanism for keeping the assistant on-topic. It defines the assistant's persona, lists covered topics, sets tone guidelines, and instructs it to redirect off-topic questions. The keyword-based heuristic in the API route is a fast pre-check that tags responses visually (amber border + badge) before the LLM even responds, so the UI can surface the off-topic status in the stream.

### Model: `claude-sonnet-4-6`

Chosen for the balance of response quality and latency. For VPN support, answers need to be technically accurate and well-structured — Sonnet handles numbered steps and technical detail reliably at good speed.

---

## Tradeoffs

| Decision | Benefit | Cost |
|----------|---------|------|
| No database | Zero infra to manage | History lost on refresh |
| Keyword off-topic heuristic | Instant, cheap | False positives possible |
| Client-side markdown parsing | No extra dep | Limited to subset of MD |
| SSE over WebSockets | Simpler, stateless | Server-push only (fine here) |
| 20-turn history window | Keeps context cost bounded | Very long sessions lose early context |

---

## What I'd Improve With More Time

1. **Persistent sessions** — store conversations in a DB (e.g. Supabase) keyed by session ID so history survives refresh and can be reviewed
2. **LLM-based off-topic detection** — replace the keyword heuristic with a lightweight classifier call or a structured output schema so detection is more nuanced (e.g. "Is this VPN-related? yes/no")
3. **Richer analytics** — track which topics appear most (connection issues vs. server selection vs. billing) to inform product and documentation priorities
4. **Rate limiting** — add per-IP rate limiting on the API route to prevent abuse
5. **Feedback buttons** — thumbs up/down on responses to collect quality signal
6. **Accessibility audit** — proper ARIA live regions for the chat, focus management on send
7. **Tests** — unit tests for the off-topic heuristic, integration tests for the API route with mocked Anthropic responses
