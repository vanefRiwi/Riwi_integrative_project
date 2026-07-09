// ─── Student Home ─────────────────────────────────────────────────────────────
// Por ahora solo muestra la barra de navegación del student.
// El contenido (cursos, stats, etc.) se implementará después.

import { navbar, initNavbar } from "../../components/navbar.js";

export function studentHomeView() {
  return `
    <div class="min-h-screen" style="background: var(--background)">
      ${navbar()}

      <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <!-- TODO: contenido del home del student -->
      </main>
    </div>
  `;
}

export function initStudentHome() {
  initNavbar(document.getElementById("app"));
}
