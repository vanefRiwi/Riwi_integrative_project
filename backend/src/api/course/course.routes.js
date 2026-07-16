import { Router } from "express";
import { 
  getCourses, 
  createCourse, 
  updateCourse 
} from "./course.controllers.js";

// Middleware guardians
import { verifyJWT, authorizeRoles } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * 1. General course catalog
 * Requirement: Any authenticated user (student or tutor) can consult it.
 */
router.get("/", verifyJWT, getCourses);

/**
 * 2. Course creation (Blocker #2)
 * Requirement: Exclusive for users with rol "tutor".
 * If a user tests it, the middleware bounces a 403 automatically.
 */
router.post("/", verifyJWT, authorizeRoles("tutor"), createCourse);

/**
 * 3. Course edition/modify (Blocker #2).
 * Requirement: Exclusive for tutors.
 */
router.put("/:id", verifyJWT, authorizeRoles("tutor"), updateCourse);

export default router;