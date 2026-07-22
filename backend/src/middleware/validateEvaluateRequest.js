const MAX_TRANSCRIPT_LENGTH = 8000;

/**
 * Validates and lightly sanitizes the body of POST /api/evaluate-answer.
 * Rejects early with a 400 rather than letting bad input reach Gemini.
 */
function validateEvaluateRequest(req, res, next) {
  const { jobRole, questionAsked, userTranscript, userId } = req.body || {};

  const errors = [];

  if (typeof jobRole !== "string" || jobRole.trim().length === 0) {
    errors.push("`jobRole` is required and must be a non-empty string.");
  }
  if (typeof questionAsked !== "string" || questionAsked.trim().length === 0) {
    errors.push("`questionAsked` is required and must be a non-empty string.");
  }
  if (typeof userTranscript !== "string" || userTranscript.trim().length === 0) {
    errors.push("`userTranscript` is required and must be a non-empty string.");
  } else if (userTranscript.length > MAX_TRANSCRIPT_LENGTH) {
    errors.push(`\`userTranscript\` must be under ${MAX_TRANSCRIPT_LENGTH} characters.`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Invalid request body.", details: errors });
  }

  req.body = {
    // The dashboard doesn't have real auth yet, so fall back to a
    // placeholder id until a login/session system exists.
    userId: typeof userId === "string" && userId.trim() ? userId.trim() : "anonymous-user",
    jobRole: jobRole.trim(),
    questionAsked: questionAsked.trim(),
    userTranscript: userTranscript.trim(),
  };

  next();
}

module.exports = { validateEvaluateRequest };
