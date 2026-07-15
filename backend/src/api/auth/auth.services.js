import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authRepository } from "./auth.repository.js";

export const authServices = {
  /**
   * Login logic (task #7)
   */
  login: async (email, password) => {
    const user = await authRepository.findUserByEmail(email);
    if (!user) return null; // Unregistered email.

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return null; // Wrong password.

    // We sign the valid JWT for 24 hours
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "lumora_fallback_secret",
      { expiresIn: "24h" }
    );

    return {
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        learningGoal: user.learning_goal
      }
    };
  },

  /**
   * Signup logic (task #8)
   */
  registerUser: async (userData) => {
    const existingUser = await authRepository.findUserByEmail(userData.email);
    if (existingUser) throw new Error("EMAIL_ALREADY_TAKEN");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    return await authRepository.createUser({
      fullName: userData.fullName,
      email: userData.email,
      passwordHash: hashedPassword,
      role: userData.role,
      learningGoal: userData.learningGoal || null
    });
  }
};
