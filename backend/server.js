import { GoogleGenAI } from "@google/genai";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { computeTax } from "./tax/taxEngine.js";
import {
  estimateInputTokens,
  updateChatRateLimit,
  validateChatInput,
} from "./utils/chatUtils.js";

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
// -------- Google Gemini chat endpoint (fixed to use spending + taxHistory) --------
app.post("/api/gemini/chat", async (request, response) => {
  try {
    const { message, uid } = request.body;

    if (!uid) {
      return response.status(400).json({ error: "User ID (uid) is required." });
    }

    const trimmedMessage = (message || "").trim();
    const validation = await validateChatInput(uid, trimmedMessage);
    if (!validation.valid) {
      return response.status(400).json({ error: validation.error });
    }

    const db = admin.firestore();

    // ===================== TAX HISTORY (users/{uid}/taxHistory) =====================
    const taxRef = db
      .collection("users")
      .doc(uid)
      .collection("taxHistory")
      .orderBy("createdAt", "desc")
      .limit(10);

    const taxSnapshot = await taxRef.get();

    const taxHistory = taxSnapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        date: d.createdAt?.toDate?.().toLocaleString() || d.date || "Unknown",
        income: d.income || 0,
        state: d.state || "N/A",
        federalTax: d.federalTax || 0,
        stateTax: d.stateTax || 0,
        totalTax: d.totalTax || 0,
        effectiveRate: d.effectiveRate || 0,
      };
    });

    const taxHistoryString =
      taxHistory.length > 0
        ? taxHistory
            .map(
              (t, i) =>
                `${i + 1}. ${t.date} — Income: $${t.income}, State: ${
                  t.state
                }, Federal: $${t.federalTax}, StateTax: $${t.stateTax}, Total: $${
                  t.totalTax
                }, EffectiveRate: ${t.effectiveRate.toFixed(2)}%`,
            )
            .join("\n")
        : "No tax history available.";

    // ===================== TRANSACTIONS (users/{uid}.spending map) =====================
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const spending = userData.spending || {};

    const now = new Date();
    const thirtyDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 30,
    );

    let transactions = [];
    let categoryTotals = {};
    let last30DaysSpend = 0;

    Object.values(spending).forEach((tx) => {
      if (!tx) return;

      let dateObj = tx.date ? new Date(tx.date) : tx.createdAt?.toDate?.();
      const amount = Number(tx.amount) || 0;

      const entry = {
        date: dateObj ? dateObj.toLocaleString() : "N/A",
        rawDate: dateObj,
        amount,
        category: tx.category || "Uncategorized",
        type: tx.type || "expense",
        description: tx.description || "",
      };

      transactions.push(entry);

      if (
        entry.type === "expense" &&
        entry.rawDate &&
        entry.rawDate >= thirtyDaysAgo
      ) {
        last30DaysSpend += amount;
        categoryTotals[entry.category] =
          (categoryTotals[entry.category] || 0) + amount;
      }
    });

    transactions.sort(
      (a, b) => (b.rawDate?.getTime?.() || 0) - (a.rawDate?.getTime?.() || 0),
    );

    const transactionsString =
      transactions.length > 0
        ? transactions
            .slice(0, 40)
            .map(
              (t, i) =>
                `${i + 1}. ${t.date} — ${t.type.toUpperCase()} $${t.amount.toFixed(
                  2,
                )} in ${t.category}${t.description ? ` (${t.description})` : ""}`,
            )
            .join("\n")
        : "No transaction history available.";

    const categorySummaryString =
      Object.keys(categoryTotals).length > 0
        ? Object.entries(categoryTotals)
            .map(([cat, amt]) => `- ${cat}: $${amt.toFixed(2)}`)
            .join("\n")
        : "No category breakdown available.";

    // ===================== GEMINI CONTEXT TEXT =====================
    const contextText = `
You are Obfin’s AI Financial Advisor.

Your tone must always follow these rules:
- Friendly, brief, and human-like.
- Use bullet points for clarity.
- Provide a "snapshot" feeling: quick overview + useful highlight.
- Encourage the user politely (e.g., “You’re doing great”, “Let me know if you want help”).
- Avoid robotic or overly formal responses.
- Never lecture; keep it conversational.
- If there's little spending, point it out positively.
- If there are trends (more categories), point out top categories or notable changes.

Here is the user’s financial data. Use this to create a personalized summary:

=== TAX HISTORY (latest ${taxHistory.length}) ===
${taxHistoryString}

=== TRANSACTIONS (latest ${transactions.length}) ===
${transactionsString}

=== LAST 30 DAYS SUMMARY ===
Total spent: $${last30DaysSpend.toFixed(2)}
By category:
${categorySummaryString}

=== USER QUESTION ===
${trimmedMessage}

Now produce a concise, friendly response that includes:
1. A short bullet-point summary of spending (like “Last 30 Days Snapshot”).  
2. Category highlights (e.g., “Top categories”, “All spending was in Food”).  
3. Any helpful insight (e.g., “Light spending so far”, “Shopping increased vs last month”).  
4. A closing friendly line offering help (e.g., “Let me know if you want deeper insights”).  

Do NOT write paragraphs or long explanations. Keep it clean and human.
`;

    // ===================== GEMINI REQUEST =====================
    const geminiResponse = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: contextText }] }],
    });

    const text =
      geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "NO_RESPONSE_FOUND";

    const inputTokens = estimateInputTokens(contextText);
    console.log(`Chat UID:${uid} inputTokens:${inputTokens}`);

    await updateChatRateLimit(uid);

    return response.json({
      status: "success",
      response: text,
      model: "gemini-2.5-flash",
      taxHistoryIncluded: taxHistory.length,
      transactionsIncluded: transactions.length,
    });
  } catch (error) {
    console.error("AI ERROR:", error);
    return response.status(500).json({ error: "AI system error" });
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
  fs.readFileSync(
    path.join(__dirname, "tax/data/federal_2025.preview.json"),
    "utf8",
  ),
);

const states2025 = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "tax/data/states_2025.preview.json"),
    "utf8",
  ),
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
      return res
        .status(400)
        .json({ error: `State '${state}' not found in 2025 dataset.` });
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

// Transaction management
app.put("/api/transactions/:uid/:transactionId", async (req, res) => {
  try {
    const { uid, transactionId } = req.params;
    const { amount, category, description, date } = req.body;

    console.log("Update request received:", {
      uid,
      transactionId,
      body: req.body,
    });

    if (!uid || !transactionId) {
      return res
        .status(400)
        .json({ error: "User ID and Transaction ID are required" });
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log("User not found:", uid);
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const oldTransaction = userData.spending?.[transactionId];

    if (!oldTransaction) {
      console.log("Transaction not found:", transactionId);
      console.log(
        "Available transactions:",
        Object.keys(userData.spending || {}),
      );
      return res.status(404).json({ error: "Transaction not found" });
    }

    console.log("Old transaction:", oldTransaction);

    // Calculate monthly trend adjustments
    const oldMonth = oldTransaction.date.substring(5, 7);
    const oldYear = oldTransaction.date.substring(0, 4);
    const oldYearMonth = `${oldYear}-${oldMonth}`;

    const newMonth = date.substring(5, 7);
    const newYear = date.substring(0, 4);
    const newYearMonth = `${newYear}-${newMonth}`;

    const oldAmount = Number(oldTransaction.amount);
    const newAmount = Number(amount);

    // Prepare update object
    const updates = {
      [`spending.${transactionId}`]: {
        amount: newAmount,
        category: category,
        date: date,
        description: description,
        createdAt: oldTransaction.createdAt || Date.now(), // Preserve createdAt
      },
    };

    // Update monthly trends
    if (oldYearMonth === newYearMonth) {
      // Same month - adjust by difference
      updates[`monthlyTrends.${oldYearMonth}`] =
        admin.firestore.FieldValue.increment(newAmount - oldAmount);
    } else {
      // Different month - subtract from old, add to new
      updates[`monthlyTrends.${oldYearMonth}`] =
        admin.firestore.FieldValue.increment(-oldAmount);
      updates[`monthlyTrends.${newYearMonth}`] =
        admin.firestore.FieldValue.increment(newAmount);
    }

    console.log("Applying updates:", updates);

    await userRef.update(updates);

    console.log("Transaction updated successfully");

    res.json({
      success: true,
      message: "Transaction updated successfully",
      transactionId,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res
      .status(500)
      .json({ error: "Failed to update transaction", details: error.message });
  }
});

// Delete a transaction from the nested spending map structure
app.delete("/api/transactions/:uid/:transactionId", async (req, res) => {
  try {
    const { uid, transactionId } = req.params;

    console.log("Delete request received:", { uid, transactionId });

    if (!uid || !transactionId) {
      return res
        .status(400)
        .json({ error: "User ID and Transaction ID are required" });
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log("User not found:", uid);
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const transaction = userData.spending?.[transactionId];

    if (!transaction) {
      console.log("Transaction not found:", transactionId);
      console.log(
        "Available transactions:",
        Object.keys(userData.spending || {}),
      );
      return res.status(404).json({ error: "Transaction not found" });
    }

    console.log("Deleting transaction:", transaction);

    // Extract year-month for monthly trends
    const month = transaction.date.substring(5, 7);
    const year = transaction.date.substring(0, 4);
    const yearMonth = `${year}-${month}`;
    const amount = Number(transaction.amount);

    // Delete transaction and update monthly trend
    await userRef.update({
      [`spending.${transactionId}`]: admin.firestore.FieldValue.delete(),
      [`monthlyTrends.${yearMonth}`]:
        admin.firestore.FieldValue.increment(-amount),
    });

    console.log("Transaction deleted successfully");

    res.json({
      success: true,
      message: "Transaction deleted successfully",
      transactionId,
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res
      .status(500)
      .json({ error: "Failed to delete transaction", details: error.message });
  }
});
// -------- Get User Budget Categories --------
app.get("/api/categories/:uid", async (req, res) => {
  try {
    const uid = req.params.uid;

    const userRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const data = userDoc.data();
    const categories = Object.keys(data.budgetCategories || {});

    return res.json({ categories });
  } catch (err) {
    console.error("Error retrieving categories:", err);
    return res.status(500).json({ error: "Failed to load categories" });
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
    const historyRef = admin
      .firestore()
      .collection("users")
      .doc(uid)
      .collection("taxHistory")
      .orderBy("createdAt", "desc");

    const snapshot = await historyRef.get();
    const results = snapshot.docs.map((doc) => doc.data());

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tax history" });
  }
});
