// ─── Course Service ───────────────────────────────────────────────────────────
//
// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  🚨 REQUISITO BLOQUEANTE PARA EL BACKEND — LEER ANTES DE INTEGRAR        ║
// ╠═══════════════════════════════════════════════════════════════════════════╣
// ║                                                                           ║
// ║  HOY (mock): el frontend recibe las preguntas CON el campo `correct` y    ║
// ║  califica localmente. Esto es INSEGURO: cualquier estudiante abre         ║
// ║  DevTools y ve todas las respuestas correctas.                            ║
// ║                                                                           ║
// ║  AL INTEGRAR EL BACKEND, es OBLIGATORIO:                                  ║
// ║                                                                           ║
// ║   1. GET /api/sections/:id/items                                          ║
// ║      -> NUNCA debe incluir el campo `correct` en las preguntas.           ║
// ║         El servidor lo elimina antes de responder.                        ║
// ║                                                                           ║
// ║   2. POST /api/submissions                                                ║
// ║      -> Recibe SOLO las respuestas del alumno.                            ║
// ║         El SERVIDOR compara, califica y devuelve { score, total, points }. ║
// ║                                                                           ║
// ║  ⚠️ Esto CAMBIARÁ el frontend: submitQuizz() dejará de calcular el score  ║
// ║     localmente y pasará a leerlo de la respuesta del backend.             ║
// ║     Está previsto y aislado en este archivo (ver submitQuizz).            ║
// ║                                                                           ║
// ║  Ver: QUIZZES_Y_REVIEWS.md · Criterio de aceptación de la HU de backend.  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝
//
// Puerta de entrada al contenido de un curso (secciones, items, progreso).
//
// 🔌 INTEGRACIÓN: descomenta `api` y reemplaza el cuerpo de cada función.
// Las vistas NO cambian.

// import { api } from "../helpers/api.js";
import {
  MOCK_SECTIONS,
  MOCK_WELCOME,
  MOCK_COURSE_CONTENTS,
  MOCK_REVIEWS,
  MOCK_QUIZZES,
  MOCK_FINAL,
  MOCK_LEADERBOARD,
} from "../mocks/courseContent.mock.js";
import { getCourseById } from "../data/courses.js";

// ── Estructura del curso ─────────────────────────────────────────────────────

// GET /api/courses/:id/sections
export async function getSections(courseId) {
  // FUTURO: const { data } = await api.get(`/courses/${courseId}/sections`); return data;
  const course = await getCourseById(courseId);

  // Si el tutor creó el curso desde el editor, usamos SUS secciones
  if (course?.sections?.length) {
    return course.sections.map((s, i) => ({
      id: s.id,
      course_id: Number(courseId),
      title: s.title,
      orden: i + 1,
    }));
  }
  return MOCK_SECTIONS;
}

// GET /api/sections/:id/items  -> welcome, content, review, quizz
export async function getSectionItems(courseId, sectionId) {
  // FUTURO: const { data } = await api.get(`/sections/${sectionId}/items`); return data;
  const course = await getCourseById(courseId);

  // Curso creado por el tutor -> leemos lo que él guardó
  const custom = course?.items?.[sectionId];
  if (custom) {
    return {
      welcome: custom.welcome || { message: "", videoUrl: "" },
      contents: custom.content || [],
      review: custom.review || null,
      quizz: custom.quizz || null,
    };
  }

  // Curso de ejemplo -> mocks
  return {
    welcome: MOCK_WELCOME[sectionId] || { message: "", videoUrl: "" },
    contents: MOCK_COURSE_CONTENTS[sectionId] || [],
    review: MOCK_REVIEWS[sectionId] || null,
    quizz: MOCK_QUIZZES[sectionId] || null,
  };
}

// GET /api/courses/:id/final-assessment
export async function getFinalAssessment(courseId) {
  // FUTURO: const { data } = await api.get(`/courses/${courseId}/final`); return data;
  const course = await getCourseById(courseId);
  return course?.finalAssessment?.questions?.length
    ? course.finalAssessment
    : MOCK_FINAL;
}

// GET /api/courses/:id/leaderboard
export async function getLeaderboard(courseId) {
  // FUTURO: const { data } = await api.get(`/courses/${courseId}/leaderboard`); return data;
  return [...MOCK_LEADERBOARD].sort((a, b) => b.points - a.points);
}

// ── Progreso del estudiante ──────────────────────────────────────────────────
// Hoy en localStorage; mañana serán las tablas `submissions` del backend.
// FUTURO: GET/POST /api/submissions

const key = (courseId) => `progress:${courseId}`;

// { quizzes: { [sectionId]: { score, points } }, reviews: { [sectionId]: true }, final: {...} }
export async function getProgress(courseId) {
  // FUTURO: const { data } = await api.get(`/courses/${courseId}/progress`); return data;
  const saved = localStorage.getItem(key(courseId));
  return saved ? JSON.parse(saved) : { quizzes: {}, reviews: {}, final: null };
}

// POST /api/submissions  -> guarda el resultado de un quizz
// ⚠️ La CALIFICACIÓN vive aquí, NO en la vista.
//
// Recibe las RESPUESTAS del alumno (no el score ya calculado). Hoy corrige
// localmente contra el mock; mañana el SERVIDOR corrige y devuelve el score.
// La vista solo envía respuestas y muestra el resultado: no sabe corregir.
//
// FUTURO (backend obligatorio):
//   const { data } = await api.post("/submissions", { item_id, answers });
//   return { progress: await getProgress(courseId), result: data };
//   ...y este archivo deja de ver `q.correct` (el backend nunca lo envía).
export async function submitQuizz(courseId, sectionId, { quiz, answers }) {
  // ── Corrección (esto se MUEVE al servidor al integrar) ──
  const correct = quiz.questions.filter((q) => answers[q.id] === q.correct).length;
  const total = quiz.questions.length;
  const points = Math.round((correct / total) * (quiz.points || 50));

  const p = await getProgress(courseId);
  p.quizzes[sectionId] = { score: correct, total, points };
  localStorage.setItem(key(courseId), JSON.stringify(p));

  // Devuelve progreso + resultado (misma forma que devolverá la API)
  return { progress: p, result: { correct, total, points } };
}

// POST /api/submissions  -> guarda el resultado de una review
// ⚠️ Las reviews NO otorgan puntos al leaderboard (solo los quizzes).
// Son actividades de práctica: dan feedback, pero no puntúan ni califican.
export async function submitReview(courseId, sectionId, { correct }) {
  const p = await getProgress(courseId);
  p.reviews[sectionId] = { correct, completed: true };
  localStorage.setItem(key(courseId), JSON.stringify(p));
  return p;
}

// Igual que submitQuizz: la corrección vive aquí, no en la vista.
// FUTURO: la hace el servidor (POST /api/submissions con item_id del final).
export async function submitFinal(courseId, { quiz, answers }) {
  const correct = quiz.questions.filter((q) => answers[q.id] === q.correct).length;
  const total = quiz.questions.length;
  const points = Math.round((correct / total) * (quiz.points || 200));

  const p = await getProgress(courseId);
  p.final = { score: correct, total, points };
  localStorage.setItem(key(courseId), JSON.stringify(p));

  return { progress: p, result: { correct, total, points } };
}

// ── Reglas de desbloqueo (lock progresivo) ───────────────────────────────────

// Una sección está desbloqueada si es la primera, o si el quizz de la ANTERIOR
// ya fue completado.
export function isSectionUnlocked(sections, sectionId, progress) {
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx <= 0) return true;                       // la primera siempre abierta
  const prev = sections[idx - 1];
  return Boolean(progress.quizzes[prev.id]);       // ¿hizo el quizz anterior?
}

// El examen final se desbloquea al completar TODOS los quizzes
export function isFinalUnlocked(sections, progress) {
  return sections.every((s) => Boolean(progress.quizzes[s.id]));
}

// ── Cálculo de notas (reutilizable: student Grades + tutor Dashboard) ────────

// NOTA FINAL DEL CURSO
// Promedio entre los quizzes de cada sección + el examen final.
// La cantidad de quizzes varía según el curso, por eso se divide entre
// (nº de secciones + 1 por el final).
//
// Cada item aporta su porcentaje (score/total * 100). Los no presentados
// cuentan como 0, porque el curso no está completo hasta hacerlos todos.
//
// Devuelve null si el estudiante aún no ha presentado NADA.
export function finalGrade(sections, progress) {
  const totalItems = sections.length + 1;          // quizzes + examen final
  if (!totalItems) return null;

  const pct = (r) => (r && r.total ? (r.score / r.total) * 100 : 0);

  const quizSum = sections.reduce((sum, s) => sum + pct(progress.quizzes[s.id]), 0);
  const finalSum = pct(progress.final);

  const presented =
    sections.filter((s) => progress.quizzes[s.id]).length + (progress.final ? 1 : 0);
  if (!presented) return null;                     // no ha presentado nada

  return Math.round(((quizSum + finalSum) / totalItems) * 10) / 10;
}

// Desglose de notas individuales (para el reporte del tutor y el panel Grades)
// [{ label, score, total, percent, points, status }]
export function gradeBreakdown(sections, progress) {
  const rows = sections.map((s) => {
    const q = progress.quizzes[s.id];
    return {
      id: s.id,
      label: `Quizz — ${s.title}`,
      score: q?.score ?? null,
      total: q?.total ?? null,
      percent: q ? Math.round((q.score / q.total) * 100) : null,
      points: q?.points ?? 0,
      status: q ? "Graded" : "Not started",
    };
  });

  const f = progress.final;
  rows.push({
    id: "final",
    label: "Final Assessment",
    score: f?.score ?? null,
    total: f?.total ?? null,
    percent: f ? Math.round((f.score / f.total) * 100) : null,
    points: f?.points ?? 0,
    status: f ? "Graded" : isFinalUnlocked(sections, progress) ? "Not started" : "Locked",
  });

  return rows;
}

// Puntos totales del leaderboard (SOLO quizzes + final; las reviews no puntúan)
export function totalPoints(sections, progress) {
  const fromQuizzes = sections.reduce(
    (sum, s) => sum + (progress.quizzes[s.id]?.points || 0), 0
  );
  return fromQuizzes + (progress.final?.points || 0);
}

// ─── Dashboard del tutor ─────────────────────────────────────────────────────

// GET /api/courses/:id/students
// Devuelve los estudiantes inscritos con TODAS sus notas (individuales + final).
// FUTURO: el backend lo resuelve con JOIN users + enrollments + submissions.
export async function getCourseStudents(courseId, sections) {
  // FUTURO: const { data } = await api.get(`/courses/${courseId}/students`); return data;
  const { studentsForCourse } = await import("../mocks/enrollments.mock.js");
  const students = studentsForCourse(courseId);

  // Reutilizamos EXACTAMENTE la misma lógica de nota que ve el estudiante,
  // para que tutor y estudiante nunca vean cifras distintas.
  return students.map((st) => {
    const progress = {
      quizzes: st.grades.quizzes || {},
      reviews: {},
      final: st.grades.final || null,
    };
    return {
      ...st,
      finalGrade: finalGrade(sections, progress),      // null si no ha presentado nada
      breakdown: gradeBreakdown(sections, progress),   // nota por quizz + examen
      points: totalPoints(sections, progress),
    };
  });
}

// Estadísticas del curso para el Dashboard
export function courseStats(students) {
  const graded = students.filter((s) => s.finalGrade !== null);
  const avg = graded.length
    ? Math.round(graded.reduce((sum, s) => sum + s.finalGrade, 0) / graded.length)
    : 0;

  return {
    enrolled: students.length,
    averageGrade: avg,
    completed: students.filter((s) => s.breakdown.every((b) => b.status === "Graded")).length,
  };
}

// ─── Cálculo de la NOTA FINAL ────────────────────────────────────────────────
//
// Fórmula: promedio de (quizz de cada sección + examen final).
//   nota = suma(porcentajes) / (nº de secciones + 1)
//
// El examen final cuenta como UN item más, igual que cada quizz.
// Los items no presentados cuentan como 0.
// Las reviews NO cuentan (son práctica, no evaluación) ni dan puntos.
//
// ⚠️ Esta es la ÚNICA fuente de verdad de la nota: la usa tanto el estudiante
// en "My Grades" como el tutor en el Dashboard. Así ambos ven lo mismo.
// FUTURO: el backend puede replicar esta fórmula sobre la tabla `submissions`.
export function calculateFinalGrade(sections, progress) {
  const safe = progress || { quizzes: {}, reviews: {}, final: null };
  const quizzes = safe.quizzes || {};
  const totalItems = sections.length + 1;   // quizzes + examen final

  if (!sections.length) {
    return { grade: 0, breakdown: [], completed: 0, totalItems: 0, points: 0 };
  }

  const breakdown = [];
  let sum = 0;
  let completed = 0;

  // Un item por cada quizz de sección
  sections.forEach((sec) => {
    const q = quizzes[sec.id];
    const pct = q ? Math.round((q.score / q.total) * 100) : 0;
    if (q) { sum += pct; completed++; }
    breakdown.push({
      id: sec.id,
      label: `Quizz — ${sec.title}`,
      score: q ? q.score : null,
      total: q ? q.total : null,
      pct: q ? pct : null,
      points: q?.points || 0,
      status: q ? "graded" : "pending",
    });
  });

  // El examen final es un item más
  const f = safe.final;
  const fPct = f ? Math.round((f.score / f.total) * 100) : 0;
  if (f) { sum += fPct; completed++; }
  breakdown.push({
    id: "final",
    label: "Final Assessment",
    score: f ? f.score : null,
    total: f ? f.total : null,
    pct: f ? fPct : null,
    points: f?.points || 0,
    status: f ? "graded" : isFinalUnlocked(sections, safe) ? "pending" : "locked",
  });

  // Nota definitiva: promedio sobre TODOS los items (los no hechos valen 0)
  const grade = Math.round((sum / totalItems) * 10) / 10;

  // Puntos del leaderboard: SOLO quizzes + final (las reviews no dan puntos)
  const points = breakdown.reduce((acc, b) => acc + (b.points || 0), 0);

  // Puntos MÁXIMOS posibles del curso (para el "Out of X total").
  // Por defecto: 50 pts por quizz de sección + 200 del examen final.
  // FUTURO: el backend enviará el valor real de `points` de cada item.
  const maxPoints = sections.length * 50 + 200;

  return { grade, breakdown, completed, totalItems, points, maxPoints };
}

// ─── Estudiantes inscritos (Dashboard del tutor) ─────────────────────────────

// GET /api/courses/:id/students
// Devuelve los estudiantes con su `progress` para que el frontend calcule
// las notas con calculateFinalGrade() — la MISMA fórmula que ve el estudiante.
export async function getEnrolledStudents(courseId) {
  // FUTURO: const { data } = await api.get(`/courses/${courseId}/students`); return data;
  const { MOCK_ENROLLED_STUDENTS, DEFAULT_STUDENTS } = await import("../mocks/students.mock.js");
  return MOCK_ENROLLED_STUDENTS[courseId] || DEFAULT_STUDENTS;
}
