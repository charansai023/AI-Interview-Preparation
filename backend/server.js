const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { port, corsOrigin } = require("./src/config/env");
const { connectDB } = require("./src/config/db");
const evaluateRouter = require("./src/routes/evaluate");
const sessionsRouter = require("./src/routes/sessions");

const app = express();

// --- Security & parsing middleware ---
app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
  })
);
app.use(express.json({ limit: "100kb" }));

// Basic abuse protection: each caller gets a modest number of
// evaluation requests per window, since every call costs a Gemini request.
const evaluateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a bit and try again." },
});

// --- Routes ---
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", evaluateLimiter, evaluateRouter);
app.use("/api", sessionsRouter);

// --- 404 fallback ---
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// --- Central error handler (catches anything unexpected/synchronous) ---
app.use((err, req, res, next) => {
  console.error("[unhandled error]", err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("[startup] Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Interview prep backend listening on http://localhost:${port}`);
  });
}

start();
