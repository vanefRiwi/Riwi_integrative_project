import { authServices } from "./auth.services.js";

export const authControllers = {
  // POST /api/auth/login
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await authServices.login(email, password);
      res.json({ ok: true, ...result });
    } catch (err) {
      next(err);
    }
  },
};
