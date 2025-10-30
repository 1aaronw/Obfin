import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

//-------setup environment-------
dotenv.config();

//Express app initialization------
const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// allow your React dev server only
const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
app.use(
  cors({
    origin(origin, cb) {
      // allow tools like curl/Postman (no origin)
      if (!origin) return cb(null, true);
      return allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Needed for ES Modules // Firebase admin setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the service account key dynamically
// Load Firebase Admin SDK key manually
const serviceAccountPath = path.join(
  __dirname,
  "config/serviceAccountKey.json"
);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("Firebase Admin initialized successfully");

//------------ROUTES-----------------
//--------Test Firestore connection---------
app.get("/api/test", async (req, res) => {
  try {
    const db = admin.firestore();
    const testDoc = await db.collection("test").doc("connection").get();
    res.json({
      status: "ok",
      firebase: true,
      data: testDoc.exists ? testDoc.data() : "No data yet",
    });
  } catch (error) {
    console.error("Firebase connection error:", error);
    res.status(500).json({ error: "Firebase connection failed" });
  }
});

// --- Health & Diagnostics ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "obfin-backend" });
});

app.get("/api/version", (req, res) => {
  res.json({ api: "v1", env: process.env.NODE_ENV || "development" });
});

// 404 handler (for unknown routes)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// basic error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

//------Satrt Server----------
app.listen(PORT, () => {
  console.log(`obfin-backend listening on http://localhost:${PORT}`);
});
