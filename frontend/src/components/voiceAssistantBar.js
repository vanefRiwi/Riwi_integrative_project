// ─── Voice Assistant Bar (LumiVoice) ──────────────────────────────────────────
// La barra "Listen to this section" que abre el micrófono del navbar.
//
// Es un OVERLAY FLOTANTE (position: fixed) con fondo translúcido: se monta
// encima de la vista y NO desacomoda el layout del curso. Aparece anclada
// arriba, debajo del navbar, centrada sobre el contenido.
//
// La UI solo llama al service (ttsService.js). Nunca toca speechSynthesis.
//
//   navbar (mic) ──abre/cierra──▶ voiceAssistantBar ──▶ ttsService ──▶ voz
//
// Contenido a leer: se obtiene de window.__lumivoice, un pequeño "puente"
// que la vista del curso rellena con la sección actual (ver courseView).

import {
  speakText, pauseSpeech, resumeSpeech, stopSpeech,
  setSpeechRate, setOnStateChange,
  extractSectionText, extractTextFromMarkdown,
  summarizeText,
} from "../services/ttsService.js";

const RATES = [0.75, 1, 1.5];

const icon = {
  play:  `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  pause: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  close: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  doc:   `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
  spark: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z"/></svg>`,
  loader:`<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
};

// Estado interno de la barra
let mounted = false;
let playing = false;   // ¿hay una lectura en curso?
let paused  = false;
let loading = false;   // ¿la IA está pensando?
let mode    = "original"; // "original" | "ai"

// ─── Puente con la vista ──────────────────────────────────────────────────────
// La vista del curso publica aquí qué se está viendo. Si no hay nada
// (ej. el usuario abre el mic fuera de un curso), la barra lo avisa.
function getContext() {
  return window.__lumivoice || null; // { sectionTitle, section }
}

// ─── Markup ───────────────────────────────────────────────────────────────────
function template() {
  const ctx = getContext();
  const title = ctx?.sectionTitle || "No section open";

  const rateBtns = RATES.map((r) => `
    <button data-rate="${r}"
      class="js-rate px-2 py-0.5 rounded-md text-xs font-semibold transition-all"
      style="background: ${r === currentRate() ? "var(--primary)" : "transparent"};
             color: ${r === currentRate() ? "#fff" : "var(--primary)"}">
      ${r}×
    </button>`).join("");

  return `
    <div class="js-va-panel max-w-4xl mx-auto rounded-2xl overflow-hidden"
         style="background: rgba(220, 252, 231, 0.72);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid var(--border);
                box-shadow: 0 8px 30px rgba(22,163,74,0.15)">

      <!-- Fila superior: play + título + cerrar -->
      <div class="flex items-center gap-4 px-4 sm:px-5 py-3">
        <button class="js-va-play w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 cursor-pointer transition-transform hover:scale-105"
                style="background: var(--primary)"
                title="${playing && !paused ? "Pause" : "Play"}">
          ${loading ? icon.loader : (playing && !paused ? icon.pause : icon.play)}
        </button>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold leading-tight" style="color: var(--primary); font-family: var(--font-family-display)">
            Listen to this section
          </p>
          <p class="text-sm truncate" style="color: var(--muted-foreground)">${title}</p>
        </div>

        <button class="js-va-close p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/40"
                style="color: var(--primary)" title="Close">
          ${icon.close}
        </button>
      </div>

      <!-- Separador sutil -->
      <div style="height:1px; background: var(--border)"></div>

      <!-- Fila inferior: modo (Original / AI) + velocidad -->
      <div class="flex items-center gap-2 px-4 sm:px-5 py-3">
        <button class="js-va-original flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer"
                style="background: ${mode === "original" ? "#fff" : "rgba(255,255,255,0.55)"};
                       color: var(--primary);
                       border: 1.5px solid ${mode === "original" ? "var(--primary)" : "transparent"}">
          ${icon.doc} Original
        </button>

        <button class="js-va-ai flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-white transition-all cursor-pointer"
                style="background: ${loading ? "#8b83e6" : "#6d5ce7"};
                       opacity: ${loading ? ".85" : "1"}">
          ${loading ? icon.loader : icon.spark}
          ${loading ? "Summarizing…" : "Summarize with AI"}
        </button>

        <div class="flex-1"></div>

        <!-- Selector de velocidad -->
        <div class="flex items-center gap-0.5 p-0.5 rounded-lg" style="background: rgba(255,255,255,0.55)">
          ${rateBtns}
        </div>
      </div>
    </div>`;
}

// Velocidad actual (la barra la recuerda entre renders)
let _rate = 1;
function currentRate() { return _rate; }

// ─── Montaje / desmontaje ─────────────────────────────────────────────────────
function host() {
  let el = document.getElementById("lumivoice-host");
  if (!el) {
    el = document.createElement("div");
    el.id = "lumivoice-host";
    // Overlay flotante: fijo bajo el navbar, no ocupa espacio en el flujo.
    el.style.cssText =
      "position:fixed; top:76px; left:0; right:0; z-index:60;" +
      "padding:0 1rem; pointer-events:none;";
    document.body.appendChild(el);
  }
  return el;
}

function render() {
  const el = host();
  el.innerHTML = `<div style="pointer-events:auto">${template()}</div>`;
  attach(el);
}

function attach(root) {
  root.querySelector(".js-va-close")?.addEventListener("click", closeBar);

  // Play / Pause / Resume
  root.querySelector(".js-va-play")?.addEventListener("click", () => {
    if (loading) return;
    if (!playing) return start();          // no hay lectura → empezar
    if (paused)   { resumeSpeech(); return; } // pausada → reanudar
    pauseSpeech();                          // sonando → pausar
  });

  // Modo Original
  root.querySelector(".js-va-original")?.addEventListener("click", () => {
    mode = "original";
    start();
  });

  // Modo AI
  root.querySelector(".js-va-ai")?.addEventListener("click", () => {
    mode = "ai";
    startAI();
  });

  // Velocidad
  root.querySelectorAll(".js-rate").forEach((btn) =>
    btn.addEventListener("click", () => {
      _rate = Number(btn.dataset.rate);
      setSpeechRate(_rate);
      render();
      // Si estaba sonando, reinicia con la nueva velocidad
      if (playing && !paused) start();
    })
  );
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function textToRead() {
  const ctx = getContext();
  if (!ctx?.section) return "";
  return extractSectionText(ctx.section); // welcome + readmes de la sección
}

// Lee el contenido original de la sección
function start() {
  const text = textToRead();
  if (!text) { flashEmpty(); return; }
  mode = "original";
  speakText(text);
}

// Pide resumen a la IA y lo lee (con loading + fallback)
async function startAI() {
  const ctx = getContext();
  const raw = ctx?.section
    ? (ctx.section.contents || [])
        .filter((c) => c.tipo === "readme")
        .map((c) => c.datos).join("\n\n")
    : "";

  if (!raw.trim()) { flashEmpty(); return; }

  loading = true;
  render();

  try {
    const summary = await summarizeText(raw);
    loading = false;
    render();
    speakText(summary);
  } catch (err) {
    console.error("[LumiVoice] summary failed, fallback to original:", err);
    loading = false;
    render();
    speakText(extractTextFromMarkdown(raw)); // fallback silencioso
  }
}

// Aviso breve cuando no hay nada que leer
function flashEmpty() {
  const p = host().querySelector(".js-va-panel p.truncate");
  if (!p) return;
  const prev = p.textContent;
  p.textContent = "Nothing to read on this screen.";
  setTimeout(() => { if (p) p.textContent = prev; }, 1800);
}

// ─── API pública (la usa el navbar) ───────────────────────────────────────────
export function openVoiceAssistant() {
  if (mounted) return closeBar(); // toggle: segundo clic la cierra
  mounted = true;

  // La barra reacciona a los cambios de estado del service
  setOnStateChange((state) => {
    playing = state === "playing" || state === "paused";
    paused  = state === "paused";
    if (state === "stopped") { playing = false; paused = false; }
    if (mounted) render();
  });

  setSpeechRate(_rate);
  render();
}

export function closeBar() {
  stopSpeech();
  mounted = false;
  playing = false;
  paused = false;
  loading = false;
  const el = document.getElementById("lumivoice-host");
  if (el) el.innerHTML = "";
}

export function isVoiceAssistantOpen() {
  return mounted;
}
