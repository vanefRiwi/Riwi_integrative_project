// ─── Content Renderer ─────────────────────────────────────────────────────────
// Decide AUTOMÁTICAMENTE qué componente pintar según content.tipo.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  CONTRATO DE DATOS (idéntico al de la API)                              │
// │                                                                         │
// │  { id, titulo, tipo, datos, orden }                                     │
// │                                                                         │
// │  El campo `tipo` indica CÓMO interpretar el campo `datos`:              │
// │                                                                         │
// │   tipo = "readme"   ->  datos = texto en MARKDOWN                       │
// │                         ej: "## Título\n\n- **Punto** importante"       │
// │                                                                         │
// │   tipo = "youtube"  ->  datos = ID o URL del video                      │
// │                         ej: "dQw4w9WgXcQ"                               │
// │                         ej: "https://youtube.com/watch?v=dQw4w9WgXcQ"   │
// │                                                                         │
// │   tipo = "canva"    ->  datos = URL de EMBED del diseño                 │
// │                         ej: "https://canva.com/design/XXX/view?embed"   │
// │                                                                         │
// │  Siempre es UN SOLO campo `datos`. Nunca `url` ni `md` por separado.    │
// └─────────────────────────────────────────────────────────────────────────┘
//
// Para soportar un tipo nuevo, basta con agregarlo al mapa RENDERERS.
// Ninguna vista cambia. (Principio abierto/cerrado.)

import { marked } from "marked";
import DOMPurify from "dompurify";
import { CONTENT_TYPES, youtubeId } from "../services/contentService.js";

// Configuración de marked: saltos de línea al estilo GitHub
marked.setOptions({ breaks: true, gfm: true });

// Envoltorio común de todas las tarjetas de contenido
function card(titulo, inner, { padded = true } = {}) {
  return `
    <div class="rounded-xl overflow-hidden" style="background: var(--card); border: 1px solid var(--border)">
      ${titulo ? `<p class="px-5 pt-4 pb-1 font-bold text-sm" style="font-family: var(--font-family-display)">${titulo}</p>` : ""}
      <div class="${padded ? "px-5 pb-5 pt-2" : "p-4"}">${inner}</div>
    </div>`;
}

// ── tipo: "readme" -> datos = Markdown ───────────────────────────────────────
function renderReadme(content) {
  // marked convierte Markdown -> HTML.
  // DOMPurify limpia el HTML para evitar XSS (un tutor podría inyectar <script>).
  const dirty = marked.parse(content.datos || "");
  const clean = DOMPurify.sanitize(dirty);

  return card(
    content.titulo,
    `<div class="markdown-body text-sm leading-relaxed">${clean}</div>`
  );
}

// ── tipo: "youtube" -> datos = ID o URL del video ────────────────────────────
function renderYoutube(content) {
  const id = youtubeId(content.datos);   // normaliza cualquier formato a un ID

  return card(
    content.titulo,
    `<div class="relative w-full rounded-lg overflow-hidden" style="padding-bottom:56.25%">
       <iframe class="absolute inset-0 w-full h-full"
         src="https://www.youtube.com/embed/${id}"
         title="${content.titulo || "Video"}"
         frameborder="0" allowfullscreen loading="lazy"
         allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"></iframe>
     </div>`,
    { padded: false }
  );
}

// ── tipo: "canva" -> datos = URL de embed ────────────────────────────────────
function renderCanva(content) {
  return card(
    content.titulo,
    `<div class="relative w-full rounded-lg overflow-hidden" style="padding-bottom:56.25%">
       <iframe class="absolute inset-0 w-full h-full"
         src="${content.datos}"
         title="${content.titulo || "Canva design"}"
         frameborder="0" allowfullscreen loading="lazy"></iframe>
     </div>`,
    { padded: false }
  );
}

// ── Fallback: tipo desconocido (no rompemos la vista) ────────────────────────
function renderUnknown(content) {
  return `
    <div class="rounded-xl p-4 text-sm" style="background: var(--muted); color: var(--muted-foreground)">
      Unsupported content type: <code>${content.tipo}</code>
    </div>`;
}

// ── Mapa: tipo -> renderer ───────────────────────────────────────────────────
const RENDERERS = {
  [CONTENT_TYPES.README]: renderReadme,
  [CONTENT_TYPES.YOUTUBE]: renderYoutube,
  [CONTENT_TYPES.CANVA]: renderCanva,
};

// Renderiza UN contenido según su tipo
export function renderContent(content) {
  const renderer = RENDERERS[content.tipo] || renderUnknown;
  return renderer(content);
}

// Renderiza una LISTA completa, respetando el campo `orden`
export function renderContentList(contents = []) {
  if (!contents.length) {
    return `<p class="text-sm py-8 text-center" style="color: var(--muted-foreground)">No content yet.</p>`;
  }
  return contents
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((c) => `<div class="mb-4">${renderContent(c)}</div>`)
    .join("");
}
