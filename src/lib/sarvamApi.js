// ─────────────────────────────────────────────────────────
//  Sarvam AI — chat completions helper
//  Endpoint:  POST https://api.sarvam.ai/v1/chat/completions
//  Auth:      Authorization: Bearer <key>
//  Response:  OpenAI-compatible → choices[0].message.content
// ─────────────────────────────────────────────────────────
import { SARVAM_API_KEY, SARVAM_MODEL } from "./config.js";

const SARVAM_ENDPOINT = "https://api.sarvam.ai/v1/chat/completions";

/**
 * Send a list of messages to Sarvam and get the reply text back.
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} opts  — optional overrides
 * @param {string} opts.model
 * @param {number} opts.max_tokens
 * @returns {Promise<string>}  The assistant reply text
 */
export async function sarvamChat(messages, opts = {}) {
  const body = {
    model:      opts.model      || SARVAM_MODEL,
    max_tokens: opts.max_tokens || 1500,
    messages,
  };

  const res = await fetch(SARVAM_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${SARVAM_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Sarvam API ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Sarvam returned an empty response");
  return content;
}

// ─────────────────────────────────────────────────────────
//  PDF text extraction — runs entirely in the browser
//  Uses pdfjs-dist (Mozilla PDF.js) — add to package.json:
//    "pdfjs-dist": "^4.4.168"
// ─────────────────────────────────────────────────────────

let _pdfjsLib = null;

async function getPdfJs() {
  if (_pdfjsLib) return _pdfjsLib;
  const pdfjsLib = await import("pdfjs-dist");
  // Point worker at the bundled worker file
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).href;
  _pdfjsLib = pdfjsLib;
  return pdfjsLib;
}

/**
 * Extract all text from a PDF File object.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractPdfText(file) {
  const pdfjsLib   = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf        = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page        = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText    = textContent.items
      .map((item) => item.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }

  return pages.join("\n\n");
}
