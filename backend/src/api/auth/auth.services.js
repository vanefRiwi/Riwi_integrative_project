import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authRepository } from "./auth.repository.js";

export const authServices = {
  // Valida credenciales y devuelve { token, user }
  login: async (email, password) => {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw Object.assign(new Error("Credenciales inválidas"), { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw Object.assign(new Error("Credenciales inválidas"), { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    // No devolver el hash al cliente
    const { password_hash, ...safeUser } = user;
    return { token, user: safeUser };
  },
};
