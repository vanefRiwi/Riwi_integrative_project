// ─── Tutor Dashboard ──────────────────────────────────────────────────────────
// Reporte de estudiantes inscritos con sus notas.
//
// La NOTA FINAL se calcula con calculateFinalGrade() — la MISMA función que usa
// el estudiante en su pestaña "Grades". Una sola fuente de verdad.
//
// Además de la nota definitiva, el tutor puede desplegar cada fila para ver
// las notas INDIVIDUALES (cada quizz + el examen final).

import { navbar, initNavbar } from "../../components/navbar.js";
import { getTutorCourses } from "../../data/courses.js";
import { getSections, getEnrolledStudents, calculateFinalGrade } from "../../services/courseService.js";

const icon = {
  users: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>`,
  award: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  chevron: `<svg class="w-4 h-4 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
};

// ─── Estado ──────────────────────────────────────────────────────────────────
let courses = [];
let selCourseId = null;
let sections = [];
let students = [];
let expanded = new Set();   // filas desplegadas (notas individuales)

// Color según la nota
function gradeColor(pct) {
  if (pct === null) return "var(--muted-foreground)";
  if (pct >= 80) return "var(--primary)";
  if (pct >= 60) return "#f59e0b";
  return "#dc2626";
}

// Fila desplegable con las notas individuales
function studentRow(st) {
  const { grade, breakdown, completed, totalItems } = calculateFinalGrade(sections, st.progress);
  const isOpen = expanded.has(st.id);
  const started = completed > 0;

  // Detalle: cada quizz + el examen final
  const detail = breakdown.map((b) => {
    const value = b.status === "graded"
      ? `<span class="text-sm font-bold" style="color: ${gradeColor(b.pct)}">
           ${b.score}/${b.total} <span class="font-normal text-xs">(${b.pct}%)</span>
         </span>`
      : `<span class="text-xs px-2 py-0.5 rounded-full"
              style="background: var(--muted); color: var(--muted-foreground)">
           ${b.status === "locked" ? "Locked" : "Not started"}
         </span>`;

    return `
      <div class="flex items-center justify-between py-2 px-4 rounded-lg mb-1" style="background: var(--muted)">
        <span class="text-xs font-medium">${b.label}</span>
        ${value}
      </div>`;
  }).join("");

  return `
    <div class="mb-2 rounded-xl overflow-hidden" style="border: 1px solid var(--border); background: var(--card)">
      <!-- Fila principal -->
      <button data-student="${st.id}"
        class="js-row w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--muted)]">
        <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style="background: var(--secondary); color: var(--primary)">
          ${st.full_name.split(" ").map((n) => n[0]).join("")}
        </span>

        <span class="flex-1 text-left min-w-0">
          <span class="block text-sm font-medium truncate">${st.full_name}</span>
          <span class="block text-xs truncate" style="color: var(--muted-foreground)">
            ${completed}/${totalItems} items completed
          </span>
        </span>

        <!-- Nota definitiva -->
        <span class="text-right shrink-0">
          ${started
            ? `<span class="text-base font-bold" style="color: ${gradeColor(grade)}">${grade}%</span>`
            : `<span class="text-sm" style="color: var(--muted-foreground)">—</span>`}
          <span class="block text-xs" style="color: var(--muted-foreground)">Final grade</span>
        </span>

        <span style="color: var(--muted-foreground); transform: rotate(${isOpen ? "180deg" : "0"})">${icon.chevron}</span>
      </button>

      <!-- Detalle: notas individuales -->
      ${isOpen ? `
        <div class="px-4 pb-4 pt-1" style="border-top: 1px solid var(--border)">
          <p class="text-xs font-semibold mb-2 mt-2 tracking-wide" style="color: var(--muted-foreground)">
            INDIVIDUAL GRADES
          </p>
          ${detail}
        </div>` : ""}
    </div>`;
}

export function dashboardView() {
  const course = courses.find((c) => c.id === selCourseId);

  // Promedio del curso (solo entre quienes empezaron)
  const grades = students
    .map((st) => calculateFinalGrade(sections, st.progress))
    .filter((g) => g.completed > 0)
    .map((g) => g.grade);
  const avg = grades.length
    ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 10) / 10
    : 0;

  const stat = (ic, value, label) => `
    <div class="rounded-xl p-5 flex items-start gap-4" style="background: var(--card); border: 1px solid var(--border)">
      <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
           style="background: var(--secondary); color: var(--primary)">${ic}</div>
      <div>
        <p class="text-2xl font-bold" style="font-family: var(--font-family-display)">${value}</p>
        <p class="text-sm font-medium">${label}</p>
      </div>
    </div>`;

  const options = courses
    .map((c) => `<option value="${c.id}" ${c.id === selCourseId ? "selected" : ""}>${c.title}</option>`)
    .join("");

  return `
    <div class="min-h-screen" style="background: var(--background); font-family: var(--font-family-body)">
      ${navbar({ active: "dashboard" })}

      <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 class="text-2xl font-bold mb-6" style="font-family: var(--font-family-display)">Dashboard</h1>

        ${courses.length === 0 ? `
          <div class="rounded-xl p-8 text-center text-sm"
               style="background: var(--card); border: 1px solid var(--border); color: var(--muted-foreground)">
            You haven't created any courses yet.
          </div>` : `

          <!-- Selector de curso -->
          <div class="mb-6">
            <label class="block text-sm font-medium mb-1.5">Course</label>
            <select class="js-course w-full sm:w-72 px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style="background: var(--card); border: 1px solid var(--border)">${options}</select>
          </div>

          <!-- Estadísticas -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            ${stat(icon.users, students.length.toLocaleString(), "Enrolled students")}
            ${stat(icon.award, `${avg}%`, "Average final grade")}
          </div>

          <!-- Tabla de estudiantes -->
          <div class="rounded-2xl p-5" style="background: var(--card); border: 1px solid var(--border)">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-bold" style="font-family: var(--font-family-display)">Enrolled Students</h2>
              <span class="text-xs" style="color: var(--muted-foreground)">Click a row to see individual grades</span>
            </div>
            ${students.length
              ? students.map(studentRow).join("")
              : `<p class="text-sm py-6 text-center" style="color: var(--muted-foreground)">No students enrolled yet.</p>`}
          </div>
        `}
      </main>
    </div>`;
}

function rerender() {
  const app = document.getElementById("app");
  app.innerHTML = dashboardView();
  attachEvents(app);
}

function attachEvents(root) {
  initNavbar(root);

  // Cambiar de curso
  root.querySelector(".js-course")?.addEventListener("change", async (e) => {
    selCourseId = Number(e.target.value);
    expanded.clear();
    await loadCourseData();
  });

  // Desplegar / plegar las notas individuales
  root.querySelectorAll(".js-row").forEach((btn) =>
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.student);
      expanded.has(id) ? expanded.delete(id) : expanded.add(id);
      rerender();
    })
  );
}

// Carga secciones + estudiantes del curso seleccionado
async function loadCourseData() {
  sections = await getSections(selCourseId);
  students = await getEnrolledStudents(selCourseId);
  rerender();
}

export async function initDashboard() {
  const root = document.getElementById("app");

  courses = await getTutorCourses();   // Regla 3: solo SUS cursos
  expanded = new Set();

  if (!courses.length) {
    root.innerHTML = dashboardView();
    attachEvents(root);
    return;
  }

  selCourseId = courses[0].id;
  await loadCourseData();
}