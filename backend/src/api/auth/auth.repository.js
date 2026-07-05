import { pool } from "../../config/postgres/postgres.db.js";

export const authRepository = {
  // Busca un usuario por email (para el login)
  findByEmail: async (email) => {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    return rows[0];
  },
};
