// ─── Content Service ──────────────────────────────────────────────────────────
// Only gateway to contents. Views ONLY talk to this.
//
//  BACKEND INTEGRATION:
// To connect the real API, uncomment the `api` line and replace the
// body of each function. NOTHING ELSE changes in the entire app.

// import { api } from "../helpers/api.js";
import { MOCK_CONTENTS } from "../mocks/contents.mock.js";

// Valid types (same as the API)
export const CONTENT_TYPES = {
  README: "readme",
  YOUTUBE: "youtube",
  CANVA: "canva",
};

// ── Reading ──────────────────────────────────────────────────────────────────────

// GET /api/sections/:sectionId/contents
export async function getContentsBySection(sectionId) {
  // FUTURE:
  // const { data } = await api.get(`/sections/${sectionId}/contents`);
  // return data.sort((a, b) => a.orden - b.orden);

  const list = MOCK_CONTENTS[sectionId] || [];
  return [...list].sort((a, b) => a.orden - b.orden);
}

// GET /api/contents/:id
export async function getContentById(id) {
  // FUTURE: const { data } = await api.get(`/contents/${id}`); return data;
  const all = Object.values(MOCK_CONTENTS).flat();
  return all.find((c) => c.id === Number(id)) || null;
}

// ── Writing ────────────────────────────────────────────────────────────────────

// POST /api/sections/:sectionId/contents
export async function createContent(sectionId, content) {
  // FUTURE: const { data } = await api.post(`/sections/${sectionId}/contents`, content); return data;
  const list = MOCK_CONTENTS[sectionId] || (MOCK_CONTENTS[sectionId] = []);
  const newContent = {
    id: Date.now(),
    titulo: content.titulo || "",
    tipo: content.tipo,
    datos: content.datos || "",
    orden: list.length + 1,
  };
  list.push(newContent);
  return newContent;
}

// PUT /api/contents/:id
export async function updateContent(id, patch) {
  // FUTURE: const { data } = await api.put(`/contents/${id}`, patch); return data;
  const content = await getContentById(id);
  if (!content) throw new Error("Content not found");
  Object.assign(content, patch);
  return content;
}

// DELETE /api/contents/:id
export async function deleteContent(sectionId, id) {
  // FUTURE: await api.del(`/contents/${id}`);
  const list = MOCK_CONTENTS[sectionId] || [];
  const idx = list.findIndex((c) => c.id === Number(id));
  if (idx >= 0) list.splice(idx, 1);
  // Reorder so 'orden' is consecutive
  list.forEach((c, i) => (c.orden = i + 1));
  return true;
}

// ── Contract utilities ───────────────────────────────────────────────────────

// Normalizes YouTube URL/ID to a pure ID (backend can send any)
export function youtubeId(datos = "") {
  const match = datos.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return match ? match[1] : datos.trim();
}

// Valida que un contenido cumpla el contrato antes de enviarlo a la API
export function isValidContent(c) {
  return (
    c &&
    typeof c.tipo === "string" &&
    Object.values(CONTENT_TYPES).includes(c.tipo) &&
    typeof c.datos === "string"
  );
}
