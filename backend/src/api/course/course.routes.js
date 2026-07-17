import { Router } from "express";
import { getCourses, getMyCourses, createCourse, updateCourse } from "./course.controllers.js";
import { verifyJWT, authorizeRoles } from "../../middlewares/auth.middleware.js";

const router = Router();

// 🎓 Catálogo general (Para estudiantes y tutores)
router.get("/", verifyJWT, getCourses);

// 👨‍🏫 Panel del Tutor: Obtiene solo los cursos del tutor autenticado
router.get("/mine", verifyJWT, authorizeRoles("tutor"), getMyCourses);

// 📝 Crear curso (Exclusivo Tutor - Blocker #2)
router.post("/", verifyJWT, authorizeRoles("tutor"), createCourse);

// 🔄 Editar curso (Exclusivo Tutor dueño - Blocker #2)
router.put("/:id", verifyJWT, authorizeRoles("tutor"), updateCourse);

export default router;
