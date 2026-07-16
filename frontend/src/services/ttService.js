import { marked } from "marked";

// ─────────────────────────────────────────────────────────────
// LumiVoice - Text To Speech Service
// This service contains all speech-related logic.
// The UI should only call these exported functions.
// ─────────────────────────────────────────────────────────────

let utterance = null;
let currentRate = 1;
let isSpeaking = false;

/**
 * Reads plain text aloud.
 * @param {string} text
 */
export function speakText(text = "") {
    if (!text.trim()) return;

    stopSpeech();

    utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = currentRate;
    utterance.lang = "en-US";

    utterance.onstart = () => {
        isSpeaking = true;
    };

    utterance.onend = () => {
        isSpeaking = false;
    };

    utterance.onerror = () => {
        isSpeaking = false;
    };

    speechSynthesis.speak(utterance);
}

/**
 * Pauses the current speech.
 */
export function pauseSpeech() {
    if (speechSynthesis.speaking) {
        speechSynthesis.pause();
    }
}

/*Resumes paused speech.
 */
export function resumeSpeech() {
    if (speechSynthesis.paused) {
        speechSynthesis.resume();
    }
}

/*Stops any current speech.
*/

export function stopSpeech() {
    speechSynthesis.cancel();
    isSpeaking = false;
}

/**
 * Changes the speech speed.
 * Supported values:
 * 0.75
 * 1
 * 1.5
 */
export function setSpeechRate(rate = 1) {
    currentRate = rate;
}

/**
 * Returns true if speech is currently playing.
 */
export function isSpeechPlaying() {
    return isSpeaking;
}

/**
 * Converts Markdown into plain text.
 * This allows the assistant to read lessons naturally.
 */
export function extractTextFromMarkdown(markdown = "") {
    const html = marked.parse(markdown);

    const temp = document.createElement("div");
    temp.innerHTML = html;

    return temp.textContent || "";
}

/**
 * Reads Markdown content aloud.
 */
export function speakMarkdown(markdown = "") {
    const text = extractTextFromMarkdown(markdown);

    speakText(text);
}

/**
 * Placeholder for AI summarization.
 *
 * Later this function will call:
 *
 * Frontend
 *      ↓
 * Agent
 *      ↓
 * OpenAI / Gemini
 *
 */
export async function summarizeText(markdown = "") {

    // TODO:
    // Replace with Agent request

    console.log("AI summary not implemented yet.");

    return extractTextFromMarkdown(markdown);

}

/**
 * Generates an AI summary and reads it.
 *
 * If the AI fails,
 * LumiVoice automatically reads
 * the original lesson instead.
 */
export async function summarizeAndSpeak(markdown = "") {

    try {

        const summary = await summarizeText(markdown);

        speakText(summary);

    } catch (error) {

        console.error("AI Summary failed:", error);

        speakMarkdown(markdown);

    }

}
// =========================
// COMPATIBILIDAD
// =========================

export function speak(text) {
    if (!text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
}

// NOTE (QA): this speak() function duplicates most of what speakText()
// already does (same lang/rate defaults, same cancel-before-speak
// behavior), but it does NOT update the isSpeaking flag or reuse the
// module-level `utterance` variable. Any UI relying on isSpeechPlaying()
// to reflect state will be out of sync if this function is used instead
// of speakText(). Recommend consolidating into a single function, or
// clarifying in code where/why this legacy version is still needed.