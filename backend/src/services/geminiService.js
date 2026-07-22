const { GoogleGenerativeAI } = require("@google/generative-ai");
const { geminiApiKey } = require("../config/env");

const genAI = new GoogleGenerativeAI(geminiApiKey);

const SYSTEM_INSTRUCTION = `You are an elite corporate technical recruiter. Evaluate the candidate's answer to the given question based on the STAR method. You must respond ONLY with a clean JSON object containing:
{
"score": (a number from 1-10),
"strengths": ["point 1", "point 2"],
"weaknesses": ["point 1", "point 2"],
"idealAnswerSnippet": "A short example of how they could have framed it better"
}
Do not wrap the JSON output in markdown blocks like \`\`\`json.`;

// "gemini-2.5-flash" is now blocked for new API keys (Google restricts new
// projects to newer generations while still serving existing users on it).
// "gemini-flash-latest" is Google's auto-updating alias for their current
// recommended fast/free-tier model, so this stays correct as Google rolls
// models forward instead of breaking again on the next cutover.
const model = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
  systemInstruction: SYSTEM_INSTRUCTION,
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.4,
  },
});

/**
 * Strips accidental markdown code fences, just in case the model
 * doesn't fully honor the "no markdown" instruction.
 */
function stripCodeFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function validateShape(parsed) {
  const errors = [];

  if (typeof parsed.score !== "number" || parsed.score < 1 || parsed.score > 10) {
    errors.push("`score` must be a number between 1 and 10.");
  }
  if (!Array.isArray(parsed.strengths) || !parsed.strengths.every((s) => typeof s === "string")) {
    errors.push("`strengths` must be an array of strings.");
  }
  if (!Array.isArray(parsed.weaknesses) || !parsed.weaknesses.every((s) => typeof s === "string")) {
    errors.push("`weaknesses` must be an array of strings.");
  }
  if (typeof parsed.idealAnswerSnippet !== "string") {
    errors.push("`idealAnswerSnippet` must be a string.");
  }

  return errors;
}

/**
 * Sends the candidate's answer to Gemini and returns the parsed,
 * validated evaluation object.
 *
 * @param {{ jobRole: string, questionAsked: string, userTranscript: string }} params
 * @returns {Promise<{ score: number, strengths: string[], weaknesses: string[], idealAnswerSnippet: string }>}
 */
async function evaluateAnswer({ jobRole, questionAsked, userTranscript }) {
  const prompt = [
    `Job role: ${jobRole}`,
    `Interview question: ${questionAsked}`,
    `Candidate's transcribed answer: ${userTranscript}`,
  ].join("\n\n");

  let rawText;
  try {
    const result = await model.generateContent(prompt);
    rawText = result.response.text();
  } catch (err) {
    // Log the real cause immediately - status/statusText/message from the
    // Gemini SDK get lost if we don't capture them here before wrapping.
    console.error(
      "[geminiService] Raw Gemini call failed:",
      err.status || "",
      err.statusText || "",
      err.message || err
    );
    const error = new Error("Gemini request failed.");
    error.cause = err;
    error.type = "GEMINI_REQUEST_FAILED";
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(stripCodeFences(rawText));
  } catch (err) {
    const error = new Error("Gemini returned a response that wasn't valid JSON.");
    error.type = "GEMINI_INVALID_JSON";
    error.raw = rawText;
    throw error;
  }

  const shapeErrors = validateShape(parsed);
  if (shapeErrors.length > 0) {
    const error = new Error("Gemini's response didn't match the expected shape.");
    error.type = "GEMINI_INVALID_SHAPE";
    error.details = shapeErrors;
    error.raw = parsed;
    throw error;
  }

  return parsed;
}

module.exports = { evaluateAnswer };
