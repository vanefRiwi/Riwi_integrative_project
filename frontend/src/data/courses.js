// ─── Data layer: Courses ──────────────────────────────────────────────────────
// ⚠️ IMPORTANT — Prepared for backend:
// This file is the ONLY data source for the views. Today it returns test data
// (mock). When the backend (Express + PostgreSQL) is ready, you ONLY need to
// change the body of these functions to real API calls.
// The views are NOT touched, because they already consume these functions (which are async).
//
// ─── LUMORA BUSINESS RULES (implemented here) ──────────────────────────────
// 1. Students only see courses with visibility = "open".
//    "code" courses only appear if they're already enrolled (or using the code).
// 2. Students CANNOT create courses, only join them. (There's no createCourse
//    for students; the guard is in canCreateCourse()).
// 3. Tutors only see and edit courses where course.tutor_id === their id.
//
//  These rules MUST also be validated in the backend. Filtering in the
// frontend is UI-only: it's never a real security measure.

import { getSession } from "../helpers/auth.js";
// import { api } from "../helpers/api.js";   // ← descomentar al conectar el backend

// ── Test data (deleted when connecting to backend) ──
// tutor_id  → which tutor owns the course (Rule 3)
// visibility→ "open" (anyone sees it) | "code" (requires code) (Rule 1)
// course_code→ only if visibility === "code"
const MOCK_COURSES = [
  { id: 1, tutor_id: 2, visibility: "open", course_code: null, title: "Python for Data Science", category: "Programming", instructor: "Dr. Sarah Chen", baseStudents: 4820, level: "Intermediate", image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=220&fit=crop&auto=format" },
  { id: 2, tutor_id: 2, visibility: "open", course_code: null, title: "UX Design Fundamentals", category: "Design", instructor: "Prof. Marco Reyes", baseStudents: 3210, level: "Beginner", image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=220&fit=crop&auto=format" },
  { id: 3, tutor_id: 2, visibility: "code", course_code: "EDU-A3K9", title: "Machine Learning Essentials", category: "AI & ML", instructor: "Dr. Aisha Nkosi", baseStudents: 6140, level: "Advanced", image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&h=220&fit=crop&auto=format" },
  { id: 4, tutor_id: 2, visibility: "open", course_code: null, title: "Web Development Bootcamp", category: "Programming", instructor: "James Whitfield", baseStudents: 8930, level: "Beginner", image: "https://images.unsplash.com/photo-1593720219276-0b1eacd0aef4?w=400&h=220&fit=crop&auto=format" },
  { id: 5, tutor_id: 3, visibility: "open", course_code: null, title: "Business Analytics", category: "Business", instructor: "Prof. Elena Vasquez", baseStudents: 2870, level: "Intermediate", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=220&fit=crop&auto=format" },
  { id: 6, tutor_id: 3, visibility: "open", course_code: null, title: "Digital Marketing Strategy", category: "Marketing", instructor: "Lisa Thornton", baseStudents: 5120, level: "Beginner", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=220&fit=crop&auto=format" },
  { id: 7, tutor_id: 3, visibility: "code", course_code: "AWS-7X2M", title: "Cloud Architecture AWS", category: "Cloud", instructor: "Dr. Rohan Mehta", baseStudents: 3780, level: "Advanced", image: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=220&fit=crop&auto=format" },
  { id: 8, tutor_id: 3, visibility: "open", course_code: null, title: "Project Management Pro", category: "Management", instructor: "Sophie Adler", baseStudents: 4290, level: "Intermediate", image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=220&fit=crop&auto=format" },
];

// Example sections (for tutor stats count)
const SECTIONS_PER_COURSE = 4;

// Color classes based on course level
export const LEVEL_COLORS = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-green-100 text-green-700",
  Advanced: "bg-teal-100 text-teal-700",
};

// Combines base courses (mock) with those created/edited by the tutor.
// If a local course has the same id as a mock, the local wins (it was edited).
function mergedCourses() {
  const local = getLocalCourses();
  const localIds = local.map((c) => c.id);
  const base = MOCK_COURSES.filter((c) => !localIds.includes(c.id));
  // Returns RAW data. The count is calculated separately (withEnrollmentCount),
  // so we don't have two systems counting at once.
  return [...base, ...local];
}

// Returns courses with UPDATED student count:
// adds 1 to the base total if the current user is enrolled.
// FUTURE: the backend will already return `students` with the real count from the
// `enrollments` table (COUNT), so this function disappears.
//  KEY SEPARATION between stored data and calculated data:
//
//   baseStudents  -> number of "background" enrollees (other fictional students).
//                    It's IMMUTABLE: saved once and never recalculated.
//   students      -> what's DISPLAYED = baseStudents + (am I enrolled? 1 : 0)
//                    It's a DERIVED value: calculated on the fly, never persisted.
//
// Before, `students` was saved already summed and when saving again it accumulated,
// showing 2 when there was only 1 enrolled. That's why now the persisted field
// is `baseStudents` and `students` is always derived.
//
// FUTURE: the backend will return `students` with the real COUNT from `enrollments`,
// so this function disappears completely.
async function withEnrollmentCount(courses) {
  const enrolled = await getEnrolledIds();

  return courses.map((c) => {
    // baseStudents is the source of truth. If an old mock only brings
    // `students`, we take it as the base (backward compatibility).
    const base = c.baseStudents ?? c.students ?? 0;
    const mine = enrolled.includes(c.id) ? 1 : 0;

    return {
      ...c,
      baseStudents: base,                      // kept intact
      students: Math.max(0, base + mine),      // derived, never negative
    };
  });
}

// ─── Business rule guards ──────────────────────────────────────────────────────

// Rule 2: only tutors can create courses.
export function canCreateCourse() {
  return getSession()?.role === "tutor";
}

// Rule 3: a tutor can only edit THEIR OWN courses.
export function canEditCourse(course) {
  const user = getSession();
  return user?.role === "tutor" && course.tutor_id === user.id;
}

// ─── Data API (what the views consume) ─────────────────────────────────────────

// RULE 1 — Student catalog: only "open" courses.
// Code courses are only included if the student is ALREADY enrolled
// (so they keep seeing it in their list after joining with the code).
// FUTURE: const { data } = await api.get("/courses"); return data;
//         (backend should already return only the permitted ones)
export async function getCourses() {
  const enrolled = await getEnrolledIds();
  const visible = mergedCourses().filter(
    (c) => c.visibility === "open" || enrolled.includes(c.id)
  );
  return withEnrollmentCount(visible);   // count up-to-date
}

// RULE 3 — Logged-in tutor's courses: only those they created.
// FUTURE: const { data } = await api.get("/courses/mine"); return data;
//         (backend filters by the token's tutor)
export async function getTutorCourses() {
  const user = getSession();
  if (user?.role !== "tutor") return [];
  const mine = mergedCourses().filter((c) => c.tutor_id === user.id);
  return withEnrollmentCount(mine);
}

// Find a course by its code (Rule 1: this is how you access private ones)
// FUTURE: const { data } = await api.post("/enrollments/by-code", { code });
export async function findCourseByCode(code) {
  const clean = code.trim().toUpperCase();
  return mergedCourses().find((c) => c.course_code === clean) || null;
}

// IDs of courses the student is enrolled in
// FUTURE: const { data } = await api.get("/enrollments"); return data.map(e => e.course_id);
export async function getEnrolledIds() {
  const saved = localStorage.getItem("enrolled");
  return saved ? JSON.parse(saved) : [];
}

// RULE 2 — Join a course (only action a student takes on courses).
// If the course requires a code, it must be passed and must match.
// FUTURE: await api.post("/enrollments", { course_id: id, code });
export async function joinCourse(id, code = null) {
  const course = mergedCourses().find((c) => c.id === id);
  if (!course) throw new Error("Curso no encontrado");

  // Rule 1: private courses require the correct code
  if (course.visibility === "code") {
    if (!code || code.trim().toUpperCase() !== course.course_code) {
      throw new Error("Código de curso inválido");
    }
  }

  const ids = await getEnrolledIds();
  if (!ids.includes(id)) ids.push(id);
  localStorage.setItem("enrolled", JSON.stringify(ids));
  // The count is NOT touched here: it's derived from `enrolled` in withEnrollmentCount().
  return ids;
}

// Leave a course.
// Effects:
//   - The enrollment count DROPS (withEnrollmentCount stops adding the +1).
//   - If the course was PRIVATE, it disappears from the catalog (getCourses filters it).
//   - Progress is deleted: if they rejoin, they start from zero.
// FUTURE: await api.del(`/enrollments/${id}`);
//         (backend deletes the `enrollments` row and its `submissions`)
export async function leaveCourse(id) {
  const ids = (await getEnrolledIds()).filter((x) => x !== id);
  localStorage.setItem("enrolled", JSON.stringify(ids));

  // Cleans up progress for that course (quizzes, reviews, final exam)
  localStorage.removeItem(`progress:${id}`);

  return ids;
}

// Tutor statistics (only for THEIR courses — Rule 3)
// FUTURE: const { data } = await api.get("/courses/stats"); return data;
export async function getTutorStats() {
  const courses = await getTutorCourses();
  return {
    totalCourses: courses.length,
    totalStudents: courses.reduce((sum, c) => sum + c.students, 0),
    totalSections: courses.length * SECTIONS_PER_COURSE,
    sectionsPerCourse: SECTIONS_PER_COURSE,
  };
}

// ─── Join a course ("Join a course" modal) ────────────────────────────────────

// RULE 1 — OPEN courses available to explore in the modal.
// Private ones (visibility="code") are NOT listed: only accessed with code.
// Excludes courses the student is already enrolled in... no: it shows them
// anyway, but marked as "Joined" (so the user sees the status).
// FUTURE: const { data } = await api.get("/courses?visibility=open"); return data;
export async function getOpenCourses() {
  const open = mergedCourses().filter((c) => c.visibility === "open");
  return withEnrollmentCount(open);
}

// RULE 1 — Join a PRIVATE course using its code.
// Returns the course if the code is valid; throws error if not.
// FUTURE: const { data } = await api.post("/enrollments/by-code", { code });
//         (backend validates the code and creates the enrollment)
export async function joinCourseByCode(code) {
  const clean = (code || "").trim().toUpperCase();
  if (!clean) throw new Error("Enter a course code.");

  const course = await findCourseByCode(clean);
  if (!course) throw new Error("Invalid course code. Check it and try again.");

  const enrolled = await getEnrolledIds();
  if (enrolled.includes(course.id)) {
    throw new Error("You're already enrolled in this course.");
  }

  // Enroll passing the code (joinCourse validates it again)
  await joinCourse(course.id, clean);
  return course;
}

// ─── Course writing (create / edit) ────────────────────────────────────────────

// Courses created in this session (mock). They persist in localStorage so they
// don't get lost on reload. FUTURE: the database handles this.
function getLocalCourses() {
  const saved = localStorage.getItem("customCourses");
  return saved ? JSON.parse(saved) : [];
}

function saveLocalCourses(list) {
  localStorage.setItem("customCourses", JSON.stringify(list));
}

// Generates a unique course code (format EDU-XXXX).
// Ambiguous characters (I, O, 0, 1) are excluded to avoid confusion.
export function generateCourseCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `EDU-${rand}`;
}

// Returns a course by id (searches in mocks + locally created ones)
// FUTURE: const { data } = await api.get(`/courses/${id}`); return data;
export async function getCourseById(id) {
  return mergedCourses().find((c) => c.id === Number(id)) || null;
}

// RULE 2 — Only a tutor can create courses.
// RULE 1 — If it's private, a course_code is assigned to it (immutable).
// FUTURE: const { data } = await api.post("/courses", payload); return data;
export async function createCourse(payload) {
  const user = getSession();
  if (!canCreateCourse()) {
    throw new Error("Only tutors can create courses");
  }

  const isPrivate = payload.visibility === "code";

  const course = {
    ...payload,
    id: Date.now(),                 // FUTURE: assigned by the DB SERIAL
    tutor_id: user.id,              // Rule 3: bound to its creator
    baseStudents: 0,                // new course: 0 background enrollees
    // The code is generated ONCE, when creating the private course.
    course_code: isPrivate ? (payload.course_code || generateCourseCode()) : null,
  };

  const list = getLocalCourses();
  list.push(course);
  saveLocalCourses(list);
  return course;
}

// RULE 3 — Only the course's owner tutor can edit it.
// The course_code is NEVER overwritten if it already existed (it's immutable).
// FUTURE: const { data } = await api.put(`/courses/${id}`, payload); return data;
export async function updateCourse(id, payload) {
  const existing = await getCourseById(id);
  if (!existing) throw new Error("Course not found");

  if (!canEditCourse(existing)) {
    throw new Error("You cannot edit a course you didn't create");
  }

  // ── Immutable code ──
  // If the course ALREADY had a code, it's preserved no matter what.
  // If it changes from "open" to "code" for the first time, a new one is generated.
  let course_code = existing.course_code;
  if (payload.visibility === "code" && !course_code) {
    course_code = generateCourseCode();
  }
  // If it changes back to "open", the code is kept saved (in case it reactivates),
  // but it's not used while it's public.

  //  Never persist `students` (it's derived). Only `baseStudents` is real.
  // If the payload brings `students` (calculated in a view), we discard it.
  const { students: _ignored, ...cleanPayload } = payload;

  const updated = {
    ...existing,
    ...cleanPayload,
    course_code,
    tutor_id: existing.tutor_id,                                  // not reassignable
    baseStudents: existing.baseStudents ?? existing.students ?? 0, // kept intact
  };
  delete updated.students;   // the derived value is recalculated on read, not saved

  const list = getLocalCourses();
  const idx = list.findIndex((c) => c.id === Number(id));
  if (idx >= 0) {
    list[idx] = updated;              // was a locally created course
  } else {
    list.push(updated);               // was a mock: the edited version is saved
  }
  saveLocalCourses(list);
  return updated;
}
