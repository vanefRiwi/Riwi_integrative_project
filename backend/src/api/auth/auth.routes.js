import { Router } from "express";
import { login, register } from ""



import { authControllers } from "./auth.controllers.js";
import { validateBody } from "../../middlewares/validation.middleware.js";

const router = Router();

// Ruta necesaria para el inicio de sesión
router.post("/login", validateBody(["email", "password"]), authControllers.login);

export default router;
