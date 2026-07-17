import { marked } from "marked";

// ─────────────────────────────────────────────────────────────
// LumiVoice · Text-To-Speech Service
//
// All voice logic lives here. The UI (voiceAssistantBar.js) ONLY calls
// these exported functions: it never touches speechSynthesis directly.
// This is the same service pattern used by the rest of the project
// (courseService.js, contentService.js).
//
//   Frontend (voiceAssistantBar) → ttsService → SpeechSynthesis (browser)
//                                             └→ agent/ (only summarize)
//
// TTS runs 100% in the browser with the native SpeechSynthesis API:
// no backend, no API key, no cost. Only `summarizeText` touches the agent.
// ─────────────────────────────────────────────────────────────

let utterance = null;
let currentRate = 1;
let isSpeaking = false;

// Callbacks that the UI can register to update its buttons
// (play/pause) without having to poll the state.
let onStateChange = null;

function emitState(state) {
  // state: "playing" | "paused" | "stopped"
  if (typeof onStateChange === "function") onStateChange(state);
}

/**
 * Allows the UI to listen for player state changes.
 * @param {(state: "playing"|"paused"|"stopped") => void} cb
 */
export function setOnStateChange(cb) {
  onStateChange = cb;
}

// ─── Basic playback ────────────────────────────────────────

/**
 * Reads plain text aloud. Cancels any previous reading.
 * @param {string} text
 */
export function speakText(text = "") {
  if (!text.trim()) return;

  stopSpeech();

  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = currentRate;
  utterance.lang = "en-US";

  utterance.onstart = () => { isSpeaking = true; emitState("playing"); };
  utterance.onend = () => { isSpeaking = false; emitState("stopped"); };
  utterance.onerror = () => { isSpeaking = false; emitState("stopped"); };

  speechSynthesis.speak(utterance);
}

/** Pauses the current reading. */
export function pauseSpeech() {
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
    emitState("paused");
  }
}

/** Resumes a paused reading. */
export function resumeSpeech() {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    emitState("playing");
  }
}

/** Stops any reading completely. */
export function stopSpeech() {
  speechSynthesis.cancel();
  isSpeaking = false;
  emitState("stopped");
}

/**
 * Changes the reading speed. Supported: 0.75, 1, 1.5.
 * If something is already being read, it restarts with the new speed so
 * the change is applied instantly.
 * @param {number} rate
 */
export function setSpeechRate(rate = 1) {
  currentRate = rate;
}

/** true if there's a reading in progress (even if paused). */
export function isSpeechPlaying() {
  return speechSynthesis.speaking;
}

/** true if the reading is paused. */
export function isSpeechPaused() {
  return speechSynthesis.paused;
}

// ─── Markdown → readable text ─────────────────────────────────

/**
 * Converts Markdown to plain text so the assistant can read it
 * naturally (without ##, **, hyphens, etc.).
 * @param {string} markdown
 * @returns {string}
 */
export function extractTextFromMarkdown(markdown = "") {
  const html = marked.parse(markdown || "");
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || "").replace(/\s+/g, " ").trim();
}

/** Reads Markdown content aloud. */
export function speakMarkdown(markdown = "") {
  speakText(extractTextFromMarkdown(markdown));
}

// ─── Screen content extraction ────────────────────────────────
//
// The bar passes to these functions what's in the current section.
// Only things that make sense to read are read:
//   · contents of type "readme" (Markdown)  ← the lesson material
//   · the welcome message (welcome)
//   · quiz questions (text + options)
// YouTube videos and Canva embeds are NOT read (they're not text).

/**
 * Gathers all readable text from a section to read it "straight through".
 * Receives the `items` object that courseView already loads (welcome/contents/quizz).
 *
 * @param {object} section  { welcome, contents, review, quizz }
 * @param {object} [opts]
 * @param {"welcome"|"content"|"quizz"} [opts.only]  read only one part
 * @returns {string} plain text ready for speakText()
 */
export function extractSectionText(section = {}, { only } = {}) {
  if (!section) return "";
  const parts = [];

  // Welcome
  if ((!only || only === "welcome") && section.welcome?.message) {
    parts.push(section.welcome.message);
  }

  // Content: ONLY readme blocks (Markdown). YouTube/Canva are ignored.
  if (!only || only === "content") {
    const readmes = (section.contents || [])
      .filter((c) => c.tipo === "readme")
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map((c) => {
        const titulo = c.titulo ? `${c.titulo}. ` : "";
        return titulo + extractTextFromMarkdown(c.datos);
      });
    parts.push(...readmes);
  }

  // Quiz: statement + options for each question
  if (only === "quizz" && section.quizz?.questions?.length) {
    parts.push(extractQuizText(section.quizz));
  }

  return parts.filter(Boolean).join(". ").replace(/\.\s*\./g, ".").trim();
}

/**
 * Converts a quiz to readable text: each question with its numbered options
 * ("Option 1: ..."). Never reads which one is correct.
 * @param {object} quiz  { questions: [{ text, options }] }
 * @returns {string}
 */
export function extractQuizText(quiz = {}) {
  const qs = quiz.questions || [];
  return qs.map((q, i) => {
    const opts = (q.options || [])
      .map((opt, oi) => `Option ${oi + 1}: ${opt}`)
      .join(". ");
    return `Question ${i + 1}. ${q.text}. ${opts}`;
  }).join(". ");
}

// ─── AI Summarization (via agent/) ───────────────────────────

/**
 * Requests a short summary from the agent (which talks to OpenAI/Gemini and
 * keeps the API key outside the frontend). Today it's a placeholder that
 * returns the text as-is; when the agent is ready, replace the body.
 *
 *   FUTURE:
 *   const res = await fetch("/agent/summarize", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ text }),
 *   });
 *   const { summary } = await res.json();
 *   return summary;
 *
 * @param {string} markdown
 * @returns {Promise<string>}
 */
export async function summarizeText(markdown = "") {
  // TODO: replace with the real request to the agent.
  console.log("[LumiVoice] AI summary not implemented yet — reading original.");
  return extractTextFromMarkdown(markdown);
}

/**
 * Generates an AI summary and reads it. If AI fails, reads the original
 * text instead (silent fallback: never breaks).
 * @param {string} markdown
 */
export async function summarizeAndSpeak(markdown = "") {
  try {
    const summary = await summarizeText(markdown);
    speakText(summary);
  } catch (error) {
    console.error("[LumiVoice] AI summary failed, reading original:", error);
    speakMarkdown(markdown);
  }
}

// ─── Compatibility ─────────────────────────────────────────
// Simple alias used by the navbar for a quick test.
export function speak(text = "") {
  speakText(text);
}