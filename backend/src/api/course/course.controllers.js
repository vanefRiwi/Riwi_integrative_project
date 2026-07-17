import { courseServices } from "./course.services.js";

/**
 * 1. GET /api/courses — Catálogo general con filtros del Blocker #2
 */
export const getCourses = async (req, res, next) => {
  try {
    // req.user viene inyectado por tu Middleware verifyJWT 🎉
    const courses = await courseServices.getCoursesForUser(req.user);
    return res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/courses/mine — Cursos exclusivos del Tutor autenticado (Exigido en el contrato)
 */
export const getMyCourses = async (req, res, next) => {
  try {
    const courses = await courseServices.getCoursesByTutor(req.user.id);
    return res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
};

/**
 * 3. POST /api/courses — Crear un curso inyectando el tutor_id del Token
 */
export const createCourse = async (req, res, next) => {
  try {
    const newCourse = await courseServices.createNewCourse(req.user.id, req.body);
    return res.status(201).json({ ok: true, course: newCourse });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. PUT /api/courses/:id — Modificar un curso aplicando Blocker #2 y #3 server-side
 */
export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await courseServices.updateExistingCourse(id, req.user.id, req.body);

    if (result.error === "NOT_FOUND") {
      return res.status(404).json({ ok: false, message: "Course not found." });
    }
    if (result.error === "FORBIDDEN") {
      return res.status(403).json({ ok: false, message: "Forbidden: You do not own this course." });
    }

    return res.status(200).json({ ok: true, course: result.course });
  } catch (error) {
    next(error);
  }
};
