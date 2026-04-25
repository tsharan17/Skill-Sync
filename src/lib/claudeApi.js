// ─────────────────────────────────────────────────────────
//  Gemini API helper (FREE — 1500 req/day, no credit card)
//
//  SETUP:
//  1. Get free key → https://aistudio.google.com → "Get API key"
//  2. Create .env in project root:
//       VITE_GEMINI_API_KEY=your_key_here
//  3. STOP and restart: npm run dev
// ─────────────────────────────────────────────────────────

const MODEL   = "gemini-2.0-flash";  // stable, fast, free-tier model
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Free tier limits: ~32k input tokens per request.
// 1 token ≈ 4 chars — cap at 12000 chars (~3000 tokens) to stay safe.
const MAX_INPUT_CHARS = 12000;

// ── Truncate any message content that's too long ──────────────────
function truncateMessages(messages) {
  return messages.map((m) => {
    if (typeof m.content === "string" && m.content.length > MAX_INPUT_CHARS) {
      return {
        ...m,
        content: m.content.slice(0, MAX_INPUT_CHARS) +
          "\n\n[Resume truncated to fit API limits — extract info from above only]",
      };
    }
    return m;
  });
}

// ── Parse retry delay from 429 error body ─────────────────────────
function parseRetryDelay(errText) {
  try {
    const json = JSON.parse(errText);
    // API returns retryDelay like "46s"
    const delay = json?.error?.details?.find(
      (d) => d["@type"]?.includes("RetryInfo")
    )?.retryDelay;
    if (delay) {
      const secs = parseInt(delay.replace("s", ""), 10);
      return isNaN(secs) ? 15000 : secs * 1000;
    }
  } catch (_) {}
  return 15000; // default 15s
}

// ── Main chat function with auto-retry on 429 ─────────────────────
export async function claudeChat(messages, opts = {}) {
  if (!API_KEY) {
    throw new Error(
      "VITE_GEMINI_API_KEY is not set.\n" +
      "Create a .env file in the project root with:\n" +
      "VITE_GEMINI_API_KEY=your_key_here\n" +
      "Then RESTART npm run dev for it to take effect."
    );
  }

  // Truncate to avoid input token quota errors
  const safeMessages = truncateMessages(messages);

  // Gemini wants { role: "user"|"model", parts: [{text}] }
  const contents = safeMessages.map((m) => ({
    role:  m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = JSON.stringify({
    contents,
    generationConfig: {
      maxOutputTokens: opts.max_tokens || 1500,
      temperature:     0.2,
    },
  });

  // Retry up to 2 times on 429 (rate limit), with the delay the API tells us
  const MAX_RETRIES = 2;
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(
      `/api/gemini/v1/models/${MODEL}:generateContent?key=${API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body }
    );

    if (res.ok) {
      const data    = await res.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("Gemini returned an empty response.");
      return content;
    }

    const errText = await res.text().catch(() => res.statusText);

    // On 429, wait the suggested delay then retry
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const waitMs = parseRetryDelay(errText);
      console.warn(`Gemini rate limited. Retrying in ${waitMs / 1000}s… (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    lastError = new Error(`Gemini API ${res.status}: ${errText}`);
    break;
  }

  throw lastError;
}
