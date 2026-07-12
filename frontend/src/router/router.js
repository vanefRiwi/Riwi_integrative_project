import { routes } from "./routes.js";
import { getSession } from "../helpers/auth.js";

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

// Renderiza la vista de la URL actual
export async function renderRoute() {
  const path = location.pathname;
  const route = routes[path];

  // Si la ruta no existe aún, redirige al login
  if (!route) return navigate("/login");

  const session = getSession();

  // Guard por rol (para cuando existan rutas protegidas)
  if (route.roles.length && (!session || !route.roles.includes(session.role))) {
    return navigate("/login");
  }

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
