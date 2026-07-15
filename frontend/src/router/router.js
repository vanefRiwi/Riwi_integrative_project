import { routes } from "./routes.js";
import { getSession } from "../helpers/auth.js";
import { notFoundView, initNotFound } from "../views/shared/notFoundView.js";
import { notAuthorizedView, initNotAuthorized } from "../views/shared/notAuthorizedView.js";

const app = () => document.getElementById("app");

// Navega sin recargar (History API)
export function navigate(path) {
  history.pushState({}, "", path);
  renderRoute();
}

// Intercepta clicks en <a data-link> para navegar sin recargar
function handleLinks() {
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute("href"));
  });
}

// Pinta una vista de error SIN cambiar la URL.
// Así el usuario ve la ruta que intentó abrir (útil y honesto),
// y puede corregirla o volver atrás.
async function renderError(view, init) {
  app().innerHTML = view();
  if (init) await init();
}

// Renderiza la vista de la URL actual
export async function renderRoute() {
  const path = location.pathname;
  const session = getSession();

  // ── Raíz "/": redirige al home que corresponda (no es un 404) ──
  if (path === "/" || path === "") {
    return navigate(!session ? "/login" : session.role === "tutor" ? "/tutor" : "/student");
  }

  const route = routes[path];

  // ── 404: la ruta no existe ──
  if (!route) {
    return renderError(notFoundView, initNotFound);
  }

  // ── 403: la ruta existe, pero el rol no tiene acceso ──
  // (o no hay sesión, y la ruta es protegida)
  const isProtected = route.roles.length > 0;
  const hasRole = session && route.roles.includes(session.role);

  if (isProtected && !hasRole) {
    return renderError(notAuthorizedView, initNotAuthorized);
  }

  // ── Guard extra: algunas rutas necesitan más que el rol ──
  // Ej: /student/course permite al TUTOR, pero SOLO en modo preview
  // y SOLO sobre sus propios cursos. `canAccess` devuelve true/false.
  if (route.canAccess) {
    const allowed = await route.canAccess(session);
    if (!allowed) {
      return renderError(notAuthorizedView, initNotAuthorized);
    }
  }

  // ── Si YA tiene sesión y va a login/register, lo mandamos a su home ──
  // (evita que un usuario logueado vea el formulario de login)
  if (session && (path === "/login" || path === "/register")) {
    return navigate(session.role === "tutor" ? "/tutor" : "/student");
  }

  // ── Ruta válida ──
  // Pinta la vista inicial y luego ejecuta su init
  // (las vistas que cargan datos vuelven a renderizarse dentro de su init)
  app().innerHTML = route.view();
  if (route.init) await route.init();
}

export function initRouter() {
  handleLinks();
  window.addEventListener("popstate", renderRoute);
  renderRoute();
}
