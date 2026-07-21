// ─── User Service ─────────────────────────────────────────────────────────────
// Only gateway to user data.
//
// ⚠️ No view should touch localStorage directly: all profile read/write goes through here.
// This way, when connecting the backend, only this file changes.
//
// 🔌 INTEGRATION: uncomment `api` and replace the body of each function.

// import { api } from "../helpers/api.js";
import { getSession, saveSession } from "../helpers/auth.js";

// Available learning goals (FUTURE: could come from the backend)
export const LEARNING_GOALS = [
  "Career change",
  "Skill upgrade",
  "Academic study",
  "Personal interest",
  "Teaching",
];

// GET /api/users/me -> authenticated user data
export async function getProfile() {
  // FUTURE: const { data } = await api.get("/users/me"); return data;
  return getSession();
}

// PUT /api/users/me -> updates the profile
// Returns the updated user.
export async function updateProfile({ full_name, email, learning_goal }) {
  // FUTURE:
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

  // Persists the updated session (the token doesn't change)
  saveSession({ token: localStorage.getItem("token"), user: updated });
  return updated;
}
