import pkg from "pg";
import dotenv from "dotenv";
import { ensureSchema } from "./create-tables.js";

dotenv.config();

const { Pool } = pkg;

// Pool config
export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433", 10),
  database: process.env.DB_NAME || "lumora_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres123",

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Active connections monitoring.
pool.on("connect", () => {
  console.log("🔌 [Database]: New client connection stablished with the connection pool.");
});

// Error catching on secondary threads.
pool.on("error", (err) => {
  console.error("❌ [Database]: Unexpeceted error at an inactive client on the pool:", err.message);
});

/**
 * Start verification function
 * Makes sure the backend DOESN'T start if the database is down.
 * Also, runs the schema (CREATE TABLE IF NOT EXISTS) so that the MVP
 * deploys without manual migration steps.
 */
export const verifyConnection = async () => {
  try {
    // We try to get a real connection from the pool immediately.
    const client = await pool.connect();
    console.log("✅ [Database]: Successful initial connection to PostgreSQL through the pool.");
    client.release();

    // 🏗️ Creates the tables if they don't exist (idempotent).
    await ensureSchema();

    const res = await pool.query("SELECT COUNT(*) FROM users;");
    console.log(`📊 [Database]: Structure verified succesfully. Users in DB: ${res.rows[0].count}`);
  } catch (error) {
    console.error("🚨 [Database CRITICAL]: Error connecting to PostgreSQL on start:", error.message);
    process.exit(1);
  }
};
