// ─── MOCK: Contenidos ─────────────────────────────────────────────────────────
// ⚠️ Formato IDÉNTICO al que devolverá la API REST.
// Cuando el backend esté listo, este archivo se borra y NADA MÁS cambia.
//
// Contrato acordado con backend:
//   GET /api/sections/:id/contents  ->  Content[]
//
//   Content = {
//     id:     number
//     titulo: string
//     tipo:   "readme" | "youtube" | "canva"
//     datos:  string    // markdown | id/url de YouTube | url embed de Canva
//     orden:  number    // orden de aparición dentro de la sección
//   }

export const MOCK_CONTENTS = {
  // key = section_id
  1: [
    {
      id: 1,
      titulo: "Introducción",
      tipo: "readme",
      datos: "## Key Concepts\n\nIn this section we explore the ideas that underpin the course.\n\n- **Abstraction** simplifies complex systems\n- **Modularity** keeps code maintainable\n- **Iteration** drives continuous improvement",
      orden: 1,
    },
    {
      id: 2,
      titulo: "Video de bienvenida",
      tipo: "youtube",
      datos: "dQw4w9WgXcQ",
      orden: 2,
    },
    {
      id: 3,
      titulo: "Presentación del módulo",
      tipo: "canva",
      datos: "https://www.canva.com/design/DAHMOD8pb74/tAhkFwGeNUV9ScjIbDToyg/view?embed",
      orden: 3,
    },
  ],
  2: [
    {
      id: 4,
      titulo: "Conceptos avanzados",
      tipo: "readme",
      datos: "### Why this matters\n\nUnderstanding these principles helps you build more **robust** and scalable solutions.",
      orden: 1,
    },
  ],
};
