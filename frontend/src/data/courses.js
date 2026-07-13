// ─── Capa de datos: Cursos ────────────────────────────────────────────────────
// ⚠️ IMPORTANTE — Preparado para el backend:
// Este archivo es la ÚNICA fuente de datos de las vistas. Hoy devuelve datos de
// prueba (mock). Cuando el backend (Express + PostgreSQL) esté listo, SOLO hay
// que cambiar el cuerpo de estas funciones por llamadas reales a la API.
// Las vistas NO se tocan, porque ya consumen estas funciones (que son async).
//
// ─── REGLAS DE NEGOCIO LUMORA (implementadas aquí) ───────────────────────────
// 1. Los students solo ven cursos con visibility = "open".
//    Los cursos "code" solo aparecen si ya están inscritos (o al usar el código).
// 2. Los students NO pueden crear cursos, solo unirse. (No existe createCourse
//    para students; el guard está en canCreateCourse()).
// 3. Los tutores solo ven y editan los cursos donde course.tutor_id === su id.
//
// ⚠️ Estas reglas también DEBEN validarse en el backend. El filtrado en el
// frontend es solo de UI: nunca es una medida de seguridad real.

import { getSession } from "../helpers/auth.js";
// import { api } from "../helpers/api.js";   // ← descomentar al conectar el backend

// ── Datos de prueba (se borran al conectar el backend) ──
// tutor_id  → de qué tutor es el curso (Regla 3)
// visibility→ "open" (cualquiera lo ve) | "code" (requiere código) (Regla 1)
// course_code→ solo si visibility === "code"
const MOCK_COURSES = [
  { id: 1, tutor_id: 2, visibility: "open", course_code: null,      title: "Python for Data Science",     category: "Programming", instructor: "Dr. Sarah Chen",      students: 4820, level: "Intermediate", image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=220&fit=crop&auto=format" },
  { id: 2, tutor_id: 2, visibility: "open", course_code: null,      title: "UX Design Fundamentals",      category: "Design",      instructor: "Prof. Marco Reyes",   students: 3210, level: "Beginner",     image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=220&fit=crop&auto=format" },
  { id: 3, tutor_id: 2, visibility: "code", course_code: "EDU-A3K9", title: "Machine Learning Essentials", category: "AI & ML",     instructor: "Dr. Aisha Nkosi",     students: 6140, level: "Advanced",     image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&h=220&fit=crop&auto=format" },
  { id: 4, tutor_id: 2, visibility: "open", course_code: null,      title: "Web Development Bootcamp",    category: "Programming", instructor: "James Whitfield",     students: 8930, level: "Beginner",     image: "https://images.unsplash.com/photo-1593720219276-0b1eacd0aef4?w=400&h=220&fit=crop&auto=format" },
  { id: 5, tutor_id: 3, visibility: "open", course_code: null,      title: "Business Analytics",          category: "Business",    instructor: "Prof. Elena Vasquez", students: 2870, level: "Intermediate", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=220&fit=crop&auto=format" },
  { id: 6, tutor_id: 3, visibility: "open", course_code: null,      title: "Digital Marketing Strategy",  category: "Marketing",   instructor: "Lisa Thornton",       students: 5120, level: "Beginner",     image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=220&fit=crop&auto=format" },
  { id: 7, tutor_id: 3, visibility: "code", course_code: "AWS-7X2M", title: "Cloud Architecture AWS",      category: "Cloud",       instructor: "Dr. Rohan Mehta",     students: 3780, level: "Advanced",     image: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=220&fit=crop&auto=format" },
  { id: 8, tutor_id: 3, visibility: "open", course_code: null,      title: "Project Management Pro",      category: "Management",  instructor: "Sophie Adler",        students: 4290, level: "Intermediate", image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=220&fit=crop&auto=format" },
];

// Secciones de ejemplo (para el conteo de stats del tutor)
const SECTIONS_PER_COURSE = 4;

// Clases de color según el nivel del curso
export const LEVEL_COLORS = {
  Beginner:     "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-green-100 text-green-700",
  Advanced:     "bg-teal-100 text-teal-700",
};

// Combina los cursos base (mock) con los creados/editados por el tutor.
// Si un curso local tiene el mismo id que un mock, el local gana (fue editado).
function mergedCourses() {
  const local = getLocalCourses();
  const localIds = local.map((c) => c.id);
  const base = MOCK_COURSES.filter((c) => !localIds.includes(c.id));
  const deltas = getStudentDeltas();
  // El contador de estudiantes refleja las inscripciones reales
  return [...base, ...local].map((c) => withStudentCount(c, deltas));
}

// Devuelve los cursos con el contador de estudiantes ACTUALIZADO:
// al total base le suma 1 si el usuario actual está inscrito.
// FUTURO: el backend ya devolverá `students` con el conteo real de la tabla
// `enrollments` (COUNT), así que esta función desaparece.
async function withEnrollmentCount(courses) {
  const enrolled = await getEnrolledIds();
  return courses.map((c) => ({
    ...c,
    students: (c.students || 0) + (enrolled.includes(c.id) ? 1 : 0),
  }));
}

// ─── Guards de reglas de negocio ─────────────────────────────────────────────

// Regla 2: solo los tutores pueden crear cursos.
export function canCreateCourse() {
  return getSession()?.role === "tutor";
}

// Regla 3: un tutor solo puede editar SUS propios cursos.
export function canEditCourse(course) {
  const user = getSession();
  return user?.role === "tutor" && course.tutor_id === user.id;
}

// ─── API de datos (esto es lo que consumen las vistas) ────────────────────────

// REGLA 1 — Catálogo del student: solo cursos "open".
// Los cursos con código solo se incluyen si el student YA está inscrito
// (para que los siga viendo en su lista después de unirse con el código).
// FUTURO: const { data } = await api.get("/courses"); return data;
//         (el backend ya debe devolver solo los permitidos)
export async function getCourses() {
  const enrolled = await getEnrolledIds();
  const visible = mergedCourses().filter(
    (c) => c.visibility === "open" || enrolled.includes(c.id)
  );
  return withEnrollmentCount(visible);   // contador al día
}

// REGLA 3 — Cursos del tutor logueado: solo los que él creó.
// FUTURO: const { data } = await api.get("/courses/mine"); return data;
//         (el backend filtra por el tutor del token)
export async function getTutorCourses() {
  const user = getSession();
  if (user?.role !== "tutor") return [];
  const mine = mergedCourses().filter((c) => c.tutor_id === user.id);
  return withEnrollmentCount(mine);
}

// Buscar un curso por su código (Regla 1: así se accede a los privados)
// FUTURO: const { data } = await api.post("/enrollments/by-code", { code });
export async function findCourseByCode(code) {
  const clean = code.trim().toUpperCase();
  return mergedCourses().find((c) => c.course_code === clean) || null;
}

// Ajuste local del contador de estudiantes por curso.
// MOCK: el backend hará SELECT COUNT(*) FROM enrollments WHERE course_id = X
function getStudentDeltas() {
  const saved = localStorage.getItem("studentDeltas");
  return saved ? JSON.parse(saved) : {};
}
function saveStudentDeltas(d) {
  localStorage.setItem("studentDeltas", JSON.stringify(d));
}

// Aplica el delta al contador base del curso
function withStudentCount(course, deltas) {
  return { ...course, students: (course.students || 0) + (deltas[course.id] || 0) };
}

// IDs de los cursos en los que el student está inscrito
// FUTURO: const { data } = await api.get("/enrollments"); return data.map(e => e.course_id);
export async function getEnrolledIds() {
  const saved = localStorage.getItem("enrolled");
  return saved ? JSON.parse(saved) : [];
}

// REGLA 2 — Unirse a un curso (única acción del student sobre cursos).
// Si el curso requiere código, hay que pasarlo y debe coincidir.
// FUTURO: await api.post("/enrollments", { course_id: id, code });
export async function joinCourse(id, code = null) {
  const course = mergedCourses().find((c) => c.id === id);
  if (!course) throw new Error("Curso no encontrado");

  // Regla 1: los cursos privados exigen el código correcto
  if (course.visibility === "code") {
    if (!code || code.trim().toUpperCase() !== course.course_code) {
      throw new Error("Código de curso inválido");
    }
  }

  const ids = await getEnrolledIds();
  if (!ids.includes(id)) {
    ids.push(id);
    // Incrementa el contador de estudiantes del curso
    const deltas = getStudentDeltas();
    deltas[id] = (deltas[id] || 0) + 1;
    saveStudentDeltas(deltas);
  }
  localStorage.setItem("enrolled", JSON.stringify(ids));
  return ids;
}

// Salirse de un curso
// FUTURO: await api.del(`/enrollments/${id}`);
export async function leaveCourse(id) {
  const before = await getEnrolledIds();
  const ids = before.filter((x) => x !== id);

  if (before.includes(id)) {
    // Decrementa el contador de estudiantes del curso
    const deltas = getStudentDeltas();
    deltas[id] = (deltas[id] || 0) - 1;
    saveStudentDeltas(deltas);
  }
  localStorage.setItem("enrolled", JSON.stringify(ids));
  return ids;
}

// Estadísticas del tutor (solo sobre SUS cursos — Regla 3)
// FUTURO: const { data } = await api.get("/courses/stats"); return data;
export async function getTutorStats() {
  const courses = await getTutorCourses();
  return {
    totalCourses: courses.length,
    totalStudents: courses.reduce((sum, c) => sum + c.students, 0),
    totalSections: courses.length * SECTIONS_PER_COURSE,
    sectionsPerCourse: SECTIONS_PER_COURSE,
  };
}

// ─── Escritura de cursos (crear / editar) ────────────────────────────────────

// Cursos creados en esta sesión (mock). Se persisten en localStorage para que
// no se pierdan al recargar. FUTURO: esto lo maneja la BD.
function getLocalCourses() {
  const saved = localStorage.getItem("customCourses");
  return saved ? JSON.parse(saved) : [];
}

function saveLocalCourses(list) {
  localStorage.setItem("customCourses", JSON.stringify(list));
}

// Genera un código único de curso (formato EDU-XXXX).
// Se excluyen caracteres ambiguos (I, O, 0, 1) para evitar confusiones.
export function generateCourseCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `EDU-${rand}`;
}

// Devuelve un curso por id (busca en mocks + en los creados localmente)
// FUTURO: const { data } = await api.get(`/courses/${id}`); return data;
export async function getCourseById(id) {
  return mergedCourses().find((c) => c.id === Number(id)) || null;
}

// REGLA 2 — Solo un tutor puede crear cursos.
// REGLA 1 — Si es privado, se le asigna un course_code (inmutable).
// FUTURO: const { data } = await api.post("/courses", payload); return data;
export async function createCourse(payload) {
  const user = getSession();
  if (!canCreateCourse()) {
    throw new Error("Solo los tutores pueden crear cursos");
  }

  const isPrivate = payload.visibility === "code";

  const course = {
    ...payload,
    id: Date.now(),                 // FUTURO: lo asigna el SERIAL de la BD
    tutor_id: user.id,              // Regla 3: queda ligado a su creador
    students: 0,
    // El código se genera UNA sola vez, al crear el curso privado.
    course_code: isPrivate ? (payload.course_code || generateCourseCode()) : null,
  };

  const list = getLocalCourses();
  list.push(course);
  saveLocalCourses(list);
  return course;
}

// REGLA 3 — Solo el tutor dueño puede editar su curso.
// El course_code NUNCA se sobrescribe si ya existía (es inmutable).
// FUTURO: const { data } = await api.put(`/courses/${id}`, payload); return data;
export async function updateCourse(id, payload) {
  const existing = await getCourseById(id);
  if (!existing) throw new Error("Curso no encontrado");

  if (!canEditCourse(existing)) {
    throw new Error("No puedes editar un curso que no creaste");
  }

  // ── Código inmutable ──
  // Si el curso YA tenía código, se conserva pase lo que pase.
  // Si pasa de "open" a "code" por primera vez, se genera uno nuevo.
  let course_code = existing.course_code;
  if (payload.visibility === "code" && !course_code) {
    course_code = generateCourseCode();
  }
  // Si vuelve a "open", el código se conserva guardado (por si lo reactiva),
  // pero no se usa mientras sea público.

  const updated = { ...existing, ...payload, course_code, tutor_id: existing.tutor_id };

  const list = getLocalCourses();
  const idx = list.findIndex((c) => c.id === Number(id));
  if (idx >= 0) {
    list[idx] = updated;              // era un curso creado localmente
  } else {
    list.push(updated);               // era un mock: se guarda la versión editada
  }
  saveLocalCourses(list);
  return updated;
}
