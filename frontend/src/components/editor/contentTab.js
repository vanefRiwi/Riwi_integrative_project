// ─── Pestaña: Content ─────────────────────────────────────────────────────────
// Bloques de contenido de la sección: Video link, README (Markdown) y Canva.

const icon = {
  video: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>`,
  file: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
  canva: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`,
  close: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  plus: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>`,
};

// Íconos grandes para las tarjetas del menú
const bigIcon = {
  video: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>`,
  readme: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
  canva: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`,
};

// Campo según el tipo de bloque
function blockBody(block) {
  if (block.type === "video") {
    return `
      <label class="block text-xs font-medium mb-1.5">YouTube or Vimeo URL</label>
      <input type="url" data-block-input="${block.id}" value="${block.url || ""}"
        class="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style="background: var(--muted); border: 1px solid var(--border)"
        placeholder="https://www.youtube.com/watch?v=..." />`;
  }
  if (block.type === "readme") {
    return `
      <label class="block text-xs font-medium mb-1.5">Markdown content</label>
      <textarea rows="5" data-block-input="${block.id}"
        class="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y font-mono"
        style="background: var(--muted); border: 1px solid var(--border)"
        placeholder="## Key Concepts">${block.md || ""}</textarea>`;
  }
  return `
    <label class="block text-xs font-medium mb-1.5">Canva share/view link</label>
    <input type="url" data-block-input="${block.id}" value="${block.url || ""}"
      class="w-full px-3 py-2 rounded-lg text-sm outline-none"
      style="background: var(--muted); border: 1px solid var(--border)"
      placeholder="https://www.canva.com/design/.../view?embed" />`;
}

const LABELS = {
  video:  { icon: icon.video, text: "Video link",         color: "var(--primary)" },
  readme: { icon: icon.file,  text: "README (Markdown)",  color: "var(--primary)" },
  canva:  { icon: icon.canva, text: "Canva",              color: "#8b3dff" },
};

// Tarjeta grande del menú (ícono + título + descripción)
function menuCard(type, title, desc, iconSvg, tint) {
  return `
    <button data-add-type="${type}"
      class="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:shadow-sm text-left mb-2"
      style="background: var(--card); border: 1px solid var(--border)">
      <span class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style="background: ${tint}20; color: ${tint}">${iconSvg}</span>
      <span>
        <span class="block text-sm font-semibold">${title}</span>
        <span class="block text-xs" style="color: var(--muted-foreground)">${desc}</span>
      </span>
    </button>`;
}

// menuOpen = true -> muestra las tarjetas y el botón dice "Cancel"
export function contentTab(blocks = [], { menuOpen = false } = {}) {
  const list = blocks
    .map((b, i) => {
      const label = LABELS[b.type];
      return `
        <div class="rounded-xl mb-3 overflow-hidden" style="background: var(--card); border: 1px solid var(--border)">
          <div class="flex items-center justify-between px-4 py-2.5"
               style="background: var(--muted); border-bottom: 1px solid var(--border)">
            <span class="flex items-center gap-1.5 text-xs font-semibold" style="color: ${label.color}">
              ${label.icon} ${label.text}
              <span class="font-normal ml-1" style="color: var(--muted-foreground)">Block ${i + 1}</span>
            </span>
            <button data-remove-block="${b.id}" class="transition-colors hover:text-red-600"
                    style="color: var(--muted-foreground)">${icon.close}</button>
          </div>
          <div class="p-4">${blockBody(b)}</div>
        </div>`;
    })
    .join("");

  return `
    <div>
      <p class="text-sm mb-4" style="color: var(--muted-foreground)">
        Add video links, Markdown lessons, or Canva designs. Students see them in order.
      </p>

      <div class="js-blocks">${list}</div>

      <!-- Botón: alterna entre "Add content block" y "Cancel" -->
      <button class="js-add-block w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors"
              style="border: 1px dashed var(--border); color: var(--muted-foreground)">
        ${icon.plus} ${menuOpen ? "Cancel" : "Add content block"}
      </button>

      <!-- Menú desplegable HACIA ABAJO con tarjetas grandes -->
      ${menuOpen ? `
        <div class="mt-3">
          ${menuCard("video",  "Video link", "Paste a YouTube or Vimeo link", bigIcon.video,  "#ef4444")}
          ${menuCard("readme", "README",     "Write the lesson in Markdown",  bigIcon.readme, "#16a34a")}
          ${menuCard("canva",  "Canva",      "Paste a Canva design link",     bigIcon.canva,  "#00c4cc")}
        </div>` : ""}
    </div>
  `;
}