// Mapa de rutas de la SPA.
import { loginView, initLogin } from "../views/auth/login.js";
import { registerView, initRegister } from "../views/auth/register.js";
import { studentHomeView, initStudentHome } from "../views/student/studentHome.js";
import { courseView, initCourseView } from "../views/student/courseView.js";
import { getCourseById, getEnrolledIds } from "../data/courses.js";
import { tutorHomeView, initTutorHome } from "../views/tutor/tutorHome.js";
import { dashboardView, initDashboard } from "../views/tutor/dashboardView.js";
import { courseEditorView, initCourseEditor } from "../views/tutor/courseEditorView.js";
import { profileView, initProfile } from "../views/shared/profileView.js";


// ─── Guard de /student/course ────────────────────────────────────────────────
// La vista de curso la usan DOS roles, pero con condiciones distintas:
//
//   STUDENT -> solo si está INSCRITO en el curso.
//   TUTOR   -> solo en modo PREVIEW (?preview=1) y solo sobre SUS PROPIOS
//              cursos (Regla 3). Sin el flag, o si el curso es de otro tutor,
//              se le niega el acceso (403).
//
// ⚠️ Esto impide que un tutor abra /student/course?id=1 a mano y se cuele
// en la vista del estudiante de un curso ajeno.
async function canAccessCourse(session) {
  const params = new URLSearchParams(location.search);
  const courseId = Number(params.get("id"));
  const isPreview = params.get("preview") === "1";

  if (!courseId) return false;

  const course = await getCourseById(courseId);
  if (!course) return false;              // curso inexistente -> 403

  if (session.role === "tutor") {
    // El tutor SOLO puede entrar en preview y SOLO a sus cursos
    return isPreview && course.tutor_id === session.id;
  }

  if (session.role === "student") {
    // El student SOLO entra a cursos en los que está inscrito.
    // (Y nunca en modo preview: ese modo es del tutor.)
    if (isPreview) return false;
    const enrolled = await getEnrolledIds();
    return enrolled.includes(courseId);
  }

  return false;
}

export const routes = {
  "/login":            { view: loginView,       init: initLogin,       roles: [] },
  "/register":         { view: registerView,    init: initRegister,    roles: [] },

  "/student":          { view: studentHomeView, init: initStudentHome, roles: ["student"] },
  // La vista de curso sirve a AMBOS roles: el tutor la usa como "Preview as student"
  "/student/course":   { view: courseView,      init: initCourseView,  roles: ["student", "tutor"], canAccess: canAccessCourse },

  "/tutor":            { view: tutorHomeView,   init: initTutorHome,   roles: ["tutor"] },
  "/tutor/dashboard":  { view: dashboardView,   init: initDashboard,   roles: ["tutor"] },
  "/tutor/editor":     { view: courseEditorView, init: initCourseEditor, roles: ["tutor"] },

  // Profile es compartido por ambos roles
  "/profile":          { view: profileView,     init: initProfile,     roles: ["student", "tutor"] },
};
