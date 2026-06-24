/**
 * Fake in-memory vector database for VPN support knowledge (RAG).
 *
 * This simulates a semantic vector store WITHOUT any external service or API:
 * documents are turned into vectors by a deterministic local "embedder"
 * (token hashing over unigrams + bigrams with TF weighting), then retrieved
 * by cosine similarity. It demonstrates the retrieval-augmented-generation
 * pattern — swap `embed()` for OpenAIEmbeddings + a real store (Pinecone,
 * pgvector, Chroma…) and the rest of the pipeline stays the same.
 */

export interface VPNDoc {
  id: string;
  title: string;
  category: string;
  content: string;
}

/** The knowledge base — the "documents" stored in our fake vector DB. */
export const KNOWLEDGE_BASE: VPNDoc[] = [
  {
    id: "kb-protocols",
    title: "Choosing a VPN protocol",
    category: "performance",
    content:
      "We support WireGuard, OpenVPN, and IKEv2. WireGuard is the fastest and best default for streaming and gaming thanks to low overhead. OpenVPN (UDP) is the most compatible and works well on restrictive networks; OpenVPN (TCP) helps when UDP is blocked. IKEv2 is ideal for mobile because it reconnects quickly when switching between Wi-Fi and cellular.",
  },
  {
    id: "kb-killswitch",
    title: "Enabling the kill switch",
    category: "configuration",
    content:
      "The kill switch blocks all internet traffic if the VPN connection drops, preventing IP leaks. Enable it under Settings > Connection > Kill Switch. On Windows and macOS you can choose 'App-level' (block specific apps) or 'System-level' (block everything). On iOS and Android it is enabled per-profile. Reconnect after toggling for it to take effect.",
  },
  {
    id: "kb-disconnects",
    title: "Fixing frequent disconnections",
    category: "troubleshooting",
    content:
      "If the VPN keeps disconnecting: 1) Switch protocol to WireGuard or IKEv2. 2) Try a different nearby server. 3) Lower the MTU to 1380 in advanced settings if you are on a flaky network. 4) Disable battery optimization for the app on mobile. 5) Update to the latest app version. Persistent drops on one network often indicate ISP throttling — try OpenVPN (TCP) on port 443.",
  },
  {
    id: "kb-speed",
    title: "Improving slow VPN speeds",
    category: "troubleshooting",
    content:
      "To improve speed: connect to a geographically closer server, switch to the WireGuard protocol, avoid servers marked as high-load in the app, and enable split tunneling so only the apps you choose use the VPN. Wired connections and 5GHz Wi-Fi outperform 2.4GHz. Some ISPs throttle VPN traffic; obfuscated servers can help bypass this.",
  },
  {
    id: "kb-streaming",
    title: "Best servers for streaming (Netflix, etc.)",
    category: "servers",
    content:
      "For US streaming catalogs, use the dedicated streaming servers in 'New York' or 'Los Angeles' — they are optimized for Netflix, Hulu, and Disney+. For UK content use 'London (Streaming)'. If a title will not load, clear the app cache, reconnect to a streaming-optimized server, and ensure you are not using a DNS override. Streaming servers rotate IPs to avoid blocks.",
  },
  {
    id: "kb-dnsleak",
    title: "Preventing DNS leaks",
    category: "privacy",
    content:
      "A DNS leak happens when DNS queries bypass the VPN tunnel. We route DNS through our private resolvers by default. To verify, run a DNS leak test while connected and confirm only our servers appear. Enable 'Force VPN DNS' in Settings > Privacy. Disable IPv6 at the OS level if your network leaks IPv6 DNS, or enable our IPv6 leak protection.",
  },
  {
    id: "kb-splittunnel",
    title: "Setting up split tunneling",
    category: "configuration",
    content:
      "Split tunneling lets you choose which apps or domains use the VPN. Go to Settings > Split Tunneling, pick 'Only selected apps use VPN' or 'Selected apps bypass VPN'. Useful for local devices (printers, casting) or banking apps that block VPNs. Available on Windows, macOS, Android, and routers; not available on iOS due to platform limits.",
  },
  {
    id: "kb-devices",
    title: "Device limits and simultaneous connections",
    category: "account",
    content:
      "Each account supports up to 10 simultaneous device connections. Installing on a router counts as a single connection but covers every device behind it. To free a slot, sign out on an unused device or remove it from Account > Devices. Exceeding the limit shows a 'too many connections' error; it does not charge extra.",
  },
  {
    id: "kb-billing",
    title: "Refunds and billing",
    category: "account",
    content:
      "We offer a 30-day money-back guarantee on all plans. Refund requests are processed within 5-7 business days to the original payment method. To request one, contact support@vpnservice.com or use in-app support chat with your account email. Annual and multi-year plans renew automatically; you can disable auto-renew in Account > Subscription. We do not disclose specific pricing in chat — see the website for current plans.",
  },
  {
    id: "kb-router",
    title: "Installing on a router",
    category: "platform",
    content:
      "Router installation protects every device on your network and is great for smart TVs and consoles that lack a native app. We support DD-WRT, OpenWrt, AsusWRT, and GL.iNet routers. Use a WireGuard or OpenVPN config from Account > Manual Setup. Flash compatible firmware first, import the config, and set DNS to our resolvers. A router connection counts as one device slot.",
  },
];

const DIM = 512;
const MIN_SCORE = 0.06;

/** Crude singularizer so "devices"/"connections" match "device"/"connection". */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return token.slice(0, -3) + "y";
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .map(stem);
}

/** Deterministic 32-bit string hash (FNV-1a) → bucket index. */
function hashToBucket(token: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % DIM;
}

/** Raw term-frequency vector over hashed unigrams + bigrams. */
function termVector(text: string): Float32Array {
  const vec = new Float32Array(DIM);
  const tokens = tokenize(text);
  for (let i = 0; i < tokens.length; i++) {
    vec[hashToBucket(tokens[i])] += 1;
    if (i > 0) vec[hashToBucket(tokens[i - 1] + "_" + tokens[i])] += 1;
  }
  return vec;
}

// Build raw TF vectors for the corpus, then derive IDF weights so that rare,
// discriminative terms (e.g. "refund") outweigh common ones (e.g. "can").
const RAW_DOCS = KNOWLEDGE_BASE.map((doc) => termVector(`${doc.title}. ${doc.content}`));

const IDF = (() => {
  const df = new Float32Array(DIM);
  for (const v of RAW_DOCS) for (let i = 0; i < DIM; i++) if (v[i] > 0) df[i] += 1;
  const n = RAW_DOCS.length;
  const idf = new Float32Array(DIM);
  for (let i = 0; i < DIM; i++) idf[i] = Math.log((n + 1) / (df[i] + 1)) + 1;
  return idf;
})();

/** Fake embedding: TF-IDF weighted, L2-normalized so cosine == dot product. */
function embed(text: string): Float32Array {
  const vec = termVector(text);
  for (let i = 0; i < DIM; i++) vec[i] *= IDF[i];
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < DIM; i++) vec[i] /= norm;
  return vec;
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < DIM; i++) s += a[i] * b[i];
  return s;
}

// Precompute (index) the document embeddings once at module load.
const INDEX = KNOWLEDGE_BASE.map((doc) => ({
  doc,
  vector: embed(`${doc.title}. ${doc.content}`),
}));

export interface RetrievalHit {
  doc: VPNDoc;
  score: number;
}

/** Return the top-k most relevant knowledge-base docs for a query. */
export function retrieve(query: string, k = 3): RetrievalHit[] {
  const q = embed(query);
  return INDEX.map(({ doc, vector }) => ({ doc, score: dot(q, vector) }))
    .filter((hit) => hit.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** Format retrieved docs as a context block to inject into the system prompt. */
export function buildContext(hits: RetrievalHit[]): string {
  if (hits.length === 0) return "";
  const entries = hits
    .map((h) => `### ${h.doc.title} (${h.doc.category})\n${h.doc.content}`)
    .join("\n\n");
  return (
    "Use the following knowledge base entries to answer the user. " +
    "Prefer this information over your own assumptions; if it does not cover the question, " +
    "answer from general VPN expertise and say so.\n\n" +
    entries
  );
}
