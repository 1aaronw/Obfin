import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { computeTax } from "./tax/taxEngine.js";

//-------setup environment-------
dotenv.config();
console.log("Current mode:", process.env.NODE_ENV); //to check the mode development or deployed

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
  }),
);

// Needed for ES Modules // Firebase admin setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the service account key dynamically
// Load Firebase Admin SDK key manually
const serviceAccountPath = path.join(
  __dirname,
  "config/serviceAccountKey.json",
);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("Firebase Admin initialized successfully");

// initialize Google AI (will use GEMINI_API_KEY from environment)
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

//--------Google Gemini chat endpoint---------
// express js post route
app.post("/api/gemini/chat", async (request, response) => {
  try {
    // destructure hashmap
    const { message } = request.body;

    // pre-request handling
    if (!message) {
      return response
        .status(400)
        .json({ error: "400 Bad Request: Message is required" });
    }

    // TODO: edit the message to have user financial data and current news context

    // generate response using given message
    const result = await genAI.models.generateContent({
      // async await call to prevent blocking
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: message }] }],
    });

    console.log("Google Gemini API Response:", JSON.stringify(result, null, 2));

    // check every lookup for null / undefined, if former, then return right of ||
    const text =
      result.candidates?.[0]?.content?.parts?.[0]?.text || "NO_RESPONSE_FOUND";

    response.json({
      status: "success",
      response: text,
      model: "gemini-2.5-flash",
    });
  } catch (error) {
    console.error("Google Gemini API error:", error);
    response
      .status(500)
      .json({ error: "500: Failed to get response from Gemini" });
  }
});

//--------Marketaux News API endpoint---------
app.get("/api/news", async (req, res) => {
  try {
    const MARKETAUX_API_KEY = process.env.MARKETAUX_API_KEY;

    if (!MARKETAUX_API_KEY) {
      console.error("MARKETAUX_API_KEY is not set in environment variables");
      return res.status(500).json({
        error:
          "MarketAux API key not configured. Please add MARKETAUX_API_KEY to your .env file",
      });
    }

    console.log("Fetching news from MarketAux API...");
    const symbols = "TSLA,AAPL,MSFT,AMZN,GOOGL,META,NVDA,JPM,V,WMT";
    const apiUrl = `https://api.marketaux.com/v1/news/all?symbols=${symbols}&filter_entities=true&language=en&limit=10&api_token=${MARKETAUX_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Obfin-Finance-App/1.0",
      },
    });

    console.log("MarketAux API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MarketAux API error response:", errorText);
      throw new Error(`MarketAux API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log(
      "MarketAux API success, returned",
      data.data?.length || 0,
      "articles",
    );

    res.status(200).json({
      status: "success",
      data: data.data,
      meta: data.meta || {},
    });
  } catch (error) {
    console.error("MarketAux API error:", error.message);
    res.status(500).json({
      error: "Failed to fetch financial news",
      details: error.message,
    });
  }
});

// --- Health & Diagnostics ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "obfin-backend" });
});

app.get("/api/version", (req, res) => {
  res.json({ api: "v1", env: process.env.NODE_ENV || "development" });
});

// Test route for frontend-backend communication
//this route will only exist in development mode and when we deploy it it would be removed automatically
// ---------------- Dev-only test route ----------------
// this route exists ONLY during local development for quick connection checks.
if (process.env.NODE_ENV === "development") {
  app.get("/api/testUser", (req, res) => {
    res.json({
      success: true,
      message: "Frontend and backend are connected! (dev mode)",
      timestamp: new Date().toISOString(),
      sampleUser: { name: "Poojan Shah", project: "Obfin" },
    });
  });
}

// ========================================================
//  TAX CALCULATOR ROUTE (2025 REAL DATA, SINGLE ONLY)
// ========================================================


// Resolve __dirname already exists above, so we reuse it

// Load tax JSON files ONCE (cached in memory)
const federal2025 = JSON.parse(
  fs.readFileSync(path.join(__dirname, "tax/data/federal_2025.preview.json"), "utf8")
);

const states2025 = JSON.parse(
  fs.readFileSync(path.join(__dirname, "tax/data/states_2025.preview.json"), "utf8")
);

// -------------------- TAX API --------------------
app.post("/api/tax/calculate", (req, res) => {
  try {
    const { income, state } = req.body;

    if (!income || isNaN(income)) {
      return res.status(400).json({ error: "Income must be a valid number." });
    }

    if (!state) {
      return res.status(400).json({ error: "State is required." });
    }

    const stateCfg = states2025[state];

    if (!stateCfg) {
      return res.status(400).json({ error: `State '${state}' not found in 2025 dataset.` });
    }

    // SINGLE ONLY — clean future-proof design
    const result = computeTax({
      income: Number(income),
      filingStatus: "single",
      federal: federal2025,
      stateCfg,
    });

    return res.json({
      success: true,
      income: Number(income),
      state,
      ...result,
    });

  } catch (err) {
    console.error("Tax Engine Error:", err);
    res.status(500).json({ error: "Tax calculation failed" });
  }
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

app.get("/api/tax/history/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;
    const historyRef = admin.firestore()
      .collection("users")
      .doc(uid)
      .collection("taxHistory")
      .orderBy("createdAt", "desc");

    const snapshot = await historyRef.get();
    const results = snapshot.docs.map(doc => doc.data());

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tax history" });
  }
});
