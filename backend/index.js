import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./src/api/auth/auth.routes.js";
import { errorHandler } from "./src/utils/errorHandler.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de autenticación (única implementada por ahora)
app.use("/api/auth", authRoutes);

// TODO: montar el resto de módulos a medida que se implementen
// app.use("/api/users", userRoutes);
// app.use("/api/courses", courseRoutes);
// ...

app.get("/", (req, res) => res.json({ ok: true, message: "LumORA API 🚀" }));

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Servidor en http://localhost:${port}`));
