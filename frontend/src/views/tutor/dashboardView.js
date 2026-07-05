// ─── Tutor Dashboard ──────────────────────────────────────────────────────────
// Por ahora solo muestra la barra de navegación (con "Dashboard" activo)
// y un área de contenido vacía. El contenido se implementará después.

import { navbar, initNavbar } from "../../components/navbar.js";

export function dashboardView() {
  return `
    <div class="min-h-screen" style="background: var(--background)">
      ${navbar({ active: "dashboard" })}

      <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <!-- TODO: contenido del dashboard del tutor -->
      </main>
    </div>
  `;
}

export function initDashboard() {
  initNavbar(document.getElementById("app"));
}
