import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // En desarrollo, /api se redirige al backend Express
      "/api": "http://localhost:3000",
    },
  },
});
