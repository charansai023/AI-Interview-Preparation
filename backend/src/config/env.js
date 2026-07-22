require("dotenv").config();

const required = ["GEMINI_API_KEY", "MONGODB_URI"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  // Fail fast and loudly rather than booting a server that can never work.
  console.error(
    `[startup] Missing required environment variable(s): ${missing.join(", ")}. ` +
      "Copy .env.example to .env and set them before starting the server."
  );
  process.exit(1);
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  geminiApiKey: process.env.GEMINI_API_KEY,
  mongodbUri: process.env.MONGODB_URI,
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : "*",
};
