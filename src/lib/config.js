// ─────────────────────────────────────────────────────────
//  SARVAM AI CONFIG — edit this one file to switch keys/models
// ─────────────────────────────────────────────────────────
//
//  1. Get your free API key at: https://dashboard.sarvam.ai
//  2. Paste it below as SARVAM_API_KEY
//  3. Choose a model:
//       "sarvam-30b"  → faster, cheaper, 64K context  (recommended for most use)
//       "sarvam-105b" → smartest, 128K context         (use for complex reasoning)
//
//  NEVER commit this file with a real key to a public repo.
//  For production, load the key from an environment variable instead:
//     export const SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY;
// ─────────────────────────────────────────────────────────

export const SARVAM_API_KEY = "YOUR_SARVAM_API_KEY_HERE";
export const SARVAM_MODEL   = "sarvam-30b";
