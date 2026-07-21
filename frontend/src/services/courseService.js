// ─── Course Service ───────────────────────────────────────────────────────────
//
// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║   BLOCKING REQUIREMENT FOR BACKEND — READ BEFORE INTEGRATING            ║
// ╠═══════════════════════════════════════════════════════════════════════════╣
// ║                                                                           ║
// ║  TODAY (mock): the frontend receives questions WITH the `correct` field  ║
// ║  and grades locally. This is INSECURE: any student opens DevTools and    ║
// ║  sees all the correct answers.                                           ║
// ║                                                                           ║
// ║  WHEN INTEGRATING THE BACKEND, it's MANDATORY:                           ║
// ║                                                                           ║
// ║   1. GET /api/sections/:id/items                                          ║
// ║      -> MUST NEVER include the `correct` field in questions.             ║
// ║         The server removes it before responding.                         ║
// ║                                                                           ║
// ║   2. POST /api/submissions                                                ║
// ║      -> Receives ONLY the student's answers.                             ║
// ║         The SERVER compares, grades and returns { score, total, points }. ║
// ║                                                                           ║
// ║  ⚠️ This WILL CHANGE the frontend: submitQuizz() will stop calculating   ║
// ║     the score locally and will read it from the backend response.        ║
// ║     It's planned and isolated in this file (see submitQuizz).            ║
// ║                                                                           ║
// ║  See: QUIZZES_Y_REVIEWS.md · Acceptance criteria for the backend HU.     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝
//
// Gateway to course content (sections, items, progress).
//
// INTEGRATION: uncomment `api` and replace the body of each function.
// The views do NOT change.

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

// ── Course structure ──────────────────────────────────────────────────────────

// GET /api/courses/:id/sections
export async function getSections(courseId) {
  // FUTURE: const { data } = await api.get(`/courses/${courseId}/sections`); return data;
  const course = await getCourseById(courseId);

  // If the tutor created the course from the editor, we use THEIR sections
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
  // FUTURE: const { data } = await api.get(`/sections/${sectionId}/items`); return data;
  const course = await getCourseById(courseId);

  // Course created by tutor -> we read what they saved
  const custom = course?.items?.[sectionId];
  if (custom) {
    return {
      welcome: custom.welcome || { message: "", videoUrl: "" },
      contents: custom.content || [],
      review: custom.review || null,
      quizz: custom.quizz || null,
    };
  }

  // Example course -> mocks
  return {
    welcome: MOCK_WELCOME[sectionId] || { message: "", videoUrl: "" },
    contents: MOCK_COURSE_CONTENTS[sectionId] || [],
    review: MOCK_REVIEWS[sectionId] || null,
    quizz: MOCK_QUIZZES[sectionId] || null,
  };
}

// GET /api/courses/:id/final-assessment
export async function getFinalAssessment(courseId) {
  // FUTURE: const { data } = await api.get(`/courses/${courseId}/final`); return data;
  const course = await getCourseById(courseId);
  return course?.finalAssessment?.questions?.length
    ? course.finalAssessment
    : MOCK_FINAL;
}

// GET /api/courses/:id/leaderboard
export async function getLeaderboard(courseId) {
  // FUTURE: const { data } = await api.get(`/courses/${courseId}/leaderboard`); return data;
  return [...MOCK_LEADERBOARD].sort((a, b) => b.points - a.points);
}

// ── Student progress ──────────────────────────────────────────────────────────
// Today in localStorage; tomorrow they'll be the backend `submissions` tables.
// FUTURE: GET/POST /api/submissions

const key = (courseId) => `progress:${courseId}`;

// { quizzes: { [sectionId]: { score, points } }, reviews: { [sectionId]: true }, final: {...} }
export async function getProgress(courseId) {
  // FUTURE: const { data } = await api.get(`/courses/${courseId}/progress`); return data;
  const saved = localStorage.getItem(key(courseId));
  return saved ? JSON.parse(saved) : { quizzes: {}, reviews: {}, final: null };
}

// POST /api/submissions  -> saves the result of a quiz
//  The GRADING lives here, NOT in the view.
//
// Receives the student's ANSWERS (not the already calculated score). Today corrects
// locally against the mock; tomorrow the SERVER corrects and returns the score.
// The view only sends answers and displays the result: it doesn't know how to grade.
//
// FUTURE (backend mandatory):
//   const { data } = await api.post("/submissions", { item_id, answers });
//   return { progress: await getProgress(courseId), result: data };
//   ...and this file stops seeing `q.correct` (the backend never sends it).
export async function submitQuizz(courseId, sectionId, { quiz, answers }) {
  // ── Grading (this MOVES to the server when integrating) ──
  const correct = quiz.questions.filter((q) => answers[q.id] === q.correct).length;
  const total = quiz.questions.length;
  const points = Math.round((correct / total) * (quiz.points || 50));

  const p = await getProgress(courseId);
  p.quizzes[sectionId] = { score: correct, total, points };
  localStorage.setItem(key(courseId), JSON.stringify(p));

  // Returns progress + result (same format the API will return)
  return { progress: p, result: { correct, total, points } };
}

// POST /api/submissions  -> saves the result of a review
// ⚠️ Reviews do NOT award leaderboard points (only quizzes do).
// They are practice activities: they provide feedback, but don't score or grade.
export async function submitReview(courseId, sectionId, { correct }) {
  const p = await getProgress(courseId);
  p.reviews[sectionId] = { correct, completed: true };
  localStorage.setItem(key(courseId), JSON.stringify(p));
  return p;
}

// Just like submitQuizz: the grading happens here, not in the view.
// FUTURE: It's done by the server (POST /api/submissions with the item_id at the end).
export async function submitFinal(courseId, { quiz, answers }) {
  const correct = quiz.questions.filter((q) => answers[q.id] === q.correct).length;
  const total = quiz.questions.length;
  const points = Math.round((correct / total) * (quiz.points || 200));

  const p = await getProgress(courseId);
  p.final = { score: correct, total, points };
  localStorage.setItem(key(courseId), JSON.stringify(p));

  return { progress: p, result: { correct, total, points } };
}

 // ── Unlock Rules (Progressive Unlock) ───────────────────────────────────

// A section is unlocked if it is the first one, or if the quiz from the PREVIOUS
// section has already been completed.

export function isSectionUnlocked(sections, sectionId, progress) {
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx <= 0) return true;                       // the first one is always open
  const prev = sections[idx - 1];
  return Boolean(progress.quizzes[prev.id]);       // Did you take the quiz above?
}

// The final exam is unlocked after completing ALL the quizzes
export function isFinalUnlocked(sections, progress) {
  return sections.every((s) => Boolean(progress.quizzes[s.id]));
}

// ── Grade Calculation (reusable: Student Grades + Instructor Dashboard) ────────

// FINAL COURSE GRADE
// Average of the quizzes for each section + the final exam.
// The number of quizzes varies by course, so it is divided by
// (number of sections + 1 for the final).
//
// Each item contributes its percentage (score/total * 100). Unsubmitted items
// count as 0, because the course is not complete until all of them are submitted.
//
// Returns null if the student has not yet submitted ANYTHING.
export function finalGrade(sections, progress) {
  const totalItems = sections.length + 1;          // quizzes +  final assestment
  if (!totalItems) return null;

  const pct = (r) => (r && r.total ? (r.score / r.total) * 100 : 0);

  const quizSum = sections.reduce((sum, s) => sum + pct(progress.quizzes[s.id]), 0);
  const finalSum = pct(progress.final);

  const presented =
    sections.filter((s) => progress.quizzes[s.id]).length + (progress.final ? 1 : 0);
  if (!presented) return null;                     // the student has not yet submitted ANYTHING.

  return Math.round(((quizSum + finalSum) / totalItems) * 10) / 10;
}

// Breakdown of individual grades (for the tutor's report and the Grades panel)
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

// Total leaderboard points (ONLY quizzes + final; reviews do not count toward the score)
export function totalPoints(sections, progress) {
  const fromQuizzes = sections.reduce(
    (sum, s) => sum + (progress.quizzes[s.id]?.points || 0), 0
  );
  return fromQuizzes + (progress.final?.points || 0);
}

// ─── Instructor Dashboard ─────────────────────────────────────────────────────

// GET /api/courses/:id/students
// Returns enrolled students with ALL their grades (individual + final).
// FUTURE: The backend handles this using a JOIN of users, enrollments, and submissions.
export async function getCourseStudents(courseId, sections) {
  // FUTURE: const { data } = await api.get(`/courses/${courseId}/students`); return data;
  const { studentsForCourse } = await import("../mocks/enrollments.mock.js");
  const students = studentsForCourse(courseId);

  // We reuse EXACTLY the same grading logic that the student sees,
  // so that the tutor and the student never see different scores.
  return students.map((st) => {
    const progress = {
      quizzes: st.grades.quizzes || {},
      reviews: {},
      final: st.grades.final || null,
    };
    return {
      ...st,
      finalGrade: finalGrade(sections, progress),      // null if you haven't submitted anything
      breakdown: gradeBreakdown(sections, progress),   // Grade for quiz + exam
      points: totalPoints(sections, progress),
    };
  });
}

// Course Statistics for the Dashboard
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

// ─── Calculation of the FINAL GRADE ────────────────────────────────────────────────
//
// Formula: average of (quizzes for each section + final exam).
//   grade = sum(percentages) / (number of sections + 1)
//
// The final exam counts as ONE additional item, just like each quiz.
// Items not submitted count as 0.
// Reviews do NOT count (they are practice, not assessment) and do not award points.
//
//  This is the ONLY true source of the grade: it is used by both the student
// in “My Grades” and the instructor in the Dashboard. This way, both see the same information.
// FUTURE: the backend can replicate this formula on the `submissions` table.
export function calculateFinalGrade(sections, progress) {
  const safe = progress || { quizzes: {}, reviews: {}, final: null };
  const quizzes = safe.quizzes || {};
  const totalItems = sections.length + 1;   // quizzes + final assestment

  if (!sections.length) {
    return { grade: 0, breakdown: [], completed: 0, totalItems: 0, points: 0 };
  }

  const breakdown = [];
  let sum = 0;
  let completed = 0;

  // One item for each section quiz
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

  // The final exam is just one more item
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

  // Final score: average of ALL items (uncompleted items count as 0)
  const grade = Math.round((sum / totalItems) * 10) / 10;

  // Leaderboard points: ONLY quizzes + final (reviews do not earn points)
  const points = breakdown.reduce((acc, b) => acc + (b.points || 0), 0);

  // Maximum possible points for the course (for “Out of X total”).
  // Default: 50 points per section quiz + 200 for the final exam.
  // FUTURE: The backend will send the actual `points` value for each item.
  const maxPoints = sections.length * 50 + 200;

  return { grade, breakdown, completed, totalItems, points, maxPoints };
}

// ─── Enrolled Students (Instructor Dashboard) ─────────────────────────────

// GET /api/courses/:id/students
// Returns students along with their `progress` so the frontend can calculate
// grades using calculateFinalGrade() — the SAME formula the student sees.
export async function getEnrolledStudents(courseId) {
  // FUTURE: const { data } = await api.get(`/courses/${courseId}/students`); return data;
  const { MOCK_ENROLLED_STUDENTS, DEFAULT_STUDENTS } = await import("../mocks/students.mock.js");
  return MOCK_ENROLLED_STUDENTS[courseId] || DEFAULT_STUDENTS;
}
