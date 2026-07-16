// ─── User Service ─────────────────────────────────────────────────────────────
// Única puerta de entrada a los datos del usuario.
//
// ⚠️ Ninguna vista debe tocar localStorage directamente: toda lectura/escritura
// del perfil pasa por aquí. Así, al conectar el backend, solo cambia este archivo.
//
// 🔌 INTEGRACIÓN: descomenta `api` y reemplaza el cuerpo de cada función.

// import { api } from "../helpers/api.js";
import { getSession, saveSession } from "../helpers/auth.js";

// Metas de aprendizaje disponibles (FUTURO: podrían venir del backend)
export const LEARNING_GOALS = [
  "Career change",
  "Skill upgrade",
  "Academic study",
  "Personal interest",
  "Teaching",
];

// GET /api/users/me -> datos del usuario autenticado
export async function getProfile() {
  // FUTURO: const { data } = await api.get("/users/me"); return data;
  return getSession();
}

// PUT /api/users/me -> actualiza el perfil
// Devuelve el usuario actualizado.
export async function updateProfile({ full_name, email, learning_goal }) {
  // FUTURO:
  //   const { user } = await api.put("/users/me", { full_name, email, learning_goal });
  //   saveSession({ token: localStorage.getItem("token"), user });
  //   return user;

  const current = getSession();
  if (!current) throw new Error("No active session.");

  if (!full_name?.trim()) throw new Error("Name cannot be empty.");
  if (!email?.trim()) throw new Error("Email cannot be empty.");

  const updated = {
    ...current,
    full_name: full_name.trim(),
    email: email.trim(),
    learning_goal,
  };

  // Persiste la sesión actualizada (el token no cambia)
  saveSession({ token: localStorage.getItem("token"), user: updated });
  return updated;
}
