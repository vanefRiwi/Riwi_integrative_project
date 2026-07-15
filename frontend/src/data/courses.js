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
  { id: 1, tutor_id: 2, visibility: "open", course_code: null,      title: "Python for Data Science",     category: "Programming", instructor: "Dr. Sarah Chen",      baseStudents: 4820, level: "Intermediate", image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=220&fit=crop&auto=format" },
  { id: 2, tutor_id: 2, visibility: "open", course_code: null,      title: "UX Design Fundamentals",      category: "Design",      instructor: "Prof. Marco Reyes",   baseStudents: 3210, level: "Beginner",     image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=220&fit=crop&auto=format" },
  { id: 3, tutor_id: 2, visibility: "code", course_code: "EDU-A3K9", title: "Machine Learning Essentials", category: "AI & ML",     instructor: "Dr. Aisha Nkosi",     baseStudents: 6140, level: "Advanced",     image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&h=220&fit=crop&auto=format" },
  { id: 4, tutor_id: 2, visibility: "open", course_code: null,      title: "Web Development Bootcamp",    category: "Programming", instructor: "James Whitfield",     baseStudents: 8930, level: "Beginner",     image: "https://images.unsplash.com/photo-1593720219276-0b1eacd0aef4?w=400&h=220&fit=crop&auto=format" },
  { id: 5, tutor_id: 3, visibility: "open", course_code: null,      title: "Business Analytics",          category: "Business",    instructor: "Prof. Elena Vasquez", baseStudents: 2870, level: "Intermediate", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=220&fit=crop&auto=format" },
  { id: 6, tutor_id: 3, visibility: "open", course_code: null,      title: "Digital Marketing Strategy",  category: "Marketing",   instructor: "Lisa Thornton",       baseStudents: 5120, level: "Beginner",     image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=220&fit=crop&auto=format" },
  { id: 7, tutor_id: 3, visibility: "code", course_code: "AWS-7X2M", title: "Cloud Architecture AWS",      category: "Cloud",       instructor: "Dr. Rohan Mehta",     baseStudents: 3780, level: "Advanced",     image: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=220&fit=crop&auto=format" },
  { id: 8, tutor_id: 3, visibility: "open", course_code: null,      title: "Project Management Pro",      category: "Management",  instructor: "Sophie Adler",        baseStudents: 4290, level: "Intermediate", image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=220&fit=crop&auto=format" },
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
  // Devuelve el dato CRUDO. El contador se calcula aparte (withEnrollmentCount),
  // para no tener dos sistemas sumando a la vez.
  return [...base, ...local];
}

// Devuelve los cursos con el contador de estudiantes ACTUALIZADO:
// al total base le suma 1 si el usuario actual está inscrito.
// FUTURO: el backend ya devolverá `students` con el conteo real de la tabla
// `enrollments` (COUNT), así que esta función desaparece.
// ⚠️ SEPARACIÓN CLAVE entre dato guardado y dato calculado:
//
//   baseStudents  -> número de inscritos "de fondo" (los otros alumnos ficticios).
//                    Es INMUTABLE: se guarda una vez y jamás se recalcula.
//   students      -> lo que se MUESTRA = baseStudents + (¿yo estoy inscrito? 1 : 0)
//                    Es un valor DERIVADO: se calcula al vuelo, nunca se persiste.
//
// Antes se guardaba `students` ya sumado y al volver a guardar se acumulaba,
// mostrando 2 cuando solo había 1 inscrito. Por eso ahora el campo persistido
// es `baseStudents` y `students` se deriva siempre.
//
// FUTURO: el backend devolverá `students` con el COUNT real de `enrollments`,
// así que esta función desaparece por completo.
async function withEnrollmentCount(courses) {
  const enrolled = await getEnrolledIds();

  return courses.map((c) => {
    // baseStudents es la fuente de verdad. Si un mock antiguo solo trae
    // `students`, lo tomamos como base (retrocompatibilidad).
    const base = c.baseStudents ?? c.students ?? 0;
    const mine = enrolled.includes(c.id) ? 1 : 0;

    return {
      ...c,
      baseStudents: base,                      // se conserva intacto
      students: Math.max(0, base + mine),      // derivado, nunca negativo
    };
  });
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
  if (!ids.includes(id)) ids.push(id);
  localStorage.setItem("enrolled", JSON.stringify(ids));
  // El contador NO se toca aquí: se deriva de `enrolled` en withEnrollmentCount().
  return ids;
}

// Salirse de un curso.
// Efectos:
//   - El contador de inscritos BAJA (withEnrollmentCount deja de sumar el +1).
//   - Si el curso era PRIVADO, desaparece del catálogo (getCourses lo filtra).
//   - Se borra el progreso: si vuelve a entrar, empieza de cero.
// FUTURO: await api.del(`/enrollments/${id}`);
//         (el backend borra la fila de `enrollments` y sus `submissions`)
export async function leaveCourse(id) {
  const ids = (await getEnrolledIds()).filter((x) => x !== id);
  localStorage.setItem("enrolled", JSON.stringify(ids));

  // Limpia el progreso de ese curso (quizzes, reviews, examen final)
  localStorage.removeItem(`progress:${id}`);

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

// ─── Unirse a un curso (modal "Join a course") ───────────────────────────────

// REGLA 1 — Cursos ABIERTOS disponibles para explorar en el modal.
// Los privados (visibility="code") NO se listan: solo se accede con el código.
// Excluye los cursos en los que el estudiante ya está inscrito... no: los
// muestra igual, pero marcados como "Joined" (así el usuario ve el estado).
// FUTURO: const { data } = await api.get("/courses?visibility=open"); return data;
export async function getOpenCourses() {
  const open = mergedCourses().filter((c) => c.visibility === "open");
  return withEnrollmentCount(open);
}

// REGLA 1 — Unirse a un curso PRIVADO usando su código.
// Devuelve el curso si el código es válido; lanza error si no.
// FUTURO: const { data } = await api.post("/enrollments/by-code", { code });
//         (el backend valida el código y crea la inscripción)
export async function joinCourseByCode(code) {
  const clean = (code || "").trim().toUpperCase();
  if (!clean) throw new Error("Enter a course code.");

  const course = await findCourseByCode(clean);
  if (!course) throw new Error("Invalid course code. Check it and try again.");

  const enrolled = await getEnrolledIds();
  if (enrolled.includes(course.id)) {
    throw new Error("You're already enrolled in this course.");
  }

  // Inscribe pasando el código (joinCourse lo valida de nuevo)
  await joinCourse(course.id, clean);
  return course;
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
    baseStudents: 0,                // curso nuevo: 0 inscritos de fondo
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

  // ⚠️ Nunca persistir `students` (es derivado). Solo `baseStudents` es real.
  // Si el payload trae `students` (calculado en una vista), lo descartamos.
  const { students: _ignored, ...cleanPayload } = payload;

  const updated = {
    ...existing,
    ...cleanPayload,
    course_code,
    tutor_id: existing.tutor_id,                                  // no reasignable
    baseStudents: existing.baseStudents ?? existing.students ?? 0, // se conserva
  };
  delete updated.students;   // el derivado se recalcula al leer, no se guarda

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
