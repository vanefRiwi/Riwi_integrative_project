// ─────────────────────────────────────────────────────────────
// Lumora AI Agent
//
// A tiny Express proxy whose ONLY job is to hold the AI API key and
// return a short summary of a lesson. It exists for one reason: the
// key must never live in the frontend, where anyone could read it in
// DevTools. The browser sends text here; this process talks to the AI.
//
//   Frontend (ttsService.summarizeText)  ->  POST /summarize  ->  AI model.
//
// It supports three providers, chosen with AI_PROVIDER in .env:
//   - "mock"    : no key needed. Returns a naive extractive summary so the
//                 feature works out of the box for demos and offline dev.
//   - "openai"  : uses OPENAI_API_KEY (chat completions).
//   - "gemini"  : uses GEMINI_API_KEY (generateContent).
//
// If a real provider fails, the endpoint still returns 200 with a mock
// summary so the voice assistant never breaks (the frontend also has its
// own fallback that reads the original text).
// ─────────────────────────────────────────────────────────────

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.AGENT_PORT || 4000;
const PROVIDER = (process.env.AI_PROVIDER || "mock").toLowerCase();
const MAX_INPUT_CHARS = 8000; // guard against huge lessons

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ─── Health check ────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ ok: true, provider: PROVIDER });
});

// ─── Summarize endpoint ──────────────────────────────────────
// Body: { text: string }
// 200:  { ok: true, summary: string, provider: string }
app.post("/summarize", async (req, res) => {
  const text = (req.body?.text || "").toString().trim().slice(0, MAX_INPUT_CHARS);

  if (!text) {
    return res.status(400).json({ ok: false, message: "Field 'text' is required." });
  }

  try {
    let summary;
    if (PROVIDER === "openai") {
      summary = await summarizeWithOpenAI(text);
    } else if (PROVIDER === "gemini") {
      summary = await summarizeWithGemini(text);
    } else {
      summary = mockSummary(text);
    }
    return res.json({ ok: true, summary, provider: PROVIDER });
  } catch (err) {
    // Never break the assistant: fall back to a mock summary.
    console.error("[agent] provider failed, using mock summary:", err.message);
    return res.json({ ok: true, summary: mockSummary(text), provider: "mock-fallback" });
  }
});

// The prompt used for both real providers.
function buildPrompt(text) {
  return (
    "Summarize the following lesson for a student who will listen to it as audio " +
    "right before a quiz. Use 3 to 5 short, clear sentences in plain English. " +
    "Do not use markdown, lists, or headings. Focus on the key ideas.\n\n" +
    text
  );
}

// ─── OpenAI ──────────────────────────────────────────────────
async function summarizeWithOpenAI(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a concise study assistant." },
        { role: "user", content: buildPrompt(text) },
      ],
      max_tokens: 220,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const summary = data?.choices?.[0]?.message?.content?.trim();
  if (!summary) throw new Error("OpenAI returned an empty summary");
  return summary;
}

// ─── Gemini ──────────────────────────────────────────────────
// Google retires model names over time. As of 2026 the Gemini 1.x, 2.0 and
// 2.5 models are gone or closed to new users, and the current Flash model is
// the Gemini 3 series. We default to a current model and, on a 404 "model
// not found", retry with a short list of alternates so the agent keeps
// working across model renames. We also retry briefly on 503 (high demand).
async function summarizeWithGemini(text) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  // Preferred model from .env, then sensible current fallbacks.
  const preferred = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const candidates = [...new Set([
    preferred,
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3-flash",
    "gemini-3.1-flash-lite",
  ])];

  let lastError = "";
  for (const model of candidates) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    // Up to 3 attempts per model, to ride out a transient 503 high-demand spike.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(text) }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 220 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (summary) return summary;
        lastError = "empty summary";
        break; // empty is not a transient error, try next model
      }

      const detail = await res.text().catch(() => "");
      lastError = `Gemini ${res.status}: ${detail.slice(0, 160)}`;

      // 503 = high demand: wait a moment and retry the same model.
      if (res.status === 503 && attempt < 3) {
        console.warn(`[agent] '${model}' busy (503), retry ${attempt}/2...`);
        await sleep(800 * attempt);
        continue;
      }
      // 404 = model not found: stop retrying this model, try the next one.
      if (res.status === 404) {
        console.warn(`[agent] model '${model}' not available, trying next...`);
      }
      // Any other error (401 bad key, 429 quota): no point retrying.
      break;
    }
  }

  throw new Error(lastError || "Gemini request failed");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Mock summary (no key needed) ────────────────────────────
// A naive extractive summary: keeps the first few sentences and trims.
// Good enough to demo the flow without any provider or cost.
function mockSummary(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  const picked = sentences.slice(0, 3).join(" ").trim();
  const summary = picked.length > 500 ? picked.slice(0, 500).trim() + "…" : picked;
  return summary || clean.slice(0, 300);
}

app.listen(PORT, () => {
  console.log(`[agent] Lumora AI agent listening on http://localhost:${PORT} (provider: ${PROVIDER})`);
});
