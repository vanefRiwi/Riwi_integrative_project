// ─── Content Service ──────────────────────────────────────────────────────────
// Única puerta de entrada a los contenidos. Las vistas SOLO hablan con esto.
//
// 🔌 INTEGRACIÓN CON BACKEND:
// Para conectar la API real, descomenta la línea del `api` y reemplaza el
// cuerpo de cada función. NADA MÁS cambia en toda la app.

// import { api } from "../helpers/api.js";
import { MOCK_CONTENTS } from "../mocks/contents.mock.js";

// Tipos válidos (los mismos que la API)
export const CONTENT_TYPES = {
  README: "readme",
  YOUTUBE: "youtube",
  CANVA: "canva",
};

// ── Lectura ──────────────────────────────────────────────────────────────────

// GET /api/sections/:sectionId/contents
export async function getContentsBySection(sectionId) {
  // FUTURO:
  // const { data } = await api.get(`/sections/${sectionId}/contents`);
  // return data.sort((a, b) => a.orden - b.orden);

  const list = MOCK_CONTENTS[sectionId] || [];
  return [...list].sort((a, b) => a.orden - b.orden);
}

// GET /api/contents/:id
export async function getContentById(id) {
  // FUTURO: const { data } = await api.get(`/contents/${id}`); return data;
  const all = Object.values(MOCK_CONTENTS).flat();
  return all.find((c) => c.id === Number(id)) || null;
}

// ── Escritura ────────────────────────────────────────────────────────────────

// POST /api/sections/:sectionId/contents
export async function createContent(sectionId, content) {
  // FUTURO: const { data } = await api.post(`/sections/${sectionId}/contents`, content); return data;
  const list = MOCK_CONTENTS[sectionId] || (MOCK_CONTENTS[sectionId] = []);
  const nuevo = {
    id: Date.now(),
    titulo: content.titulo || "",
    tipo: content.tipo,
    datos: content.datos || "",
    orden: list.length + 1,
  };
  list.push(nuevo);
  return nuevo;
}

// PUT /api/contents/:id
export async function updateContent(id, patch) {
  // FUTURO: const { data } = await api.put(`/contents/${id}`, patch); return data;
  const content = await getContentById(id);
  if (!content) throw new Error("Contenido no encontrado");
  Object.assign(content, patch);
  return content;
}

// DELETE /api/contents/:id
export async function deleteContent(sectionId, id) {
  // FUTURO: await api.del(`/contents/${id}`);
  const list = MOCK_CONTENTS[sectionId] || [];
  const idx = list.findIndex((c) => c.id === Number(id));
  if (idx >= 0) list.splice(idx, 1);
  // Reordenar para que 'orden' quede consecutivo
  list.forEach((c, i) => (c.orden = i + 1));
  return true;
}

// ── Utilidades del contrato ──────────────────────────────────────────────────

// Normaliza la URL/ID de YouTube a un ID puro (el backend puede mandar cualquiera)
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
