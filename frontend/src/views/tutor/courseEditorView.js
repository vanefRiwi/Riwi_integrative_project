// ─── Course Editor (Tutor) ────────────────────────────────────────────────────
// Crear o editar un curso. Réplica del diseño de Figma.
//
// REGLAS DE NEGOCIO:
//  - Regla 2: solo un tutor puede crear cursos (guard dentro de createCourse).
//  - Regla 3: solo el tutor dueño puede editar (guard dentro de updateCourse).
//  - Regla 1: si el curso es privado, se genera un course_code.
//
// ⚠️ CÓDIGO INMUTABLE: el código se genera UNA sola vez, al marcar "Require
// course code". Después queda bloqueado: no se puede cambiar ni regenerar
// (solo copiar). Así, quien ya tiene el código nunca pierde el acceso.

import { navbar, initNavbar } from "../../components/navbar.js";
import { welcomeTab } from "../../components/editor/welcomeTab.js";
import { contentTab } from "../../components/editor/contentTab.js";
import { reviewTab } from "../../components/editor/reviewTab.js";
import { quizzTab } from "../../components/editor/quizzTab.js";
import { navigate } from "../../router/router.js";
import { showToast } from "../../helpers/toast.js";
import {
  getCourseById,
  createCourse,
  updateCourse,
  generateCourseCode,
} from "../../data/courses.js";

const COVER_PRESETS = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=220&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=220&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=400&h=220&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=220&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1550439062-609e1531270e?w=400&h=220&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=220&fit=crop&auto=format",
];

const icon = {
  back: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  cap: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  eye: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  save: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  plus: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>`,
  lock: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  copy: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  grip: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>`,
  trash: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  trophy: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
};

// ─── Estado del editor ───────────────────────────────────────────────────────
let state = null;
let editingId = null;   // null = curso nuevo

function blankState() {
  return {
    title: "",
    instructor: "",
    category: "",
    level: "Beginner",
    description: "Build real-world skills with hands-on projects and expert guidance.",
    image: "",
    visibility: "open",
    course_code: null,          // se genera solo al pasar a "code"
    codeLocked: false,          // ⚠️ una vez true, el código ya no cambia
    sections: [
      { id: 1, title: "Getting Started" },
      { id: 2, title: "Section 2" },
    ],
    items: {},                  // { [sectionId]: { welcome, content, review, quizz } }
    finalAssessment: { questions: [], countsGrade: true, points: 200 },
    selSection: 1,
    selTab: "welcome",          // welcome | content | review | quizz | final
    menuOpen: false,            // menú de "Add content block" abierto?
  };
}

// Devuelve (creando si hace falta) los items de una sección
function sectionItems(secId) {
  if (!state.items[secId]) {
    state.items[secId] = {
      welcome: { message: "", videoUrl: "" },
      content: [],
      review: {
        format: "fill-blanks", blankText: "", pairs: [], steps: [],
        instantFeedback: true, countsGrade: true, points: 100,
      },
      quizz: { questions: [], countsGrade: true, points: 50 },
    };
  }
  return state.items[secId];
}

// ─── Panel izquierdo ─────────────────────────────────────────────────────────
function leftPanel() {
  const covers = COVER_PRESETS.map(
    (url) => `
      <button data-cover="${url}" class="h-12 rounded-lg overflow-hidden transition-all"
        style="border: 2px solid ${state.image === url ? "var(--primary)" : "transparent"}">
        <img src="${url}" class="w-full h-full object-cover" />
      </button>`
  ).join("");

  const sections = state.sections.map((s) => {
    const active = state.selTab !== "final" && state.selSection === s.id;
    // Solo se permite borrar si queda más de una sección
    const canDelete = state.sections.length > 1;
    return `
      <div data-section="${s.id}"
        class="js-section group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all mb-1"
        style="background: ${active ? "var(--primary)" : "transparent"};
               color: ${active ? "#fff" : "var(--foreground)"}">
        <span style="opacity:.5">${icon.grip}</span>
        <span class="js-sec-title flex-1" data-sec-id="${s.id}">${s.title}</span>
        ${canDelete ? `
          <button data-delete-section="${s.id}" title="Delete section"
            class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-red-500"
            style="color: ${active ? "#fff" : "var(--muted-foreground)"}">${icon.trash}</button>` : ""}
      </div>`;
  }).join("");

  // Caja del código (solo si es privado y ya se generó)
  const codeBox = state.visibility === "code" && state.course_code
    ? `
      <div class="mt-3 p-3 rounded-lg" style="background: var(--secondary)">
        <div class="flex items-center justify-between mb-1">
          <span class="flex items-center gap-1 text-xs font-semibold" style="color: var(--primary)">
            ${icon.lock} Course code
          </span>
          <button class="js-copy-code flex items-center gap-1 text-xs font-medium"
                  style="color: var(--primary)">${icon.copy} Copy</button>
        </div>
        <p class="font-mono font-bold tracking-wider" style="color: var(--primary)">${state.course_code}</p>
        <p class="text-xs mt-1" style="color: var(--muted-foreground)">
          Generated once and locked. Share it with your students.
        </p>
      </div>`
    : "";

  const visOption = (value, label, sub) => {
    const active = state.visibility === value;
    return `
      <label data-visibility="${value}"
        class="js-visibility flex items-start gap-2.5 p-3 rounded-lg cursor-pointer transition-all mb-2"
        style="border: 2px solid ${active ? "var(--primary)" : "var(--border)"};
               background: ${active ? "var(--secondary)" : "transparent"}">
        <input type="radio" name="visibility" ${active ? "checked" : ""} class="mt-0.5 accent-green-600" />
        <span>
          <span class="block text-sm font-medium">${label}</span>
          <span class="block text-xs" style="color: var(--muted-foreground)">${sub}</span>
        </span>
      </label>`;
  };

  return `
    <aside class="w-full lg:w-72 shrink-0 space-y-6">

      <div>
        <p class="text-xs font-semibold mb-3 tracking-wide" style="color: var(--muted-foreground)">COURSE INFO</p>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium mb-1">Title</label>
            <input name="title" value="${state.title}" placeholder="Course title"
              class="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style="background: var(--muted); border: 1px solid var(--border)" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Instructor</label>
            <input name="instructor" value="${state.instructor}" placeholder="Instructor name"
              class="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style="background: var(--muted); border: 1px solid var(--border)" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Category</label>
            <input name="category" value="${state.category}" placeholder="e.g. Programming"
              class="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style="background: var(--muted); border: 1px solid var(--border)" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Level</label>
            <select name="level" class="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style="background: var(--muted); border: 1px solid var(--border)">
              ${["Beginner", "Intermediate", "Advanced"]
                .map((l) => `<option ${state.level === l ? "selected" : ""}>${l}</option>`)
                .join("")}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Description</label>
            <textarea name="description" rows="3"
              class="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style="background: var(--muted); border: 1px solid var(--border)">${state.description}</textarea>
          </div>
        </div>
      </div>

      <div>
        <p class="text-xs font-semibold mb-3 tracking-wide" style="color: var(--muted-foreground)">COVER IMAGE</p>
        <div class="grid grid-cols-3 gap-2 mb-2">${covers}</div>
        <label class="block text-xs mb-1" style="color: var(--muted-foreground)">or paste an image URL</label>
        <input name="image" value="${state.image}" placeholder="https://..."
          class="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style="background: var(--muted); border: 1px solid var(--border)" />
      </div>

      <div>
        <p class="text-xs font-semibold mb-3 tracking-wide" style="color: var(--muted-foreground)">VISIBILITY</p>
        ${visOption("open", "Open to everyone", "Anyone can find and join.")}
        ${visOption("code", "Require course code", "Students need the code to join.")}
        ${codeBox}
      </div>

      <div>
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold tracking-wide" style="color: var(--muted-foreground)">SECTIONS</p>
          <button class="js-add-section w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style="background: var(--primary)">${icon.plus}</button>
        </div>
        ${sections}
        <p class="text-xs mt-1" style="color: var(--muted-foreground)">Double-click a section to rename it.</p>

        <div data-section="final"
          class="js-section flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all mt-3"
          style="background: ${state.selTab === "final" ? "var(--primary)" : "transparent"};
                 color: ${state.selTab === "final" ? "#fff" : "var(--foreground)"};
                 border: 1px solid var(--border)">
          ${icon.trophy} Final Assessment
        </div>
      </div>
    </aside>
  `;
}

// ─── Panel derecho (pestañas) ────────────────────────────────────────────────
function rightPanel() {
  if (state.selTab === "final") {
    return `
      <div class="flex-1 rounded-2xl p-5" style="background: var(--card); border: 1px solid var(--border)">
        <p class="text-xs mb-4">
          <span style="color: var(--muted-foreground)">Editing: </span>
          <span class="px-2 py-0.5 rounded font-semibold"
                style="background: var(--secondary); color: var(--primary)">Course &rarr; Final Assessment</span>
        </p>
        <div class="js-tab-body">${quizzTab(state.finalAssessment, { isFinal: true })}</div>
      </div>`;
  }

  const items = sectionItems(state.selSection);
  const sec = state.sections.find((s) => s.id === state.selSection);

  const tabBtn = (key, label) => {
    const active = state.selTab === key;
    return `<button data-tab="${key}"
      class="js-tab px-3 py-2 text-sm font-medium rounded-lg transition-all"
      style="background: ${active ? "var(--muted)" : "transparent"};
             color: ${active ? "var(--primary)" : "var(--muted-foreground)"}">${label}</button>`;
  };

  const body =
    state.selTab === "content" ? contentTab(items.content, { menuOpen: state.menuOpen })
    : state.selTab === "review" ? reviewTab(items.review)
    : state.selTab === "quizz" ? quizzTab(items.quizz)
    : welcomeTab(items.welcome);

  const tabName = state.selTab.charAt(0).toUpperCase() + state.selTab.slice(1);

  return `
    <div class="flex-1 rounded-2xl p-5" style="background: var(--card); border: 1px solid var(--border)">
      <div class="flex items-center gap-1 mb-4 pb-3" style="border-bottom: 1px solid var(--border)">
        ${tabBtn("welcome", "Welcome")}
        ${tabBtn("content", "Content")}
        ${tabBtn("review", "Review")}
        ${tabBtn("quizz", "Quizz")}
      </div>

      <p class="text-xs mb-4">
        <span style="color: var(--muted-foreground)">Editing: </span>
        <span class="px-2 py-0.5 rounded font-semibold"
              style="background: var(--secondary); color: var(--primary)">${sec?.title || ""} &rarr; ${tabName}</span>
      </p>

      <div class="js-tab-body">${body}</div>
    </div>
  `;
}

// ─── Vista completa ──────────────────────────────────────────────────────────
export function courseEditorView() {
  if (!state) state = blankState();

  return `
    <div class="min-h-screen pb-24" style="background: var(--background); font-family: var(--font-family-body)">
      ${navbar({ active: "home" })}

      <div class="sticky top-16 z-30" style="background: var(--card); border-bottom: 1px solid var(--border)">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <button class="js-back flex items-center gap-1 text-sm" style="color: var(--muted-foreground)">
              ${icon.back} Back
            </button>
            <span style="color: var(--border)">|</span>
            <span class="flex items-center gap-2 text-sm font-semibold">
              <span class="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                    style="background: var(--primary)">${icon.cap}</span>
              ${state.title || "New Course"} &mdash; Editor
            </span>
          </div>
          <button class="js-preview flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style="border: 1px solid var(--border); color: var(--muted-foreground)">
            ${icon.eye} <span class="hidden sm:inline">Preview as student</span>
          </button>
        </div>
      </div>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        ${leftPanel()}
        ${rightPanel()}
      </main>

      <div class="fixed bottom-0 left-0 right-0 z-30"
           style="background: var(--card); border-top: 1px solid var(--border)">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-end gap-3">
          <p class="js-msg text-sm mr-auto font-medium"></p>
          <button class="js-cancel px-4 py-2 rounded-lg text-sm font-medium"
                  style="border: 1px solid var(--border); color: var(--muted-foreground)">Cancel</button>
          <button class="js-save flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
                  style="background: var(--primary)">${icon.save} Save Course</button>
        </div>
      </div>
    </div>
  `;
}

function rerender() {
  const app = document.getElementById("app");
  app.innerHTML = courseEditorView();
  attachEvents(app);
}

// ─── Captura del estado antes de re-renderizar ───────────────────────────────
function captureLeft(root) {
  const get = (n) => root.querySelector(`[name="${n}"]`)?.value;
  if (get("title") !== undefined) {
    state.title = get("title");
    state.instructor = get("instructor");
    state.category = get("category");
    state.level = get("level");
    state.description = get("description");
    state.image = get("image");
  }
}

function captureTab(root) {
  const body = root.querySelector(".js-tab-body");
  if (!body) return;

  if (state.selTab === "final") {
    const pts = body.querySelector('[name="quizPoints"]');
    if (pts) state.finalAssessment.points = Number(pts.value);
    return;
  }

  const items = sectionItems(state.selSection);

  if (state.selTab === "welcome") {
    const msg = body.querySelector('[name="welcomeMessage"]');
    const vid = body.querySelector('[name="welcomeVideo"]');
    if (msg) items.welcome.message = msg.value;
    if (vid) items.welcome.videoUrl = vid.value;
  }

  if (state.selTab === "review") {
    const txt = body.querySelector('[name="blankText"]');
    const pts = body.querySelector('[name="revPoints"]');
    if (txt) items.review.blankText = txt.value;
    if (pts) items.review.points = Number(pts.value);
  }

  if (state.selTab === "quizz") {
    const pts = body.querySelector('[name="quizPoints"]');
    if (pts) items.quizz.points = Number(pts.value);
  }
}

function captureAll(root) {
  captureLeft(root);
  captureTab(root);
}

// Arma el objeto que se envía a la capa de datos (y mañana a la API)
function buildPayload() {
  return {
    title: state.title,
    instructor: state.instructor,
    category: state.category,
    level: state.level,
    description: state.description,
    image: state.image || COVER_PRESETS[0],
    visibility: state.visibility,
    course_code: state.course_code,
    sections: state.sections,
    items: state.items,
    finalAssessment: state.finalAssessment,
  };
}

// ─── Eventos ─────────────────────────────────────────────────────────────────
function attachEvents(root) {
  initNavbar(root);

  root.querySelector(".js-back").addEventListener("click", () => navigate("/tutor"));
  root.querySelector(".js-cancel").addEventListener("click", () => navigate("/tutor"));
  // "Preview as student": guarda primero (para ver el contenido real) y abre la vista de curso
  root.querySelector(".js-preview").addEventListener("click", async () => {
    captureAll(root);
    const msg = root.querySelector(".js-msg");

    if (!state.title.trim()) {
      msg.style.color = "#dc2626";
      msg.textContent = "Add a title before previewing";
      return;
    }

    const payload = buildPayload();
    try {
      if (editingId) {
        await updateCourse(editingId, payload);
      } else {
        const created = await createCourse(payload);
        editingId = created.id;
      }
      // ?preview=1 -> la vista de curso muestra el banner "viewing as a student"
      // from=editor -> al salir del preview, vuelve AQUÍ (no al home)
      navigate(`/student/course?id=${editingId}&preview=1&from=editor`);
    } catch (err) {
      msg.style.color = "#dc2626";
      msg.textContent = err.message;
    }
  });

  // Portada
  root.querySelectorAll("[data-cover]").forEach((btn) =>
    btn.addEventListener("click", () => {
      captureAll(root);
      state.image = btn.dataset.cover;
      rerender();
    })
  );

  // ── Visibilidad + generación del código (INMUTABLE) ──
  root.querySelectorAll(".js-visibility").forEach((el) =>
    el.addEventListener("click", () => {
      captureAll(root);
      state.visibility = el.dataset.visibility;

      // Se genera SOLO la primera vez que se marca "code".
      // Si codeLocked ya es true, el código NO se toca nunca más.
      if (state.visibility === "code" && !state.codeLocked) {
        state.course_code = generateCourseCode();
        state.codeLocked = true;
      }
      rerender();
    })
  );

  // Copiar el código
  root.querySelector(".js-copy-code")?.addEventListener("click", () => {
    navigator.clipboard?.writeText(state.course_code);
    const msg = root.querySelector(".js-msg");
    msg.style.color = "var(--primary)";
    msg.textContent = "\u2713 Code copied";
    setTimeout(() => (msg.textContent = ""), 2000);
  });

  // Secciones
  root.querySelector(".js-add-section").addEventListener("click", () => {
    captureAll(root);
    const id = Date.now();
    state.sections.push({ id, title: `Section ${state.sections.length + 1}` });
    state.selSection = id;
    state.selTab = "welcome";
    rerender();
  });

  root.querySelectorAll(".js-section").forEach((el) =>
    el.addEventListener("click", () => {
      captureAll(root);
      if (el.dataset.section === "final") {
        state.selTab = "final";
      } else {
        state.selSection = Number(el.dataset.section);
        if (state.selTab === "final") state.selTab = "welcome";
      }
      rerender();
    })
  );

  // Renombrar sección (doble clic)
  root.querySelectorAll(".js-sec-title").forEach((el) =>
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const id = Number(el.dataset.secId);
      const current = state.sections.find((s) => s.id === id);
      const name = prompt("Section name:", current.title);
      if (name) {
        captureAll(root);
        current.title = name;
        rerender();
      }
    })
  );

  // Eliminar sección
  root.querySelectorAll("[data-delete-section]").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();                 // que no seleccione la sección al borrar
      const id = Number(btn.dataset.deleteSection);
      const sec = state.sections.find((s) => s.id === id);

      if (!confirm(`Delete "${sec.title}"? Its content will be lost.`)) return;

      captureAll(root);

      // Quita la sección y todo su contenido
      state.sections = state.sections.filter((s) => s.id !== id);
      delete state.items[id];

      // Si borramos la sección seleccionada, saltamos a la primera
      if (state.selSection === id) {
        state.selSection = state.sections[0].id;
        state.selTab = "welcome";
      }
      rerender();
    })
  );

  // Pestañas
  root.querySelectorAll(".js-tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      captureAll(root);
      state.selTab = btn.dataset.tab;
      rerender();
    })
  );

  attachTabEvents(root);

  // ── Guardar ──
  root.querySelector(".js-save").addEventListener("click", async () => {
    captureAll(root);
    const msg = root.querySelector(".js-msg");

    if (!state.title.trim()) {
      msg.style.color = "#dc2626";
      msg.textContent = "The course needs a title";
      return;
    }

    const payload = buildPayload();

    try {
      if (editingId) {
        await updateCourse(editingId, payload);   // Regla 3 validada dentro
        showToast("\u2713 Course updated successfully");
      } else {
        const created = await createCourse(payload);  // Regla 2 validada dentro
        editingId = created.id;                        // por si sigue editando
        showToast("\u2713 Course created successfully");
      }
      msg.style.color = "var(--primary)";
      msg.textContent = "";
      setTimeout(() => navigate("/tutor"), 1200);
    } catch (err) {
      msg.style.color = "#dc2626";
      msg.textContent = err.message;
    }
  });
}

// ─── Eventos de la pestaña activa ────────────────────────────────────────────
function attachTabEvents(root) {
  const items = state.selTab === "final" ? null : sectionItems(state.selSection);

  // ── Content ──
  const addBtn = root.querySelector(".js-add-block");
  if (addBtn) {
    // Abre/cierra el menú. El botón dice "Cancel" mientras está abierto.
    addBtn.addEventListener("click", () => {
      captureAll(root);
      state.menuOpen = !state.menuOpen;
      rerender();
    });

    root.querySelectorAll("[data-add-type]").forEach((btn) =>
      btn.addEventListener("click", () => {
        captureAll(root);
        // Formato IDÉNTICO al de la API: { id, titulo, tipo, datos, orden }
        // `datos` es un ÚNICO campo; su significado depende de `tipo`.
        items.content.push({
          id: Date.now(),
          titulo: "",
          tipo: btn.dataset.addType,     // "readme" | "youtube" | "canva"
          datos: "",
          orden: items.content.length + 1,
        });
        state.menuOpen = false;          // se cierra al agregar el bloque
        rerender();
      })
    );

    root.querySelectorAll("[data-remove-block]").forEach((btn) =>
      btn.addEventListener("click", () => {
        captureAll(root);
        const id = Number(btn.dataset.removeBlock);
        items.content = items.content.filter((b) => b.id !== id);
        // Reordenar para que `orden` quede consecutivo (1, 2, 3...)
        items.content.forEach((b, i) => (b.orden = i + 1));
        rerender();
      })
    );

    // Todo el contenido va al MISMO campo `datos`, sin importar el tipo
    root.querySelectorAll("[data-block-input]").forEach((input) =>
      input.addEventListener("input", () => {
        const block = items.content.find((b) => b.id === Number(input.dataset.blockInput));
        if (block) block.datos = input.value;
      })
    );

    // Título del bloque (común a todos los tipos)
    root.querySelectorAll("[data-block-title]").forEach((input) =>
      input.addEventListener("input", () => {
        const block = items.content.find((b) => b.id === Number(input.dataset.blockTitle));
        if (block) block.titulo = input.value;
      })
    );
  }

  // ── Review: formato ──
  root.querySelectorAll("[data-format]").forEach((btn) =>
    btn.addEventListener("click", () => {
      captureAll(root);
      items.review.format = btn.dataset.format;
      rerender();
    })
  );

  // Review: pares
  root.querySelector(".js-add-pair")?.addEventListener("click", () => {
    captureAll(root);
    items.review.pairs.push({ id: Date.now(), term: "", def: "" });
    rerender();
  });
  root.querySelectorAll("[data-remove-pair]").forEach((btn) =>
    btn.addEventListener("click", () => {
      captureAll(root);
      items.review.pairs = items.review.pairs.filter((p) => p.id !== Number(btn.dataset.removePair));
      rerender();
    })
  );
  root.querySelectorAll("[data-pair-term]").forEach((i) =>
    i.addEventListener("input", () => {
      const p = items.review.pairs.find((x) => x.id === Number(i.dataset.pairTerm));
      if (p) p.term = i.value;
    })
  );
  root.querySelectorAll("[data-pair-def]").forEach((i) =>
    i.addEventListener("input", () => {
      const p = items.review.pairs.find((x) => x.id === Number(i.dataset.pairDef));
      if (p) p.def = i.value;
    })
  );

  // Review: pasos
  root.querySelector(".js-add-step")?.addEventListener("click", () => {
    captureAll(root);
    items.review.steps.push({ id: Date.now(), text: "" });
    rerender();
  });
  root.querySelectorAll("[data-remove-step]").forEach((btn) =>
    btn.addEventListener("click", () => {
      captureAll(root);
      items.review.steps = items.review.steps.filter((s) => s.id !== Number(btn.dataset.removeStep));
      rerender();
    })
  );
  root.querySelectorAll("[data-step]").forEach((i) =>
    i.addEventListener("input", () => {
      const s = items.review.steps.find((x) => x.id === Number(i.dataset.step));
      if (s) s.text = i.value;
    })
  );

  // ── Quizz / Final Assessment ──
  const quiz = state.selTab === "final" ? state.finalAssessment : items?.quizz;

  root.querySelector(".js-add-question")?.addEventListener("click", () => {
    captureAll(root);
    quiz.questions.push({
      id: Date.now(),
      text: "",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct: 0,
    });
    rerender();
  });

  root.querySelectorAll("[data-remove-q]").forEach((btn) =>
    btn.addEventListener("click", () => {
      captureAll(root);
      quiz.questions = quiz.questions.filter((q) => q.id !== Number(btn.dataset.removeQ));
      rerender();
    })
  );

  root.querySelectorAll("[data-q-text]").forEach((i) =>
    i.addEventListener("input", () => {
      const q = quiz.questions.find((x) => x.id === Number(i.dataset.qText));
      if (q) q.text = i.value;
    })
  );

  root.querySelectorAll("[data-opt-text]").forEach((i) =>
    i.addEventListener("input", () => {
      const [qid, idx] = i.dataset.optText.split("-").map(Number);
      const q = quiz.questions.find((x) => x.id === qid);
      if (q) q.options[idx] = i.value;
    })
  );

  root.querySelectorAll("[data-correct]").forEach((radio) =>
    radio.addEventListener("change", () => {
      captureAll(root);
      const q = quiz.questions.find((x) => x.id === Number(radio.dataset.correct));
      if (q) q.correct = Number(radio.dataset.opt);
      rerender();
    })
  );

  // ── Toggles ──
  root.querySelectorAll("[data-toggle]").forEach((btn) =>
    btn.addEventListener("click", () => {
      captureAll(root);
      const name = btn.dataset.toggle;
      if (name === "instantFeedback") items.review.instantFeedback = !items.review.instantFeedback;
      if (name === "revCounts") items.review.countsGrade = !items.review.countsGrade;
      if (name === "quizCounts") {
        if (state.selTab === "final") {
          state.finalAssessment.countsGrade = !state.finalAssessment.countsGrade;
        } else {
          items.quizz.countsGrade = !items.quizz.countsGrade;
        }
      }
      rerender();
    })
  );
}

// ─── Init ────────────────────────────────────────────────────────────────────
export async function initCourseEditor() {
  const root = document.getElementById("app");

  // ?id=X en la URL -> editar un curso existente
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  if (id) {
    editingId = Number(id);
    const course = await getCourseById(editingId);
    if (course) {
      const base = blankState();
      const sections = course.sections || base.sections;
      state = {
        ...base,
        ...course,
        // Si ya tenía código, queda bloqueado desde el inicio (inmutable)
        codeLocked: Boolean(course.course_code),
        sections,
        items: course.items || {},
        finalAssessment: course.finalAssessment || base.finalAssessment,
        selSection: sections[0].id,
        selTab: "welcome",
      };
    } else {
      state = blankState();
    }
  } else {
    editingId = null;
    state = blankState();
  }

  root.innerHTML = courseEditorView();
  attachEvents(root);
}
