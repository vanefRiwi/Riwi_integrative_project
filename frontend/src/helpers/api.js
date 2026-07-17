// Central communication layer with the backend.
const BASE_URL = "/api"; // Vite proxies to http://localhost:3000 in dev

async function request(endpoint, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request error");
  return data;
}

export const api = {
  get: (e) => request(e),
  post: (e, body, opts) => request(e, { method: "POST", body, ...opts }),
  put: (e, body) => request(e, { method: "PUT", body }),
  del: (e) => request(e, { method: "DELETE" }),
};
