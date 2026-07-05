// ─── Tutor Home ───────────────────────────────────────────────────────────────
// Por ahora solo muestra la barra de navegación del tutor
// (incluye el botón "Dashboard" además de "Home").
// El contenido (cursos, stats, etc.) se implementará después.

import { navbar, initNavbar } from "../../components/navbar.js";

export function tutorHomeView() {
  return `
    <div class="min-h-screen" style="background: var(--background)">
      ${navbar()}

      <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <!-- TODO: contenido del home del tutor -->
      </main>
    </div>
  `;
}

export function initTutorHome() {
  initNavbar(document.getElementById("app"));
}
