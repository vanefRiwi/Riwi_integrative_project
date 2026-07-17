import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./src/api/auth/auth.routes.js";
import courseRoutes from "./src/api/course/course.routes.js";
import { errorHandler } from "./src/utils/errorHandler.js";
import { verifyConnection } from "./src/config/postgres/postgres.db.js"; 

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
 
// Auth route
app.use("/api/auth", authRoutes);

// Course route: 
app.use("/api/courses", courseRoutes);


// TODO: mount the rest of the modules on the go.

// app.use("/api/users", userRoutes);
// ...


app.get("/", (req, res) => res.json({ ok: true, message: "Lumora API 🚀" })); //

app.use(errorHandler);

const port = process.env.PORT || 3000;

/**
 * 🚀 Safe start function (Fail-Fast pattern used for this one)
 * Makes sure the backend doesn't listen to requests if Postgres fails.
 */
async function bootstrap() {
  try {
    await verifyConnection();

    app.listen(port, () => {
      console.log(`🚀 [Server]: Lumora Backend running succesfully at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("🚨 [Server CRITICAL]: Couldn't initialize network architecture:", error.message);
    process.exit(1);
  }
}

// Run the app
bootstrap();