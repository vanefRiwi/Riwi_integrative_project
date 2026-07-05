// Mapa de rutas de la SPA.
import { loginView, initLogin } from "../views/auth/login.js";
import { registerView, initRegister } from "../views/auth/register.js";
import { studentHomeView, initStudentHome } from "../views/student/studentHome.js";
import { tutorHomeView, initTutorHome } from "../views/tutor/tutorHome.js";
import { dashboardView, initDashboard } from "../views/tutor/dashboardView.js";
import { profileView, initProfile } from "../views/shared/profileView.js";

export const routes = {
  "/login":            { view: loginView,       init: initLogin,       roles: [] },
  "/register":         { view: registerView,    init: initRegister,    roles: [] },

  "/student":          { view: studentHomeView, init: initStudentHome, roles: ["student"] },

  "/tutor":            { view: tutorHomeView,   init: initTutorHome,   roles: ["tutor"] },
  "/tutor/dashboard":  { view: dashboardView,   init: initDashboard,   roles: ["tutor"] },

  // Profile es compartido por ambos roles
  "/profile":          { view: profileView,     init: initProfile,     roles: ["student", "tutor"] },
};
