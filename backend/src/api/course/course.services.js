import { courseRepository } from "./course.repository.js";

export const courseServices = {
  /**
   * 🎓 Lógica de listado con filtros de seguridad (Blocker #2)
   */
  getCoursesForUser: async (userContext) => {
    const allCourses = await courseRepository.findAll();

    // Si el usuario conectado es un estudiante, aplicamos el filtro estricto del Blocker #2
    if (userContext.role === "student") {
      return allCourses.filter((c) => {
        // Estudiantes solo ven cursos públicos ('open')
        return c.visibility === "open";
      }).map(({ course_code, ...c }) => c); // 🔴 SEGURIDAD: Nunca exponer el 'course_code' a estudiantes
    }

    // Si es tutor, el catálogo general le muestra todo para administración
    return allCourses;
  },

  /**
   * 👨‍🏫 Obtener solo los cursos creados por el Tutor autenticado
   */
  getCoursesByTutor: async (tutorId) => {
    const allCourses = await courseRepository.findAll();
    return allCourses.filter((c) => c.tutor_id === Number(tutorId));
  },

  /**
   * 📝 Crear un curso inyectando el tutor_id de forma segura
   */
  createNewCourse: async (tutorId, payload) => {
    let generatedCode = null;
    if (payload.visibility === "code") {
      generatedCode = `EDU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }

    return await courseRepository.create({
      tutor_id: Number(tutorId), // 🔒 No confiamos en el body, viene del token
      title: payload.title,
      instructor: payload.instructor || "Tutor",
      category: payload.category,
      level: payload.level || "Beginner",
      description: payload.description,
      image: payload.image || "https://placeholder.com",
      visibility: payload.visibility || "open",
      course_code: generatedCode
    });
  },

  /**
   * 🔄 Modificar un curso validando propiedad server-side
   */
  updateExistingCourse: async (courseId, tutorId, updatedData) => {
    const course = await courseRepository.findById(courseId);
    if (!course) return { error: "NOT_FOUND" };

    // 🔴 BLOCKER #2 — Validación de propiedad estricta del Tutor dueño
    if (course.tutor_id !== Number(tutorId)) return { error: "FORBIDDEN" };

    const updated = await courseRepository.update(courseId, updatedData);
    return { error: null, course: updated };
  }
};